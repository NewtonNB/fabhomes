<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\OtherFee;
use App\Models\OtherFeeCategory;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class OtherFeeController extends Controller
{
    /**
     * Display a listing of other fees with comprehensive filtering and KPI metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $query = OtherFee::with(['client', 'site', 'unit', 'savingsAccount', 'recordedBy', 'approvedBy'])
            ->latest();

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Category Filter
        if ($request->filled('category_code') && $request->category_code !== 'all') {
            $query->where('category_code', $request->category_code);
        }

        // Client Filter
        if ($request->filled('client_id')) {
            $clientId = $request->client_id;
            if (is_numeric($clientId)) {
                $query->where('client_id', $clientId);
            } else {
                $client = Client::where('uuid', $clientId)->first();
                if ($client) {
                    $query->where('client_id', $client->id);
                }
            }
        }

        // Site / Estate Filter
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->site_id);
        }

        // Search Term (Fee Number, Receipt Number, Title, or Client details)
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('fee_number', 'like', "%{$search}%")
                  ->orWhere('receipt_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('payment_reference', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%")
                         ->orWhere('client_number', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        // Date Range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = (int) $request->input('per_page', 15);
        $fees = $query->paginate($perPage);

        // Compute high-level KPI aggregations
        $stats = [
            'total_billed' => (float) OtherFee::sum('amount'),
            'total_collected' => (float) OtherFee::sum('amount_paid'),
            'total_pending' => (float) OtherFee::whereIn('status', ['pending', 'partial'])->sum('balance_due'),
            'total_waived' => (float) OtherFee::where('status', 'waived')->sum('amount'),
            'count_all' => OtherFee::count(),
            'count_pending' => OtherFee::where('status', 'pending')->count(),
            'count_partial' => OtherFee::where('status', 'partial')->count(),
            'count_paid' => OtherFee::where('status', 'paid')->count(),
            'count_waived' => OtherFee::where('status', 'waived')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $fees,
            'statistics' => $stats,
        ]);
    }

    /**
     * Retrieve all active fee categories.
     */
    public function categories(): JsonResponse
    {
        $categories = OtherFeeCategory::where('is_active', true)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Store a newly assessed / invoiced other fee.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required',
            'category_code' => 'required|string',
            'title' => 'required|string|max:200',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'nullable|date',
            'description' => 'nullable|string|max:1000',
            'site_id' => 'nullable|exists:sites,id',
            'unit_id' => 'nullable|exists:units,id',
            'savings_account_id' => 'nullable|exists:savings_accounts,id',
            'notes' => 'nullable|string|max:1000',
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

        // Category lookup for standard naming
        $category = OtherFeeCategory::where('code', $validated['category_code'])->first();
        $categoryName = $category ? $category->name : ucwords(str_replace('_', ' ', $validated['category_code']));

        // Sequential Fee Number
        $count = OtherFee::withTrashed()->count() + 1;
        $feeNumber = 'FEE-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $fee = OtherFee::create([
            'uuid' => (string) Str::uuid(),
            'fee_number' => $feeNumber,
            'client_id' => $client->id,
            'category_code' => $validated['category_code'],
            'category_name' => $categoryName,
            'site_id' => $validated['site_id'] ?? null,
            'unit_id' => $validated['unit_id'] ?? null,
            'savings_account_id' => $validated['savings_account_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
            'amount_paid' => 0.00,
            'balance_due' => $validated['amount'],
            'status' => 'pending',
            'due_date' => $validated['due_date'] ?? null,
            'recorded_by' => auth()->id(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Fee assessment {$feeNumber} recorded successfully.",
            'data' => $fee->load(['client', 'site', 'unit', 'savingsAccount', 'recordedBy']),
        ], 201);
    }

    /**
     * Display a specific other fee by UUID or ID.
     */
    public function show($identifier): JsonResponse
    {
        $fee = is_numeric($identifier)
            ? OtherFee::with(['client', 'site', 'unit', 'savingsAccount', 'recordedBy', 'approvedBy'])->find($identifier)
            : OtherFee::with(['client', 'site', 'unit', 'savingsAccount', 'recordedBy', 'approvedBy'])->where('uuid', $identifier)->first();

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'Fee record not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $fee,
        ]);
    }

    /**
     * Record a full or partial payment towards a fee.
     */
    public function recordPayment(Request $request, $identifier): JsonResponse
    {
        $fee = is_numeric($identifier)
            ? OtherFee::find($identifier)
            : OtherFee::where('uuid', $identifier)->first();

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'Fee record not found.',
            ], 404);
        }

        if ($fee->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'This fee has already been fully settled.',
            ], 422);
        }

        if ($fee->status === 'waived') {
            return response()->json([
                'success' => false,
                'message' => 'This fee was previously waived.',
            ], 422);
        }

        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:1|max:' . ($fee->balance_due > 0 ? $fee->balance_due : $fee->amount),
            'payment_method' => 'required|string|in:cash,mtn_momo,airtel_money,bank_transfer,cheque',
            'payment_reference' => 'nullable|string|max:100',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            $paymentAmount = (float) $validated['payment_amount'];
            $newPaid = (float) $fee->amount_paid + $paymentAmount;
            $newBalance = max(0, (float) $fee->amount - $newPaid);
            $newStatus = $newBalance <= 0 ? 'paid' : 'partial';
            $paymentDate = !empty($validated['payment_date']) ? $validated['payment_date'] : now()->toDateString();

            // Sequential Receipt Number if not assigned
            if (empty($fee->receipt_number)) {
                $receiptCount = OtherFee::whereNotNull('receipt_number')->count() + 1;
                $receiptNumber = 'RCP-FEE-' . date('Y') . '-' . str_pad($receiptCount, 4, '0', STR_PAD_LEFT);
                $fee->receipt_number = $receiptNumber;
            }

            $fee->amount_paid = $newPaid;
            $fee->balance_due = $newBalance;
            $fee->status = $newStatus;
            $fee->paid_at = !empty($validated['payment_date']) ? date('Y-m-d H:i:s', strtotime($validated['payment_date'])) : now();
            $fee->payment_method = $validated['payment_method'];
            $fee->payment_reference = $validated['payment_reference'] ?? $fee->payment_reference;
            if (!empty($validated['notes'])) {
                $fee->notes = ($fee->notes ? $fee->notes . "\n" : '') . "Payment: " . $validated['notes'];
            }
            $fee->save();

            // Record into central financial transactions ledger
            if (class_exists(Transaction::class) && Schema::hasTable('transactions')) {
                $txCount = Transaction::withTrashed()->count() + 1;
                Transaction::create([
                    'uuid' => (string) Str::uuid(),
                    'transaction_number' => 'TXN-FEE-' . date('Y') . '-' . str_pad($txCount, 4, '0', STR_PAD_LEFT),
                    'client_id' => $fee->client_id,
                    'account_id' => $fee->savings_account_id,
                    'transaction_type' => 'payment',
                    'amount' => $paymentAmount,
                    'currency' => 'UGX',
                    'balance_before' => 0.00,
                    'balance_after' => 0.00,
                    'description' => "Fee Payment: {$fee->category_name} ({$fee->fee_number})",
                    'narration' => "Receipt {$fee->receipt_number} via " . strtoupper($validated['payment_method']) . (!empty($validated['payment_reference']) ? " [Ref: {$validated['payment_reference']}]" : ""),
                    'reference_number' => $fee->receipt_number,
                    'transaction_date' => $paymentDate,
                    'value_date' => $paymentDate,
                    'status' => 'posted',
                    'created_by' => auth()->id(),
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Payment of UGX " . number_format($paymentAmount) . " recorded successfully. Receipt {$fee->receipt_number} issued.",
                'data' => $fee->load(['client', 'site', 'unit', 'savingsAccount', 'recordedBy']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to record fee payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Waive a pending fee with statutory/managerial justification.
     */
    public function waive(Request $request, $identifier): JsonResponse
    {
        $fee = is_numeric($identifier)
            ? OtherFee::find($identifier)
            : OtherFee::where('uuid', $identifier)->first();

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'Fee record not found.',
            ], 404);
        }

        if ($fee->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot waive a fee that has already been paid.',
            ], 422);
        }

        $validated = $request->validate([
            'waiver_reason' => 'required|string|max:1000',
        ]);

        $fee->status = 'waived';
        $fee->balance_due = 0.00;
        $fee->waiver_reason = $validated['waiver_reason'];
        $fee->approved_by = auth()->id();
        $fee->save();

        return response()->json([
            'success' => true,
            'message' => "Fee {$fee->fee_number} has been officially waived.",
            'data' => $fee->load(['client', 'site', 'unit', 'savingsAccount', 'recordedBy', 'approvedBy']),
        ]);
    }

    /**
     * Soft delete a fee record.
     */
    public function destroy($identifier): JsonResponse
    {
        $fee = is_numeric($identifier)
            ? OtherFee::find($identifier)
            : OtherFee::where('uuid', $identifier)->first();

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'Fee record not found.',
            ], 404);
        }

        if ($fee->amount_paid > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete a fee record that has payments credited against it. Please reverse or reconcile the payments first.',
            ], 422);
        }

        $feeNumber = $fee->fee_number;
        $fee->delete();

        return response()->json([
            'success' => true,
            'message' => "Fee record {$feeNumber} deleted successfully.",
        ]);
    }
}
