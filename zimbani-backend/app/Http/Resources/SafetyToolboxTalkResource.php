<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SafetyToolboxTalkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'talk_number' => $this->talk_number,
            'topic' => $this->topic,
            'category' => $this->category,
            'conducted_at' => $this->conducted_at?->toDateString(),
            'duration_minutes' => (int) $this->duration_minutes,
            'attendees_count' => (int) $this->attendees_count,
            'attendees_names' => $this->attendees_names ?? [],
            'key_discussion_points' => $this->key_discussion_points,
            'hazards_identified' => $this->hazards_identified,
            'supervisor_notes' => $this->supervisor_notes,

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

            'conducted_by' => $this->when($this->relationLoaded('conductedByUser') && $this->conductedByUser, function () {
                return [
                    'id' => $this->conductedByUser->id,
                    'uuid' => $this->conductedByUser->uuid,
                    'name' => $this->conductedByUser->name,
                    'email' => $this->conductedByUser->email,
                ];
            }),

            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
