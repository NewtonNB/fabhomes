<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SiteDailyLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'log_number' => $this->log_number,
            'log_date' => $this->log_date?->toDateString(),
            'weather_condition' => $this->weather_condition,
            'temperature_celsius' => $this->temperature_celsius !== null ? (float) $this->temperature_celsius : null,
            'work_delayed_by_weather' => (bool) $this->work_delayed_by_weather,
            'delay_hours' => (float) $this->delay_hours,
            'labor_headcount' => (int) $this->labor_headcount,
            'subcontractor_headcount' => (int) $this->subcontractor_headcount,
            'total_headcount' => (int) ($this->labor_headcount + $this->subcontractor_headcount),
            'work_performed_summary' => $this->work_performed_summary,
            'delays_or_impediments' => $this->delays_or_impediments,
            'materials_received_notes' => $this->materials_received_notes,
            'equipment_on_site_notes' => $this->equipment_on_site_notes,
            'visitors_log' => $this->visitors_log,
            'notes' => $this->notes,
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),

            // Computed helpers
            'is_submitted' => $this->status === 'submitted',
            'is_approved' => $this->status === 'approved',
            'is_delayed' => (bool) $this->work_delayed_by_weather,
            'incidents_count' => $this->safety_incidents_count ?? ($this->relationLoaded('safetyIncidents') ? $this->safetyIncidents->count() : 0),
            'toolbox_talks_count' => $this->toolbox_talks_count ?? ($this->relationLoaded('toolboxTalks') ? $this->toolboxTalks->count() : 0),

            // Relations
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

            'supervisor' => $this->when($this->relationLoaded('supervisor') && $this->supervisor, function () {
                return [
                    'id' => $this->supervisor->id,
                    'uuid' => $this->supervisor->uuid,
                    'name' => $this->supervisor->name,
                    'email' => $this->supervisor->email,
                ];
            }),

            'approved_by' => $this->when($this->relationLoaded('approvedByUser') && $this->approvedByUser, function () {
                return [
                    'id' => $this->approvedByUser->id,
                    'uuid' => $this->approvedByUser->uuid,
                    'name' => $this->approvedByUser->name,
                ];
            }),

            'safety_incidents' => SafetyIncidentResource::collection($this->whenLoaded('safetyIncidents')),
            'toolbox_talks' => SafetyToolboxTalkResource::collection($this->whenLoaded('toolboxTalks')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
