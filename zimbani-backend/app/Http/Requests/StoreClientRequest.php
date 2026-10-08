<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Client::class);
    }

    public function rules(): array
    {
        return [
            // Personal Information (Required)
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'in:male,female,other'],
            
            // Contact Information
            'email' => ['nullable', 'email', 'max:255', 'unique:clients,email'],
            'phone_primary' => ['required', 'string', 'max:20'],
            'phone_secondary' => ['nullable', 'string', 'max:20'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            
            // Identification
            'id_type' => ['nullable', 'in:national_id,passport,driving_license,other'],
            'id_number' => ['nullable', 'string', 'max:100'],
            'id_expiry_date' => ['nullable', 'date', 'after:today'],
            
            // Next of Kin
            'nok_name' => ['nullable', 'string', 'max:255'],
            'nok_relationship' => ['nullable', 'string', 'max:100'],
            'nok_phone' => ['nullable', 'string', 'max:20'],
            'nok_address' => ['nullable', 'string'],
            
            // Status
            'status' => ['nullable', 'in:active,inactive,suspended,closed'],
            
            // Metadata
            'notes' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'First name is required',
            'last_name.required' => 'Last name is required',
            'phone_primary.required' => 'Primary phone number is required',
            'email.unique' => 'This email is already registered',
            'date_of_birth.before' => 'Date of birth must be in the past',
            'id_expiry_date.after' => 'ID expiry date must be in the future',
        ];
    }
}
