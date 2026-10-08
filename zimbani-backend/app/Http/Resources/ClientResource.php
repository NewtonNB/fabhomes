<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'client_number' => $this->client_number,
            'user_id' => $this->user_id,
            
            // Personal Information
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'gender' => $this->gender,
            
            // Contact Information
            'email' => $this->email,
            'phone_primary' => $this->phone_primary,
            'phone_secondary' => $this->phone_secondary,
            'address_line1' => $this->address_line1,
            'address_line2' => $this->address_line2,
            'city' => $this->city,
            'district' => $this->district,
            'country' => $this->country,
            'postal_code' => $this->postal_code,
            'full_address' => $this->full_address,
            
            // Identification
            'id_type' => $this->id_type,
            'id_number' => $this->id_number,
            'id_expiry_date' => $this->id_expiry_date?->format('Y-m-d'),
            
            // Next of Kin
            'nok_name' => $this->nok_name,
            'nok_relationship' => $this->nok_relationship,
            'nok_phone' => $this->nok_phone,
            'nok_address' => $this->nok_address,
            
            // Status
            'status' => $this->status,
            'kyc_status' => $this->kyc_status,
            'kyc_verified_at' => $this->kyc_verified_at?->format('Y-m-d H:i:s'),
            
            // Metadata
            'notes' => $this->notes,
            'tags' => $this->tags,
            
            // Relationships
            'user' => $this->whenLoaded('user', fn() => [
                'uuid' => $this->user->uuid,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            
            'units' => $this->whenLoaded('units'),
            'units_count' => $this->when(isset($this->units_count), $this->units_count),
            
            'kyc_verified_by' => $this->whenLoaded('kycVerifiedBy', fn() => [
                'uuid' => $this->kycVerifiedBy->uuid,
                'name' => $this->kycVerifiedBy->name,
            ]),
            
            // Timestamps
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            'deleted_at' => $this->deleted_at?->format('Y-m-d H:i:s'),
        ];
    }
}
