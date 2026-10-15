<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SafetyIncidentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOpen = in_array($this->status, ['reported', 'investigating', 'action_required']);

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'incident_number' => $this->incident_number,
            'incident_type' => $this->incident_type,
            'severity' => $this->severity,
            'status' => $this->status,
            'incident_date' => $this->incident_date?->toDateString(),
            'incident_time' => $this->incident_time,
            'location_details' => $this->location_details,
            'title' => $this->title,
            'description' => $this->description,
            'immediate_actions_taken' => $this->immediate_actions_taken,
            'root_cause_analysis' => $this->root_cause_analysis,
            'preventative_measures' => $this->preventative_measures,
            'injured_person_name' => $this->injured_person_name,
            'injured_person_type' => $this->injured_person_type,
            'investigated_at' => $this->investigated_at?->toISOString(),
            'closed_at' => $this->closed_at?->toISOString(),

            // Computed helpers
            'is_open' => $isOpen,
            'is_closed' => $this->status === 'closed',
            'is_critical' => $this->severity === 'critical',
            'is_lost_time' => $this->incident_type === 'lost_time_injury',

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

            'site_daily_log' => $this->when($this->relationLoaded('siteDailyLog') && $this->siteDailyLog, function () {
                return [
                    'id' => $this->siteDailyLog->id,
                    'uuid' => $this->siteDailyLog->uuid,
                    'log_number' => $this->siteDailyLog->log_number,
                    'log_date' => $this->siteDailyLog->log_date?->toDateString(),
                ];
            }),

            'reported_by' => $this->when($this->relationLoaded('reportedByUser') && $this->reportedByUser, function () {
                return [
                    'id' => $this->reportedByUser->id,
                    'uuid' => $this->reportedByUser->uuid,
                    'name' => $this->reportedByUser->name,
                    'email' => $this->reportedByUser->email,
                ];
            }),

            'investigated_by' => $this->when($this->relationLoaded('investigatedByUser') && $this->investigatedByUser, function () {
                return [
                    'id' => $this->investigatedByUser->id,
                    'uuid' => $this->investigatedByUser->uuid,
                    'name' => $this->investigatedByUser->name,
                    'email' => $this->investigatedByUser->email,
                ];
            }),

            'closed_by' => $this->when($this->relationLoaded('closedByUser') && $this->closedByUser, function () {
                return [
                    'id' => $this->closedByUser->id,
                    'uuid' => $this->closedByUser->uuid,
                    'name' => $this->closedByUser->name,
                ];
            }),

            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
