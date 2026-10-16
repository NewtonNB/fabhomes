<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PettyCashTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'transaction_number' => $this->transaction_number,
            'petty_cash_account_id' => $this->petty_cash_account_id,
            'transaction_type' => $this->transaction_type,
            'amount' => (float) $this->amount,
            'balance_before' => (float) $this->balance_before,
            'balance_after' => (float) $this->balance_after,
            'currency' => $this->currency,
            'expense_claim_id' => $this->expense_claim_id,
            'reference_number' => $this->reference_number,
            'description' => $this->description,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'created_by_user' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ];
            }),
        ];
    }
}
