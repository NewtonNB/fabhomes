<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Department;
use App\Models\Employee;
use App\Models\MotherTitle;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LegacyManualEnhancementsTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole($role);
    }

    /**
     * Test employee demographic statistics returns total, male, and female headcounts.
     */
    public function test_employee_statistics_endpoint_returns_gender_breakdown(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/employees/statistics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_employees',
                    'male_employees',
                    'female_employees',
                    'active_employees',
                ],
            ]);

        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, $data['total_employees']);
        $this->assertEquals($data['total_employees'], $data['male_employees'] + $data['female_employees']);
    }

    /**
     * Test creating a new employee profile.
     */
    public function test_can_create_employee(): void
    {
        $payload = [
            'first_name' => 'George',
            'last_name' => 'Kiyaga',
            'nin' => 'CM' . rand(10000000, 99999999) . 'X',
            'gender' => 'male',
            'phone' => '+256700112233',
            'email' => 'george.kiyaga.' . uniqid() . '@fabhomes.ug',
            'district' => 'Wakiso',
            'position' => 'Senior Surveyor',
            'salary_grade' => 'G-4',
            'base_salary' => 2500000,
            'date_joined' => '2024-01-10',
            'status' => 'active',
        ];

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/employees', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'first_name' => 'George',
                    'last_name' => 'Kiyaga',
                ],
            ]);
    }

    /**
     * Test mother titles registry and creation.
     */
    public function test_mother_titles_crud(): void
    {
        $payload = [
            'phase' => 'Phase 4',
            'scheme' => 'Jinja',
            'title_no' => 'Budondo Block 50 Plot ' . rand(1, 999),
            'block_no' => '50',
            'district' => 'Jinja',
            'estate_name' => 'Sunset Bay Estate',
            'area_acres' => 45.2,
            'title_status' => 'in_safe',
            'verified_by' => 'Eng. Patrick Musisi',
        ];

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/mother-titles', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'estate_name' => 'Sunset Bay Estate',
                ],
            ]);

        $listResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/mother-titles?phase=Phase 4');

        $listResponse->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    /**
     * Test overall and saving cashbook endpoints.
     */
    public function test_cashbook_endpoints(): void
    {
        // 1. Overall CashBook
        $overallRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/cashbook/overall');

        $overallRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'summary' => [
                    'cash_available',
                    'total_inflow',
                    'total_outflow',
                ],
                'data',
            ]);

        // 2. Saving CashBook
        $savingRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/cashbook/savings');

        $savingRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'summary' => [
                    'cash_available',
                    'total_savings_inflow',
                    'total_savings_outflow',
                ],
                'data',
            ]);
    }

    /**
     * Test refund deduction math calculation.
     */
    public function test_refund_deduction_calculator(): void
    {
        $payload = [
            'amount_paid' => 10000000,     // 10,000,000 UGX
            'requested_amount' => 6000000,  // 6,000,000 UGX requested
            'deduction_percentage' => 10,  // 10% penalty deduction
        ];

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/payment-refunds/calculate-deduction', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'amount_paid' => 10000000,
                    'requested_amount' => 6000000,
                    'deduction_percentage' => 10,
                    'deduction_amount' => 600000,       // 10% of 6,000,000
                    'net_payable_to_client' => 5400000,  // 6,000,000 - 600,000
                    'balance_after_refund' => 4000000,   // 10,000,000 - 6,000,000
                ],
            ]);
    }
}
