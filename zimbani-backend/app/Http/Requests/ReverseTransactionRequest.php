<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReverseTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'required|string|min:5|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'A clear justification is strictly required to reverse an immutable transaction.',
            'reason.min' => 'The reversal reason must be at least 5 characters.',
        ];
    }
}
