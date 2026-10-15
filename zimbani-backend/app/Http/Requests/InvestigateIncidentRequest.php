<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class InvestigateIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'investigator_id' => 'nullable|exists:users,id',
            'immediate_actions_taken' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('investigator_id') && !empty($this->investigator_id) && !is_numeric($this->investigator_id)) {
            $user = User::where('uuid', $this->investigator_id)->first();
            if ($user) {
                $this->merge(['investigator_id' => $user->id]);
            }
        }

        if (!$this->has('investigator_id') || empty($this->investigator_id)) {
            $this->merge(['investigator_id' => auth()->id()]);
        }
    }
}
