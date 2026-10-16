<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StorePettyCashAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'project_id' => 'nullable',
            'site_id' => 'nullable',
            'custodian_id' => 'required',
            'float_limit' => 'required|numeric|min:0',
            'initial_balance' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'notes' => 'nullable|string',
        ];
    }

    public function getProjectId(): ?int
    {
        $id = $this->input('project_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $project = Project::where('uuid', $id)->first();
        return $project ? $project->id : null;
    }

    public function getSiteId(): ?int
    {
        $id = $this->input('site_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $site = Site::where('uuid', $id)->first();
        return $site ? $site->id : null;
    }

    public function getCustodianId(): ?int
    {
        $id = $this->input('custodian_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $user = User::where('uuid', $id)->first();
        return $user ? $user->id : null;
    }
}
