<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PettyCashAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'account_number' => $this->account_number,
            'name' => $this->name,
            'project_id' => $this->project_id,
            'site_id' => $this->site_id,
            'custodian_id' => $this->custodian_id,
            'float_limit' => (float) $this->float_limit,
            'current_balance' => (float) $this->current_balance,
            'currency' => $this->currency,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Relationships
            'project' => $this->whenLoaded('project', function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ];
            }),
            'site' => $this->whenLoaded('site', function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                    'code' => $this->site->code,
                ];
            }),
            'custodian' => $this->whenLoaded('custodian', function () {
                return [
                    'id' => $this->custodian->id,
                    'uuid' => $this->custodian->uuid,
                    'name' => $this->custodian->name,
                    'email' => $this->custodian->email,
                ];
            }),
            'created_by_user' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ];
            }),
            'transactions' => PettyCashTransactionResource::collection($this->whenLoaded('transactions')),
            'expense_claims' => $this->whenLoaded('expenseClaims'),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
        ];
    }
}
