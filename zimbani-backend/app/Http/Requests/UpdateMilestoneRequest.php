<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'milestone_name' => 'sometimes|required|string|max:255',
            'milestone_order' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:5000',
            'planned_start_date' => 'nullable|date',
            'planned_end_date' => 'nullable|date|after_or_equal:planned_start_date',
            'actual_start_date' => 'nullable|date',
            'actual_end_date' => 'nullable|date|after_or_equal:actual_start_date',
            'estimated_cost' => 'nullable|numeric|min:0|max:999999999999.99',
            'actual_cost' => 'nullable|numeric|min:0|max:999999999999.99',
            'currency' => 'nullable|string|size:3',
            'status' => 'nullable|in:pending,in_progress,completed,skipped',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'completed_at' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
            'completion_notes' => 'nullable|string|max:5000',
            'metadata' => 'nullable|array',
            'photos' => 'nullable|array',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Support API-SPECIFICATION.md Section 9.3 aliases: progress -> completion_percentage, completedDate -> completed_at
        if ($this->has('progress') && !$this->has('completion_percentage')) {
            $this->merge(['completion_percentage' => $this->progress]);
        }

        if ($this->has('completedDate') && !$this->has('completed_at')) {
            $this->merge(['completed_at' => $this->completedDate]);
        }
    }
}
