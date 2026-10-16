<?php

namespace App\Http\Requests;

use App\Models\PettyCashAccount;
use Illuminate\Foundation\Http\FormRequest;

class ReimburseExpenseClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_reference' => 'required|string|max:100',
            'petty_cash_account_id' => 'nullable',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function getPettyCashAccountId(): ?int
    {
        $id = $this->input('petty_cash_account_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $float = PettyCashAccount::where('uuid', $id)->first();
        return $float ? $float->id : null;
    }
}
