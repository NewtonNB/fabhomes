<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class SignOffInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supervisor_id' => 'nullable|exists:users,id',
            'sign_off_notes' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('supervisor_id') && !empty($this->supervisor_id) && !is_numeric($this->supervisor_id)) {
            $user = User::where('uuid', $this->supervisor_id)->first();
            if ($user) {
                $this->merge(['supervisor_id' => $user->id]);
            }
        }
    }
}
