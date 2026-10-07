<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Project::class);
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // If company_id is a UUID, convert it to integer ID
        if ($this->has('company_id') && !is_numeric($this->company_id)) {
            $company = \App\Models\Company::where('uuid', $this->company_id)->first();
            if ($company) {
                $this->merge(['company_id' => $company->id]);
            }
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Basic Information
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:projects,code',
            'description' => 'nullable|string|max:5000',
            
            // Company relationship
            'company_id' => [
                'required',
                'exists:companies,id',
                function ($attribute, $value, $fail) {
                    // Company Admin can only create projects for their own company
                    $user = $this->user();
                    if ($user->hasRole('Company Admin') && $user->company_id != $value) {
                        $fail('You can only create projects for your own company.');
                    }
                },
            ],
            
            // Project Type & Status
            'project_type' => 'required|in:residential,commercial,industrial,infrastructure,mixed_use,other',
            'status' => 'required|in:planning,active,on_hold,completed,cancelled',
            
            // Timeline
            'start_date' => 'nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after:start_date',
            'actual_completion_date' => 'nullable|date',
            
            // Financial
            'budget' => 'nullable|numeric|min:0|max:999999999999.99',
            'currency' => 'nullable|string|size:3', // ISO currency code (e.g., UGX, USD)
            'total_spent' => 'nullable|numeric|min:0|max:999999999999.99',
            
            // Location
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            
            // Contact Information
            'contact_person' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:20',
            
            // Additional Details
            'total_units' => 'nullable|integer|min:0',
            'total_area' => 'nullable|numeric|min:0',
            'area_unit' => 'nullable|string|in:sqm,sqft,acres',
            
            // Metadata
            'metadata' => 'nullable|json',
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
            'name.required' => 'The project name is required.',
            'code.required' => 'The project code is required.',
            'code.unique' => 'This project code is already in use.',
            'company_id.required' => 'The company is required.',
            'company_id.exists' => 'The selected company does not exist.',
            'project_type.required' => 'The project type is required.',
            'project_type.in' => 'The project type must be one of: residential, commercial, industrial, infrastructure, mixed_use, other.',
            'status.required' => 'The project status is required.',
            'status.in' => 'The project status must be one of: planning, active, on_hold, completed, cancelled.',
            'start_date.after_or_equal' => 'The start date must be today or a future date.',
            'end_date.after' => 'The end date must be after the start date.',
            'budget.numeric' => 'The budget must be a number.',
            'budget.min' => 'The budget must be at least 0.',
            'currency.size' => 'The currency code must be exactly 3 characters (e.g., UGX, USD).',
            'contact_email.email' => 'Please provide a valid email address.',
            'latitude.between' => 'The latitude must be between -90 and 90.',
            'longitude.between' => 'The longitude must be between -180 and 180.',
            'area_unit.in' => 'The area unit must be one of: sqm, sqft, acres.',
            'metadata.json' => 'The metadata must be valid JSON.',
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
            'company_id' => 'company',
            'project_type' => 'project type',
            'start_date' => 'start date',
            'end_date' => 'end date',
            'actual_completion_date' => 'actual completion date',
            'contact_person' => 'contact person',
            'contact_email' => 'contact email',
            'contact_phone' => 'contact phone',
            'total_units' => 'total units',
            'total_area' => 'total area',
            'area_unit' => 'area unit',
        ];
    }
}
