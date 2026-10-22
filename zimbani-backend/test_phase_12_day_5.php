<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\Document;
use App\Models\SavingsAccount;
use App\Models\SupportTicket;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Str;

echo "\n========================================================";
echo "\n   PHASE 12 DAY 5: VAULT, STATEMENTS & TICKETING TEST   ";
echo "\n========================================================\n\n";

$passed = 0;
$failed = 0;

function assertTest(bool $condition, string $message, &$passed, &$failed)
{
    if ($condition) {
        echo " [PASS] " . $message . "\n";
        $passed++;
    } else {
        echo " [FAIL] " . $message . "\n";
        $failed++;
    }
}

try {
    // 1. Client Registration
    $email = 'client.vault.' . time() . '@example.com';
    $password = 'Secret123!';
    $phone = '+25675' . rand(1000000, 9999999);

    $registerPayload = [
        'first_name' => 'Grace',
        'last_name' => 'Akello',
        'email' => $email,
        'phone_primary' => $phone,
        'password' => $password,
        'password_confirmation' => $password,
        'pin' => '4321',
    ];

    $response = app()->handle(
        \Illuminate\Http\Request::create('/api/v1/client-portal/auth/register', 'POST', $registerPayload)
    );
    $regData = json_decode($response->getContent(), true);
    assertTest($response->getStatusCode() === 201, 'Client registration returns HTTP 201', $passed, $failed);
    $token = $regData['data']['token'];
    $user = User::where('email', $email)->first();
    $client = Client::where('email', $email)->first();

    // 2. Seed Digital Documents in Vault
    $doc1 = Document::create([
        'uuid' => (string) Str::uuid(),
        'title' => 'Plot Reservation & Sale Agreement (Plot 45 Kigumba)',
        'description' => 'Official bilateral sale contract signed by Fab Homes legal counsel.',
        'document_type' => 'contract',
        'file_name' => 'Plot_45_Reservation_Contract.pdf',
        'file_path' => 'documents/contracts/plot_45.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1024 * 450, // 450 KB
        'documentable_type' => Client::class,
        'documentable_id' => $client->id,
        'uploaded_by' => 1,
        'is_verified' => true,
    ]);

    $doc2 = Document::create([
        'uuid' => (string) Str::uuid(),
        'title' => 'Certified Boundary Deed Plan & Cadastral Print',
        'description' => 'Survey diagram signed by Commissioner of Surveys.',
        'document_type' => 'title_deed',
        'file_name' => 'Deed_Plan_DP_2026_WK.pdf',
        'file_path' => 'documents/deeds/deed_plan_45.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1024 * 1200,
        'documentable_type' => Client::class,
        'documentable_id' => $client->id,
        'uploaded_by' => 1,
        'is_verified' => true,
    ]);

    assertTest($doc1 && $doc2, 'Seeded official contracts and deed plans in vault', $passed, $failed);

    // 3. Test GET /api/v1/client-portal/documents
    $getDocsReq = \Illuminate\Http\Request::create('/api/v1/client-portal/documents', 'GET');
    $getDocsReq->headers->set('Authorization', 'Bearer ' . $token);
    $getDocsRes = app()->handle($getDocsReq);
    $docsData = json_decode($getDocsRes->getContent(), true);

    assertTest($getDocsRes->getStatusCode() === 200, 'Documents vault query returns HTTP 200', $passed, $failed);
    assertTest($docsData['data']['total_count'] >= 2, 'Vault returns at least 2 registered documents', $passed, $failed);
    assertTest($docsData['data']['categories']['contracts'] >= 1, 'Categories summary counts contracts', $passed, $failed);
    assertTest($docsData['data']['categories']['title_deeds'] >= 1, 'Categories summary counts title deeds', $passed, $failed);

    // 4. Test Filtered Document Query
    $filterDocsReq = \Illuminate\Http\Request::create('/api/v1/client-portal/documents?document_type=contract', 'GET');
    $filterDocsReq->headers->set('Authorization', 'Bearer ' . $token);
    $filterDocsRes = app()->handle($filterDocsReq);
    $filteredDocsData = json_decode($filterDocsRes->getContent(), true);

    assertTest($filterDocsRes->getStatusCode() === 200, 'Filtered documents query returns HTTP 200', $passed, $failed);
    assertTest($filteredDocsData['data']['documents'][0]['document_type'] === 'contract', 'Returned document is strictly of type "contract"', $passed, $failed);

    // 5. Seed Savings Account & Transactions for Financial Statement
    $account = SavingsAccount::create([
        'uuid' => (string) Str::uuid(),
        'account_number' => 'SAV-STM-' . rand(100, 999),
        'client_id' => $client->id,
        'scheme_name' => 'Kigumba Land Acquisition Savings',
        'account_type' => 'land_saving',
        'target_amount' => 35000000.00,
        'current_balance' => 8000000.00,
        'status' => 'active',
    ]);

    Transaction::create([
        'uuid' => (string) Str::uuid(),
        'account_id' => $account->id,
        'client_id' => $client->id,
        'transaction_type' => 'credit',
        'amount' => 5000000.00,
        'currency' => 'UGX',
        'status' => 'completed',
        'transaction_date' => now()->subDays(30),
        'value_date' => now()->subDays(30)->toDateString(),
        'description' => 'Initial Scheme Deposit via MTN MoMo',
        'narration' => 'Initial deposit',
        'reference_number' => 'INT-STM-001',
    ]);

    Transaction::create([
        'uuid' => (string) Str::uuid(),
        'account_id' => $account->id,
        'client_id' => $client->id,
        'transaction_type' => 'credit',
        'amount' => 3000000.00,
        'currency' => 'UGX',
        'status' => 'completed',
        'transaction_date' => now()->subDays(10),
        'value_date' => now()->subDays(10)->toDateString(),
        'description' => 'Monthly Savings Installment via Stanbic Visa',
        'narration' => 'Monthly installment',
        'reference_number' => 'INT-STM-002',
    ]);

    // 6. Test GET /api/v1/client-portal/statements
    $getStmtReq = \Illuminate\Http\Request::create('/api/v1/client-portal/statements?account_id=' . $account->id, 'GET');
    $getStmtReq->headers->set('Authorization', 'Bearer ' . $token);
    $getStmtRes = app()->handle($getStmtReq);
    $stmtData = json_decode($getStmtRes->getContent(), true);

    assertTest($getStmtRes->getStatusCode() === 200, 'Account statement query returns HTTP 200', $passed, $failed);
    assertTest(!empty($stmtData['data']['header']['statement_reference']), 'Statement header has unique reference', $passed, $failed);
    assertTest($stmtData['data']['financial_summary']['total_deposits'] == 8000000.00, 'Statement total deposits equals 8,000,000 UGX', $passed, $failed);
    assertTest($stmtData['data']['financial_summary']['net_closing_balance'] == 8000000.00, 'Closing balance equals 8,000,000 UGX', $passed, $failed);
    assertTest(count($stmtData['data']['entries']) === 2, 'Ledger contains 2 chronological entries', $passed, $failed);
    assertTest($stmtData['data']['entries'][1]['running_balance'] == 8000000.00, 'Line item running balance accurately computed to 8,000,000 UGX', $passed, $failed);

    // 7. Test POST /api/v1/client-portal/support/tickets (Create Ticket)
    $createTicketPayload = [
        'subject' => 'Deed Plan Mutation Timeline Question',
        'message' => 'Hello team, I would like to inquire when the Wakiso MZO surveyor inspection report will be completed for Plot 45.',
        'category' => 'title_deed',
        'priority' => 'high',
        'savings_account_id' => $account->id,
    ];
    $ticketReq = \Illuminate\Http\Request::create('/api/v1/client-portal/support/tickets', 'POST', $createTicketPayload);
    $ticketReq->headers->set('Authorization', 'Bearer ' . $token);
    $ticketRes = app()->handle($ticketReq);
    $ticketData = json_decode($ticketRes->getContent(), true);

    assertTest($ticketRes->getStatusCode() === 201, 'Create support ticket returns HTTP 201 Created', $passed, $failed);
    assertTest(!empty($ticketData['data']['ticket_number']), 'Support ticket number generated (e.g. TCK-2026-XXXX)', $passed, $failed);
    assertTest($ticketData['data']['status'] === 'open', 'Initial ticket status is "open"', $passed, $failed);
    assertTest(count($ticketData['data']['messages']) === 1, 'Initial client message created in ticket conversation', $passed, $failed);

    $ticketUuid = $ticketData['data']['uuid'];

    // 8. Test GET /api/v1/client-portal/support/tickets (List Tickets)
    $getTicketsReq = \Illuminate\Http\Request::create('/api/v1/client-portal/support/tickets', 'GET');
    $getTicketsReq->headers->set('Authorization', 'Bearer ' . $token);
    $getTicketsRes = app()->handle($getTicketsReq);
    $listTicketsData = json_decode($getTicketsRes->getContent(), true);

    assertTest($getTicketsRes->getStatusCode() === 200, 'Support tickets list returns HTTP 200', $passed, $failed);
    assertTest($listTicketsData['data']['open_count'] >= 1, 'Open tickets counter reflects active ticket', $passed, $failed);
    assertTest($listTicketsData['data']['tickets'][0]['uuid'] === $ticketUuid, 'Ticket list includes newly created ticket', $passed, $failed);

    // 9. Test GET /api/v1/client-portal/support/tickets/{uuid} (Ticket Details)
    $getDetailsReq = \Illuminate\Http\Request::create("/api/v1/client-portal/support/tickets/{$ticketUuid}", 'GET');
    $getDetailsReq->headers->set('Authorization', 'Bearer ' . $token);
    $getDetailsRes = app()->handle($getDetailsReq);
    $detailsData = json_decode($getDetailsRes->getContent(), true);

    assertTest($getDetailsRes->getStatusCode() === 200, 'Ticket details returns HTTP 200', $passed, $failed);
    assertTest($detailsData['data']['subject'] === 'Deed Plan Mutation Timeline Question', 'Subject matches ticket creation input', $passed, $failed);

    // 10. Test POST /api/v1/client-portal/support/tickets/{uuid}/reply
    $replyPayload = [
        'message' => 'Also attaching a copy of my national ID in case the registrar requires proof of identification.',
    ];
    $replyReq = \Illuminate\Http\Request::create("/api/v1/client-portal/support/tickets/{$ticketUuid}/reply", 'POST', $replyPayload);
    $replyReq->headers->set('Authorization', 'Bearer ' . $token);
    $replyRes = app()->handle($replyReq);
    $replyData = json_decode($replyRes->getContent(), true);

    assertTest($replyRes->getStatusCode() === 201, 'Reply to ticket returns HTTP 201 Created', $passed, $failed);
    assertTest($replyData['data']['sender_type'] === 'client', 'Reply message sender is "client"', $passed, $failed);

    // 11. Test POST /api/v1/client-portal/support/tickets/{uuid}/close
    $closeReq = \Illuminate\Http\Request::create("/api/v1/client-portal/support/tickets/{$ticketUuid}/close", 'POST');
    $closeReq->headers->set('Authorization', 'Bearer ' . $token);
    $closeRes = app()->handle($closeReq);
    $closeData = json_decode($closeRes->getContent(), true);

    assertTest($closeRes->getStatusCode() === 200, 'Close support ticket returns HTTP 200', $passed, $failed);
    assertTest($closeData['data']['status'] === 'closed', 'Ticket status updated to "closed"', $passed, $failed);
    assertTest(!empty($closeData['data']['resolved_at']), 'Ticket resolved_at timestamp populated', $passed, $failed);

} catch (\Exception $e) {
    echo " [ERROR] Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    $failed++;
}

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "--------------------------------------------------------\n\n";

exit($failed > 0 ? 1 : 0);
