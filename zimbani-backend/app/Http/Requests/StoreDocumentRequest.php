<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Handled by policy
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'document_type' => 'required|string|in:contract,id_proof,receipt,floor_plan,permit,survey,inspection_report,kyc,title_deed,invoice,other',
            'file' => 'required|file|max:20480', // 20 MB max
            'documentable_type' => 'nullable|string|in:client,unit,project,site,payment,Client,Unit,Project,Site,Payment',
            'documentable_id' => 'nullable|string',
            'expiry_date' => 'nullable|date',
            'metadata' => 'nullable|array',
        ];
    }

    /**
     * Resolve documentable model instance if provided
     */
    public function getDocumentableModel(): ?\Illuminate\Database\Eloquent\Model
    {
        $type = strtolower($this->input('documentable_type', ''));
        $id = $this->input('documentable_id');

        if (!$type || !$id) {
            return null;
        }

        $modelClass = match ($type) {
            'client' => \App\Models\Client::class,
            'unit' => \App\Models\Unit::class,
            'project' => \App\Models\Project::class,
            'site' => \App\Models\Site::class,
            'payment' => \App\Models\Payment::class,
            default => null,
        };

        if (!$modelClass) {
            return null;
        }

        // Search by UUID or integer ID
        if (is_numeric($id)) {
            return $modelClass::find($id);
        }

        return $modelClass::where('uuid', $id)->first();
    }
}
