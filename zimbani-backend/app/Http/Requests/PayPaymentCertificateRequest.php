<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PayPaymentCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_reference' => 'required|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
