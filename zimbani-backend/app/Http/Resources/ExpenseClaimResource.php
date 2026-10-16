<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseClaimResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'claim_number' => $this->claim_number,
            'title' => $this->title,
            'claim_type' => $this->claim_type,
            'expense_category' => $this->expense_category,
            'expense_date' => $this->expense_date?->format('Y-m-d'),
            'total_amount' => (float) $this->total_amount,
            'currency' => $this->currency,
            'payment_method' => $this->payment_method,
            'vendor_name' => $this->vendor_name,
            'vendor_tin' => $this->vendor_tin,
            'receipt_number' => $this->receipt_number,
            'description' => $this->description,
            'status' => $this->status,

            // Multi-tier Sign-off Audit Details
            'site_manager_id' => $this->site_manager_id,
            'site_manager_signed_at' => $this->site_manager_signed_at?->toISOString(),
            'site_manager_notes' => $this->site_manager_notes,

            'finance_officer_id' => $this->finance_officer_id,
            'finance_officer_approved_at' => $this->finance_officer_approved_at?->toISOString(),
            'finance_officer_notes' => $this->finance_officer_notes,

            'admin_id' => $this->admin_id,
            'admin_authorized_at' => $this->admin_authorized_at?->toISOString(),
            'admin_notes' => $this->admin_notes,

            'paid_by' => $this->paid_by,
            'paid_at' => $this->paid_at?->toISOString(),
            'payment_reference' => $this->payment_reference,
            'rejection_reason' => $this->rejection_reason,

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Relationships
            'claimant' => $this->whenLoaded('claimant', function () {
                return [
                    'id' => $this->claimant->id,
                    'uuid' => $this->claimant->uuid,
                    'name' => $this->claimant->name,
                    'email' => $this->claimant->email,
                ];
            }),
            'petty_cash_account' => $this->whenLoaded('pettyCashAccount', function () {
                return [
                    'id' => $this->pettyCashAccount->id,
                    'uuid' => $this->pettyCashAccount->uuid,
                    'account_number' => $this->pettyCashAccount->account_number,
                    'name' => $this->pettyCashAccount->name,
                    'current_balance' => (float) $this->pettyCashAccount->current_balance,
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
            'site' => $this->whenLoaded('site', function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                    'code' => $this->site->code,
                ];
            }),
            'site_manager' => $this->whenLoaded('siteManager', function () {
                return [
                    'id' => $this->siteManager->id,
                    'name' => $this->siteManager->name,
                ];
            }),
            'finance_officer' => $this->whenLoaded('financeOfficer', function () {
                return [
                    'id' => $this->financeOfficer->id,
                    'name' => $this->financeOfficer->name,
                ];
            }),
            'admin' => $this->whenLoaded('admin', function () {
                return [
                    'id' => $this->admin->id,
                    'name' => $this->admin->name,
                ];
            }),
            'paid_by_user' => $this->whenLoaded('paidBy', function () {
                return [
                    'id' => $this->paidBy->id,
                    'name' => $this->paidBy->name,
                ];
            }),
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'uuid' => $item->uuid,
                        'item_description' => $item->item_description,
                        'expense_category' => $item->expense_category,
                        'quantity' => (float) $item->quantity,
                        'unit_of_measure' => $item->unit_of_measure,
                        'unit_price' => (float) $item->unit_price,
                        'total_price' => (float) $item->total_price,
                        'receipt_reference' => $item->receipt_reference,
                    ];
                });
            }),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
        ];
    }
}
