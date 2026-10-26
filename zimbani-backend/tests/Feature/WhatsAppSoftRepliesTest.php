<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\WhatsAppMessage;
use App\Services\Notifications\WhatsAppWebhookService;
use App\Services\Notifications\Drivers\MockWhatsAppDriver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppSoftRepliesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_soft_greetings_triggers_polite_welcome_reply(): void
    {
        $mockDriver = new MockWhatsAppDriver();
        $service = new WhatsAppWebhookService($mockDriver);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'messages' => [
                                    [
                                        'from' => '256770112233',
                                        'id' => 'wamid.IN.test1',
                                        'type' => 'text',
                                        'text' => ['body' => 'Hello Fab Homes, good morning'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $service->processWebhook($payload, true);

        // Assert inbound message saved
        $this->assertDatabaseHas('whatsapp_messages', [
            'phone_number' => '256770112233',
            'direction' => 'inbound',
            'body' => 'Hello Fab Homes, good morning',
        ]);

        // Assert outbound soft reply was generated and recorded
        $this->assertDatabaseHas('whatsapp_messages', [
            'phone_number' => '256770112233',
            'direction' => 'outbound',
        ]);

        $outbound = WhatsAppMessage::where('direction', 'outbound')->latest()->first();
        $this->assertStringContainsString('Welcome to Fab Homes Uganda', $outbound->body);
        $this->assertStringContainsString('BALANCE', $outbound->body);
    }

    public function test_soft_gratitude_triggers_polite_appreciation_reply(): void
    {
        $mockDriver = new MockWhatsAppDriver();
        $service = new WhatsAppWebhookService($mockDriver);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'messages' => [
                                    [
                                        'from' => '256770112233',
                                        'id' => 'wamid.IN.test2',
                                        'type' => 'text',
                                        'text' => ['body' => 'Thank you so much!'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $service->processWebhook($payload, true);

        $outbound = WhatsAppMessage::where('direction', 'outbound')->latest()->first();
        $this->assertStringContainsString("You're most welcome", $outbound->body);
        $this->assertStringContainsString("Have a wonderful day", $outbound->body);
    }

    public function test_unrecognized_text_triggers_soft_fallback_assistant_reply(): void
    {
        $mockDriver = new MockWhatsAppDriver();
        $service = new WhatsAppWebhookService($mockDriver);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'messages' => [
                                    [
                                        'from' => '256770112233',
                                        'id' => 'wamid.IN.test3',
                                        'type' => 'text',
                                        'text' => ['body' => 'What is the schedule for next week?'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $service->processWebhook($payload, true);

        $outbound = WhatsAppMessage::where('direction', 'outbound')->latest()->first();
        $this->assertStringContainsString("We have received your inquiry", $outbound->body);
        $this->assertStringContainsString("An estate relationship manager has been notified", $outbound->body);
    }

    public function test_authenticated_user_can_dispatch_soft_reply_api(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/whatsapp/reply', [
            'to' => '256770998877',
            'message' => 'Hello! Your payment has been confirmed and official digital receipt is ready in your Client Vault.',
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'WhatsApp soft reply sent successfully',
        ]);

        $this->assertDatabaseHas('whatsapp_messages', [
            'phone_number' => '256770998877',
            'direction' => 'outbound',
        ]);
    }
}
