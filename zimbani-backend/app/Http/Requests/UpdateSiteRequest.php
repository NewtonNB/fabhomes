<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSiteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $site = $this->route('site');
        return $this->user()->can('update', $site);
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // If project_id is a UUID, convert it to integer ID
        if ($this->has('project_id') && !is_numeric($this->project_id)) {
            $project = \App\Models\Project::where('uuid', $this->project_id)->first();
            if ($project) {
                $this->merge(['project_id' => $project->id]);
            }
        }

        // If supervisor_id is a UUID, convert it to integer ID
        if ($this->has('supervisor_id') && $this->supervisor_id && !is_numeric($this->supervisor_id)) {
            $supervisor = \App\Models\User::where('uuid', $this->supervisor_id)->first();
            if ($supervisor) {
                $this->merge(['supervisor_id' => $supervisor->id]);
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
        $site = $this->route('site');
        $user = $this->user();

        return [
            // Basic Information
            'name' => 'sometimes|required|string|max:255',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('sites', 'code')->ignore($site->id),
            ],
            'description' => 'nullable|string|max:5000',
            
            // Project relationship
            'project_id' => [
                'sometimes',
                'required',
                'exists:projects,id',
                function ($attribute, $value, $fail) use ($user) {
                    $project = \App\Models\Project::find($value);
                    
                    if (!$project) {
                        return $fail('The selected project does not exist.');
                    }
                    
                    // Company Admin can only move sites to their company's projects
                    if ($user->hasRole('Company Admin') && $user->company_id != $project->company_id) {
                        $fail('You can only assign sites to projects belonging to your company.');
                    }
                    
                    // Site Manager can only move sites to assigned projects
                    if ($user->hasRole('Site Manager')) {
                        if (!$project->users()->where('user_id', $user->id)->exists()) {
                            $fail('You can only assign sites to projects you are assigned to.');
                        }
                    }
                },
            ],
            
            // Site Classification
            'site_type' => 'sometimes|required|in:construction,sales_office,warehouse,equipment_yard,residential_complex,commercial_complex,mixed_use,other',
            'status' => [
                'sometimes',
                'required',
                'in:planned,preparation,active,suspended,completed,closed,archived',
                function ($attribute, $value, $fail) use ($site) {
                    // Business rule: cannot reopen completed sites to active status
                    if ($site->status === 'completed' && in_array($value, ['active', 'preparation'])) {
                        $fail('Cannot change a completed site back to active or preparation status. Use restore if needed.');
                    }
                    
                    // Business rule: cannot change archived sites except by Super Admin
                    if ($site->status === 'archived' && $value !== 'archived' && !$this->user()->hasRole('Super Admin')) {
                        $fail('Only Super Admin can change the status of archived sites.');
                    }
                },
            ],
            
            // Location Details
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'region' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            
            // Boundaries and Area
            'boundaries' => 'nullable|array',
            'total_area' => 'nullable|numeric|min:0|max:999999999.99',
            'buildable_area' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) {
                    $totalArea = $this->input('total_area', $this->route('site')->total_area);
                    if ($totalArea && $value > $totalArea) {
                        $fail('The buildable area cannot exceed the total area.');
                    }
                },
            ],
            
            // Site Management
            'supervisor_id' => [
                'nullable',
                'exists:users,id',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $supervisor = \App\Models\User::find($value);
                        if ($supervisor && !$supervisor->hasRole('Supervisor')) {
                            $fail('The selected user must have the Supervisor role.');
                        }
                    }
                },
            ],
            'start_date' => 'nullable|date',
            'expected_completion_date' => 'nullable|date|after:start_date',
            'actual_completion_date' => [
                'nullable',
                'date',
                function ($attribute, $value, $fail) use ($site) {
                    // If setting actual completion date, status should be completed
                    if ($value && $this->input('status', $site->status) !== 'completed') {
                        $fail('The site status must be set to completed when providing an actual completion date.');
                    }
                },
            ],
            
            // Site Resources
            'total_workers' => 'nullable|integer|min:0',
            'total_equipment' => 'nullable|integer|min:0',
            'total_units' => 'nullable|integer|min:0',
            
            // Financial Tracking (restricted to certain roles)
            'allocated_budget' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
                function ($attribute, $value, $fail) use ($user) {
                    if (!$user->can('updateFinancials', $this->route('site'))) {
                        $fail('You do not have permission to update financial data.');
                    }
                },
            ],
            'actual_spent' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) use ($user) {
                    if (!$user->can('updateFinancials', $this->route('site'))) {
                        $fail('You do not have permission to update financial data.');
                    }
                },
            ],
            'currency' => 'nullable|string|size:3',
            
            // Utilities & Facilities
            'utilities' => 'nullable|array',
            'facilities' => 'nullable|array',
            
            // Safety & Compliance
            'safety_measures' => [
                'nullable',
                'array',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && !$user->can('manageSafety', $this->route('site'))) {
                        $fail('You do not have permission to update safety measures.');
                    }
                },
            ],
            'last_inspection_date' => 'nullable|date|before_or_equal:today',
            'next_inspection_date' => 'nullable|date|after:last_inspection_date',
            
            // Contact Information
            'contact_person' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:20',
            'contact_email' => 'nullable|email|max:255',
            
            // Additional Information
            'notes' => 'nullable|string|max:5000',
            'metadata' => 'nullable|array',
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
            'name.required' => 'The site name is required.',
            'code.required' => 'The site code is required.',
            'code.unique' => 'This site code is already in use.',
            'project_id.required' => 'The project is required.',
            'project_id.exists' => 'The selected project does not exist.',
            'site_type.required' => 'The site type is required.',
            'site_type.in' => 'The site type must be one of: construction, sales_office, warehouse, equipment_yard, residential_complex, commercial_complex, mixed_use, other.',
            'status.required' => 'The site status is required.',
            'status.in' => 'The site status must be one of: planned, preparation, active, suspended, completed, closed, archived.',
            'latitude.between' => 'The latitude must be between -90 and 90.',
            'longitude.between' => 'The longitude must be between -180 and 180.',
            'boundaries.json' => 'The boundaries must be valid JSON (GeoJSON format recommended).',
            'total_area.numeric' => 'The total area must be a number.',
            'total_area.min' => 'The total area must be at least 0.',
            'buildable_area.numeric' => 'The buildable area must be a number.',
            'buildable_area.min' => 'The buildable area must be at least 0.',
            'supervisor_id.exists' => 'The selected supervisor does not exist.',
            'expected_completion_date.after' => 'The expected completion date must be after the start date.',
            'allocated_budget.numeric' => 'The allocated budget must be a number.',
            'allocated_budget.min' => 'The allocated budget must be at least 0.',
            'currency.size' => 'The currency code must be exactly 3 characters (e.g., UGX, USD).',
            'utilities.json' => 'The utilities must be valid JSON.',
            'facilities.json' => 'The facilities must be valid JSON.',
            'safety_measures.json' => 'The safety measures must be valid JSON.',
            'last_inspection_date.before_or_equal' => 'The last inspection date cannot be in the future.',
            'next_inspection_date.after' => 'The next inspection date must be after the last inspection date.',
            'contact_email.email' => 'Please provide a valid email address.',
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
            'project_id' => 'project',
            'site_type' => 'site type',
            'start_date' => 'start date',
            'expected_completion_date' => 'expected completion date',
            'actual_completion_date' => 'actual completion date',
            'total_area' => 'total area',
            'buildable_area' => 'buildable area',
            'supervisor_id' => 'supervisor',
            'total_workers' => 'total workers',
            'total_equipment' => 'total equipment',
            'total_units' => 'total units',
            'allocated_budget' => 'allocated budget',
            'actual_spent' => 'actual spent',
            'contact_person' => 'contact person',
            'contact_phone' => 'contact phone',
            'contact_email' => 'contact email',
            'last_inspection_date' => 'last inspection date',
            'next_inspection_date' => 'next inspection date',
        ];
    }
}
