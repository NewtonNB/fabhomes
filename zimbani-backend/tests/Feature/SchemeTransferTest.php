<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\SavingsAccount;
use App\Models\SchemeTransfer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SchemeTransferTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected SavingsAccount $fromAccount;
    protected SavingsAccount $toAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->assignRole($adminRole);

        $this->client = Client::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'client_number' => 'CL-TEST-100',
            'first_name' => 'Kato',
            'last_name' => 'Daniel',
            'phone_primary' => '+256770112233',
            'status' => 'active',
        ]);

        $this->fromAccount = SavingsAccount::create([
            'client_id' => $this->client->id,
            'account_number' => 'SAV-FROM-001',
            'account_type' => 'land_saving',
            'scheme_name' => 'Mukono Phase 1',
            'target_amount' => 30000000,
            'current_balance' => 15000000,
            'currency' => 'UGX',
            'status' => 'active',
            'opened_date' => now()->toDateString(),
        ]);

        $this->toAccount = SavingsAccount::create([
            'client_id' => $this->client->id,
            'account_number' => 'SAV-TO-002',
            'account_type' => 'land_saving',
            'scheme_name' => 'Matugga Phase 2',
            'target_amount' => 45000000,
            'current_balance' => 5000000,
            'currency' => 'UGX',
            'status' => 'active',
            'opened_date' => now()->toDateString(),
        ]);
    }

    /**
     * Test creating a scheme transfer request.
     */
    public function test_can_create_scheme_transfer_request(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/scheme-transfers', [
                'client_id' => $this->client->id,
                'from_savings_account_id' => $this->fromAccount->id,
                'to_savings_account_id' => $this->toAccount->id,
                'from_scheme_name' => 'Mukono Phase 1',
                'to_scheme_name' => 'Matugga Phase 2',
                'amount' => 5000000,
                'reason' => 'Client relocated and requested to transfer savings to Matugga estate.',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('scheme_transfers', [
            'client_id' => $this->client->id,
            'amount' => 5000000,
            'status' => 'pending',
        ]);
    }

    /**
     * Test approving a scheme transfer deducts from source and credits target.
     */
    public function test_approving_scheme_transfer_executes_balance_transfers(): void
    {
        $transfer = SchemeTransfer::create([
            'client_id' => $this->client->id,
            'from_savings_account_id' => $this->fromAccount->id,
            'to_savings_account_id' => $this->toAccount->id,
            'from_scheme_name' => 'Mukono Phase 1',
            'to_scheme_name' => 'Matugga Phase 2',
            'amount' => 5000000,
            'reason' => 'Transfer requested by client',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/scheme-transfers/{$transfer->uuid}/approve");

        $response->assertStatus(200);

        // Verify balances
        $this->assertEquals(10000000, $this->fromAccount->fresh()->current_balance);
        $this->assertEquals(10000000, $this->toAccount->fresh()->current_balance);

        // Verify transfer status
        $this->assertEquals('approved', $transfer->fresh()->status);
    }
}
