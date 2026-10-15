<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavingsAccountResource extends JsonResource
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
            'account_number' => $this->account_number,
            'account_type' => $this->account_type,
            'scheme_name' => $this->scheme_name,
            'target_amount' => (float) $this->target_amount,
            'current_balance' => (float) $this->current_balance,
            'remaining_amount' => (float) $this->remaining_amount,
            'progress_percentage' => (float) $this->progress_percentage,
            'currency' => $this->currency,
            'status' => $this->status,
            'opened_date' => $this->opened_date?->format('Y-m-d'),
            'target_date' => $this->target_date?->format('Y-m-d'),
            'closed_date' => $this->closed_date?->format('Y-m-d'),
            'notes' => $this->notes,

            // Computed helpers
            'is_active' => $this->is_active,
            'is_completed' => $this->is_completed,
            'is_suspended' => $this->is_suspended,
            'is_closed' => $this->is_closed,

            // Relations
            'client' => $this->whenLoaded('client', function () {
                return [
                    'id' => $this->client->id,
                    'uuid' => $this->client->uuid,
                    'name' => trim(($this->client->first_name ?? '') . ' ' . ($this->client->last_name ?? '')),
                    'first_name' => $this->client->first_name,
                    'last_name' => $this->client->last_name,
                    'client_number' => $this->client->client_number,
                    'phone' => $this->client->phone ?? $this->client->phone_number,
                    'email' => $this->client->email,
                ];
            }),

            'plot' => $this->whenLoaded('plot', function () {
                return [
                    'id' => $this->plot->id,
                    'uuid' => $this->plot->uuid,
                    'unit_number' => $this->plot->unit_number,
                    'block_number' => $this->plot->block_number,
                    'floor_number' => $this->plot->floor_number,
                    'unit_type' => $this->plot->unit_type,
                    'current_price' => (float) $this->plot->current_price,
                    'status' => $this->plot->status,
                ];
            }),

            'project' => $this->whenLoaded('project', function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ];
            }),

            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'uuid' => $this->createdBy->uuid,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ];
            }),

            'updated_by' => $this->whenLoaded('updatedBy', function () {
                return [
                    'id' => $this->updatedBy->id,
                    'uuid' => $this->updatedBy->uuid,
                    'name' => $this->updatedBy->name,
                    'email' => $this->updatedBy->email,
                ];
            }),

            'payments_count' => $this->whenCounted('payments'),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
