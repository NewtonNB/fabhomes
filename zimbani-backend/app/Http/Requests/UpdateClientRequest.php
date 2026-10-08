<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        $client = $this->route('client');
        return $this->user()->can('update', $client);
    }

    public function rules(): array
    {
        $clientId = $this->route('client')->id;
        
        return [
            // Personal Information
            'first_name' => ['sometimes', 'required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'in:male,female,other'],
            
            // Contact Information
            'email' => ['nullable', 'email', 'max:255', Rule::unique('clients')->ignore($clientId)],
            'phone_primary' => ['sometimes', 'required', 'string', 'max:20'],
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
            'kyc_status' => ['nullable', 'in:pending,verified,rejected'],
            
            // Metadata
            'notes' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
        ];
    }
}
