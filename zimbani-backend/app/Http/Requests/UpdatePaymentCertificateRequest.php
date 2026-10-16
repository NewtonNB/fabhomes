<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'valuation_period_start' => 'sometimes|required|date',
            'valuation_period_end' => 'sometimes|required|date',
            'valuation_date' => 'sometimes|required|date',
            'certificate_type' => 'sometimes|required|string|in:interim,practical_completion,final,retention_release',
            'gross_amount' => 'sometimes|required|numeric|min:0',
            'previous_gross_amount' => 'nullable|numeric|min:0',
            'materials_on_site_value' => 'nullable|numeric|min:0',
            'retention_rate' => 'nullable|numeric|min:0|max:100',
            'withholding_tax_rate' => 'nullable|numeric|min:0|max:100',
            'other_deductions' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'description' => 'sometimes|required|string|max:500',
            'measurement_sheet_summary' => 'nullable|string',
            'status' => 'nullable|string',
        ];
    }
}
