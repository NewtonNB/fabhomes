<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MilestoneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'project_id' => $this->project_id,
            'milestone_name' => $this->milestone_name,
            'name' => $this->milestone_name, // Alias for API-SPECIFICATION Section 9
            'milestone_order' => $this->milestone_order,
            'description' => $this->description,
            
            // Dates
            'planned_start_date' => $this->planned_start_date?->toDateString(),
            'planned_end_date' => $this->planned_end_date?->toDateString(),
            'actual_start_date' => $this->actual_start_date?->toDateString(),
            'actual_end_date' => $this->actual_end_date?->toDateString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'completed_date' => $this->completed_at?->toDateString(),
            
            // Financials
            'estimated_cost' => $this->estimated_cost ? (float) $this->estimated_cost : null,
            'actual_cost' => $this->actual_cost ? (float) $this->actual_cost : null,
            'cost_variance' => ($this->estimated_cost && $this->actual_cost) 
                ? (float) ($this->estimated_cost - $this->actual_cost) 
                : null,
            'currency' => $this->currency ?? 'UGX',
            
            // Progress & Status
            'status' => $this->status,
            'completion_percentage' => (float) $this->completion_percentage,
            'progress' => (float) $this->completion_percentage, // Alias for API-SPECIFICATION Section 9
            
            // Relationships
            'project' => $this->when($this->relationLoaded('project'), function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ];
            }),
            
            'completed_by' => $this->when($this->relationLoaded('completedByUser') && $this->completedByUser, function () {
                return [
                    'id' => $this->completedByUser->id,
                    'uuid' => $this->completedByUser->uuid,
                    'name' => $this->completedByUser->name,
                    'email' => $this->completedByUser->email,
                ];
            }),
            
            'tasks_count' => $this->when(isset($this->tasks_count), $this->tasks_count),
            'tasks' => TaskResource::collection($this->whenLoaded('tasks')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            
            // Notes & Metadata
            'notes' => $this->notes,
            'completion_notes' => $this->completion_notes,
            'metadata' => $this->metadata,
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
