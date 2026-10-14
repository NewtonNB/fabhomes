<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\Unit;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PaymentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of payments
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Payment::class);

        $query = Payment::with(['unit', 'client', 'processedBy', 'confirmedBy']);

        // Apply filters
        if ($request->filled('unit_id')) {
            $unit = Unit::where('uuid', $request->unit_id)->first();
            if ($unit) {
                $query->where('unit_id', $unit->id);
            }
        }

        if ($request->filled('client_id')) {
            $client = Client::where('uuid', $request->client_id)->first();
            if ($client) {
                $query->where('client_id', $client->id);
            }
        }

        if ($request->filled('payment_type')) {
            $query->where('payment_type', $request->payment_type);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('payment_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('payment_date', '<=', $request->to_date);
        }

        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        if ($request->boolean('pending_only')) {
            $query->pending();
        }

        if ($request->boolean('confirmed_only')) {
            $query->confirmed();
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('payment_number', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('transaction_id', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'payment_date');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $payments = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => PaymentResource::collection($payments),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'from' => $payments->firstItem(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'to' => $payments->lastItem(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Store a newly created payment
     */
    public function store(StorePaymentRequest $request): JsonResponse
    {
        $this->authorize('create', Payment::class);

        $payment = Payment::create([
            ...$request->validated(),
            'processed_by' => auth()->id(),
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment created successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy'])),
        ], 201);
    }

    /**
     * Display the specified payment
     */
    public function show(Payment $payment): JsonResponse
    {
        $this->authorize('view', $payment);

        $payment->load(['unit', 'client', 'processedBy', 'confirmedBy']);

        return response()->json([
            'success' => true,
            'data' => new PaymentResource($payment),
        ]);
    }

    /**
     * Update the specified payment
     */
    public function update(UpdatePaymentRequest $request, Payment $payment): JsonResponse
    {
        $this->authorize('update', $payment);

        $payment->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Payment updated successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy', 'confirmedBy'])),
        ]);
    }

    /**
     * Remove the specified payment
     */
    public function destroy(Payment $payment): JsonResponse
    {
        $this->authorize('delete', $payment);

        // Only allow deletion of pending/rejected payments
        if (!in_array($payment->status, ['pending', 'rejected', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete confirmed or verified payments',
            ], 422);
        }

        $payment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payment deleted successfully',
        ]);
    }

    /**
     * Restore a soft-deleted payment
     */
    public function restore(string $uuid): JsonResponse
    {
        $payment = Payment::withTrashed()->where('uuid', $uuid)->firstOrFail();

        $this->authorize('restore', $payment);

        $payment->restore();

        return response()->json([
            'success' => true,
            'message' => 'Payment restored successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy'])),
        ]);
    }

    /**
     * Confirm a payment
     */
    public function confirm(Payment $payment): JsonResponse
    {
        $this->authorize('confirm', $payment);

        if (!$payment->canBeConfirmed()) {
            return response()->json([
                'success' => false,
                'message' => 'Payment cannot be confirmed in its current status',
            ], 422);
        }

        $payment->confirm(auth()->id());

        return response()->json([
            'success' => true,
            'message' => 'Payment confirmed successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy', 'confirmedBy'])),
        ]);
    }

    /**
     * Verify a payment
     */
    public function verify(Payment $payment): JsonResponse
    {
        $this->authorize('verify', $payment);

        if (!$payment->verify()) {
            return response()->json([
                'success' => false,
                'message' => 'Payment must be confirmed before verification',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment verified successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy', 'confirmedBy'])),
        ]);
    }

    /**
     * Reject a payment
     */
    public function reject(Request $request, Payment $payment): JsonResponse
    {
        $this->authorize('reject', $payment);

        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        if (!$payment->reject()) {
            return response()->json([
                'success' => false,
                'message' => 'Payment cannot be rejected in its current status',
            ], 422);
        }

        // Store rejection reason in notes
        $payment->update([
            'notes' => ($payment->notes ? $payment->notes . "\n\n" : '') 
                . 'Rejection Reason: ' . $request->reason 
                . ' (by ' . auth()->user()->name . ' on ' . now()->toDateTimeString() . ')',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment rejected successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy'])),
        ]);
    }

    /**
     * Refund a payment
     */
    public function refund(Request $request, Payment $payment): JsonResponse
    {
        $this->authorize('refund', $payment);

        $request->validate([
            'refund_reason' => 'required|string|max:1000',
            'refund_amount' => 'nullable|numeric|min:0|max:' . $payment->total_amount,
        ]);

        if (!$payment->refund()) {
            return response()->json([
                'success' => false,
                'message' => 'Payment cannot be refunded in its current status',
            ], 422);
        }

        // Store refund information
        $payment->update([
            'notes' => ($payment->notes ? $payment->notes . "\n\n" : '') 
                . 'Refund Reason: ' . $request->refund_reason 
                . ' (by ' . auth()->user()->name . ' on ' . now()->toDateTimeString() . ')'
                . ($request->refund_amount ? ' - Amount: ' . $request->refund_amount : ''),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment refunded successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy'])),
        ]);
    }

    /**
     * Cancel a payment
     */
    public function cancel(Payment $payment): JsonResponse
    {
        $this->authorize('cancel', $payment);

        if (!$payment->cancel()) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending payments can be cancelled',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment cancelled successfully',
            'data' => new PaymentResource($payment->load(['unit', 'client', 'processedBy'])),
        ]);
    }

    /**
     * Get payment statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Payment::class);

        $query = Payment::query();

        // Date range filter for statistics
        if ($request->filled('from_date')) {
            $query->whereDate('payment_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('payment_date', '<=', $request->to_date);
        }

        $stats = [
            'total_payments' => (clone $query)->count(),
            'pending_payments' => (clone $query)->where('status', 'pending')->count(),
            'confirmed_payments' => (clone $query)->where('status', 'confirmed')->count(),
            'verified_payments' => (clone $query)->where('status', 'verified')->count(),
            'rejected_payments' => (clone $query)->where('status', 'rejected')->count(),
            'refunded_payments' => (clone $query)->where('status', 'refunded')->count(),
            'overdue_payments' => (clone $query)->overdue()->count(),
            
            'by_type' => (clone $query)->select('payment_type', DB::raw('count(*) as count'))
                ->groupBy('payment_type')
                ->pluck('count', 'payment_type'),
            
            'by_method' => (clone $query)->select('payment_method', DB::raw('count(*) as count'))
                ->groupBy('payment_method')
                ->pluck('count', 'payment_method'),
            
            'total_amount' => (clone $query)->where('status', 'verified')->sum('total_amount'),
            'pending_amount' => (clone $query)->where('status', 'pending')->sum('total_amount'),
            'confirmed_amount' => (clone $query)->where('status', 'confirmed')->sum('total_amount'),
            
            'recent_payments' => PaymentResource::collection(
                (clone $query)->with(['unit', 'client', 'processedBy'])
                    ->latest()
                    ->limit(5)
                    ->get()
            ),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
