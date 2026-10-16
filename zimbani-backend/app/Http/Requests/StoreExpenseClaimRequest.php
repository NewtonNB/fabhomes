<?php

namespace App\Http\Requests;

use App\Models\PettyCashAccount;
use App\Models\Project;
use App\Models\Site;
use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'claim_type' => 'required|string|in:petty_cash_reimbursement,direct_site_purchase,travel_mileage,emergency_materials,site_utilities,other',
            'expense_category' => 'required|string|in:materials,fuel_oil,tools_hardware,transport,labour_welfare,equipment_hire,statutory_permits,office_admin,other',
            'expense_date' => 'required|date',
            'total_amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'payment_method' => 'required|string|in:petty_cash,bank_transfer,mobile_money,cash,company_card',
            'petty_cash_account_id' => 'nullable',
            'project_id' => 'nullable',
            'site_id' => 'nullable',
            'vendor_name' => 'nullable|string|max:255',
            'vendor_tin' => 'nullable|string|max:100',
            'receipt_number' => 'nullable|string|max:100',
            'description' => 'required|string',
            'items' => 'nullable|array',
            'items.*.item_description' => 'required_with:items|string|max:255',
            'items.*.expense_category' => 'required_with:items|string|in:materials,fuel_oil,tools_hardware,transport,labour_welfare,equipment_hire,statutory_permits,office_admin,other',
            'items.*.quantity' => 'required_with:items|numeric|min:0.01',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.receipt_reference' => 'nullable|string|max:100',
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

    public function getPettyCashAccountId(): ?int
    {
        $id = $this->input('petty_cash_account_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $float = PettyCashAccount::where('uuid', $id)->first();
        return $float ? $float->id : null;
    }
}
