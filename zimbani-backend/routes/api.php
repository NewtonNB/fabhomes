<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientPortalAuthController;
use App\Http\Controllers\Api\ClientPortalSavingsController;
use App\Http\Controllers\Api\ClientPortalPlotController;
use App\Http\Controllers\Api\ClientPortalDocumentController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\RoleManagementController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\MilestoneController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\MaterialRequisitionController;
use App\Http\Controllers\Api\MaterialUsageController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\EquipmentDispatchController;
use App\Http\Controllers\Api\EquipmentMaintenanceController;
use App\Http\Controllers\Api\EquipmentUtilizationController;
use App\Http\Controllers\Api\SiteInspectionController;
use App\Http\Controllers\Api\PunchListItemController;
use App\Http\Controllers\Api\SiteDailyLogController;
use App\Http\Controllers\Api\SafetyIncidentController;
use App\Http\Controllers\Api\SafetyToolboxTalkController;
use App\Http\Controllers\Api\SavingsAccountController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SubcontractorContractController;
use App\Http\Controllers\Api\PaymentCertificateController;
use App\Http\Controllers\Api\PettyCashAccountController;
use App\Http\Controllers\Api\ExpenseClaimController;
use App\Http\Controllers\Api\ProjectBudgetController;
use App\Http\Controllers\Api\FinancialReportController;
use App\Http\Controllers\Api\MilestoneVerificationController;
use App\Http\Controllers\Api\MilestonePaymentReleaseController;
use App\Http\Controllers\Api\ClientPortalMilestoneController;
use App\Http\Controllers\Api\SubcontractorMilestoneValuationController;
use App\Http\Controllers\Api\EscrowReconciliationController;
use App\Http\Controllers\Api\AutomatedMilestoneTriggerController;
use App\Http\Controllers\Api\RetentionFundController;
use App\Http\Controllers\Api\DefectLiabilityCertificateController;
use App\Http\Controllers\Api\ConstructionSavingSchemeController;
use App\Http\Controllers\Api\MobileMoneyController;
use App\Http\Controllers\Api\SiteAuditSyncController;
use App\Http\Controllers\Api\MultiCurrencyEscalationController;
use App\Http\Controllers\Api\ProjectHandoverSettlementController;
use App\Http\Controllers\Api\PaymentGatewayIntegrationController;
use App\Http\Controllers\Api\PaymentRefundDisputeController;
use App\Http\Controllers\Api\PaymentSimulationReconciliationController;
use App\Http\Controllers\Api\ExecutiveReportingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationDripController;
use App\Http\Controllers\Api\SecurityHardeningController;
use App\Http\Controllers\Api\WhatsAppWebhookController;
use App\Http\Controllers\Api\BroadcastingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public authentication routes (no auth required) with rate limiting
Route::prefix('v1')->group(function () {
    // More restrictive rate limits for authentication endpoints
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:3,1'); // 3 attempts per minute
    
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1'); // 5 attempts per minute
    
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,1'); // 3 attempts per minute
    
    Route::post('/password/reset', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:3,1'); // 3 attempts per minute

    // Mobile Money Public Webhook IPN Callback (Phase 9 Day 2)
    Route::post('/mobile-money/webhook/{provider}', [MobileMoneyController::class, 'handleWebhook']);

    // Universal Payment Gateway Public Webhooks (Phase 10)
    Route::post('/payments/webhooks/{gateway}', [PaymentGatewayIntegrationController::class, 'handleWebhook']);

    // WhatsApp Cloud API Public Webhooks (Phase 13 Day 2)
    Route::get('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify']);
    Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle']);

    // Client Portal PWA Public Auth & Onboarding (Phase 12 Day 1)
    Route::prefix('client-portal/auth')->group(function () {
        Route::post('/register', [ClientPortalAuthController::class, 'register'])
            ->middleware('throttle:5,1');
        Route::post('/login', [ClientPortalAuthController::class, 'login'])
            ->middleware('throttle:10,1');
        Route::post('/pin-login', [ClientPortalAuthController::class, 'pinLogin'])
            ->middleware('throttle:5,1');
        Route::post('/biometric-login', [ClientPortalAuthController::class, 'biometricLogin'])
            ->middleware('throttle:10,1');
    });
});

