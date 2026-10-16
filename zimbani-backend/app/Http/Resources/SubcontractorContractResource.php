<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubcontractorContractResource extends JsonResource
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
            'contract_number' => $this->contract_number,
            'title' => $this->title,
            'subcontractor_name' => $this->subcontractor_name,
            'subcontractor_contact_person' => $this->subcontractor_contact_person,
            'subcontractor_phone' => $this->subcontractor_phone,
            'subcontractor_email' => $this->subcontractor_email,
            'tax_identification_number' => $this->tax_identification_number,
            'project_id' => $this->project_id,
            'site_id' => $this->site_id,
            'trade_category' => $this->trade_category,
            'scope_of_work' => $this->scope_of_work,
            'contract_sum' => (float) $this->contract_sum,
            'currency' => $this->currency,
            'retention_percentage' => (float) $this->retention_percentage,
            'retention_amount' => (float) $this->retention_amount,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'expected_completion_date' => $this->expected_completion_date?->format('Y-m-d'),
            'actual_completion_date' => $this->actual_completion_date?->format('Y-m-d'),
            'payment_terms' => $this->payment_terms,
            'status' => $this->status,
            'signed_at' => $this->signed_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'notes' => $this->notes,

            // Financial Progress Metrics
            'total_certified_gross' => (float) $this->total_certified_gross,
            'total_retention_held' => (float) $this->total_retention_held,
            'total_net_payable' => (float) $this->total_net_payable,
            'total_paid' => (float) $this->total_paid,
            'remaining_balance' => (float) $this->remaining_balance,
            'percentage_completed' => (float) $this->percentage_completed,

            // Relations
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

            'signed_by' => $this->whenLoaded('signedBy', function () {
                return [
                    'id' => $this->signedBy->id,
                    'name' => $this->signedBy->name,
                ];
            }),

            'approved_by' => $this->whenLoaded('approvedBy', function () {
                return [
                    'id' => $this->approvedBy->id,
                    'name' => $this->approvedBy->name,
                ];
            }),

            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ];
            }),

            'payment_certificates' => PaymentCertificateResource::collection($this->whenLoaded('paymentCertificates')),
            'documents' => $this->whenLoaded('documents'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
