<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SiteResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            // Identifiers
            'uuid' => $this->uuid,
            'code' => $this->code,
            
            // Basic Information
            'name' => $this->name,
            'description' => $this->description,
            
            // Site Classification
            'site_type' => $this->site_type,
            'status' => $this->status,
            'is_active' => $this->isActive(),
            'is_overdue' => $this->isOverdue(),
            'needs_inspection' => $this->needsInspection(),
            
            // Timeline
            'start_date' => $this->start_date?->format('Y-m-d'),
            'expected_completion_date' => $this->expected_completion_date?->format('Y-m-d'),
            'actual_completion_date' => $this->actual_completion_date?->format('Y-m-d'),
            'days_until_completion' => $this->getDaysUntilCompletion(),
            'progress_percentage' => $this->getProgressPercentage(),
            
            // Location Details
            'address' => $this->address,
            'city' => $this->city,
            'region' => $this->region,
            'country' => $this->country,
            'full_address' => $this->full_address,
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,
            
            // Boundaries and Area
            'boundaries' => $this->boundaries,
            'total_area' => $this->total_area ? (float) $this->total_area : null,
            'buildable_area' => $this->buildable_area ? (float) $this->buildable_area : null,
            'area_utilization' => $this->getAreaUtilization(),
            
            // Site Resources
            'total_workers' => $this->total_workers,
            'total_equipment' => $this->total_equipment,
            'total_units' => $this->total_units,
            
            // Financial Information (only if user has permission)
            $this->mergeWhen($request->user()?->can('viewFinancials', $this->resource), [
                'allocated_budget' => $this->allocated_budget ? (float) $this->allocated_budget : null,
                'actual_spent' => $this->actual_spent ? (float) $this->actual_spent : null,
                'currency' => $this->currency,
                'remaining_budget' => $this->getRemainingBudget(),
                'budget_utilization' => $this->getBudgetUtilization(),
                'is_over_budget' => $this->isOverBudget(),
            ]),
            
            // Utilities & Facilities
            'utilities' => $this->utilities,
            'facilities' => $this->facilities,
            
            // Safety & Compliance
            'safety_measures' => $this->safety_measures,
            'last_inspection_date' => $this->last_inspection_date?->format('Y-m-d'),
            'next_inspection_date' => $this->next_inspection_date?->format('Y-m-d'),
            
            // Contact Information
            'contact_person' => $this->contact_person,
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            
            // Additional Information
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            
            // Relationships
            'project' => $this->when($this->relationLoaded('project'), function () {
                return [
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                    'status' => $this->project->status,
                    'company' => [
                        'uuid' => $this->project->company->uuid,
                        'name' => $this->project->company->name,
                    ],
                ];
            }),
            
            'supervisor' => $this->when($this->relationLoaded('supervisor') && $this->supervisor, function () {
                return [
                    'uuid' => $this->supervisor->uuid,
                    'name' => $this->supervisor->name,
                    'email' => $this->supervisor->email,
                    'phone' => $this->supervisor->phone,
                ];
            }),
            
            'workers' => $this->when($this->relationLoaded('workers'), function () {
                return $this->workers->map(function ($worker) {
                    return [
                        'uuid' => $worker->uuid,
                        'name' => $worker->name,
                        'email' => $worker->email,
                        'role' => $worker->pivot->role ?? null,
                        'assigned_date' => $worker->pivot->assigned_date ?? null,
                        'status' => $worker->pivot->status ?? null,
                    ];
                });
            }),
            
            'workers_count' => $this->when($this->workers_count !== null, $this->workers_count),
            
            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
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
            'success' => true,
        ];
    }
}
