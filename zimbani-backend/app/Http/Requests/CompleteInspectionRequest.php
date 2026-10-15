<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:passed,failed,passed_with_conditions',
            'score' => 'nullable|numeric|between:0,100',
            'checklist_items' => 'nullable|array',
            'summary_notes' => 'nullable|string|max:5000',
            'conditions' => 'nullable|string|max:5000',
        ];
    }
}
