<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:earthmoving,lifting,concrete,transport,power_tools,generators,compaction,other',
            'model_number' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'registration_number' => 'nullable|string|max:50',
            'ownership_type' => 'nullable|in:owned,rented,leased',
            'hourly_rate' => 'nullable|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'current_site_id' => 'nullable|exists:sites,id',
            'assigned_operator_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:available,dispatched,in_use,under_maintenance,decommissioned',
            'condition' => 'nullable|in:excellent,good,fair,needs_repair',
            'total_hours_operated' => 'nullable|numeric|min:0',
            'last_service_date' => 'nullable|date',
            'next_service_due_date' => 'nullable|date',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'supplier_or_vendor' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('current_site_id') && !empty($this->current_site_id) && !is_numeric($this->current_site_id)) {
            $site = Site::where('uuid', $this->current_site_id)->first();
            if ($site) {
                $this->merge(['current_site_id' => $site->id]);
            }
        }

        if ($this->has('assigned_operator_id') && !empty($this->assigned_operator_id) && !is_numeric($this->assigned_operator_id)) {
            $operator = User::where('uuid', $this->assigned_operator_id)->first();
            if ($operator) {
                $this->merge(['assigned_operator_id' => $operator->id]);
            }
        }
    }
}
