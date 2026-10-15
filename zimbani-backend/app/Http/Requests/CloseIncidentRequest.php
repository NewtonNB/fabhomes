<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CloseIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'root_cause_analysis' => 'required|string|max:5000',
            'preventative_measures' => 'required|string|max:5000',
        ];
    }
}
