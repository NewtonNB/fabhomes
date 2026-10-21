<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectHandover;
use App\Models\ProjectFinalSettlement;
use App\Services\ProjectHandoverSettlementService;

echo "=== Testing Phase 9 Day 5: Capstone Project Handover & End-to-End Settlement ===\n\n";

$service = app(ProjectHandoverSettlementService::class);

$project = Project::first();
if (!$project) {
    die("Error: No project found in database.\n");
}
$client = Client::first();
if (!$client) {
    die("Error: No client found in database.\n");
}

echo "Using Project ID: {$project->id} ({$project->name})\n";
echo "Using Client ID: {$client->id} ({$client->full_name})\n\n";

// Test 1: Initialize Handover
echo "1. Testing Handover Protocol Initialization...\n";
$handover = $service->initializeHandover(
    $project->id,
    null,
    $client->id,
    "Capstone Handover Protocol - {$project->name}",
    1
);
assert(!empty($handover->handover_number), "Handover number should be generated");
assert($handover->project_id === $project->id, "Project ID should match");
echo "   Handover Number: {$handover->handover_number}\n";
echo "   Status: {$handover->status}\n";
echo "   Substructure Cleared: " . ($handover->substructure_cleared ? "YES" : "NO") . "\n";
echo "   Superstructure Cleared: " . ($handover->superstructure_cleared ? "YES" : "NO") . "\n";
echo "   Roofing Cleared: " . ($handover->roofing_cleared ? "YES" : "NO") . "\n";
echo "   MEP Cleared: " . ($handover->mep_cleared ? "YES" : "NO") . "\n";
echo "   Finishes Cleared: " . ($handover->finishes_cleared ? "YES" : "NO") . "\n";
echo "   Initial Readiness Score: {$handover->readiness_percentage}%\n\n";

// Test 2: Update Handover Dossier & Municipal Permits
echo "2. Testing Handover Dossier & Municipal Permit Update...\n";
$updatedHandover = $service->updateDossier($handover, [
    'has_occupancy_permit' => true,
    'occupancy_permit_ref' => 'KCCA/DPH/2026/0891',
    'occupancy_permit_issued_at' => date('Y-m-d'),
    'has_as_built_drawings' => true,
    'as_built_drawings_ref' => 'DWG-ASB-2026-ARC-001',
    'has_mep_compliance_certs' => true,
    'mep_compliance_notes' => 'Umeme Earthing Test: 1.2 Ohms (PASSED). Water Pressure: 6.5 Bar (PASSED).',
    'has_warranty_manual' => true,
    'has_keys_inventory' => true,
    'key_sets_count' => 4,
    'project_director_signed' => true,
]);
assert($updatedHandover->has_occupancy_permit === true, "Occupancy permit should be recorded");
assert($updatedHandover->occupancy_permit_ref === 'KCCA/DPH/2026/0891', "Occupancy permit ref should match");
echo "   Occupancy Permit: {$updatedHandover->occupancy_permit_ref}\n";
echo "   As-Built Drawings: {$updatedHandover->as_built_drawings_ref}\n";
echo "   Key Sets Count: {$updatedHandover->key_sets_count}\n";
echo "   Updated Readiness Score: {$updatedHandover->readiness_percentage}%\n\n";

// Test 3: Execute Client Deed of Handover Signoff & Key Release
echo "3. Testing Client Deed of Handover Signoff & Key Release...\n";
$signedHandover = $service->executeClientSignoff($updatedHandover, [
    'client_signature_name' => $client->full_name,
    'keys_received_by_name' => $client->full_name,
    'key_sets_count' => 4,
    'dlp_period_days' => 365,
    'notes' => 'Client verified all keys, fixtures, and finishes in pristine condition.',
], '192.168.1.105');
assert($signedHandover->status === 'keys_released', "Status should be keys_released");
assert(!empty($signedHandover->client_signature_hash), "Digital signature hash must be present");
assert($signedHandover->dlp_period_days === 365, "DLP period should be 365 days");
assert($signedHandover->is_dlp_active === true, "DLP should be actively running");
echo "   Status: {$signedHandover->status}\n";
echo "   Client Signature Hash: " . substr($signedHandover->client_signature_hash, 0, 32) . "...\n";
echo "   DLP Start Date: {$signedHandover->dlp_start_date}\n";
echo "   DLP End Date: {$signedHandover->dlp_end_date}\n";
echo "   DLP Days Remaining: {$signedHandover->dlp_days_remaining} days\n";
echo "   Is DLP Active: " . ($signedHandover->is_dlp_active ? "TRUE" : "FALSE") . "\n\n";

