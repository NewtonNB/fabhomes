<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdjustBalanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'adjustment_type' => 'required|in:credit,debit,set_exact',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
