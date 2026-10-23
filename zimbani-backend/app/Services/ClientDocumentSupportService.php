<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Document;
use App\Models\Payment;
use App\Models\SavingsAccount;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ClientDocumentSupportService
{
    protected ClientAuthService $authService;

    public function __construct(ClientAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Get Client Digital Document Vault Repository
     */
    public function getClientDocuments(User $user, array $filters = []): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        // Find all documents related to this client (morphMany or direct)
        $unitIds = Unit::where('client_id', $user->id)
            ->when($client, fn($q) => $q->orWhere('client_id', $client->id))
            ->pluck('id')
            ->toArray();

        $accountIds = SavingsAccount::where('client_id', $client->id)->pluck('id')->toArray();

        $query = Document::where(function ($q) use ($client, $user, $unitIds, $accountIds) {
            $q->where(function ($sub) use ($client) {
                $sub->where('documentable_type', Client::class)
                    ->where('documentable_id', $client->id);
            })
            ->orWhere(function ($sub) use ($user) {
                $sub->where('documentable_type', User::class)
                    ->where('documentable_id', $user->id);
            });

            if (!empty($unitIds)) {
                $q->orWhere(function ($sub) use ($unitIds) {
                    $sub->where('documentable_type', Unit::class)
                        ->whereIn('documentable_id', $unitIds);
                });
            }

            if (!empty($accountIds)) {
                $q->orWhere(function ($sub) use ($accountIds) {
                    $sub->where('documentable_type', SavingsAccount::class)
                        ->whereIn('documentable_id', $accountIds);
                });
            }
        });

        if (!empty($filters['document_type']) && $filters['document_type'] !== 'all') {
            $query->where('document_type', $filters['document_type']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('description', 'like', $search)
                    ->orWhere('file_name', 'like', $search);
            });
        }

        $docs = $query->orderBy('id', 'desc')->get();

        $formatted = $docs->map(function ($doc) {
            $fileUrl = $doc->file_path ? (str_starts_with($doc->file_path, 'http') ? $doc->file_path : Storage::url($doc->file_path)) : null;

            return [
                'id' => $doc->id,
                'uuid' => $doc->uuid,
                'title' => $doc->title,
                'document_type' => $doc->document_type,
                'description' => $doc->description,
                'file_name' => $doc->file_name,
                'file_size' => $doc->file_size ? round($doc->file_size / 1024, 1) . ' KB' : 'Standard File',
                'file_type' => $doc->mime_type ?? 'application/pdf',
                'download_url' => $fileUrl,
                'is_verified' => $doc->is_verified ?? true,
                'created_at' => $doc->created_at?->toFormattedDateString(),
            ];
        });

        return [
            'documents' => $formatted,
            'total_count' => $formatted->count(),
            'categories' => [
                'all' => $formatted->count(),
                'contracts' => $formatted->where('document_type', 'contract')->count(),
                'receipts' => $formatted->where('document_type', 'receipt')->count(),
                'title_deeds' => $formatted->whereIn('document_type', ['title_deed', 'deed_plan'])->count(),
                'surveys' => $formatted->where('document_type', 'survey')->count(),
                'kyc' => $formatted->where('document_type', 'kyc')->count(),
            ],
        ];
    }

    /**
     * Upload Document to Client Vault
     */
    public function uploadClientDocument(User $user, Request $request): Document
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $request->validate([
            'title' => 'required|string|max:255',
            'document_type' => 'required|string|in:contract,receipt,kyc,id_proof,survey,title_deed,other',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240', // Max 10MB
            'description' => 'nullable|string|max:1000',
        ]);

        $file = $request->file('file');
        $filePath = $file->store('client_vault/' . $client->id, 'public');

        return Document::create([
            'uuid' => (string) Str::uuid(),
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'document_type' => $request->input('document_type'),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'documentable_type' => Client::class,
            'documentable_id' => $client->id,
            'uploaded_by' => $user->id,
            'is_verified' => false, // Pending staff review
        ]);
    }

    /**
     * Generate Comprehensive Account Statement & Ledger Breakdown
     */
    public function generateAccountStatement(User $user, array $filters = []): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $accountId = $filters['account_id'] ?? null;
        $fromDate = $filters['from_date'] ?? now()->subMonths(6)->toDateString();
        $toDate = $filters['to_date'] ?? now()->toDateString();

        $account = null;
        if ($accountId) {
            $account = SavingsAccount::where('id', $accountId)
                ->where('client_id', $client->id)
                ->first();
        }

        $query = Transaction::where('client_id', $client->id);
        if ($account) {
            $query->where('account_id', $account->id);
        }

        if ($fromDate) {
            $query->whereDate('transaction_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->whereDate('transaction_date', '<=', $toDate);
        }

        $transactions = $query->orderBy('transaction_date', 'asc')->get();

        $totalDeposits = (float) $transactions->where('transaction_type', 'credit')->sum('amount');
        $totalDisbursements = (float) $transactions->where('transaction_type', 'debit')->sum('amount');
        $runningBalance = 0.00;

        $ledgerEntries = $transactions->map(function ($txn) use (&$runningBalance) {
            $amt = (float) $txn->amount;
            if ($txn->transaction_type === 'credit') {
                $runningBalance += $amt;
            } else {
                $runningBalance -= $amt;
            }

            return [
                'id' => $txn->id,
                'uuid' => $txn->uuid,
                'transaction_number' => $txn->transaction_number ?? ('TXN-' . $txn->id),
                'date' => $txn->transaction_date ? $txn->transaction_date->format('Y-m-d H:i') : null,
                'description' => $txn->description,
                'narration' => $txn->narration,
                'reference' => $txn->reference_number,
                'type' => $txn->transaction_type, // 'credit' or 'debit'
                'debit' => $txn->transaction_type === 'debit' ? $amt : 0,
                'credit' => $txn->transaction_type === 'credit' ? $amt : 0,
                'running_balance' => $runningBalance,
            ];
        });

        return [
            'header' => [
                'statement_reference' => 'STM-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                'generated_at' => now()->toFormattedDateString() . ' ' . now()->toTimeString(),
                'client_name' => $client->full_name,
                'client_number' => $client->client_number,
                'client_email' => $client->email,
                'client_phone' => $client->phone_primary,
                'scheme_name' => $account ? $account->scheme_name : 'Consolidated Portfolio Statement',
                'account_number' => $account ? $account->account_number : 'ALL-ACCOUNTS',
                'period' => [
                    'from' => $fromDate,
                    'to' => $toDate,
                ],
                'currency' => 'UGX',
            ],
            'financial_summary' => [
                'opening_balance' => 0.00,
                'total_deposits' => $totalDeposits,
                'total_disbursements' => $totalDisbursements,
                'net_closing_balance' => $runningBalance,
            ],
            'entries' => $ledgerEntries->values(),
        ];
    }

    /**
     * Create Support Ticket
     */
    public function createTicket(User $user, array $data): SupportTicket
    {
        $client = $this->authService->resolveOrCreateClient($user);

        return DB::transaction(function () use ($user, $client, $data) {
            $ticket = SupportTicket::create([
                'uuid' => (string) Str::uuid(),
                'ticket_number' => 'TCK-' . date('Y') . '-' . strtoupper(Str::random(6)),
                'client_id' => $client->id,
                'user_id' => $user->id,
                'project_id' => $data['project_id'] ?? null,
                'unit_id' => $data['unit_id'] ?? null,
                'savings_account_id' => $data['savings_account_id'] ?? null,
                'subject' => $data['subject'],
                'category' => $data['category'] ?? 'general',
                'priority' => $data['priority'] ?? 'medium',
                'status' => 'open',
                'last_replied_at' => now(),
            ]);

            // Add Initial Message
            $msg = SupportTicketMessage::create([
                'uuid' => (string) Str::uuid(),
                'support_ticket_id' => $ticket->id,
                'user_id' => $user->id,
                'sender_type' => 'client',
                'sender_name' => $user->name,
                'message' => $data['message'],
                'attachments' => $data['attachments'] ?? null,
            ]);

            try {
                (new \App\Services\Notifications\RealtimeBroadcasterService())->broadcastTicketMessage($ticket->id, $msg, $user->name);
            } catch (\Throwable $e) {}

            return $ticket->load('messages');
        });
    }

    /**
     * Get Client's Support Tickets
     */
    public function getClientTickets(User $user): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $tickets = SupportTicket::with(['assignedAgent:id,name', 'messages'])
            ->where('client_id', $client->id)
            ->orderBy('id', 'desc')
            ->get();

        $formatted = $tickets->map(function ($t) {
            return [
                'id' => $t->id,
                'uuid' => $t->uuid,
                'ticket_number' => $t->ticket_number,
                'subject' => $t->subject,
                'category' => $t->category,
                'priority' => $t->priority,
                'status' => $t->status,
                'message_count' => $t->messages->count(),
                'last_message' => $t->messages->last()?->message,
                'assigned_agent' => $t->assignedAgent?->name ?? 'Customer Care Team',
                'last_replied_at' => $t->last_replied_at?->toIso8601String(),
                'created_at' => $t->created_at?->toIso8601String(),
            ];
        });

        return [
            'tickets' => $formatted,
            'open_count' => $formatted->whereIn('status', ['open', 'in_progress', 'waiting_client'])->count(),
            'resolved_count' => $formatted->whereIn('status', ['resolved', 'closed'])->count(),
        ];
    }

    /**
     * Get Detailed Ticket with Complete Conversation Thread
     */
    public function getTicketDetails(User $user, string $ticketIdentifier): SupportTicket
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $ticket = SupportTicket::with([
            'assignedAgent:id,name,email',
            'project:id,uuid,name',
            'unit:id,uuid,unit_number',
            'savingsAccount:id,uuid,account_number,scheme_name',
            'messages' => function ($q) {
                $q->orderBy('id', 'asc');
            },
        ])
            ->where(function ($q) use ($ticketIdentifier) {
                if (is_numeric($ticketIdentifier)) {
                    $q->where('id', (int) $ticketIdentifier);
                } else {
                    $q->where('uuid', $ticketIdentifier)
                        ->orWhere('ticket_number', $ticketIdentifier);
                }
            })
            ->where('client_id', $client->id)
            ->first();

        if (!$ticket) {
            throw new Exception("Support ticket not found.");
        }

        return $ticket;
    }

    /**
     * Post a Reply to Support Ticket
     */
    public function replyToTicket(User $user, string $ticketIdentifier, string $message, array $attachments = []): SupportTicketMessage
    {
        $client = $this->authService->resolveOrCreateClient($user);
        $ticket = $this->getTicketDetails($user, $ticketIdentifier);

        return DB::transaction(function () use ($ticket, $user, $message, $attachments) {
            $reply = SupportTicketMessage::create([
                'uuid' => (string) Str::uuid(),
                'support_ticket_id' => $ticket->id,
                'user_id' => $user->id,
                'sender_type' => 'client',
                'sender_name' => $user->name,
                'message' => $message,
                'attachments' => !empty($attachments) ? $attachments : null,
            ]);

            $ticket->update([
                'status' => 'open', // Reopen or set to open when client replies
                'last_replied_at' => now(),
            ]);

            try {
                (new \App\Services\Notifications\RealtimeBroadcasterService())->broadcastTicketMessage($ticket->id, $reply, $user->name);
            } catch (\Throwable $e) {}

            return $reply;
        });
    }

    /**
     * Close / Resolve Support Ticket
     */
    public function closeTicket(User $user, string $ticketIdentifier): SupportTicket
    {
        $ticket = $this->getTicketDetails($user, $ticketIdentifier);

        $ticket->update([
            'status' => 'closed',
            'resolved_at' => now(),
        ]);

        return $ticket;
    }
}
