<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\OtherFee;
use App\Models\OtherFeeCategory;
use App\Models\User;
use Database\Seeders\OtherFeeCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OtherFeeTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->assignRole($adminRole);

        $this->seed(OtherFeeCategorySeeder::class);

        $this->client = Client::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'client_number' => 'CL-FEE-001',
            'first_name' => 'Patrick',
            'last_name' => 'Kigozi',
            'phone_primary' => '+256701234567',
            'status' => 'active',
        ]);
    }

    public function test_can_retrieve_fee_categories(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/other-fees/categories');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [['id', 'code', 'name', 'standard_amount']]]);
    }

    public function test_can_assess_and_invoice_new_fee(): void
    {
        $payload = [
            'client_id' => $this->client->id,
            'category_code' => 'boundary_survey',
            'title' => 'Boundary Opening & Survey Beacon Fee',
            'amount' => 500000.00,
            'due_date' => now()->addDays(14)->toDateString(),
            'description' => 'Four concrete corner boundary beacons at Mukono Estate Plot 14.',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/other-fees', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.amount', '500000.00')
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('other_fees', [
            'client_id' => $this->client->id,
            'category_code' => 'boundary_survey',
            'amount' => 500000.00,
            'status' => 'pending',
        ]);
    }

    public function test_can_record_payment_against_fee(): void
    {
        $fee = OtherFee::create([
            'client_id' => $this->client->id,
            'category_code' => 'legal_agreement',
            'category_name' => 'Legal Documentation & Sales Agreement Fee',
            'title' => 'Sales Agreement Fee',
            'amount' => 350000.00,
            'amount_paid' => 0.00,
            'balance_due' => 350000.00,
            'status' => 'pending',
        ]);

        $payload = [
            'payment_amount' => 350000.00,
            'payment_method' => 'mtn_momo',
            'payment_reference' => 'MOMO-987654321',
            'notes' => 'Settled via MTN Mobile Money prompt.',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/other-fees/{$fee->uuid}/payment", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.balance_due', '0.00');

        $fee->refresh();
        $this->assertEquals('paid', $fee->status);
        $this->assertEquals(350000.00, (float) $fee->amount_paid);
        $this->assertNotNull($fee->receipt_number);
    }

    public function test_can_waive_fee_with_reason(): void
    {
        $fee = OtherFee::create([
            'client_id' => $this->client->id,
            'category_code' => 'site_visit_tour',
            'category_name' => 'Estate Site Inspection & Tour Facilitation',
            'title' => 'Site Visit Fee',
            'amount' => 50000.00,
            'amount_paid' => 0.00,
            'balance_due' => 50000.00,
            'status' => 'pending',
        ]);

        $payload = [
            'waiver_reason' => 'Executive promotion for early bird promotional cohort.',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/other-fees/{$fee->uuid}/waive", $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'waived');

        $fee->refresh();
        $this->assertEquals('waived', $fee->status);
        $this->assertEquals(0.00, (float) $fee->balance_due);
    }
}
