<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Company::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:200',
            'registration_number' => 'nullable|string|max:100|unique:companies,registration_number',
            'tax_number' => 'nullable|string|max:100|unique:companies,tax_number',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'alternate_phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'website' => 'nullable|url|max:255',
            'logo_path' => 'nullable|string|max:255',
            'company_type' => 'required|in:real_estate,construction,property_management,land_development,general_contractor,other',
            'established_date' => 'nullable|date|before_or_equal:today',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive,suspended,pending',
            'metadata' => 'nullable|array',
            'parent_company_id' => 'nullable|exists:companies,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Company name is required',
            'name.max' => 'Company name cannot exceed 200 characters',
            'registration_number.unique' => 'This registration number is already in use',
            'tax_number.unique' => 'This tax number is already in use',
            'email.email' => 'Please provide a valid email address',
            'website.url' => 'Please provide a valid website URL',
            'company_type.required' => 'Company type is required',
            'company_type.in' => 'Invalid company type selected',
            'established_date.date' => 'Please provide a valid date',
            'established_date.before_or_equal' => 'Established date cannot be in the future',
            'status.required' => 'Company status is required',
            'status.in' => 'Invalid status selected',
            'parent_company_id.exists' => 'Selected parent company does not exist',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'registration_number' => 'registration number',
            'tax_number' => 'tax number',
            'alternate_phone' => 'alternate phone number',
            'postal_code' => 'postal code',
            'company_type' => 'company type',
            'established_date' => 'established date',
            'parent_company_id' => 'parent company',
        ];
    }
}
