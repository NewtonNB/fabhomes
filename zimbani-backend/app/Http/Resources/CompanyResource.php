<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'registration_number' => $this->registration_number,
            'tax_number' => $this->tax_number,
            
            // Contact Information
            'email' => $this->email,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            
            // Address Information
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country,
            'postal_code' => $this->postal_code,
            'full_address' => $this->full_address,
            
            // Business Details
            'website' => $this->website,
            'logo_path' => $this->logo_path,
            'company_type' => $this->company_type,
            'established_date' => $this->established_date?->format('Y-m-d'),
            'description' => $this->description,
            
            // Status
            'status' => $this->status,
            'is_active' => $this->isActive(),
            
            // Metadata
            'metadata' => $this->metadata,
            
            // Relationships
            'parent_company' => $this->when(
                $this->relationLoaded('parentCompany'),
                function () {
                    return $this->parentCompany ? [
                        'uuid' => $this->parentCompany->uuid,
                        'name' => $this->parentCompany->name,
                        'company_type' => $this->parentCompany->company_type,
                    ] : null;
                }
            ),
            
            'subsidiaries' => $this->when(
                $this->relationLoaded('subsidiaries'),
                function () {
                    return $this->subsidiaries->map(function ($subsidiary) {
                        return [
                            'uuid' => $subsidiary->uuid,
                            'name' => $subsidiary->name,
                            'company_type' => $subsidiary->company_type,
                            'status' => $subsidiary->status,
                        ];
                    });
                }
            ),
            
            'subsidiaries_count' => $this->when(
                $this->relationLoaded('subsidiaries'),
                $this->subsidiaries->count()
            ),
            
            'users_count' => $this->when(
                isset($this->users_count),
                $this->users_count
            ),
            
            // Computed Properties
            'is_subsidiary' => $this->isSubsidiary(),
            'has_subsidiaries' => $this->when(
                $this->relationLoaded('subsidiaries'),
                $this->hasSubsidiaries()
            ),
            
            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->when(
                $this->deleted_at,
                $this->deleted_at?->toIso8601String()
            ),
        ];
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'success' => true,
        ];
    }
}
