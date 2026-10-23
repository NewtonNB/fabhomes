<?php

/**
 * Phase 13 Day 3 Verification Script
 * Real-Time Event Broadcasting & WebSocket Subscriptions
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Events\MilestoneInspectionBroadcastEvent;
use App\Events\NotificationBroadcastEvent;
use App\Events\SavingsDepositBroadcastEvent;
use App\Events\TicketMessageBroadcastEvent;
use App\Models\AppNotification;
use App\Models\Client;
use App\Models\Company;
use App\Models\Project;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\Unit;
use App\Models\User;
use App\Services\ClientDocumentSupportService;
use App\Services\Notifications\NotificationDispatcherService;
use App\Services\Notifications\RealtimeBroadcasterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

echo "\n========================================================\n";
echo "   PHASE 13 DAY 3: REAL-TIME BROADCASTING TEST         \n";
echo "========================================================\n\n";

$passCount = 0;
$failCount = 0;

function assertCondition(bool $condition, string $message, &$passCount, &$failCount) {
    if ($condition) {
        echo " [PASS] {$message}\n";
        $passCount++;
    } else {
        echo " [FAIL] {$message}\n";
        $failCount++;
    }
}

// 1. Setup Test Company, Project, User, Client & Support Ticket
$company = Company::first() ?? Company::create([
    'name' => 'Fab Homes Ltd',
    'email' => 'info@fabhomes.ug',
    'phone' => '+256312000000',
    'address' => 'Kampala, Uganda',
    'status' => 'active',
]);

$project = Project::first() ?? Project::create([
    'uuid' => (string) Str::uuid(),
    'company_id' => $company->id,
    'name' => 'Lake View Heights',
    'status' => 'active',
]);

$testEmail = 'broadcaster.' . Str::random(6) . '@fabhomes.ug';
$testPhone = '+25678' . rand(1000000, 9999999);

$user = User::create([
    'name' => 'Realtime Subscriber',
    'email' => $testEmail,
    'phone' => $testPhone,
    'password' => Hash::make('Secret123!'),
    'status' => 'active',
]);

$strangerUser = User::create([
    'name' => 'Unrelated User',
    'email' => 'stranger.' . Str::random(6) . '@fabhomes.ug',
    'phone' => '+25678' . rand(1000000, 9999999),
    'password' => Hash::make('Secret123!'),
    'status' => 'active',
]);

$client = Client::create([
    'user_id' => $user->id,
    'client_number' => 'CLT-RT-' . rand(1000, 9999),
    'first_name' => 'Realtime',
    'last_name' => 'Client',
    'email' => $testEmail,
    'phone_primary' => $testPhone,
    'country' => 'Uganda',
    'status' => 'active',
]);

$ticket = SupportTicket::create([
    'ticket_number' => 'TCK-RT-' . rand(1000, 9999),
    'client_id' => $client->id,
    'user_id' => $user->id,
    'subject' => 'Real-Time Chat Inquiry',
    'category' => 'savings_query',
    'priority' => 'high',
    'status' => 'open',
]);

$ticketMessage = SupportTicketMessage::create([
    'support_ticket_id' => $ticket->id,
    'user_id' => $user->id,
    'sender_type' => 'client',
    'sender_name' => $user->name,
    'message' => 'Hello concierge, testing real-time socket delivery.',
]);

assertCondition($user->id > 0, "Test subscriber user registered with ID: {$user->id}", $passCount, $failCount);
assertCondition($ticket->id > 0, "Test support ticket created with ID: {$ticket->id}", $passCount, $failCount);

// 2. Channel Authorization Callback Verification
$broadcasterService = new RealtimeBroadcasterService();

// A. client.{id}
$clientChannelAuth = $broadcasterService->isUserAuthorizedForChannel($user, 'private-client.' . $user->id);
assertCondition($clientChannelAuth === true, "User authorized for own private-client channel", $passCount, $failCount);

$strangerClientAuth = $broadcasterService->isUserAuthorizedForChannel($strangerUser, 'private-client.' . $user->id);
assertCondition($strangerClientAuth === false, "Stranger correctly denied access to other user's private channel", $passCount, $failCount);

// B. ticket.{id}
$ticketChannelAuth = $broadcasterService->isUserAuthorizedForChannel($user, 'private-ticket.' . $ticket->id);
assertCondition($ticketChannelAuth === true, "Ticket owner authorized for private-ticket channel", $passCount, $failCount);

$strangerTicketAuth = $broadcasterService->isUserAuthorizedForChannel($strangerUser, 'private-ticket.' . $ticket->id);
assertCondition($strangerTicketAuth === false, "Stranger correctly denied access to private ticket channel", $passCount, $failCount);

// 3. Core Broadcast Events Testing
// A. NotificationBroadcastEvent
$notification = new AppNotification([
    'uuid' => (string) Str::uuid(),
    'type' => 'savings_deposit',
    'title' => 'Deposit Confirmed',
    'message' => 'Your deposit of 5,000,000 UGX was credited.',
    'category' => 'financial',
    'priority' => 'normal',
    'action_url' => '/client-portal?tab=savings',
]);
$notification->id = 101;
$notification->created_at = now();

$notifEvent = new NotificationBroadcastEvent($user->id, $notification);
assertCondition($notifEvent instanceof \Illuminate\Contracts\Broadcasting\ShouldBroadcastNow, "NotificationBroadcastEvent implements ShouldBroadcastNow", $passCount, $failCount);
assertCondition($notifEvent->broadcastAs() === 'notification.received', "Broadcast event alias is 'notification.received'", $passCount, $failCount);
assertCondition($notifEvent->broadcastOn()[0]->name === 'private-client.' . $user->id, "Broadcasts on private-client channel", $passCount, $failCount);
assertCondition($notifEvent->broadcastWith()['title'] === 'Deposit Confirmed', "Event payload contains notification title", $passCount, $failCount);

// B. MilestoneInspectionBroadcastEvent
$milestoneEvent = new MilestoneInspectionBroadcastEvent($user->id, $project->id, [
    'verification_uuid' => 'ver-uuid-1234',
    'milestone_name' => 'Substructure Foundation',
    'project_name' => $project->name,
    'status' => 'certified',
    'release_amount' => 12000000,
    'sign_off_required' => true,
]);
assertCondition($milestoneEvent->broadcastAs() === 'milestone.inspection_updated', "Milestone inspection alias is 'milestone.inspection_updated'", $passCount, $failCount);
assertCondition(count($milestoneEvent->broadcastOn()) === 2, "Milestone inspection broadcasts on client and project channels", $passCount, $failCount);
assertCondition($milestoneEvent->broadcastWith()['release_amount'] === 12000000, "Milestone payload contains release_amount", $passCount, $failCount);

// C. TicketMessageBroadcastEvent
$ticketMsgEvent = new TicketMessageBroadcastEvent($ticket->id, $ticketMessage, $user->name);
assertCondition($ticketMsgEvent->broadcastAs() === 'ticket.message_sent', "Ticket message alias is 'ticket.message_sent'", $passCount, $failCount);
assertCondition($ticketMsgEvent->broadcastOn()[0]->name === 'private-ticket.' . $ticket->id, "Ticket message broadcasts on private-ticket channel", $passCount, $failCount);
assertCondition($ticketMsgEvent->broadcastWith()['sender_name'] === $user->name, "Ticket payload contains sender name", $passCount, $failCount);

// D. SavingsDepositBroadcastEvent
$depositEvent = new SavingsDepositBroadcastEvent($user->id, [
    'account_number' => 'SA-2026-001',
    'amount' => 2500000,
    'new_balance' => 9500000,
    'transaction_number' => 'TX-2026-99',
]);
assertCondition($depositEvent->broadcastAs() === 'savings.deposit_confirmed', "Deposit alias is 'savings.deposit_confirmed'", $passCount, $failCount);
assertCondition($depositEvent->broadcastOn()[0]->name === 'private-client.' . $user->id, "Deposit broadcasts on private-client channel", $passCount, $failCount);
assertCondition($depositEvent->broadcastWith()['new_balance'] === 9500000, "Deposit payload contains updated new_balance", $passCount, $failCount);

// 4. RealtimeBroadcasterService Methods
$broadcasterService = new RealtimeBroadcasterService();
$e1 = $broadcasterService->broadcastNotification($user->id, $notification);
assertCondition($e1 instanceof NotificationBroadcastEvent, "broadcastNotification dispatches event successfully", $passCount, $failCount);

$e2 = $broadcasterService->broadcastSavingsDeposit($user->id, ['amount' => 1000000]);
assertCondition($e2 instanceof SavingsDepositBroadcastEvent, "broadcastSavingsDeposit dispatches event successfully", $passCount, $failCount);

$e3 = $broadcasterService->broadcastMilestoneInspection($user->id, $project->id, ['milestone_name' => 'Wall Plate']);
assertCondition($e3 instanceof MilestoneInspectionBroadcastEvent, "broadcastMilestoneInspection dispatches event successfully", $passCount, $failCount);

$e4 = $broadcasterService->broadcastTicketMessage($ticket->id, $ticketMessage);
assertCondition($e4 instanceof TicketMessageBroadcastEvent, "broadcastTicketMessage dispatches event successfully", $passCount, $failCount);

$authorizedChannels = $broadcasterService->getUserAuthorizedChannels($user);
assertCondition(in_array('client.' . $user->id, $authorizedChannels), "Authorized channels includes user's client channel", $passCount, $failCount);
assertCondition(in_array('ticket.' . $ticket->id, $authorizedChannels), "Authorized channels includes user's ticket channel", $passCount, $failCount);

// 5. API Endpoints Verification
$controller = new \App\Http\Controllers\Api\BroadcastingController($broadcasterService);

// GET /api/v1/broadcasting/channels
$reqChannels = Request::create('/api/v1/broadcasting/channels', 'GET');
$reqChannels->setUserResolver(fn() => $user);
$respChannels = $controller->getChannels($reqChannels);
$channelsData = $respChannels->getData(true);
assertCondition($respChannels->getStatusCode() === 200, "GET /api/v1/broadcasting/channels returns HTTP 200", $passCount, $failCount);
assertCondition(isset($channelsData['data']['channels']) && count($channelsData['data']['channels']) >= 2, "Channels endpoint returns list of user channels", $passCount, $failCount);

// POST /api/v1/broadcasting/test-broadcast
$reqTest = Request::create('/api/v1/broadcasting/test-broadcast', 'POST', [
    'event_type' => 'notification',
    'title' => 'Live Socket Ping',
    'message' => 'Testing live browser delivery.',
]);
$reqTest->setUserResolver(fn() => $user);
$respTest = $controller->testBroadcast($reqTest);
$testData = $respTest->getData(true);
assertCondition($respTest->getStatusCode() === 200, "POST /api/v1/broadcasting/test-broadcast returns HTTP 200", $passCount, $failCount);
assertCondition($testData['data']['event'] === 'NotificationBroadcastEvent', "Test broadcast endpoint triggered NotificationBroadcastEvent", $passCount, $failCount);

// 6. Integration: NotificationDispatcherService triggers real-time broadcast
$dispatcher = new NotificationDispatcherService(null, null, null, $broadcasterService);
$dispatched = $dispatcher->notifySavingsDeposit($user, 4000000, 'SA-TEST-RT', 18000000);
assertCondition(isset($dispatched['notification']), "Dispatcher executed notifySavingsDeposit", $passCount, $failCount);

// 7. Integration: ClientDocumentSupportService triggers ticket message broadcast
$supportService = app(ClientDocumentSupportService::class);
$reply = $supportService->replyToTicket($user, $ticket->id, 'Testing automatic socket reply broadcast');
assertCondition($reply instanceof SupportTicketMessage, "SupportService replyToTicket created message", $passCount, $failCount);
assertCondition($reply->message === 'Testing automatic socket reply broadcast', "Reply text matches input", $passCount, $failCount);

echo "\n--------------------------------------------------------\n";
echo " TEST SUMMARY: {$passCount} Passed, {$failCount} Failed\n";
echo "--------------------------------------------------------\n\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
