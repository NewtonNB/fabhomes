<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
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
            
            // Project Classification
            'project_type' => $this->project_type,
            'status' => $this->status,
            'is_active' => $this->isActive(),
            'is_completed' => $this->isCompleted(),
            'is_overdue' => $this->isOverdue(),
            
            // Timeline
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'actual_completion_date' => $this->actual_completion_date?->format('Y-m-d'),
            'duration_days' => $this->getDurationInDays(),
            'progress_percentage' => $this->getProgressPercentage(),
            
            // Financial Information (only if user has permission)
            $this->mergeWhen($request->user()?->can('viewFinancials', $this->resource), [
                'budget' => $this->budget ? (float) $this->budget : null,
                'currency' => $this->currency,
                'total_spent' => $this->total_spent ? (float) $this->total_spent : null,
                'remaining_budget' => $this->budget ? $this->getRemainingBudget() : null,
                'budget_utilization' => $this->budget ? $this->getBudgetUtilization() : null,
            ]),
            
            // Location
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country,
            'postal_code' => $this->postal_code,
            'full_address' => $this->full_address,
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,
            
            // Contact Information
            'contact_person' => $this->contact_person,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            
            // Project Details
            'total_units' => $this->total_units,
            'total_area' => $this->total_area ? (float) $this->total_area : null,
            'area_unit' => $this->area_unit,
            
            // Metadata
            'metadata' => $this->metadata,
            
            // Relationships
            'company' => $this->when($this->relationLoaded('company'), function () {
                return [
                    'uuid' => $this->company->uuid,
                    'name' => $this->company->name,
                    'company_type' => $this->company->company_type,
                ];
            }),
            
            'sites' => $this->when($this->relationLoaded('sites'), function () {
                return $this->sites->map(function ($site) {
                    return [
                        'uuid' => $site->uuid,
                        'name' => $site->name,
                        'code' => $site->code,
                        'status' => $site->status,
                    ];
                });
            }),
            
            'sites_count' => $this->when($this->sites_count !== null, $this->sites_count),
            'users_count' => $this->when($this->users_count !== null, $this->users_count),
            
            'users' => $this->when($this->relationLoaded('users'), function () {
                return $this->users->map(function ($user) {
                    return [
                        'uuid' => $user->uuid,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->pivot->role ?? null,
                        'assigned_at' => $user->pivot->assigned_at ?? null,
                    ];
                });
            }),
            
            // Computed Properties
            'has_sites' => $this->hasSites(),
            
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
