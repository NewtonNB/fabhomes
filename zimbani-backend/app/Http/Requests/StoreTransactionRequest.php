<?php

namespace App\Http\Requests;

use App\Models\Client;
use App\Models\Payment;
use App\Models\SavingsAccount;
use Illuminate\Foundation\Http\FormRequest;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => 'required',
            'account_id' => 'nullable',
            'payment_id' => 'nullable',
            'transaction_type' => 'required|string|in:payment,adjustment,reversal,refund,transfer,withdrawal',
            'amount' => 'required|numeric|not_in:0',
            'currency' => 'nullable|string|max:3',
            'description' => 'required|string|max:500',
            'narration' => 'nullable|string|max:2000',
            'reference_number' => 'nullable|string|max:100',
            'transaction_date' => 'nullable|date',
            'value_date' => 'nullable|date',
        ];
    }

    public function getClientId(): ?int
    {
        $id = $this->input('client_id');
        if (is_numeric($id)) {
            return (int) $id;
        }
        $client = Client::where('uuid', $id)->first();
        return $client ? $client->id : null;
    }

    public function getAccountId(): ?int
    {
        $id = $this->input('account_id');
        if (!$id) {
            return null;
        }
        if (is_numeric($id)) {
            return (int) $id;
        }
        $account = SavingsAccount::where('uuid', $id)->first();
        return $account ? $account->id : null;
    }

    public function getPaymentId(): ?int
    {
        $id = $this->input('payment_id');
        if (!$id) {
            return null;
        }
        if (is_numeric($id)) {
            return (int) $id;
        }
        $payment = Payment::where('uuid', $id)->first();
        return $payment ? $payment->id : null;
    }
}
