<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'unit_number' => $this->unit_number,
            'name' => $this->name,
            'unit_type' => $this->unit_type,
            'status' => $this->status,
            
            // Location Information
            'floor_number' => $this->floor_number,
            'block_number' => $this->block_number,
            'location_description' => $this->location_description,
            'facing_direction' => $this->facing_direction,
            'view_description' => $this->view_description,
            
            // Physical Specifications
            'area' => $this->area,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'has_balcony' => $this->has_balcony,
            'has_parking' => $this->has_parking,
            'parking_slots' => $this->parking_slots,
            
            // Pricing Information (conditionally shown based on permissions)
            'base_price' => $this->when(
                $request->user()?->can('viewPricing', $this->resource),
                $this->base_price
            ),
            'current_price' => $this->when(
                $request->user()?->can('viewPricing', $this->resource),
                $this->current_price
            ),
            'discount' => $this->when(
                $request->user()?->can('viewPricing', $this->resource),
                $this->discount
            ),
            'final_price' => $this->when(
                $request->user()?->can('viewPricing', $this->resource),
                $this->getFinalPrice()
            ),
            'price_per_sqm' => $this->when(
                $request->user()?->can('viewPricing', $this->resource),
                $this->getPricePerSqm()
            ),
            'currency' => $this->currency,
            'price_type' => $this->price_type,
            
            // Payment Information (conditionally shown)
            'amount_paid' => $this->when(
                $request->user()?->can('viewPayments', $this->resource),
                $this->amount_paid
            ),
            'balance' => $this->when(
                $request->user()?->can('viewPayments', $this->resource),
                $this->balance
            ),
            'payment_progress' => $this->when(
                $request->user()?->can('viewPayments', $this->resource),
                $this->getPaymentProgress()
            ),
            'is_fully_paid' => $this->when(
                $request->user()?->can('viewPayments', $this->resource),
                $this->isFullyPaid()
            ),
            
            // Client Information
            'reserved_date' => $this->reserved_date,
            'sold_date' => $this->sold_date,
            'handover_date' => $this->handover_date,
            
            // Construction Information
            'construction_start_date' => $this->construction_start_date,
            'expected_completion_date' => $this->expected_completion_date,
            'actual_completion_date' => $this->actual_completion_date,
            'completion_percentage' => $this->completion_percentage,
            'days_until_completion' => $this->getDaysUntilCompletion(),
            'construction_duration' => $this->getConstructionDuration(),
            'is_overdue' => $this->isOverdue(),
            
            // Quality & Inspection
            'last_inspection_date' => $this->last_inspection_date,
            'next_inspection_date' => $this->next_inspection_date,
            'inspection_notes' => $this->inspection_notes,
            'is_defect_free' => $this->is_defect_free,
            'needs_inspection' => $this->needsInspection(),
            
            // Maintenance
            'maintenance_fee' => $this->maintenance_fee,
            'maintenance_frequency' => $this->maintenance_frequency,
            
            // Features & Specifications
            'features' => $this->features,
            'amenities' => $this->amenities,
            'specifications' => $this->specifications,
            'specs_summary' => $this->getSpecsSummary(),
            
            // Media
            'images' => $this->images,
            'floor_plans' => $this->floor_plans,
            'documents' => $this->documents,
            
            // Additional Information
            'description' => $this->description,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            
            // Helper Properties
            'full_identifier' => $this->getFullIdentifier(),
            'is_available' => $this->isAvailable(),
            'is_sold' => $this->isSold(),
            'is_reserved' => $this->isReserved(),
            'is_completed' => $this->isCompleted(),
            
            // Relationships
            'site' => new SiteResource($this->whenLoaded('site')),
            'project' => new ProjectResource($this->whenLoaded('project')),
            'client' => $this->when(
                $this->relationLoaded('client') && $this->client,
                function () use ($request) {
                    // Only show client details if user has permission
                    if ($request->user()?->can('view', $this->client)) {
                        return new UserResource($this->client);
                    }
                    return [
                        'id' => $this->client->uuid,
                        'name' => $this->client->name,
                    ];
                }
            ),
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'timestamp' => now()->toISOString(),
            ],
        ];
    }
}
