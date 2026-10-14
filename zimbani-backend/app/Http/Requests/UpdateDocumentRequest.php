<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:2000',
            'document_type' => 'sometimes|string|in:contract,id_proof,receipt,floor_plan,permit,survey,inspection_report,kyc,title_deed,invoice,other',
            'expiry_date' => 'nullable|date',
            'status' => 'sometimes|string|in:active,archived,expired',
            'metadata' => 'nullable|array',
        ];
    }
}