// Test 4: End-to-End Financial Settlement Audit
echo "4. Testing End-to-End Financial Settlement Audit...\n";
$settlement = $service->generateFinalSettlementAudit($project->id, null, $signedHandover->id);
assert($settlement instanceof ProjectFinalSettlement, "Settlement must be instance of ProjectFinalSettlement");
assert($settlement->adjusted_contract_sum > 0, "Adjusted contract sum must be greater than zero");
echo "   Settlement Number: {$settlement->settlement_number}\n";
echo "   Original Contract Sum: " . number_format($settlement->original_contract_sum, 2) . " UGX\n";
echo "   Approved Scope Variations: +" . number_format($settlement->approved_variations_amount, 2) . " UGX\n";
echo "   FIDIC Material Escalation: +" . number_format($settlement->material_escalation_amount, 2) . " UGX\n";
echo "   Adjusted Final Contract Sum: " . number_format($settlement->adjusted_contract_sum, 2) . " UGX\n";
echo "   Total Escrow Inflows: " . number_format($settlement->total_escrow_inflows, 2) . " UGX\n";
echo "   Subcontractor Works Paid: " . number_format($settlement->total_subcontractor_paid, 2) . " UGX\n";
echo "   Direct Expenses Paid: " . number_format($settlement->total_direct_expenses_paid, 2) . " UGX\n";
echo "   Total Disbursements: " . number_format($settlement->total_disbursements_paid, 2) . " UGX\n";
echo "   5% Retention Withheld: " . number_format($settlement->retention_withheld_total, 2) . " UGX\n";
echo "   Retention Released @ Completion: " . number_format($settlement->retention_released_completion, 2) . " UGX\n";
echo "   Retention Held (365-Day DLP): " . number_format($settlement->retention_held_dlp, 2) . " UGX\n";
echo "   Diaspora FX Hedging Savings: " . number_format($settlement->diaspora_fx_hedging_savings, 2) . " UGX\n";
echo "   Gross Project Profit: " . number_format($settlement->gross_project_profit, 2) . " UGX ({$settlement->profit_margin_percentage}%)\n";
echo "   Final Net Settlement Balance: " . number_format($settlement->final_settlement_balance, 2) . " UGX ({$settlement->settlement_direction})\n\n";

// Test 5: Finalize Settlement & Close Project
echo "5. Testing Final Settlement Finalization...\n";
$finalized = $service->finalizeSettlement($settlement, [
    'notes' => 'Audited by CFO & Principal Quantity Surveyor. Escrow balanced and accounts sealed.',
], 1);
assert($finalized->status === 'final_settled', "Settlement status must be final_settled");
assert(!empty($finalized->final_settled_at), "Settlement date must be recorded");
$project->refresh();
assert($project->status === 'completed', "Project status must be updated to completed");
echo "   Settlement Status: {$finalized->status}\n";
echo "   Audited At: {$finalized->audited_at}\n";
echo "   Project Final Status: {$project->status}\n\n";

// Test 6: Global Capstone Summary
echo "6. Testing Capstone Global Metrics Summary...\n";
$summary = $service->getCapstoneSummary();
assert(isset($summary['total_handovers_completed']), "Handovers count must exist");
assert(isset($summary['total_escrow_settled']), "Escrow settled must exist");
echo "   Total Completed Handovers: {$summary['total_handovers_completed']}\n";
echo "   Active DLP Warranties: {$summary['active_dlp_warranties']}\n";
echo "   Total Escrow Settled: " . number_format($summary['total_escrow_settled'], 2) . " UGX\n";
echo "   Total Retention Held in DLP: " . number_format($summary['total_retention_held_dlp'], 2) . " UGX\n";
echo "   Total Diaspora FX Savings: " . number_format($summary['total_diaspora_fx_savings'], 2) . " UGX\n";
echo "   Total Gross Profit: " . number_format($summary['total_gross_profit'], 2) . " UGX\n";
echo "   Average Portfolio Readiness: {$summary['average_readiness_score']}%\n\n";

echo "=== All 6 Capstone Handover & Settlement Test Steps PASSED! ===\n";
