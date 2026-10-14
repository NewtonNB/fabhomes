<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
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
            'document_number' => $this->document_number,
            'title' => $this->title,
            'description' => $this->description,
            'document_type' => $this->document_type,
            'file_name' => $this->file_name,
            'file_url' => $this->file_url,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'formatted_file_size' => $this->formatted_file_size,
            'file_extension' => $this->file_extension,
            
            // Documentable entity summary
            'documentable_type' => class_basename($this->documentable_type ?? ''),
            'documentable_uuid' => $this->documentable?->uuid,
            'documentable_name' => $this->documentable?->name ?? $this->documentable?->title ?? $this->documentable?->full_name ?? $this->documentable?->payment_number,
            
            // User & status
            'uploaded_by' => $this->uploadedBy ? [
                'id' => $this->uploadedBy->id,
                'name' => $this->uploadedBy->name,
                'email' => $this->uploadedBy->email,
            ] : null,
            'status' => $this->status,
            'expiry_date' => $this->expiry_date?->format('Y-m-d'),
            'is_verified' => (bool) $this->is_verified,
            'verified_by' => $this->verifiedBy ? [
                'id' => $this->verifiedBy->id,
                'name' => $this->verifiedBy->name,
            ] : null,
            'verified_at' => $this->verified_at?->toIso8601String(),
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
