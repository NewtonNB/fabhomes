<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyPunchListItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'verification_notes' => 'nullable|string|max:5000',
            'action' => 'nullable|in:close,waive',
        ];
    }
}
