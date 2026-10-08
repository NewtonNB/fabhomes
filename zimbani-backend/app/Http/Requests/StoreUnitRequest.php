<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Unit::class);
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert site_id UUID to integer ID if needed
        if ($this->has('site_id') && !is_numeric($this->site_id)) {
            $site = \App\Models\Site::where('uuid', $this->site_id)->first();
            if ($site) {
                $this->merge(['site_id' => $site->id]);
            }
        }

        // Convert project_id UUID to integer ID if needed
        if ($this->has('project_id') && !is_numeric($this->project_id)) {
            $project = \App\Models\Project::where('uuid', $this->project_id)->first();
            if ($project) {
                $this->merge(['project_id' => $project->id]);
            }
        }

        // Convert client_id UUID to integer ID if needed
        if ($this->has('client_id') && $this->client_id && !is_numeric($this->client_id)) {
            $client = \App\Models\User::where('uuid', $this->client_id)->first();
            if ($client) {
                $this->merge(['client_id' => $client->id]);
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
        $user = $this->user();

        return [
            // Basic Information
            'unit_number' => 'required|string|max:50|unique:units,unit_number',
            'name' => 'required|string|max:255',
            
            // Relationships
            'site_id' => [
                'required',
                'exists:sites,id',
                function ($attribute, $value, $fail) use ($user) {
                    $site = \App\Models\Site::find($value);
                    
                    if (!$site) {
                        return $fail('The selected site does not exist.');
                    }
                    
                    // Company Admin can only create units for their company's sites
                    if ($user->hasRole('Company Admin') && $user->company_id != $site->project->company_id) {
                        $fail('You can only create units for sites belonging to your company.');
                    }
                    
                    // Site Manager can only create units for assigned projects
                    if ($user->hasRole('Site Manager')) {
                        if (!$site->project->users()->where('user_id', $user->id)->exists()) {
                            $fail('You can only create units for projects you are assigned to.');
                        }
                    }
                },
            ],
            
            'project_id' => [
                'required',
                'exists:projects,id',
                function ($attribute, $value, $fail) use ($user) {
                    $project = \App\Models\Project::find($value);
                    
                    if (!$project) {
                        return $fail('The selected project does not exist.');
                    }
                    
                    // Validate project matches site's project
                    if ($this->has('site_id')) {
                        $site = \App\Models\Site::find($this->site_id);
                        if ($site && $site->project_id != $value) {
                            $fail('The project must match the site\'s project.');
                        }
                    }
                },
            ],
            
            // Classification
            'unit_type' => 'required|in:apartment,house,villa,townhouse,penthouse,studio,office,shop,warehouse,plot,parking,other',
            'status' => 'required|in:planned,under_construction,completed,available,reserved,sold,occupied,maintenance,unavailable',
            
            // Physical Specifications
            'floor_number' => 'nullable|integer|min:0|max:200',
            'block_number' => 'nullable|string|max:50',
            'area' => 'nullable|numeric|min:0|max:99999999.99',
            'area_unit' => 'nullable|string|in:sqm,sqft,acres',
            'bedrooms' => 'nullable|integer|min:0|max:20',
            'bathrooms' => 'nullable|integer|min:0|max:20',
            'has_balcony' => 'nullable|boolean',
            'has_parking' => 'nullable|boolean',
            'parking_slots' => [
                'nullable',
                'integer',
                'min:0',
                'max:10',
                function ($attribute, $value, $fail) {
                    if ($value > 0 && !$this->boolean('has_parking')) {
                        $fail('has_parking must be true if parking_slots is specified.');
                    }
                },
            ],
            
            // Pricing Information
            'base_price' => 'nullable|numeric|min:0|max:999999999999.99',
            'current_price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && !$user->can('updatePricing', \App\Models\Unit::class)) {
                        $fail('You do not have permission to set unit pricing.');
                    }
                },
            ],
            'discount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'price_type' => 'nullable|in:fixed,negotiable,per_sqm',
            
            // Client/Owner Information
            'client_id' => 'nullable|exists:users,id',
            'reserved_date' => 'nullable|date',
            'sold_date' => 'nullable|date',
            'handover_date' => 'nullable|date|after_or_equal:sold_date',
            'amount_paid' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && !$user->can('updatePayments', \App\Models\Unit::class)) {
                        $fail('You do not have permission to set payment information.');
                    }
                },
            ],
            'balance' => 'nullable|numeric',
            
            // Construction Details
            'construction_start_date' => 'nullable|date',
            'expected_completion_date' => 'nullable|date|after:construction_start_date',
            'actual_completion_date' => 'nullable|date',
            'completion_percentage' => 'nullable|integer|min:0|max:100',
            
            // Features & Amenities
            'features' => 'nullable|array',
            'amenities' => 'nullable|array',
            'specifications' => 'nullable|array',
            
            // Location within Site
            'location_description' => 'nullable|string|max:500',
            'facing_direction' => 'nullable|string|in:North,South,East,West,NorthEast,NorthWest,SouthEast,SouthWest',
            'view_description' => 'nullable|string|max:500',
            
            // Documents & Media
            'images' => 'nullable|array',
            'floor_plans' => 'nullable|array',
            'documents' => 'nullable|array',
            
            // Financial Tracking
            'maintenance_fee' => 'nullable|numeric|min:0|max:999999.99',
            'maintenance_frequency' => 'nullable|string|in:monthly,quarterly,yearly',
            
            // Quality Control
            'last_inspection_date' => 'nullable|date|before_or_equal:today',
            'next_inspection_date' => 'nullable|date|after:last_inspection_date',
            'inspection_notes' => 'nullable|string|max:2000',
            'is_defect_free' => 'nullable|boolean',
            
            // Additional Information
            'description' => 'nullable|string|max:5000',
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
            'unit_number.required' => 'The unit number is required.',
            'unit_number.unique' => 'This unit number is already in use.',
            'name.required' => 'The unit name is required.',
            'site_id.required' => 'The site is required.',
            'site_id.exists' => 'The selected site does not exist.',
            'project_id.required' => 'The project is required.',
            'project_id.exists' => 'The selected project does not exist.',
            'unit_type.required' => 'The unit type is required.',
            'unit_type.in' => 'The unit type must be one of: apartment, house, villa, townhouse, penthouse, studio, office, shop, warehouse, plot, parking, other.',
            'status.required' => 'The status is required.',
            'status.in' => 'The status must be one of: planned, under_construction, completed, available, reserved, sold, occupied, maintenance, unavailable.',
            'floor_number.integer' => 'The floor number must be an integer.',
            'floor_number.min' => 'The floor number must be at least 0.',
            'floor_number.max' => 'The floor number cannot exceed 200.',
            'area.numeric' => 'The area must be a number.',
            'area.min' => 'The area must be at least 0.',
            'bedrooms.integer' => 'The number of bedrooms must be an integer.',
            'bathrooms.integer' => 'The number of bathrooms must be an integer.',
            'current_price.numeric' => 'The price must be a number.',
            'current_price.min' => 'The price must be at least 0.',
            'currency.size' => 'The currency code must be exactly 3 characters (e.g., UGX, USD).',
            'price_type.in' => 'The price type must be one of: fixed, negotiable, per_sqm.',
            'expected_completion_date.after' => 'The expected completion date must be after the construction start date.',
            'handover_date.after_or_equal' => 'The handover date must be on or after the sold date.',
            'completion_percentage.min' => 'The completion percentage must be at least 0.',
            'completion_percentage.max' => 'The completion percentage cannot exceed 100.',
            'facing_direction.in' => 'The facing direction must be one of: North, South, East, West, NorthEast, NorthWest, SouthEast, SouthWest.',
            'maintenance_frequency.in' => 'The maintenance frequency must be one of: monthly, quarterly, yearly.',
            'last_inspection_date.before_or_equal' => 'The last inspection date cannot be in the future.',
            'next_inspection_date.after' => 'The next inspection date must be after the last inspection date.',
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
            'unit_number' => 'unit number',
            'site_id' => 'site',
            'project_id' => 'project',
            'unit_type' => 'unit type',
            'floor_number' => 'floor number',
            'block_number' => 'block number',
            'area_unit' => 'area unit',
            'has_balcony' => 'has balcony',
            'has_parking' => 'has parking',
            'parking_slots' => 'parking slots',
            'base_price' => 'base price',
            'current_price' => 'current price',
            'price_type' => 'price type',
            'client_id' => 'client',
            'reserved_date' => 'reserved date',
            'sold_date' => 'sold date',
            'handover_date' => 'handover date',
            'amount_paid' => 'amount paid',
            'construction_start_date' => 'construction start date',
            'expected_completion_date' => 'expected completion date',
            'actual_completion_date' => 'actual completion date',
            'completion_percentage' => 'completion percentage',
            'location_description' => 'location description',
            'facing_direction' => 'facing direction',
            'view_description' => 'view description',
            'maintenance_fee' => 'maintenance fee',
            'maintenance_frequency' => 'maintenance frequency',
            'last_inspection_date' => 'last inspection date',
            'next_inspection_date' => 'next inspection date',
            'inspection_notes' => 'inspection notes',
            'is_defect_free' => 'is defect free',
        ];
    }
}
