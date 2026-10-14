<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'task_number' => $this->task_number,
            'title' => $this->title,
            'description' => $this->description,
            
            // Priority & Status
            'priority' => $this->priority,
            'status' => $this->status,
            'completion_percentage' => (float) $this->completion_percentage,
            
            // Timeline
            'start_date' => $this->start_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'is_overdue' => $this->due_date && $this->status !== 'completed' && now()->startOfDay()->gt($this->due_date),
            
            // Hours
            'estimated_hours' => $this->estimated_hours ? (float) $this->estimated_hours : null,
            'actual_hours' => $this->actual_hours ? (float) $this->actual_hours : null,
            
            // Relationships
            'project' => $this->when($this->relationLoaded('project'), function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ];
            }),
            
            'site' => $this->when($this->relationLoaded('site') && $this->site, function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                    'code' => $this->site->code,
                ];
            }),
            
            'unit' => $this->when($this->relationLoaded('unit') && $this->unit, function () {
                return [
                    'id' => $this->unit->id,
                    'uuid' => $this->unit->uuid,
                    'unit_number' => $this->unit->unit_number,
                ];
            }),
            
            'milestone' => $this->when($this->relationLoaded('milestone') && $this->milestone, function () {
                return [
                    'id' => $this->milestone->id,
                    'uuid' => $this->milestone->uuid,
                    'milestone_name' => $this->milestone->milestone_name,
                    'milestone_order' => $this->milestone->milestone_order,
                    'status' => $this->milestone->status,
                ];
            }),
            
            'assigned_user' => $this->when($this->relationLoaded('assignedUser') && $this->assignedUser, function () {
                return [
                    'id' => $this->assignedUser->id,
                    'uuid' => $this->assignedUser->uuid,
                    'name' => $this->assignedUser->name,
                    'email' => $this->assignedUser->email,
                ];
            }),
            
            'created_by_user' => $this->when($this->relationLoaded('createdByUser') && $this->createdByUser, function () {
                return [
                    'id' => $this->createdByUser->id,
                    'uuid' => $this->createdByUser->uuid,
                    'name' => $this->createdByUser->name,
                ];
            }),
            
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            
            // Notes & Metadata
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
