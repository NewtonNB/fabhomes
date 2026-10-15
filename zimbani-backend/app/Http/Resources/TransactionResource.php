<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'transaction_number' => $this->transaction_number,
            'account_id' => $this->account_id,
            'client_id' => $this->client_id,
            'payment_id' => $this->payment_id,
            'related_transaction_id' => $this->related_transaction_id,
            'transaction_type' => $this->transaction_type,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'balance_before' => (float) $this->balance_before,
            'balance_after' => (float) $this->balance_after,
            'description' => $this->description,
            'narration' => $this->narration,
            'reference_number' => $this->reference_number,
            'transaction_date' => $this->transaction_date?->toISOString(),
            'value_date' => $this->value_date?->format('Y-m-d'),
            'status' => $this->status,
            'is_credit' => (bool) $this->is_credit,
            'is_debit' => (bool) $this->is_debit,
            'is_reversed' => (bool) $this->is_reversed,
            'reversed_at' => $this->reversed_at?->toISOString(),
            'reversal_reason' => $this->reversal_reason,

            // Relations
            'client' => $this->whenLoaded('client', function () {
                return [
                    'id' => $this->client->id,
                    'uuid' => $this->client->uuid,
                    'full_name' => $this->client->full_name,
                    'client_number' => $this->client->client_number,
                    'phone_primary' => $this->client->phone_primary,
                ];
            }),

            'savings_account' => $this->whenLoaded('savingsAccount', function () {
                return [
                    'id' => $this->savingsAccount->id,
                    'uuid' => $this->savingsAccount->uuid,
                    'account_number' => $this->savingsAccount->account_number,
                    'scheme_name' => $this->savingsAccount->scheme_name,
                    'account_type' => $this->savingsAccount->account_type,
                    'current_balance' => (float) $this->savingsAccount->current_balance,
                    'target_amount' => (float) $this->savingsAccount->target_amount,
                    'status' => $this->savingsAccount->status,
                ];
            }),

            'payment' => $this->whenLoaded('payment', function () {
                return [
                    'id' => $this->payment->id,
                    'uuid' => $this->payment->uuid,
                    'payment_number' => $this->payment->payment_number,
                    'payment_type' => $this->payment->payment_type,
                    'payment_method' => $this->payment->payment_method,
                    'status' => $this->payment->status,
                    'total_amount' => (float) $this->payment->total_amount,
                ];
            }),

            'related_transaction' => $this->whenLoaded('relatedTransaction', function () {
                return [
                    'id' => $this->relatedTransaction->id,
                    'uuid' => $this->relatedTransaction->uuid,
                    'transaction_number' => $this->relatedTransaction->transaction_number,
                    'transaction_type' => $this->relatedTransaction->transaction_type,
                    'amount' => (float) $this->relatedTransaction->amount,
                    'status' => $this->relatedTransaction->status,
                ];
            }),

            'reversals' => TransactionResource::collection($this->whenLoaded('reversals')),

            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ];
            }),

            'reversed_by' => $this->whenLoaded('reversedBy', function () {
                return [
                    'id' => $this->reversedBy->id,
                    'name' => $this->reversedBy->name,
                    'email' => $this->reversedBy->email,
                ];
            }),

            'documents' => $this->whenLoaded('documents'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
