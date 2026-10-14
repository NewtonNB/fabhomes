<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by PaymentPolicy
    }

    public function rules(): array
    {
        $payment = $this->route('payment');

        return [
            'payment_type' => 'sometimes|in:deposit,installment,full_payment,balance,booking_fee,penalty,refund',
            'payment_method' => 'sometimes|in:cash,bank_transfer,check,mobile_money,card,other',
            'amount' => 'sometimes|numeric|min:0|max:999999999999.99',
            'currency' => 'sometimes|string|size:3',
            'penalty_amount' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'payment_date' => 'sometimes|date',
            'due_date' => 'sometimes|date|after_or_equal:payment_date',
            'reference_number' => 'sometimes|string|max:255',
            'bank_name' => 'sometimes|string|max:255',
            'bank_account' => 'sometimes|string|max:255',
            'transaction_id' => 'sometimes|string|max:255',
            'check_number' => 'sometimes|string|max:255',
            'mobile_money_number' => 'sometimes|string|max:20',
            'notes' => 'sometimes|string|max:5000',
            'metadata' => 'sometimes|array',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $payment = $this->route('payment');

            // Prevent editing confirmed/verified payments
            if (in_array($payment->status, ['confirmed', 'verified']) && !auth()->user()->hasRole('Super Admin')) {
                $validator->errors()->add('status', 'Cannot edit confirmed or verified payments');
            }
        });
    }

    public function messages(): array
    {
        return [
            'amount.min' => 'Amount must be greater than 0',
            'due_date.after_or_equal' => 'Due date must be after or equal to payment date',
        ];
    }
}
