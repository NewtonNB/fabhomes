<?php

use App\Models\User;
use App\Services\Notifications\RealtimeBroadcasterService;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Channel authorization callbacks using centralized RealtimeBroadcasterService.
|
*/

// Private Client Channel: Personalized alerts, financial receipts, milestone sign-offs
Broadcast::channel('client.{id}', function (User $user, $id) {
    return (new RealtimeBroadcasterService())->isUserAuthorizedForChannel($user, "client.{$id}");
});

// Private Ticket Channel: Live customer support conversation thread
Broadcast::channel('ticket.{id}', function (User $user, $id) {
    return (new RealtimeBroadcasterService())->isUserAuthorizedForChannel($user, "ticket.{$id}");
});

// Private Project Channel: Milestone inspection certification & progress updates
Broadcast::channel('project.{id}', function (User $user, $id) {
    return (new RealtimeBroadcasterService())->isUserAuthorizedForChannel($user, "project.{$id}");
});
