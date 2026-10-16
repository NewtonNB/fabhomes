<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentCertificateResource extends JsonResource
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
            'certificate_number' => $this->certificate_number,
            'contract_id' => $this->contract_id,
            'project_id' => $this->project_id,
            'site_id' => $this->site_id,
            'valuation_period_start' => $this->valuation_period_start?->format('Y-m-d'),
            'valuation_period_end' => $this->valuation_period_end?->format('Y-m-d'),
            'valuation_date' => $this->valuation_date?->format('Y-m-d'),
            'certificate_type' => $this->certificate_type,
            'gross_amount' => (float) $this->gross_amount,
            'previous_gross_amount' => (float) $this->previous_gross_amount,
            'current_gross_amount' => (float) $this->current_gross_amount,
            'materials_on_site_value' => (float) $this->materials_on_site_value,
            'retention_rate' => (float) $this->retention_rate,
            'retention_deducted' => (float) $this->retention_deducted,
            'withholding_tax_rate' => (float) $this->withholding_tax_rate,
            'withholding_tax_amount' => (float) $this->withholding_tax_amount,
            'other_deductions' => (float) $this->other_deductions,
            'net_certified_amount' => (float) $this->net_certified_amount,
            'currency' => $this->currency,
            'description' => $this->description,
            'measurement_sheet_summary' => $this->measurement_sheet_summary,
            'status' => $this->status,

            // Workflow metadata
            'site_manager' => $this->whenLoaded('siteManager', function () {
                return [
                    'id' => $this->siteManager->id,
                    'name' => $this->siteManager->name,
                ];
            }),
            'site_manager_signed_at' => $this->site_manager_signed_at?->toISOString(),
            'site_manager_notes' => $this->site_manager_notes,

            'finance_officer' => $this->whenLoaded('financeOfficer', function () {
                return [
                    'id' => $this->financeOfficer->id,
                    'name' => $this->financeOfficer->name,
                ];
            }),
            'finance_officer_approved_at' => $this->finance_officer_approved_at?->toISOString(),
            'finance_officer_notes' => $this->finance_officer_notes,

            'admin' => $this->whenLoaded('admin', function () {
                return [
                    'id' => $this->admin->id,
                    'name' => $this->admin->name,
                ];
            }),
            'admin_authorized_at' => $this->admin_authorized_at?->toISOString(),
            'admin_notes' => $this->admin_notes,

            'paid_by' => $this->whenLoaded('paidBy', function () {
                return [
                    'id' => $this->paidBy->id,
                    'name' => $this->paidBy->name,
                ];
            }),
            'paid_at' => $this->paid_at?->toISOString(),
            'payment_reference' => $this->payment_reference,
            'rejection_reason' => $this->rejection_reason,

            // Relations
            'contract' => $this->whenLoaded('contract', function () {
                return [
                    'id' => $this->contract->id,
                    'uuid' => $this->contract->uuid,
                    'contract_number' => $this->contract->contract_number,
                    'title' => $this->contract->title,
                    'subcontractor_name' => $this->contract->subcontractor_name,
                    'trade_category' => $this->contract->trade_category,
                    'contract_sum' => (float) $this->contract->contract_sum,
                    'retention_percentage' => (float) $this->contract->retention_percentage,
                ];
            }),

            'project' => $this->whenLoaded('project', function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                ];
            }),

            'site' => $this->whenLoaded('site', function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                ];
            }),

            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ];
            }),

            'documents' => $this->whenLoaded('documents'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