// Protected routes (require authentication)
Route::prefix('v1')->middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // User profile routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);

    // User's own activity logs
    Route::get('/activities/me', [ActivityController::class, 'myActivities']);

    // Company Management routes
    Route::apiResource('companies', CompanyController::class);
    Route::post('/companies/{uuid}/restore', [CompanyController::class, 'restore']);
    Route::get('/companies/{company}/subsidiaries', [CompanyController::class, 'subsidiaries']);
    Route::get('/companies/{company}/users', [CompanyController::class, 'users']);

    // Project Management routes
    Route::apiResource('projects', ProjectController::class);
    Route::post('/projects/{uuid}/restore', [ProjectController::class, 'restore']);
    Route::get('/projects/{project}/sites', [ProjectController::class, 'sites']);
    Route::get('/projects/{project}/users', [ProjectController::class, 'users']);
    Route::post('/projects/{project}/users/assign', [ProjectController::class, 'assignUsers']);
    Route::post('/projects/{project}/users/remove', [ProjectController::class, 'removeUsers']);

    // Site Management routes
    Route::apiResource('sites', SiteController::class);
    Route::post('/sites/{uuid}/restore', [SiteController::class, 'restore']);
    Route::get('/sites/{site}/workers', [SiteController::class, 'workers']);
    Route::post('/sites/{site}/workers/assign', [SiteController::class, 'assignWorkers']);
    Route::post('/sites/{site}/workers/remove', [SiteController::class, 'removeWorkers']);
    Route::post('/sites/{site}/inspection', [SiteController::class, 'updateInspection']);

    // Unit Management routes
    Route::apiResource('units', UnitController::class);
    Route::post('/units/{uuid}/restore', [UnitController::class, 'restore']);
    Route::post('/units/{unit}/reserve', [UnitController::class, 'reserve']);
    Route::post('/units/{unit}/sell', [UnitController::class, 'sell']);
    Route::post('/units/{unit}/progress', [UnitController::class, 'updateProgress']);
    Route::post('/units/{unit}/inspection', [UnitController::class, 'updateInspection']);
    Route::post('/units/{unit}/payment', [UnitController::class, 'updatePayment']);

    // Client Management routes
    Route::apiResource('clients', ClientController::class);
    Route::post('/clients/{uuid}/restore', [ClientController::class, 'restore']);
    Route::get('/clients/{client}/units', [ClientController::class, 'units']);
    Route::post('/clients/{client}/verify-kyc', [ClientController::class, 'verifyKyc']);
    Route::post('/clients/{client}/reject-kyc', [ClientController::class, 'rejectKyc']);

    // Payment Management routes
    Route::apiResource('payments', PaymentController::class);
    Route::post('/payments/{uuid}/restore', [PaymentController::class, 'restore']);
    Route::post('/payments/{payment}/confirm', [PaymentController::class, 'confirm']);
    Route::post('/payments/{payment}/verify', [PaymentController::class, 'verify']);
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject']);
    Route::post('/payments/{payment}/refund', [PaymentController::class, 'refund']);
    Route::post('/payments/{payment}/cancel', [PaymentController::class, 'cancel']);

    // Document Management System (DMS) & Secure Repository (Phase 11 Day 3)
    Route::get('/documents/expiring', [DocumentController::class, 'expiring']);
    Route::get('/documents/vault-summary', [DocumentController::class, 'vaultSummary']);
    Route::apiResource('documents', DocumentController::class);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
    Route::get('/documents/{document}/preview-url', [DocumentController::class, 'previewUrl']);
    Route::post('/documents/{document}/verify', [DocumentController::class, 'verify']);

    // Task Management routes
    Route::apiResource('tasks', TaskController::class);
    Route::post('/tasks/{uuid}/restore', [TaskController::class, 'restore']);
    Route::put('/tasks/{task}/status', [TaskController::class, 'updateStatus']);

    // Milestone Management routes (including API Spec Section 9.3)
    Route::apiResource('milestones', MilestoneController::class);
    Route::get('/projects/{project}/milestones', [MilestoneController::class, 'projectMilestones']);
    Route::post('/projects/{project}/milestones', [MilestoneController::class, 'store']);
    Route::put('/construction/milestones/{milestone}', [MilestoneController::class, 'update']);

    // Material & Inventory Tracking routes
    Route::apiResource('materials', MaterialController::class);
    Route::post('/materials/{material}/adjust-stock', [MaterialController::class, 'adjustStock']);

    // Material Requisition routes
    Route::apiResource('material-requisitions', MaterialRequisitionController::class)->parameters(['material-requisitions' => 'requisition']);
    Route::post('/material-requisitions/{requisition}/approve', [MaterialRequisitionController::class, 'approve']);
    Route::post('/material-requisitions/{requisition}/reject', [MaterialRequisitionController::class, 'reject']);
    Route::post('/material-requisitions/{requisition}/deliver', [MaterialRequisitionController::class, 'deliver']);

    // Material Usage routes
    Route::apiResource('material-usages', MaterialUsageController::class);

    // Equipment & Machinery Tracking routes
    Route::apiResource('equipment', EquipmentController::class);
    Route::apiResource('equipment-dispatches', EquipmentDispatchController::class)->parameters(['equipment-dispatches' => 'dispatch']);
    Route::post('/equipment-dispatches/{dispatch}/activate', [EquipmentDispatchController::class, 'activate']);
    Route::post('/equipment-dispatches/{dispatch}/return', [EquipmentDispatchController::class, 'return']);
    Route::apiResource('equipment-maintenance', EquipmentMaintenanceController::class)->parameters(['equipment-maintenance' => 'maintenance']);
    Route::post('/equipment-maintenance/{maintenance}/start', [EquipmentMaintenanceController::class, 'start']);
    Route::post('/equipment-maintenance/{maintenance}/complete', [EquipmentMaintenanceController::class, 'complete']);
    Route::apiResource('equipment-utilization', EquipmentUtilizationController::class)->parameters(['equipment-utilization' => 'utilization']);

    // Quality Control & Site Inspection routes
    Route::apiResource('site-inspections', SiteInspectionController::class)->parameters(['site-inspections' => 'inspection']);
    Route::post('/site-inspections/{inspection}/complete', [SiteInspectionController::class, 'complete']);
    Route::post('/site-inspections/{inspection}/sign-off', [SiteInspectionController::class, 'signOff']);

    // Punch List & Defect Management routes
    Route::apiResource('punch-lists', PunchListItemController::class)->parameters(['punch-lists' => 'punchItem']);
    Route::post('/punch-lists/{punchItem}/rectify', [PunchListItemController::class, 'rectify']);
    Route::post('/punch-lists/{punchItem}/verify', [PunchListItemController::class, 'verify']);

    // Site Daily Logs & Supervisor Reporting routes
    Route::apiResource('site-daily-logs', SiteDailyLogController::class)->parameters(['site-daily-logs' => 'dailyLog']);
    Route::post('/site-daily-logs/{dailyLog}/submit', [SiteDailyLogController::class, 'submit']);
    Route::post('/site-daily-logs/{dailyLog}/approve', [SiteDailyLogController::class, 'approve']);

    // Safety Incidents & Near Misses routes
    Route::apiResource('safety-incidents', SafetyIncidentController::class)->parameters(['safety-incidents' => 'incident']);
    Route::post('/safety-incidents/{incident}/investigate', [SafetyIncidentController::class, 'investigate']);
    Route::post('/safety-incidents/{incident}/close', [SafetyIncidentController::class, 'close']);

    // Safety Toolbox Talks & Briefings routes
    Route::apiResource('safety-toolbox-talks', SafetyToolboxTalkController::class)->parameters(['safety-toolbox-talks' => 'talk']);

    // Client Savings Accounts & Scheme Enrolment routes
    Route::apiResource('savings-accounts', SavingsAccountController::class)->parameters(['savings-accounts' => 'savingsAccount']);
    Route::post('/savings-accounts/{savingsAccount}/activate', [SavingsAccountController::class, 'activate']);
    Route::post('/savings-accounts/{savingsAccount}/suspend', [SavingsAccountController::class, 'suspend']);
    Route::post('/savings-accounts/{savingsAccount}/close', [SavingsAccountController::class, 'close']);
    Route::post('/savings-accounts/{savingsAccount}/adjust-balance', [SavingsAccountController::class, 'adjustBalance']);
    Route::get('/savings-accounts/{savingsAccount}/statement', [SavingsAccountController::class, 'statement']);

    // Construction Saving Schemes & Tiered Milestone Savings Pools (Phase 9 Day 1)
    Route::post('/construction-schemes/seed-defaults', [ConstructionSavingSchemeController::class, 'seedDefaults']);
    Route::apiResource('construction-schemes', ConstructionSavingSchemeController::class)->parameters(['construction-schemes' => 'scheme']);
    Route::post('/savings-accounts/{savingsAccount}/enroll-scheme', [ConstructionSavingSchemeController::class, 'enrollAccount']);
    Route::get('/savings-accounts/{savingsAccount}/milestone-pools', [ConstructionSavingSchemeController::class, 'getAccountPools']);
    Route::post('/savings-accounts/{savingsAccount}/allocate-deposit', [ConstructionSavingSchemeController::class, 'allocateDeposit']);
    Route::post('/savings-accounts/{savingsAccount}/rebalance-pools', [ConstructionSavingSchemeController::class, 'rebalancePools']);
    Route::post('/milestone-pools/{poolUuid}/lock', [ConstructionSavingSchemeController::class, 'lockPool']);
    Route::get('/savings-accounts/{savingsAccount}/scheme-readiness', [ConstructionSavingSchemeController::class, 'getAccountReadiness']);

    // Mobile Money & Automated Gateway Disbursements (Phase 9 Day 2)
    Route::prefix('mobile-money')->group(function () {
        Route::get('/statistics', [MobileMoneyController::class, 'statistics']);
        Route::get('/transactions', [MobileMoneyController::class, 'index']);
        Route::get('/transactions/{uuid}', [MobileMoneyController::class, 'show']);
        Route::post('/stk-push', [MobileMoneyController::class, 'initiateStkPush']);
        Route::post('/disburse', [MobileMoneyController::class, 'disburse']);
        Route::post('/simulate-callback', [MobileMoneyController::class, 'simulateCallback']);
        Route::get('/webhook-logs', [MobileMoneyController::class, 'webhookLogs']);
        Route::get('/gateways', [MobileMoneyController::class, 'gateways']);
    });

    // Offline Site Walk-Through Synchronization & Audits (Phase 9 Day 3)
    Route::prefix('site-audits')->group(function () {
        Route::get('/cache-package', [SiteAuditSyncController::class, 'getOfflinePackage']);
        Route::post('/sync', [SiteAuditSyncController::class, 'sync']);
        Route::get('/sync-logs', [SiteAuditSyncController::class, 'syncLogs']);
        Route::get('/checklist-templates', [SiteAuditSyncController::class, 'checklistTemplates']);
    });

    // Multi-Currency FX Hedging & Material Escalation (Phase 9 Day 4)
    Route::prefix('fx')->group(function () {
        Route::get('/rates', [MultiCurrencyEscalationController::class, 'getRates']);
        Route::post('/rates', [MultiCurrencyEscalationController::class, 'recordRate']);
        Route::get('/convert', [MultiCurrencyEscalationController::class, 'convert']);
        Route::get('/hedging-contracts', [MultiCurrencyEscalationController::class, 'getHedgingContracts']);
        Route::post('/hedging-contracts', [MultiCurrencyEscalationController::class, 'createHedgingContract']);
        Route::post('/hedging-contracts/{uuid}/drawdown', [MultiCurrencyEscalationController::class, 'drawdownHedgingContract']);
    });

    Route::prefix('escalation')->group(function () {
        Route::get('/indices', [MultiCurrencyEscalationController::class, 'getIndices']);
        Route::get('/indices/{uuid}', [MultiCurrencyEscalationController::class, 'getIndex']);
        Route::post('/indices/{uuid}/update-price', [MultiCurrencyEscalationController::class, 'updateMaterialPrice']);
        Route::post('/calculate-adjustment', [MultiCurrencyEscalationController::class, 'calculateBoqEscalation']);
        Route::get('/statistics', [MultiCurrencyEscalationController::class, 'getStatistics']);
    });

    // Capstone Project Handover & End-to-End Financial Settlement (Phase 9 Day 5)
    Route::prefix('handovers')->group(function () {
        Route::get('/', [ProjectHandoverSettlementController::class, 'index']);
        Route::post('/', [ProjectHandoverSettlementController::class, 'store']);
        Route::get('/{identifier}', [ProjectHandoverSettlementController::class, 'show']);
        Route::put('/{identifier}/dossier', [ProjectHandoverSettlementController::class, 'updateDossier']);
        Route::post('/{identifier}/signoff', [ProjectHandoverSettlementController::class, 'signoff']);
    });

    Route::prefix('settlements')->group(function () {
        Route::post('/audit', [ProjectHandoverSettlementController::class, 'generateAudit']);
        Route::post('/{identifier}/finalize', [ProjectHandoverSettlementController::class, 'finalizeSettlement']);
        Route::get('/capstone-summary', [ProjectHandoverSettlementController::class, 'capstoneSummary']);
    });

    // Payment Integration & Dynamic Intents (Phase 10)
    Route::prefix('payment-gateways')->group(function () {
        Route::get('/', [PaymentGatewayIntegrationController::class, 'gateways']);
        Route::get('/statistics', [PaymentGatewayIntegrationController::class, 'statistics']);
        Route::get('/health', [PaymentGatewayIntegrationController::class, 'health']);
        Route::post('/ping-all', [PaymentGatewayIntegrationController::class, 'pingAll']);
        Route::post('/{name}/ping', [PaymentGatewayIntegrationController::class, 'ping']);
    });

    Route::prefix('payment-intents')->group(function () {
        Route::get('/', [PaymentGatewayIntegrationController::class, 'intents']);
        Route::post('/', [PaymentGatewayIntegrationController::class, 'createIntent']);
        Route::get('/{identifier}', [PaymentGatewayIntegrationController::class, 'showIntent']);
        Route::post('/{identifier}/confirm', [PaymentGatewayIntegrationController::class, 'confirmIntent']);
        Route::post('/{identifier}/cancel', [PaymentGatewayIntegrationController::class, 'cancelIntent']);
    });

    Route::prefix('payment-webhooks')->group(function () {
        Route::get('/logs', [PaymentGatewayIntegrationController::class, 'webhookLogs']);
        Route::get('/metrics', [PaymentGatewayIntegrationController::class, 'webhookMetrics']);
        Route::post('/logs/{id}/retry', [PaymentGatewayIntegrationController::class, 'retryWebhook']);
    });

    // Automated Refunds & Dispute Resolution Ledger (Phase 10 Day 3)
    Route::get('/payment-refunds-disputes/statistics', [PaymentRefundDisputeController::class, 'statistics']);

    Route::prefix('payment-refunds')->group(function () {
        Route::get('/', [PaymentRefundDisputeController::class, 'refunds']);
        Route::post('/', [PaymentRefundDisputeController::class, 'requestRefund']);
        Route::get('/{identifier}', [PaymentRefundDisputeController::class, 'showRefund']);
        Route::post('/{identifier}/approve', [PaymentRefundDisputeController::class, 'approveRefund']);
        Route::post('/{identifier}/reject', [PaymentRefundDisputeController::class, 'rejectRefund']);
        Route::post('/{identifier}/execute', [PaymentRefundDisputeController::class, 'executeRefund']);
    });

    Route::prefix('payment-disputes')->group(function () {
        Route::get('/', [PaymentRefundDisputeController::class, 'disputes']);
        Route::post('/', [PaymentRefundDisputeController::class, 'openDispute']);
        Route::get('/{identifier}', [PaymentRefundDisputeController::class, 'showDispute']);
        Route::post('/{identifier}/evidence', [PaymentRefundDisputeController::class, 'submitEvidence']);
        Route::post('/{identifier}/resolve', [PaymentRefundDisputeController::class, 'resolveDispute']);
    });

    // End-to-End Payment Simulation & Bank Reconciliation Staging (Phase 10 Day 5)
    Route::prefix('payment-simulations')->group(function () {
        Route::post('/run', [PaymentSimulationReconciliationController::class, 'runSimulation']);
        Route::post('/run-all', [PaymentSimulationReconciliationController::class, 'runAllSimulations']);
        Route::get('/history', [PaymentSimulationReconciliationController::class, 'simulationHistory']);
    });

    Route::prefix('bank-reconciliation-staging')->group(function () {
        Route::get('/batches', [PaymentSimulationReconciliationController::class, 'listBatches']);
        Route::post('/batches/demo', [PaymentSimulationReconciliationController::class, 'seedDemoBatch']);
        Route::get('/batches/{id}', [PaymentSimulationReconciliationController::class, 'showBatch']);
        Route::post('/batches/{id}/auto-reconcile', [PaymentSimulationReconciliationController::class, 'autoReconcile']);
        Route::post('/entries/{id}/match', [PaymentSimulationReconciliationController::class, 'manualMatch']);
    });

    // Executive BI Analytics, Export Engine & Reporting (Phase 11 Day 1 - Day 4)
    Route::prefix('reports')->group(function () {
        Route::get('/financial-summary', [ExecutiveReportingController::class, 'financialSummary']);
        Route::get('/cash-flow-breakdown', [ExecutiveReportingController::class, 'cashFlowBreakdown']);
        Route::get('/executive-kpis', [ExecutiveReportingController::class, 'executiveKpis']);
        Route::get('/client-activity', [ExecutiveReportingController::class, 'clientActivity']);
        Route::get('/plot-allocation', [ExecutiveReportingController::class, 'plotAllocation']);
        Route::get('/construction-progress', [ExecutiveReportingController::class, 'constructionProgress']);
        Route::get('/export/csv', [ExecutiveReportingController::class, 'exportCsv']);
        Route::get('/export/print-view', [ExecutiveReportingController::class, 'printView']);
        Route::get('/schedules', [ExecutiveReportingController::class, 'listSchedules']);
        Route::post('/schedules', [ExecutiveReportingController::class, 'createSchedule']);
        Route::post('/schedules/{schedule}/toggle', [ExecutiveReportingController::class, 'toggleSchedule']);
    });

    // Financial Transactions & Immutable Ledger
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/transactions/reconciliation', [TransactionController::class, 'reconciliation']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
    Route::post('/transactions/{transaction}/reverse', [TransactionController::class, 'reverse']);

    // Subcontractor Contracts & Payment Certificates (Phase 7 Day 3)
    Route::get('/subcontractor-contracts/statistics', [SubcontractorContractController::class, 'statistics']);
    Route::apiResource('subcontractor-contracts', SubcontractorContractController::class)->parameters(['subcontractor-contracts' => 'subcontractorContract']);
    Route::post('/subcontractor-contracts/{subcontractorContract}/activate', [SubcontractorContractController::class, 'activate']);
    Route::post('/subcontractor-contracts/{subcontractorContract}/suspend', [SubcontractorContractController::class, 'suspend']);
    Route::post('/subcontractor-contracts/{subcontractorContract}/terminate', [SubcontractorContractController::class, 'terminate']);

    Route::get('/payment-certificates/statistics', [PaymentCertificateController::class, 'statistics']);
    Route::apiResource('payment-certificates', PaymentCertificateController::class)->parameters(['payment-certificates' => 'paymentCertificate']);
    Route::post('/payment-certificates/{paymentCertificate}/submit', [PaymentCertificateController::class, 'submit']);
    Route::post('/payment-certificates/{paymentCertificate}/verify-site', [PaymentCertificateController::class, 'verifySite']);
    Route::post('/payment-certificates/{paymentCertificate}/approve-finance', [PaymentCertificateController::class, 'approveFinance']);
    Route::post('/payment-certificates/{paymentCertificate}/authorize-admin', [PaymentCertificateController::class, 'authorizeAdmin']);
    Route::post('/payment-certificates/{paymentCertificate}/pay', [PaymentCertificateController::class, 'pay']);
    Route::post('/payment-certificates/{paymentCertificate}/reject', [PaymentCertificateController::class, 'reject']);

    // Petty Cash Accounts & Float Ledger (Phase 7 Day 4)
    Route::get('/petty-cash-accounts/statistics', [PettyCashAccountController::class, 'statistics']);
    Route::apiResource('petty-cash-accounts', PettyCashAccountController::class)->parameters(['petty-cash-accounts' => 'pettyCashAccount']);
    Route::post('/petty-cash-accounts/{pettyCashAccount}/top-up', [PettyCashAccountController::class, 'topUp']);
    Route::post('/petty-cash-accounts/{pettyCashAccount}/return-funds', [PettyCashAccountController::class, 'returnFunds']);
    Route::get('/petty-cash-accounts/{pettyCashAccount}/transactions', [PettyCashAccountController::class, 'transactions']);

    // Expense Claims & Direct Purchasing (Phase 7 Day 4)
    Route::get('/expense-claims/statistics', [ExpenseClaimController::class, 'statistics']);
    Route::apiResource('expense-claims', ExpenseClaimController::class)->parameters(['expense-claims' => 'expenseClaim']);
    Route::post('/expense-claims/{expenseClaim}/submit', [ExpenseClaimController::class, 'submit']);
    Route::post('/expense-claims/{expenseClaim}/verify-site', [ExpenseClaimController::class, 'verifySite']);
    Route::post('/expense-claims/{expenseClaim}/approve-finance', [ExpenseClaimController::class, 'approveFinance']);
    Route::post('/expense-claims/{expenseClaim}/authorize-admin', [ExpenseClaimController::class, 'authorizeAdmin']);
    Route::post('/expense-claims/{expenseClaim}/reimburse', [ExpenseClaimController::class, 'reimburse']);
    Route::post('/expense-claims/{expenseClaim}/reject', [ExpenseClaimController::class, 'reject']);

    // Cost Accounting & Cost Code Budgets (Phase 7 Day 5)
    Route::post('/project-budgets/seed-standard/{project}', [ProjectBudgetController::class, 'seedStandard']);
    Route::apiResource('project-budgets', ProjectBudgetController::class)->parameters(['project-budgets' => 'projectBudget']);

    // Financial Auditing, Profitability & Forecasting Reports (Phase 7 Day 5)
    Route::get('/financial-reports/executive-summary', [FinancialReportController::class, 'executiveSummary']);
    Route::get('/financial-reports/budget-variance', [FinancialReportController::class, 'budgetVariance']);
    Route::get('/financial-reports/profitability', [FinancialReportController::class, 'profitability']);
    Route::get('/financial-reports/cash-flow-forecast', [FinancialReportController::class, 'cashFlowForecast']);
    Route::get('/financial-reports/compliance-audit', [FinancialReportController::class, 'complianceAudit']);
    Route::get('/financial-reports/export', [FinancialReportController::class, 'exportCsv']);

    // Milestone Verifications & Physical Sign-Offs (Phase 8 Day 1)
    Route::apiResource('milestone-verifications', MilestoneVerificationController::class)->parameters(['milestone-verifications' => 'milestoneVerification']);
    Route::post('/milestone-verifications/{milestoneVerification}/submit', [MilestoneVerificationController::class, 'submit']);
    Route::post('/milestone-verifications/{milestoneVerification}/sign-off-engineer', [MilestoneVerificationController::class, 'signOffSiteEngineer']);
    Route::post('/milestone-verifications/{milestoneVerification}/sign-off-qs', [MilestoneVerificationController::class, 'signOffQuantitySurveyor']);
    Route::post('/milestone-verifications/{milestoneVerification}/client-approve', [MilestoneVerificationController::class, 'clientApprove']);
    Route::post('/milestone-verifications/{milestoneVerification}/reject', [MilestoneVerificationController::class, 'reject']);

    // Milestone Payment Releases & Retention Fund Clearances (Phase 8 Day 1)
    Route::get('/milestone-payment-releases/statistics', [MilestonePaymentReleaseController::class, 'statistics']);
    Route::apiResource('milestone-payment-releases', MilestonePaymentReleaseController::class)->parameters(['milestone-payment-releases' => 'milestonePaymentRelease'])->only(['index', 'show']);
    Route::post('/milestone-payment-releases/{milestonePaymentRelease}/authorize', [MilestonePaymentReleaseController::class, 'authorizeRelease']);
    Route::post('/milestone-payment-releases/{milestonePaymentRelease}/disburse', [MilestonePaymentReleaseController::class, 'disburse']);
    Route::post('/milestone-payment-releases/{milestonePaymentRelease}/release-retention', [MilestonePaymentReleaseController::class, 'releaseRetention']);

    // Client Portal Milestone Authorisations & Progress Photos (Phase 8 Day 2)
    Route::prefix('client-portal/milestones')->group(function () {
        Route::get('/summary', [ClientPortalMilestoneController::class, 'summary']);
        Route::get('/verifications', [ClientPortalMilestoneController::class, 'index']);
        Route::get('/verifications/{uuid}', [ClientPortalMilestoneController::class, 'show']);
        Route::post('/verifications/{uuid}/authorize', [ClientPortalMilestoneController::class, 'authorizeVerification']);
        Route::post('/verifications/{uuid}/dispute', [ClientPortalMilestoneController::class, 'disputeVerification']);
        Route::post('/verifications/{uuid}/photos', [ClientPortalMilestoneController::class, 'uploadPhoto']);
        Route::post('/photos/{uuid}/flag', [ClientPortalMilestoneController::class, 'flagPhoto']);
        Route::post('/defects', [ClientPortalMilestoneController::class, 'reportDefect']);
        Route::get('/defects', [ClientPortalMilestoneController::class, 'getPunchListItems']);
    });

    // Client Portal PWA Self-Service & Security Profile (Phase 12 Day 1 & Day 2)
    Route::prefix('client-portal')->group(function () {
        Route::get('/profile', [ClientPortalAuthController::class, 'profile']);
        Route::put('/profile', [ClientPortalAuthController::class, 'updateProfile']);
        Route::post('/profile/kyc', [ClientPortalAuthController::class, 'submitKyc']);
        Route::get('/security/sessions', [ClientPortalAuthController::class, 'getSecuritySessions']);
        Route::post('/security/pin', [ClientPortalAuthController::class, 'setupPin']);
        Route::post('/security/biometrics', [ClientPortalAuthController::class, 'setupBiometrics']);
        Route::put('/security/preferences', [ClientPortalAuthController::class, 'updatePreferences']);
        Route::post('/security/pwa-install', [ClientPortalAuthController::class, 'recordPwaInstall']);
        Route::post('/security/revoke-others', [ClientPortalAuthController::class, 'revokeOtherSessions']);

        // Client Savings Accounts, Deposit Checkouts & Milestone Trackers (Phase 12 Day 2)
        Route::get('/savings', [ClientPortalSavingsController::class, 'overview']);
        Route::get('/savings/{identifier}', [ClientPortalSavingsController::class, 'show']);
        Route::get('/transactions', [ClientPortalSavingsController::class, 'transactions']);
        Route::post('/deposits/checkout', [ClientPortalSavingsController::class, 'initiateDeposit']);
        Route::post('/deposits/{identifier}/confirm', [ClientPortalSavingsController::class, 'confirmDeposit']);
        Route::get('/milestone-trackers', [ClientPortalSavingsController::class, 'milestoneTrackers']);

        // Plot Reservations, Interactive Estate Map & Deed Status (Phase 12 Day 3)
        Route::get('/plots', [ClientPortalPlotController::class, 'getPlots']);
        Route::get('/estate-map', [ClientPortalPlotController::class, 'getEstateMap']);
        Route::post('/plots/reserve', [ClientPortalPlotController::class, 'reservePlot']);
        Route::get('/reservations', [ClientPortalPlotController::class, 'getClientReservations']);
        Route::post('/reservations/{uuid}/cancel', [ClientPortalPlotController::class, 'cancelReservation']);
        Route::get('/deeds', [ClientPortalPlotController::class, 'getLandTitleDeeds']);

        // Digital Document Vault, Statements & Support Tickets (Phase 12 Day 5)
        Route::get('/documents', [ClientPortalDocumentController::class, 'documents']);
        Route::post('/documents/upload', [ClientPortalDocumentController::class, 'uploadDocument']);
        Route::get('/statements', [ClientPortalDocumentController::class, 'generateStatement']);
        Route::get('/support/tickets', [ClientPortalDocumentController::class, 'getTickets']);
        Route::post('/support/tickets', [ClientPortalDocumentController::class, 'createTicket']);
        Route::get('/support/tickets/{identifier}', [ClientPortalDocumentController::class, 'getTicketDetails']);
        Route::post('/support/tickets/{identifier}/reply', [ClientPortalDocumentController::class, 'replyTicket']);
        Route::post('/support/tickets/{identifier}/close', [ClientPortalDocumentController::class, 'closeTicket']);
    });

    // Multi-Channel Notifications & Preferences (Phase 13 Day 1 & Day 5)
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/summary', [NotificationController::class, 'summary']);
        Route::get('/preferences', [NotificationController::class, 'preferences']);
        Route::put('/preferences', [NotificationController::class, 'updatePreferences']);
        Route::get('/analytics', [NotificationController::class, 'analytics']);
        Route::post('/campaign-broadcast', [NotificationController::class, 'sendCampaign']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::post('/dispatch-test', [NotificationController::class, 'dispatchTest']);
        Route::get('/dispatch-logs', [NotificationController::class, 'dispatchLogs']);
        Route::post('/dispatch-logs/{id}/retry', [NotificationController::class, 'retryLog']);
        Route::post('/{identifier}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/{identifier}/dismiss', [NotificationController::class, 'dismiss']);
    });

    // WhatsApp Cloud API Management & Conversation Logs (Phase 13 Day 2)
    Route::prefix('whatsapp')->group(function () {
        Route::post('/send-template', [WhatsAppWebhookController::class, 'sendTemplate']);
        Route::get('/messages', [WhatsAppWebhookController::class, 'getMessages']);
        Route::get('/webhooks-log', [WhatsAppWebhookController::class, 'getWebhookLogs']);
    });

    // Real-Time Event Broadcasting & WebSocket Subscriptions (Phase 13 Day 3)
    Broadcast::routes(['middleware' => ['auth:sanctum']]);
    Route::prefix('broadcasting')->group(function () {
        Route::get('/channels', [BroadcastingController::class, 'getChannels']);
        Route::post('/test-broadcast', [BroadcastingController::class, 'testBroadcast']);
    });

    // Automated Notification Workflows & Drip Triggers (Phase 13 Day 4)
    Route::prefix('notification-drips')->group(function () {
        Route::get('/summary', [NotificationDripController::class, 'summary']);
        Route::get('/logs', [NotificationDripController::class, 'logs']);
        Route::post('/run-now', [NotificationDripController::class, 'runNow']);
    });

    // Enterprise Security Hardening & OWASP Compliance (Phase 14 Day 1)
    Route::prefix('security')->group(function () {
        Route::get('/health-check', [SecurityHardeningController::class, 'healthCheck']);
        Route::get('/audit-logs', [SecurityHardeningController::class, 'auditLogs']);
        Route::post('/simulate-threat', [SecurityHardeningController::class, 'simulateThreat']);
    });

    // Subcontractor Milestone Valuation & Interim Payment Linkages (Phase 8 Day 3)
    Route::get('/subcontractor-contracts/{contract}/milestones', [SubcontractorMilestoneValuationController::class, 'getContractMilestones']);
    Route::post('/subcontractor-contracts/{contract}/milestones', [SubcontractorMilestoneValuationController::class, 'allocateMilestones']);
    Route::get('/subcontractor-contracts/{contract}/milestone-progress', [SubcontractorMilestoneValuationController::class, 'getContractMilestoneProgress']);
    Route::post('/subcontractor-contracts/{contract}/retention-release-certificate', [SubcontractorMilestoneValuationController::class, 'generateRetentionReleaseCertificate']);
    Route::post('/milestone-verifications/{uuid}/generate-subcontractor-certificate', [SubcontractorMilestoneValuationController::class, 'generateCertificateFromMilestone']);
    Route::get('/projects/{project}/milestone-subcontractor-matrix', [SubcontractorMilestoneValuationController::class, 'getProjectMilestoneSubcontractorMatrix']);

    // Escrow Account Reconciliation & Automated Milestone Triggers (Phase 8 Day 4)
    Route::prefix('escrow-reconciliations')->group(function () {
        Route::get('/', [EscrowReconciliationController::class, 'index']);
        Route::post('/', [EscrowReconciliationController::class, 'store']);
        Route::get('/account/{account}', [EscrowReconciliationController::class, 'accountSummary']);
        Route::get('/project/{project}', [EscrowReconciliationController::class, 'projectSummary']);
        Route::get('/{uuid}', [EscrowReconciliationController::class, 'show']);
        Route::post('/items/{itemUuid}/resolve', [EscrowReconciliationController::class, 'resolveItem']);
        Route::post('/{uuid}/approve', [EscrowReconciliationController::class, 'approve']);
    });

    Route::prefix('milestone-triggers')->group(function () {
        Route::post('/verifications/{verification}/trigger', [AutomatedMilestoneTriggerController::class, 'triggerForVerification']);
        Route::post('/bulk-evaluate', [AutomatedMilestoneTriggerController::class, 'bulkEvaluate']);
        Route::get('/shortfall-alerts', [AutomatedMilestoneTriggerController::class, 'shortfallAlerts']);
        Route::get('/logs', [AutomatedMilestoneTriggerController::class, 'logs']);
    });

    // Retention Fund Accounting & Defect Liability Warranty Handover (Phase 8 Day 5)
    Route::prefix('retention-funds')->group(function () {
        Route::get('/statistics', [RetentionFundController::class, 'statistics']);
        Route::get('/', [RetentionFundController::class, 'index']);
        Route::get('/{uuid}', [RetentionFundController::class, 'show']);
        Route::get('/{uuid}/maturity-schedule', [RetentionFundController::class, 'maturitySchedule']);
        Route::post('/{uuid}/rectification-deduction', [RetentionFundController::class, 'rectificationDeduction']);
        Route::post('/{uuid}/release', [RetentionFundController::class, 'release']);
        Route::post('/{uuid}/start-dlp', [RetentionFundController::class, 'startDlp']);
    });

    Route::prefix('defect-certificates')->group(function () {
        Route::get('/', [DefectLiabilityCertificateController::class, 'index']);
        Route::post('/', [DefectLiabilityCertificateController::class, 'store']);
        Route::get('/{uuid}', [DefectLiabilityCertificateController::class, 'show']);
        Route::get('/{uuid}/snags-check', [DefectLiabilityCertificateController::class, 'snagsCheck']);
        Route::post('/{uuid}/sign-engineer', [DefectLiabilityCertificateController::class, 'signEngineer']);
        Route::post('/{uuid}/sign-qs', [DefectLiabilityCertificateController::class, 'signQs']);
        Route::post('/{uuid}/sign-client', [DefectLiabilityCertificateController::class, 'signClient']);
    });

    // Admin: User Management routes (stricter rate limit)
    Route::prefix('admin')->middleware('throttle:30,1')->group(function () {
        // User management
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users', [UserManagementController::class, 'store']);
        Route::get('/users/{uuid}', [UserManagementController::class, 'show']);
        Route::put('/users/{uuid}', [UserManagementController::class, 'update']);
        Route::delete('/users/{uuid}', [UserManagementController::class, 'destroy']);
        Route::post('/users/{uuid}/restore', [UserManagementController::class, 'restore']);
        Route::post('/users/{uuid}/roles', [UserManagementController::class, 'assignRoles']);
        Route::post('/users/{uuid}/permissions', [UserManagementController::class, 'assignPermissions']);

        // Role management
        Route::get('/roles', [RoleManagementController::class, 'index']);
        Route::post('/roles', [RoleManagementController::class, 'store']);
        Route::get('/roles/{id}', [RoleManagementController::class, 'show']);
        Route::put('/roles/{id}', [RoleManagementController::class, 'update']);
        Route::delete('/roles/{id}', [RoleManagementController::class, 'destroy']);
        Route::post('/roles/{id}/permissions', [RoleManagementController::class, 'assignPermissions']);

        // Permissions listing
        Route::get('/permissions', [RoleManagementController::class, 'permissions']);

        // Activity logs (Super Admin and Company Admin only)
        Route::get('/activities', [ActivityController::class, 'index']);
        Route::get('/activities/statistics', [ActivityController::class, 'statistics']);
        Route::get('/activities/{id}', [ActivityController::class, 'show']);
        
        // Company statistics
        Route::get('/companies/statistics', [CompanyController::class, 'statistics']);
        
        // Project statistics
        Route::get('/projects/statistics', [ProjectController::class, 'statistics']);
        
        // Site statistics
        Route::get('/sites/statistics', [SiteController::class, 'statistics']);
        
        // Unit statistics
        Route::get('/units/statistics', [UnitController::class, 'statistics']);
        
        // Client statistics
        Route::get('/clients/statistics', [ClientController::class, 'statistics']);
        
        // Payment statistics
        Route::get('/payments/statistics', [PaymentController::class, 'statistics']);
        
        // Document statistics
        Route::get('/documents/statistics', [DocumentController::class, 'statistics']);

        // Task statistics
        Route::get('/tasks/statistics', [TaskController::class, 'statistics']);

        // Material statistics
        Route::get('/materials/statistics', [MaterialController::class, 'statistics']);

        // Equipment statistics
        Route::get('/equipment/statistics', [EquipmentController::class, 'statistics']);

        // Quality Control & Inspection statistics
        Route::get('/inspections/statistics', [SiteInspectionController::class, 'statistics']);
        Route::get('/punch-lists/statistics', [PunchListItemController::class, 'statistics']);

        // Site Daily Logs & Safety statistics
        Route::get('/daily-logs/statistics', [SiteDailyLogController::class, 'statistics']);
        Route::get('/safety/statistics', [SafetyIncidentController::class, 'statistics']);

        // Savings Accounts Portfolio statistics
        Route::get('/savings-accounts/statistics', [SavingsAccountController::class, 'statistics']);

        // Financial Ledger & Transactions statistics
        Route::get('/transactions/statistics', [TransactionController::class, 'statistics']);

        // Subcontractor & Payment Certificates statistics
        Route::get('/subcontractor-contracts/statistics', [SubcontractorContractController::class, 'statistics']);
        Route::get('/payment-certificates/statistics', [PaymentCertificateController::class, 'statistics']);

        // Petty Cash & Expenses statistics (Phase 7 Day 4)
        Route::get('/petty-cash-accounts/statistics', [PettyCashAccountController::class, 'statistics']);
        Route::get('/expense-claims/statistics', [ExpenseClaimController::class, 'statistics']);

        // Financial Reports & Cost Accounting (Phase 7 Day 5)
        Route::get('/financial-reports/executive-summary', [FinancialReportController::class, 'executiveSummary']);
        Route::get('/financial-reports/budget-variance', [FinancialReportController::class, 'budgetVariance']);
        Route::get('/financial-reports/profitability', [FinancialReportController::class, 'profitability']);
        Route::get('/financial-reports/cash-flow-forecast', [FinancialReportController::class, 'cashFlowForecast']);
        Route::get('/financial-reports/compliance-audit', [FinancialReportController::class, 'complianceAudit']);

        // Milestone Payment Releases (Phase 8 Day 1)
        Route::get('/milestone-payment-releases/statistics', [MilestonePaymentReleaseController::class, 'statistics']);
    });
});
