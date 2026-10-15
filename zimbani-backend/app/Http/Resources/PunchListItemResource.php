<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PunchListItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOpen = in_array($this->status, ['open', 'in_progress']);
        $isOverdue = $isOpen && $this->due_date && $this->due_date->isPast();

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'item_number' => $this->item_number,
            'title' => $this->title,
            'description' => $this->description,
            'location_details' => $this->location_details,
            'category' => $this->category,
            'severity' => $this->severity,
            'status' => $this->status,
            'due_date' => $this->due_date?->toDateString(),
            'rectified_at' => $this->rectified_at?->toISOString(),
            'rectification_notes' => $this->rectification_notes,
            'subcontractor_name' => $this->subcontractor_name,
            'verified_at' => $this->verified_at?->toISOString(),
            'verification_notes' => $this->verification_notes,

            // Computed helpers
            'is_open' => $isOpen,
            'is_rectified' => $this->status === 'rectified',
            'is_closed' => $this->status === 'verified_closed',
            'is_waived' => $this->status === 'waived',
            'is_critical' => $this->severity === 'critical',
            'is_overdue' => $isOverdue,

            // Relationships
            'site_inspection' => $this->when($this->relationLoaded('siteInspection') && $this->siteInspection, function () {
                return [
                    'id' => $this->siteInspection->id,
                    'uuid' => $this->siteInspection->uuid,
                    'inspection_number' => $this->siteInspection->inspection_number,
                    'title' => $this->siteInspection->title,
                    'inspection_type' => $this->siteInspection->inspection_type,
                    'status' => $this->siteInspection->status,
                ];
            }),

            'site' => $this->when($this->relationLoaded('site') && $this->site, function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                    'code' => $this->site->code ?? $this->site->site_code,
                ];
            }),

            'project' => $this->when($this->relationLoaded('project') && $this->project, function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ];
            }),

            'unit' => $this->when($this->relationLoaded('unit') && $this->unit, function () {
                return [
                    'id' => $this->unit->id,
                    'uuid' => $this->unit->uuid,
                    'unit_number' => $this->unit->unit_number,
                ];
            }),

            'task' => $this->when($this->relationLoaded('task') && $this->task, function () {
                return [
                    'id' => $this->task->id,
                    'uuid' => $this->task->uuid,
                    'task_number' => $this->task->task_number,
                    'title' => $this->task->title,
                ];
            }),

            'assigned_to' => $this->when($this->relationLoaded('assignedUser') && $this->assignedUser, function () {
                return [
                    'id' => $this->assignedUser->id,
                    'uuid' => $this->assignedUser->uuid,
                    'name' => $this->assignedUser->name,
                    'email' => $this->assignedUser->email,
                ];
            }),

            'reported_by' => $this->when($this->relationLoaded('reportedByUser') && $this->reportedByUser, function () {
                return [
                    'id' => $this->reportedByUser->id,
                    'uuid' => $this->reportedByUser->uuid,
                    'name' => $this->reportedByUser->name,
                ];
            }),

            'verified_by' => $this->when($this->relationLoaded('verifiedByUser') && $this->verifiedByUser, function () {
                return [
                    'id' => $this->verifiedByUser->id,
                    'uuid' => $this->verifiedByUser->uuid,
                    'name' => $this->verifiedByUser->name,
                ];
            }),

            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
