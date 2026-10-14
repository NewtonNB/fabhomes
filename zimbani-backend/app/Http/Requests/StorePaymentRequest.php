<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by PaymentPolicy
    }

    public function rules(): array
    {
        return [
            'unit_id' => 'required|exists:units,id',
            'client_id' => 'required|exists:clients,id',
            'payment_type' => 'required|in:deposit,installment,full_payment,balance,booking_fee,penalty,refund',
            'payment_method' => 'required|in:cash,bank_transfer,check,mobile_money,card,other',
            'amount' => 'required|numeric|min:0|max:999999999999.99',
            'currency' => 'nullable|string|size:3',
            'penalty_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:payment_date',
            'reference_number' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:255',
            'transaction_id' => 'nullable|string|max:255',
            'check_number' => 'nullable|string|max:255',
            'mobile_money_number' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:5000',
            'metadata' => 'nullable|array',
        ];
    }

    protected function prepareForValidation()
    {
        // Convert UUIDs to IDs if not already numeric
        if ($this->has('unit_id') && !is_numeric($this->unit_id)) {
            $unit = \App\Models\Unit::where('uuid', $this->unit_id)->first();
            if ($unit) {
                $this->merge(['unit_id' => $unit->id]);
            }
        }

        if ($this->has('client_id') && !is_numeric($this->client_id)) {
            $client = \App\Models\Client::where('uuid', $this->client_id)->first();
            if ($client) {
                $this->merge(['client_id' => $client->id]);
            }
        }
    }

    public function messages(): array
    {
        return [
            'unit_id.required' => 'Unit is required',
            'unit_id.exists' => 'Selected unit does not exist',
            'client_id.required' => 'Client is required',
            'client_id.exists' => 'Selected client does not exist',
            'amount.required' => 'Payment amount is required',
            'amount.min' => 'Amount must be greater than 0',
            'payment_date.required' => 'Payment date is required',
            'due_date.after_or_equal' => 'Due date must be after or equal to payment date',
        ];
    }

    public function attributes(): array
    {
        return [
            'unit_id' => 'unit',
            'client_id' => 'client',
            'payment_type' => 'payment type',
            'payment_method' => 'payment method',
            'payment_date' => 'payment date',
            'due_date' => 'due date',
            'reference_number' => 'reference number',
            'bank_name' => 'bank name',
            'transaction_id' => 'transaction ID',
            'check_number' => 'check number',
            'mobile_money_number' => 'mobile money number',
        ];
    }
}
