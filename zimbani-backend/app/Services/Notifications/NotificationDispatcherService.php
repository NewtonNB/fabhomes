<?php

namespace App\Services\Notifications;

use App\Models\AppNotification;
use App\Models\Client;
use App\Models\ClientSecurityProfile;
use App\Models\NotificationDispatchLog;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Services\Notifications\Contracts\EmailDriverInterface;
use App\Services\Notifications\Contracts\SmsDriverInterface;
use App\Services\Notifications\Contracts\WhatsAppDriverInterface;
use App\Services\Notifications\Drivers\AfricasTalkingSmsDriver;
use App\Services\Notifications\Drivers\BrandedEmailDriver;
use App\Services\Notifications\Drivers\MetaWhatsAppCloudDriver;
use App\Services\Notifications\Drivers\MockSmsDriver;
use App\Services\Notifications\Drivers\MockWhatsAppDriver;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationDispatcherService
{
    protected SmsDriverInterface $smsDriver;
    protected EmailDriverInterface $emailDriver;
    protected WhatsAppDriverInterface $whatsappDriver;
    protected RealtimeBroadcasterService $broadcaster;

    public function __construct(
        ?SmsDriverInterface $smsDriver = null,
        ?EmailDriverInterface $emailDriver = null,
        ?WhatsAppDriverInterface $whatsappDriver = null,
        ?RealtimeBroadcasterService $broadcaster = null
    ) {
        $this->smsDriver = $smsDriver ?? (
            app()->environment('testing')
                ? new MockSmsDriver()
                : new AfricasTalkingSmsDriver()
        );
        $this->emailDriver = $emailDriver ?? new BrandedEmailDriver();
        $this->whatsappDriver = $whatsappDriver ?? (
            app()->environment('testing')
                ? new MockWhatsAppDriver()
                : new MetaWhatsAppCloudDriver()
        );
        $this->broadcaster = $broadcaster ?? new RealtimeBroadcasterService();
    }

    /**
     * Dispatch notification across enabled/requested channels
     */
    public function dispatchToUser(User $user, array $params): array
    {
        $type = $params['type'] ?? 'system_notice';
        $title = $params['title'] ?? 'Notice from Fab Homes';
        $message = $params['message'] ?? '';
        $category = $params['category'] ?? 'general';
        $priority = $params['priority'] ?? 'normal';
        $actionUrl = $params['action_url'] ?? null;
        $data = $params['data'] ?? [];
        $explicitChannels = $params['channels'] ?? null;

        // Resolve linked client if available
        $client = Client::where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        // Check client preferences
        $preferences = $this->resolvePreferences($user, $client);

        return DB::transaction(function () use (
            $user,
            $client,
            $type,
            $title,
            $message,
            $category,
            $priority,
            $actionUrl,
            $data,
            $explicitChannels,
            $preferences
        ) {
            // 1. Always create the in-app notification record
            $notification = AppNotification::create([
                'user_id' => $user->id,
                'client_id' => $client?->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $actionUrl,
                'data' => $data,
                'category' => $category,
                'priority' => $priority,
                'read_at' => null,
                'is_dismissed' => false,
            ]);

            // Real-Time Event Broadcast to private client WebSocket channel
            $this->broadcaster->broadcastNotification($user->id, $notification);

            // Log in-app delivery
            NotificationDispatchLog::create([
                'notification_id' => $notification->id,
                'recipient_type' => 'User',
                'recipient_id' => $user->id,
                'recipient_phone' => $user->phone ?? $client?->phone_primary,
                'recipient_email' => $user->email,
                'channel' => 'in_app',
                'status' => 'delivered',
                'gateway_provider' => 'internal_db',
                'gateway_message_id' => 'INAPP-' . $notification->uuid,
                'cost_ugx' => 0.00,
                'dispatched_at' => now(),
            ]);

            $results = [
                'notification' => $notification,
                'channels' => ['in_app' => ['status' => 'delivered']],
            ];

            // 2. Dispatch SMS channel
            $shouldSendSms = $explicitChannels
                ? in_array('sms', $explicitChannels)
                : ($preferences['sms'] ?? true);

            $recipientPhone = $user->phone ?? $client?->phone_primary;

            if ($shouldSendSms && !empty($recipientPhone)) {
                $smsText = "Fab Homes: {$title} - {$message}";
                $smsRes = $this->smsDriver->sendSms($recipientPhone, $smsText);

                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'recipient_phone' => $recipientPhone,
                    'recipient_email' => $user->email,
                    'channel' => 'sms',
                    'status' => $smsRes['success'] ? 'delivered' : 'failed',
                    'gateway_provider' => $smsRes['gateway_provider'] ?? 'africas_talking',
                    'gateway_message_id' => $smsRes['message_id'] ?? null,
                    'response_payload' => $smsRes['raw'] ?? [],
                    'error_message' => $smsRes['error'] ?? null,
                    'cost_ugx' => $smsRes['cost_ugx'] ?? 0.00,
                    'dispatched_at' => now(),
                ]);

                $results['channels']['sms'] = [
                    'status' => $smsRes['success'] ? 'delivered' : 'failed',
                    'message_id' => $smsRes['message_id'] ?? null,
                    'error' => $smsRes['error'] ?? null,
                ];
            } elseif ($shouldSendSms && empty($recipientPhone)) {
                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'channel' => 'sms',
                    'status' => 'failed',
                    'error_message' => 'No phone number available for recipient',
                    'dispatched_at' => now(),
                ]);
            } else {
                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'channel' => 'sms',
                    'status' => 'skipped_preference',
                    'dispatched_at' => now(),
                ]);
            }

            // 3. Dispatch Email channel
            $shouldSendEmail = $explicitChannels
                ? in_array('email', $explicitChannels)
                : ($preferences['email'] ?? true);

            $recipientEmail = $user->email ?? $client?->email;

            if ($shouldSendEmail && !empty($recipientEmail)) {
                $emailData = array_merge($data, [
                    'category' => $category,
                    'action_url' => $actionUrl,
                ]);

                $emailRes = $this->emailDriver->sendEmail($recipientEmail, $title, $message, $emailData);

                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'recipient_phone' => $recipientPhone,
                    'recipient_email' => $recipientEmail,
                    'channel' => 'email',
                    'status' => $emailRes['success'] ? 'delivered' : 'failed',
                    'gateway_provider' => $emailRes['gateway_provider'] ?? 'smtp_mail',
                    'gateway_message_id' => $emailRes['message_id'] ?? null,
                    'response_payload' => $emailRes['raw'] ?? [],
                    'error_message' => $emailRes['error'] ?? null,
                    'cost_ugx' => 0.00,
                    'dispatched_at' => now(),
                ]);

                $results['channels']['email'] = [
                    'status' => $emailRes['success'] ? 'delivered' : 'failed',
                    'message_id' => $emailRes['message_id'] ?? null,
                    'error' => $emailRes['error'] ?? null,
                ];
            }

            // 4. Dispatch WhatsApp channel
            $shouldSendWhatsApp = $explicitChannels
                ? in_array('whatsapp', $explicitChannels)
                : ($preferences['whatsapp'] ?? false);

            if ($shouldSendWhatsApp && !empty($recipientPhone)) {
                $templateName = $this->resolveWhatsAppTemplate($type);
                $templateParams = [$title, $message];
                $buttons = [
                    ['sub_type' => 'quick_reply', 'payload' => 'VIEW_LEDGER'],
                ];

                $waRes = $this->whatsappDriver->sendTemplateMessage(
                    $recipientPhone,
                    $templateName,
                    $templateParams,
                    $buttons
                );

                // Save to whatsapp_messages table
                WhatsAppMessage::create([
                    'user_id' => $user->id,
                    'client_id' => $client?->id,
                    'notification_id' => $notification->id,
                    'direction' => 'outbound',
                    'wa_message_id' => $waRes['message_id'] ?? null,
                    'phone_number' => $recipientPhone,
                    'message_type' => 'template',
                    'template_name' => $templateName,
                    'body' => "{$title}: {$message}",
                    'payload' => $waRes['raw'] ?? [],
                    'status' => $waRes['success'] ? 'sent' : 'failed',
                    'error_message' => $waRes['error'] ?? null,
                    'sent_at' => $waRes['success'] ? now() : null,
                ]);

                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'recipient_phone' => $recipientPhone,
                    'recipient_email' => $user->email,
                    'channel' => 'whatsapp',
                    'status' => $waRes['success'] ? 'dispatched' : 'failed',
                    'gateway_provider' => $waRes['gateway_provider'] ?? 'meta_whatsapp_cloud',
                    'gateway_message_id' => $waRes['message_id'] ?? null,
                    'response_payload' => $waRes['raw'] ?? [],
                    'error_message' => $waRes['error'] ?? null,
                    'cost_ugx' => 0.00,
                    'dispatched_at' => now(),
                ]);

                $results['channels']['whatsapp'] = [
                    'status' => $waRes['success'] ? 'dispatched' : 'failed',
                    'message_id' => $waRes['message_id'] ?? null,
                    'error' => $waRes['error'] ?? null,
                ];
            } elseif ($shouldSendWhatsApp && empty($recipientPhone)) {
                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'channel' => 'whatsapp',
                    'status' => 'failed',
                    'error_message' => 'No phone number available for WhatsApp recipient',
                    'dispatched_at' => now(),
                ]);
            } else {
                NotificationDispatchLog::create([
                    'notification_id' => $notification->id,
                    'recipient_type' => 'User',
                    'recipient_id' => $user->id,
                    'channel' => 'whatsapp',
                    'status' => 'skipped_preference',
                    'dispatched_at' => now(),
                ]);
            }

            return $results;
        });
    }

    /**
     * Resolve WhatsApp template name based on notification type
     */
    protected function resolveWhatsAppTemplate(string $type): string
    {
        return match ($type) {
            'savings_deposit' => 'savings_deposit_receipt',
            'milestone_approval_required' => 'milestone_approval_prompt',
            'plot_reservation' => 'plot_reservation_notice',
            'deed_status_update' => 'title_deed_status_alert',
            'support_reply' => 'support_ticket_update',
            default => 'client_general_notice',
        };
    }

    /**
     * Resolve notification preferences from ClientSecurityProfile
     */
    protected function resolvePreferences(User $user, ?Client $client): array
    {
        $default = [
            'sms' => true,
            'email' => true,
            'whatsapp' => false,
            'push' => true,
        ];

        $profile = ClientSecurityProfile::where('user_id', $user->id)
            ->when($client, fn($q) => $q->orWhere('client_id', $client->id))
            ->first();

        if ($profile && is_array($profile->notification_channels)) {
            return array_merge($default, $profile->notification_channels);
        }

        return $default;
    }

    /**
     * Domain Dispatcher: Savings Deposit Confirmation
     */
    public function notifySavingsDeposit(User $user, float $amount, string $accountNumber, float $balance): array
    {
        $formattedAmt = number_format($amount, 0) . ' UGX';
        $formattedBal = number_format($balance, 0) . ' UGX';

        $this->broadcaster->broadcastSavingsDeposit($user->id, [
            'amount' => $amount,
            'account_number' => $accountNumber,
            'balance' => $balance,
        ]);

        return $this->dispatchToUser($user, [
            'type' => 'savings_deposit',
            'category' => 'financial',
            'priority' => 'normal',
            'title' => 'Deposit Confirmed: ' . $formattedAmt,
            'message' => "We have successfully received your deposit of {$formattedAmt} towards account {$accountNumber}. Your updated ledger balance is {$formattedBal}.",
            'action_url' => '/client-portal?tab=savings',
            'data' => [
                'amount' => $amount,
                'account_number' => $accountNumber,
                'balance' => $balance,
            ],
        ]);
    }

    /**
     * Domain Dispatcher: Construction Milestone Approval Required
     */
    public function notifyMilestoneApprovalRequired(
        User $user,
        string $milestoneName,
        string $projectName,
        float $releaseAmount,
        string $verificationUuid
    ): array {
        $formattedAmt = number_format($releaseAmount, 0) . ' UGX';

        $this->broadcaster->broadcastMilestoneInspection($user->id, 0, [
            'milestone_name' => $milestoneName,
            'project_name' => $projectName,
            'release_amount' => $releaseAmount,
            'verification_uuid' => $verificationUuid,
            'sign_off_required' => true,
        ]);

        return $this->dispatchToUser($user, [
            'type' => 'milestone_approval_required',
            'category' => 'construction',
            'priority' => 'high',
            'title' => "Milestone Sign-Off Required: {$milestoneName}",
            'message' => "Inspection photos for '{$milestoneName}' at {$projectName} have been certified by the site supervisor. Please review progress photos and enter your Quick-PIN to release {$formattedAmt}.",
            'action_url' => '/client-portal?tab=milestones&verification=' . $verificationUuid,
            'data' => [
                'milestone_name' => $milestoneName,
                'project_name' => $projectName,
                'release_amount' => $releaseAmount,
                'verification_uuid' => $verificationUuid,
            ],
        ]);
    }

    /**
     * Domain Dispatcher: Plot Reservation Confirmed
     */
    public function notifyPlotReserved(User $user, string $plotNumber, string $projectName, int $holdDays = 14): array
    {
        return $this->dispatchToUser($user, [
            'type' => 'plot_reservation',
            'category' => 'legal',
            'priority' => 'normal',
            'title' => "Plot {$plotNumber} Reserved at {$projectName}",
            'message' => "Your 14-day statutory hold on Plot {$plotNumber} at {$projectName} has been registered. Complete initial deposit before expiry to finalize sale.",
            'action_url' => '/client-portal?tab=plots',
            'data' => [
                'plot_number' => $plotNumber,
                'project_name' => $projectName,
                'hold_days' => $holdDays,
            ],
        ]);
    }

    /**
     * Domain Dispatcher: Title Deed Status Update
     */
    public function notifyDeedStatus(User $user, string $deedNumber, string $stage): array
    {
        $stageLabels = [
            'survey_submitted' => 'Boundary Survey Lodged',
            'deed_plan_approved' => 'Ministry Deed Plan Approved',
            'ministry_stamping' => 'Revenue Authority Assessment & Stamping',
            'white_page_registration' => 'White Page Registration',
            'deed_ready' => 'Title Deed Ready for Handover',
        ];
        $stageLabel = $stageLabels[$stage] ?? ucfirst(str_replace('_', ' ', $stage));

        return $this->dispatchToUser($user, [
            'type' => 'deed_status_update',
            'category' => 'legal',
            'priority' => 'normal',
            'title' => "Title Deed Update: {$deedNumber}",
            'message' => "Your land title deed ({$deedNumber}) has progressed to stage: {$stageLabel}.",
            'action_url' => '/client-portal?tab=deeds',
            'data' => [
                'deed_number' => $deedNumber,
                'stage' => $stage,
                'stage_label' => $stageLabel,
            ],
        ]);
    }

    /**
     * Domain Dispatcher: Support Ticket Reply
     */
    public function notifySupportReply(User $user, string $ticketNumber, string $subject, string $agentName): array
    {
        return $this->dispatchToUser($user, [
            'type' => 'support_reply',
            'category' => 'support',
            'priority' => 'normal',
            'title' => "Support Response on {$ticketNumber}",
            'message' => "{$agentName} responded to your inquiry '{$subject}'. Tap to view conversation history.",
            'action_url' => '/client-portal?tab=support',
            'data' => [
                'ticket_number' => $ticketNumber,
                'subject' => $subject,
                'agent_name' => $agentName,
            ],
        ]);
    }

    /**
     * Paginated user in-app notifications
     */
    public function getUserNotifications(User $user, array $filters = []): LengthAwarePaginator
    {
        $perPage = min(intval($filters['per_page'] ?? 15), 50);
        $category = $filters['category'] ?? null;
        $unreadOnly = filter_var($filters['unread_only'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $query = AppNotification::where('user_id', $user->id)
            ->where('is_dismissed', false)
            ->orderBy('created_at', 'desc');

        if (!empty($category) && $category !== 'all') {
            $query->where('category', $category);
        }

        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        return $query->paginate($perPage);
    }

    /**
     * Unread count summary & recent previews
     */
    public function getUnreadSummary(User $user): array
    {
        $baseQuery = AppNotification::where('user_id', $user->id)->where('is_dismissed', false);

        $unreadCount = (clone $baseQuery)->whereNull('read_at')->count();
        $totalCount = (clone $baseQuery)->count();

        $recentNotifications = (clone $baseQuery)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $categoryCounts = [
            'financial' => (clone $baseQuery)->where('category', 'financial')->whereNull('read_at')->count(),
            'construction' => (clone $baseQuery)->where('category', 'construction')->whereNull('read_at')->count(),
            'legal' => (clone $baseQuery)->where('category', 'legal')->whereNull('read_at')->count(),
            'support' => (clone $baseQuery)->where('category', 'support')->whereNull('read_at')->count(),
            'general' => (clone $baseQuery)->where('category', 'general')->whereNull('read_at')->count(),
        ];

        return [
            'unread_count' => $unreadCount,
            'total_count' => $totalCount,
            'recent' => $recentNotifications,
            'category_unread' => $categoryCounts,
        ];
    }

    /**
     * Mark single notification as read
     */
    public function markAsRead(User $user, string|int $identifier): AppNotification
    {
        $notification = AppNotification::where('user_id', $user->id)
            ->where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id', $identifier);
                } else {
                    $q->where('uuid', $identifier);
                }
            })
            ->firstOrFail();

        $notification->markAsRead();

        return $notification;
    }

    /**
     * Bulk mark all notifications as read
     */
    public function markAllAsRead(User $user): int
    {
        return AppNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * Dismiss notification
     */
    public function dismiss(User $user, string|int $identifier): AppNotification
    {
        $notification = AppNotification::where('user_id', $user->id)
            ->where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id', $identifier);
                } else {
                    $q->where('uuid', $identifier);
                }
            })
            ->firstOrFail();

        $notification->dismiss();

        return $notification;
    }

    /**
     * Audit log retrieval
     */
    public function getDispatchLogs(array $filters = []): LengthAwarePaginator
    {
        $perPage = min(intval($filters['per_page'] ?? 20), 100);

        return NotificationDispatchLog::with('notification')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
