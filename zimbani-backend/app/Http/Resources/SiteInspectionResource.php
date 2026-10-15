<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SiteInspectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOverdue = $this->scheduled_date &&
            $this->scheduled_date->isPast() &&
            in_array($this->status, ['scheduled', 'in_progress']);

        $openDefectsCount = $this->whenLoaded('punchListItems', function () {
            return $this->punchListItems->whereIn('status', ['open', 'in_progress'])->count();
        });

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'inspection_number' => $this->inspection_number,
            'title' => $this->title,
            'inspection_type' => $this->inspection_type,
            'status' => $this->status,
            'score' => $this->score !== null ? (float) $this->score : null,
            'checklist_items' => $this->checklist_items ?? [],
            'summary_notes' => $this->summary_notes,
            'conditions' => $this->conditions,
            'scheduled_date' => $this->scheduled_date?->toDateString(),
            'inspected_at' => $this->inspected_at?->toISOString(),
            'signed_off_at' => $this->signed_off_at?->toISOString(),
            'sign_off_notes' => $this->sign_off_notes,

            // Computed helpers
            'is_passed' => $this->status === 'passed',
            'is_failed' => $this->status === 'failed',
            'is_signed_off' => !empty($this->signed_off_at),
            'is_overdue' => $isOverdue,
            'defects_count' => $this->punch_list_items_count ?? ($this->relationLoaded('punchListItems') ? $this->punchListItems->count() : 0),
            'open_defects_count' => $openDefectsCount,

            // Relationships
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

            'milestone' => $this->when($this->relationLoaded('milestone') && $this->milestone, function () {
                return [
                    'id' => $this->milestone->id,
                    'uuid' => $this->milestone->uuid,
                    'milestone_name' => $this->milestone->milestone_name,
                    'milestone_order' => $this->milestone->milestone_order,
                ];
            }),

            'inspector' => $this->when($this->relationLoaded('inspector') && $this->inspector, function () {
                return [
                    'id' => $this->inspector->id,
                    'uuid' => $this->inspector->uuid,
                    'name' => $this->inspector->name,
                    'email' => $this->inspector->email,
                ];
            }),

            'supervisor' => $this->when($this->relationLoaded('supervisor') && $this->supervisor, function () {
                return [
                    'id' => $this->supervisor->id,
                    'uuid' => $this->supervisor->uuid,
                    'name' => $this->supervisor->name,
                    'email' => $this->supervisor->email,
                ];
            }),

            'created_by' => $this->when($this->relationLoaded('createdByUser') && $this->createdByUser, function () {
                return [
                    'id' => $this->createdByUser->id,
                    'uuid' => $this->createdByUser->uuid,
                    'name' => $this->createdByUser->name,
                ];
            }),

            'punch_list_items' => PunchListItemResource::collection($this->whenLoaded('punchListItems')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
