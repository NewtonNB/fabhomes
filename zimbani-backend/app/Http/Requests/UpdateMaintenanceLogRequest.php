<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMaintenanceLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maintenance_type' => 'sometimes|required|in:routine_service,preventative,breakdown_repair,safety_inspection,oil_change,tire_replacement',
            'status' => 'nullable|in:scheduled,in_progress,completed,cancelled',
            'scheduled_date' => 'sometimes|required|date',
            'completed_date' => 'nullable|date',
            'hours_at_maintenance' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'service_provider' => 'nullable|string|max:255',
            'performed_by' => 'nullable|exists:users,id',
            'description' => 'sometimes|required|string|max:5000',
            'parts_replaced' => 'nullable|string|max:2000',
            'next_service_due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('performed_by') && !empty($this->performed_by) && !is_numeric($this->performed_by)) {
            $user = User::where('uuid', $this->performed_by)->first();
            if ($user) {
                $this->merge(['performed_by' => $user->id]);
            }
        }
    }
}
