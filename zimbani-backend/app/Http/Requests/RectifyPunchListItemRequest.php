<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RectifyPunchListItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rectification_notes' => 'required|string|max:5000',
        ];
    }
}
