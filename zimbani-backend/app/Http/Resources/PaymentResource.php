<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'payment_number' => $this->payment_number,
            'reference_number' => $this->reference_number,
            
            // Relationships
            'unit' => $this->when($this->relationLoaded('unit'), function () {
                return [
                    'uuid' => $this->unit->uuid,
                    'unit_number' => $this->unit->unit_number,
                    'type' => $this->unit->type,
                ];
            }),
            
            'client' => $this->when($this->relationLoaded('client'), function () {
                return [
                    'uuid' => $this->client->uuid,
                    'client_number' => $this->client->client_number,
                    'full_name' => $this->client->full_name,
                    'email' => $this->client->email,
                    'phone_primary' => $this->client->phone_primary,
                ];
            }),
            
            'processed_by' => $this->when($this->relationLoaded('processedBy') && $this->processedBy, function () {
                return [
                    'id' => $this->processedBy->id,
                    'name' => $this->processedBy->name,
                    'email' => $this->processedBy->email,
                ];
            }),
            
            'confirmed_by' => $this->when($this->relationLoaded('confirmedBy') && $this->confirmedBy, function () {
                return [
                    'id' => $this->confirmedBy->id,
                    'name' => $this->confirmedBy->name,
                    'email' => $this->confirmedBy->email,
                ];
            }),
            
            // Payment classification
            'payment_type' => $this->payment_type,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            
            // Financial information
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'penalty_amount' => (float) $this->penalty_amount,
            'discount_amount' => (float) $this->discount_amount,
            'total_amount' => (float) $this->total_amount,
            
            // Booleans
            'has_penalty' => $this->has_penalty,
            'has_discount' => $this->has_discount,
            'is_confirmed' => $this->isConfirmed(),
            'is_verified' => $this->isVerified(),
            'is_pending' => $this->isPending(),
            'is_overdue' => $this->isOverdue(),
            
            // Dates
            'payment_date' => $this->payment_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'confirmed_at_date' => $this->confirmed_at_date?->toDateString(),
            'days_overdue' => $this->days_overdue,
            
            // Transaction details
            'bank_name' => $this->bank_name,
            'bank_account' => $this->bank_account,
            'transaction_id' => $this->transaction_id,
            'check_number' => $this->check_number,
            'mobile_money_number' => $this->mobile_money_number,
            
            // Additional info
            'notes' => $this->notes,
            'receipt_path' => $this->receipt_path,
            'metadata' => $this->metadata,
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
