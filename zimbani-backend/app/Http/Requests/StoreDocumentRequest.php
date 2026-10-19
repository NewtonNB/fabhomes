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
            'documentable_type' => 'nullable|string',
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
            'task' => \App\Models\Task::class,
            'equipment' => \App\Models\Equipment::class,
            'site_inspection', 'site_inspections', 'inspection' => \App\Models\SiteInspection::class,
            'punch_list_item', 'punch_list_items', 'defect' => \App\Models\PunchListItem::class,
            'site_daily_log', 'site_daily_logs', 'daily_log', 'daily_logs' => \App\Models\SiteDailyLog::class,
            'safety_incident', 'safety_incidents', 'incident', 'incidents' => \App\Models\SafetyIncident::class,
            'safety_toolbox_talk', 'safety_toolbox_talks', 'toolbox_talk' => \App\Models\SafetyToolboxTalk::class,
            'savings_account', 'savings_accounts', 'account', 'accounts' => \App\Models\SavingsAccount::class,
            'transaction', 'transactions' => \App\Models\Transaction::class,
            'subcontractor_contract', 'subcontractor_contracts', 'contract', 'contracts' => \App\Models\SubcontractorContract::class,
            'payment_certificate', 'payment_certificates', 'certificate', 'certificates' => \App\Models\PaymentCertificate::class,
            'expense_claim', 'expense_claims', 'expense', 'expenses' => \App\Models\ExpenseClaim::class,
            'petty_cash_account', 'petty_cash_accounts', 'petty_cash' => \App\Models\PettyCashAccount::class,
            'milestone_verification', 'milestone_verifications', 'verification' => \App\Models\MilestoneVerification::class,
            'milestone_payment_release', 'milestone_payment_releases', 'milestone_release', 'release' => \App\Models\MilestonePaymentRelease::class,
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
