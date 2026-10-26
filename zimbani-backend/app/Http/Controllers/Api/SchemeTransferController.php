<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\SavingsAccount;
use App\Models\SchemeTransfer;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchemeTransferController extends Controller
{
    /**
     * List all scheme transfer requests.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SchemeTransfer::with(['client', 'fromAccount', 'toAccount', 'requestedBy', 'reviewedBy'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $transfers = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $transfers,
        ]);
    }

    /**
     * Store a new scheme transfer request.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required',
            'from_savings_account_id' => 'required|exists:savings_accounts,id',
            'to_savings_account_id' => 'nullable|exists:savings_accounts,id',
            'from_scheme_name' => 'required|string|max:150',
            'to_scheme_name' => 'required|string|max:150',
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string|max:1000',
        ]);

        // Resolve client
        $client = is_numeric($validated['client_id'])
            ? Client::find($validated['client_id'])
            : Client::where('uuid', $validated['client_id'])->first();

        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found.',
            ], 404);
        }

        $sourceAccount = SavingsAccount::find($validated['from_savings_account_id']);
        if (!$sourceAccount) {
            return response()->json([
                'success' => false,
                'message' => 'Source savings account not found.',
            ], 404);
        }

        if ($sourceAccount->current_balance < $validated['amount']) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient funds in source scheme. Available balance: ' . number_format($sourceAccount->current_balance, 2) . ' UGX',
            ], 422);
        }

        $transfer = SchemeTransfer::create([
            'client_id' => $client->id,
            'from_savings_account_id' => $sourceAccount->id,
            'to_savings_account_id' => $validated['to_savings_account_id'] ?? null,
            'from_scheme_name' => $validated['from_scheme_name'],
            'to_scheme_name' => $validated['to_scheme_name'],
            'amount' => $validated['amount'],
            'reason' => $validated['reason'],
            'status' => 'pending',
            'requested_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Scheme transfer request submitted successfully and queued for review.',
            'data' => $transfer->load(['client', 'fromAccount', 'toAccount']),
        ], 201);
    }

    /**
     * Approve and execute a scheme transfer.
     */
    public function approve(Request $request, string $uuid): JsonResponse
    {
        $transfer = SchemeTransfer::where('uuid', $uuid)->firstOrFail();

        if ($transfer->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => "Transfer cannot be approved because status is '{$transfer->status}'.",
            ], 422);
        }

        DB::beginTransaction();
        try {
            $sourceAccount = $transfer->fromAccount;
            if (!$sourceAccount || $sourceAccount->current_balance < $transfer->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Source account balance is insufficient to execute transfer.',
                ], 422);
            }

            // Target account
            $targetAccount = $transfer->toAccount;
            if (!$targetAccount) {
                // Auto-create or resolve savings account under new scheme
                $targetAccount = SavingsAccount::create([
                    'client_id' => $transfer->client_id,
                    'account_type' => $sourceAccount->account_type,
                    'scheme_name' => $transfer->to_scheme_name,
                    'target_amount' => $sourceAccount->target_amount,
                    'current_balance' => 0.00,
                    'currency' => $sourceAccount->currency ?? 'UGX',
                    'status' => 'active',
                    'opened_date' => now()->toDateString(),
                    'notes' => "Opened via Scheme Transfer from {$transfer->from_scheme_name}",
                    'created_by' => auth()->id(),
                ]);
                $transfer->to_savings_account_id = $targetAccount->id;
            }

            // Deduct from source
            $sourceAccount->decrement('current_balance', $transfer->amount);

            // Add to target
            $targetAccount->increment('current_balance', $transfer->amount);

            // Immutable Ledger Transactions
            Transaction::create([
                'uuid' => (string) Str::uuid(),
                'transaction_number' => 'TXN-TRF-OUT-' . now()->format('YmdHis') . '-' . rand(100, 999),
                'account_id' => $sourceAccount->id,
                'client_id' => $transfer->client_id,
                'transaction_type' => 'debit',
                'amount' => $transfer->amount,
                'currency' => $sourceAccount->currency ?? 'UGX',
                'balance_before' => $sourceAccount->current_balance + $transfer->amount,
                'balance_after' => $sourceAccount->current_balance,
                'status' => 'completed',
                'description' => "Scheme Transfer to {$transfer->to_scheme_name} (Ref: {$transfer->uuid})",
                'transaction_date' => now(),
                'created_by' => auth()->id(),
            ]);

            Transaction::create([
                'uuid' => (string) Str::uuid(),
                'transaction_number' => 'TXN-TRF-IN-' . now()->format('YmdHis') . '-' . rand(100, 999),
                'account_id' => $targetAccount->id,
                'client_id' => $transfer->client_id,
                'transaction_type' => 'credit',
                'amount' => $transfer->amount,
                'currency' => $targetAccount->currency ?? 'UGX',
                'balance_before' => $targetAccount->current_balance - $transfer->amount,
                'balance_after' => $targetAccount->current_balance,
                'status' => 'completed',
                'description' => "Scheme Transfer from {$transfer->from_scheme_name} (Ref: {$transfer->uuid})",
                'transaction_date' => now(),
                'created_by' => auth()->id(),
            ]);

            // Update transfer status
            $transfer->update([
                'status' => 'approved',
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
                'notes' => $request->input('notes', 'Transfer approved and executed.'),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Scheme transfer approved and executed successfully.',
                'data' => $transfer->fresh(['client', 'fromAccount', 'toAccount', 'reviewedBy']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Transfer execution failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject a scheme transfer.
     */
    public function reject(Request $request, string $uuid): JsonResponse
    {
        $transfer = SchemeTransfer::where('uuid', $uuid)->firstOrFail();

        if ($transfer->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => "Transfer cannot be rejected because status is '{$transfer->status}'.",
            ], 422);
        }

        $transfer->update([
            'status' => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'notes' => $request->input('notes', 'Transfer rejected by administration.'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Scheme transfer request marked as rejected.',
            'data' => $transfer->load(['client', 'fromAccount', 'toAccount', 'reviewedBy']),
        ]);
    }
}
