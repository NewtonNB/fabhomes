<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $project = $this->route('project');
        return $this->user()->can('update', $project);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $project = $this->route('project');

        return [
            // Basic Information
            'name' => 'sometimes|string|max:255',
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('projects', 'code')->ignore($project->id),
            ],
            'description' => 'nullable|string|max:5000',
            
            // Company relationship (cannot change company once created)
            'company_id' => 'sometimes|prohibited',
            
            // Project Type & Status
            'project_type' => 'sometimes|in:residential,commercial,industrial,infrastructure,mixed_use,other',
            'status' => [
                'sometimes',
                'in:planning,active,on_hold,completed,cancelled',
                function ($attribute, $value, $fail) use ($project) {
                    // Prevent reopening completed or cancelled projects without proper authorization
                    if (in_array($project->status, ['completed', 'cancelled']) && 
                        !in_array($value, ['completed', 'cancelled'])) {
                        $user = $this->user();
                        if (!$user->hasRole('Super Admin') && !$user->hasRole('Company Admin')) {
                            $fail('Only Super Admin or Company Admin can reopen completed or cancelled projects.');
                        }
                    }
                },
            ],
            
            // Timeline
            'start_date' => 'nullable|date',
            'end_date' => [
                'nullable',
                'date',
                function ($attribute, $value, $fail) {
                    $startDate = $this->input('start_date') ?? $this->route('project')->start_date;
                    if ($startDate && $value && strtotime($value) <= strtotime($startDate)) {
                        $fail('The end date must be after the start date.');
                    }
                },
            ],
            'actual_completion_date' => [
                'nullable',
                'date',
                function ($attribute, $value, $fail) {
                    // Can only set actual completion date when status is completed
                    if ($value && $this->input('status') !== 'completed') {
                        $fail('Actual completion date can only be set when project status is completed.');
                    }
                },
            ],
            
            // Financial (restricted to Company Admin and Finance Officer)
            'budget' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
                function ($attribute, $value, $fail) {
                    $user = $this->user();
                    if (!$user->can('updateFinancials', $this->route('project'))) {
                        $fail('You do not have permission to update financial information.');
                    }
                },
            ],
            'currency' => 'nullable|string|size:3',
            'total_spent' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
                function ($attribute, $value, $fail) {
                    $user = $this->user();
                    if (!$user->can('updateFinancials', $this->route('project'))) {
                        $fail('You do not have permission to update financial information.');
                    }
                },
            ],
            
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
            'name.string' => 'The project name must be text.',
            'code.unique' => 'This project code is already in use.',
            'company_id.prohibited' => 'You cannot change the company of an existing project.',
            'project_type.in' => 'The project type must be one of: residential, commercial, industrial, infrastructure, mixed_use, other.',
            'status.in' => 'The project status must be one of: planning, active, on_hold, completed, cancelled.',
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
