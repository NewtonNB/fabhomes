<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveRequest;
use App\Models\MotherTitle;
use App\Models\MotherTitleTransfer;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\SavingsAccount;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserAcceptanceTestingSuiteTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $financeManager;
    protected User $surveyorManager;
    protected Role $adminRole;
    protected Role $financeRole;
    protected Role $surveyorRole;

    protected function setUp(): void
    {
        parent::setUp();

        // Establish permissions and roles
        $userCreatePerm = Permission::firstOrCreate(['name' => 'users.create', 'guard_name' => 'web']);
        
        $this->adminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $this->adminRole->givePermissionTo($userCreatePerm);

        $this->financeRole = Role::firstOrCreate(['name' => 'Finance Manager', 'guard_name' => 'web']);
        $cashbookPerm = Permission::firstOrCreate(['name' => 'cashbook.view', 'guard_name' => 'web']);
        $this->financeRole->givePermissionTo($cashbookPerm);

        $this->surveyorRole = Role::firstOrCreate(['name' => 'Surveyor Manager', 'guard_name' => 'web']);
        $titlesPerm = Permission::firstOrCreate(['name' => 'mother-titles.view', 'guard_name' => 'web']);
        $this->surveyorRole->givePermissionTo($titlesPerm);
        Role::firstOrCreate(['name' => 'Customer Support Officer', 'guard_name' => 'web']);

        // Create test actors
        $this->superAdmin = User::factory()->create(['name' => 'Super Admin User']);
        $this->superAdmin->assignRole($this->adminRole);

        $this->financeManager = User::factory()->create(['name' => 'Finance Officer User']);
        $this->financeManager->assignRole($this->financeRole);

        $this->surveyorManager = User::factory()->create(['name' => 'Surveyor Manager User']);
        $this->surveyorManager->assignRole($this->surveyorRole);
    }

    /**
     * UAT-01: RBAC & Permissions Enforcement
     */
    public function test_uat_01_rbac_and_role_navigation_permissions(): void
    {
        // 1. Super Admin has unrestricted access to cashbook
        $adminRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/cashbook/overall');
        $adminRes->assertStatus(200);

        // 2. Finance Manager has access to cashbook
        $financeRes = $this->actingAs($this->financeManager, 'sanctum')
            ->getJson('/api/v1/cashbook/overall');
        $financeRes->assertStatus(200);

        // 3. Non-authorized actions fail gracefully
        $fakeMtId = 9999;
        $financeDeny = $this->actingAs($this->financeManager, 'sanctum')
            ->deleteJson("/api/v1/mother-titles/{$fakeMtId}");
        $this->assertTrue(in_array($financeDeny->status(), [403, 404]));
    }

    /**
     * UAT-02: Titles Management Suite (Mother Titles, Movement Checkout, Return Check-in)
     */
    public function test_uat_02_titles_management_suite(): void
    {
        // 1. Create Mother Title
        $mtPayload = [
            'record_no' => 'MT-UAT-001',
            'phase' => 'Phase 1',
            'scheme' => 'Mukono',
            'title_no' => 'Kyaggwe Block 212 Plot 14',
            'block_no' => '212',
            'district' => 'Mukono',
            'sub_county' => 'Goma',
            'village' => 'Ntaawo',
            'estate_name' => 'Mukono Greenfield Heights',
            'area_acres' => 25.50,
            'subdivision_date' => Carbon::now()->subMonths(6)->format('Y-m-d'),
            'title_status' => 'in_safe',
            'verified_by' => 'Eng. Ssempa Godfrey (Surveyor)',
        ];

        $createRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/mother-titles', $mtPayload);
        $createRes->assertStatus(201);
        $mtId = $createRes->json('data.id');

        // 2. Checkout Mother Title (Movement transfer)
        $checkoutPayload = [
            'date_taken' => Carbon::now()->format('Y-m-d'),
            'date_of_return' => Carbon::now()->addDays(20)->format('Y-m-d'),
            'verified_by' => 'Eng. Ssempa Godfrey',
            'purpose' => 'Ministry Cadastral Mutation',
            'remarks' => 'Taken for field validation',
        ];

        $checkoutRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/mother-titles/{$mtId}/transfer", $checkoutPayload);
        $checkoutRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $transferId = $checkoutRes->json('data.id');
        $this->assertNotNull($transferId);

        // 3. Return Mother Title Check-in
        $returnRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/mother-title-transfers/{$transferId}/return", [
                'return_notes' => 'Returned safely to office safe after survey.',
            ]);
        $returnRes->assertStatus(200)
            ->assertJsonPath('data.status', 'returned');
    }

    /**
     * UAT-03: CashBook & Treasury Desk (Overall CashBook vs Saving CashBook + Add/Draw Cash)
     */
    public function test_uat_03_cashbook_and_treasury_desk(): void
    {
        // 1. Overall CashBook
        $overallRes = $this->actingAs($this->superAdmin, 'sanctum')
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
        $savingsRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/cashbook/savings');
        $savingsRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'summary' => [
                    'cash_available',
                    'total_savings_inflow',
                    'total_savings_outflow',
                ],
                'data',
            ]);

        // 3. Add Cash Inflow Entry
        $addRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/cashbook/add-or-draw', [
                'action_type' => 'inflow',
                'amount' => 5000000,
                'transaction_date' => Carbon::now()->format('Y-m-d'),
                'payment_method' => 'bank_transfer',
                'description' => 'Founder Operational Working Capital Deposit',
                'reference_number' => 'VCH-ADD-001',
            ]);
        $addRes->assertStatus(201)
            ->assertJsonPath('success', true);

        // 4. Draw Cash Outflow Entry
        $drawRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/cashbook/add-or-draw', [
                'action_type' => 'drawdown',
                'amount' => 1200000,
                'transaction_date' => Carbon::now()->format('Y-m-d'),
                'payment_method' => 'cash',
                'description' => 'Fuel & logistics crew field transport',
                'cheque_voucher_no' => 'VCH-DRW-001',
            ]);
        $drawRes->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    /**
     * UAT-04: Client Refunds Desk & Interactive Deduction % Calculator
     */
    public function test_uat_04_client_refunds_and_deduction_math(): void
    {
        // 1. Mathematical calculation endpoint
        $calcRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/payment-refunds/calculate-deduction', [
                'amount_paid' => 3000000,
                'requested_amount' => 2000000,
                'deduction_percentage' => 10,
            ]);

        $calcRes->assertStatus(200)
            ->assertJsonPath('data.amount_paid', 3000000)
            ->assertJsonPath('data.requested_amount', 2000000)
            ->assertJsonPath('data.deduction_percentage', 10)
            ->assertJsonPath('data.deduction_amount', 200000)
            ->assertJsonPath('data.net_payable_to_client', 1800000)
            ->assertJsonPath('data.balance_after_refund', 1000000);

        // 2. Submit Refund Request with Legacy Manual fields
        $client = Client::create([
            'uuid' => (string) Str::uuid(),
            'first_name' => 'Sarah',
            'last_name' => 'Namubiru',
            'full_name' => 'Sarah Namubiru',
            'client_number' => 'CL-UAT-001',
            'phone_primary' => '+256701234567',
            'country' => 'Uganda',
            'status' => 'active',
        ]);

        $payment = Payment::create([
            'uuid' => (string) Str::uuid(),
            'client_id' => $client->id,
            'payment_number' => 'PAY-UAT-001',
            'amount' => 3000000,
            'currency' => 'UGX',
            'payment_method' => 'bank_transfer',
            'status' => 'confirmed',
            'payment_date' => Carbon::now()->format('Y-m-d'),
        ]);

        $refundPayload = [
            'payment_id' => $payment->id,
            'client_id' => $client->id,
            'amount' => 2000000,
            'phase_name' => 'Phase 2',
            'scheme_name' => 'Wakiso Sunset',
            'notice_date' => Carbon::now()->format('Y-m-d'),
            'deduction_percentage' => 10,
            'deduction_amount' => 200000,
            'balance_after_refund' => 1000000,
            'withdrawal_reason' => 'Client relocated abroad permanently',
            'notes' => 'Verified with original bank deposit slip',
        ];

        $requestRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/payment-refunds', $refundPayload);
        $requestRes->assertStatus(201);
    }

    /**
     * UAT-06: Employees & HR Management Suite (Gender Demographics & Leave Requests)
     */
    public function test_uat_06_employees_hr_and_gender_demographics(): void
    {
        $dept = Department::create([
            'name' => 'Survey Operations',
            'code' => 'OPS-SURV',
            'head_of_department' => 'Eng. Ssempa Godfrey',
            'is_active' => true,
        ]);

        // 1. Create Male Employee
        $empMale = Employee::create([
            'uuid' => (string) Str::uuid(),
            'employee_number' => 'EMP-UAT-M1',
            'department_id' => $dept->id,
            'first_name' => 'David',
            'last_name' => 'Mukasa',
            'nin' => 'CM88012345678A',
            'gender' => 'male',
            'phone' => '+256701111222',
            'email' => 'david.mukasa@zimbani.com',
            'district' => 'Kampala',
            'position' => 'Senior Field Surveyor',
            'salary_grade' => 'G-6',
            'base_salary' => 3800000,
            'status' => 'active',
        ]);

        // 2. Create Female Employee
        $empFemale = Employee::create([
            'uuid' => (string) Str::uuid(),
            'employee_number' => 'EMP-UAT-F1',
            'department_id' => $dept->id,
            'first_name' => 'Joan',
            'last_name' => 'Nalubega',
            'nin' => 'CF92098765432B',
            'gender' => 'female',
            'phone' => '+256702222333',
            'email' => 'joan.nalubega@zimbani.com',
            'district' => 'Wakiso',
            'position' => 'Assistant Land Surveyor',
            'salary_grade' => 'G-5',
            'base_salary' => 2800000,
            'status' => 'active',
        ]);

        // 3. Verify Demographic Statistics API returns exact gender breakdown
        $statsRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/employees/statistics');
        $statsRes->assertStatus(200);
        $data = $statsRes->json('data');

        $this->assertGreaterThanOrEqual(2, $data['total_employees']);
        $this->assertGreaterThanOrEqual(1, $data['male_employees']);
        $this->assertGreaterThanOrEqual(1, $data['female_employees']);
        $this->assertEquals($data['total_employees'], $data['male_employees'] + $data['female_employees']);

        // 4. Submit & Approve Leave Request
        $leavePayload = [
            'employee_id' => $empFemale->id,
            'leave_type' => 'annual',
            'start_date' => Carbon::now()->addDays(7)->format('Y-m-d'),
            'end_date' => Carbon::now()->addDays(14)->format('Y-m-d'),
            'days_count' => 7,
            'reason' => 'Scheduled annual family leave',
        ];

        $leaveRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/employees/leave-requests', $leavePayload);
        $leaveRes->assertStatus(201);
        $leaveId = $leaveRes->json('data.id');

        $approveLeave = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/employees/leave-requests/{$leaveId}/status", [
                'status' => 'approved',
            ]);
        $approveLeave->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');
    }

    /**
     * UAT-08: Digital Signatures & User Linkage
     */
    public function test_uat_08_digital_signatures_and_user_linkage(): void
    {
        $dept = Department::firstOrCreate(['code' => 'CS-001'], ['name' => 'Support', 'is_active' => true]);
        $emp = Employee::create([
            'uuid' => (string) Str::uuid(),
            'employee_number' => 'EMP-UAT-LINK',
            'department_id' => $dept->id,
            'first_name' => 'Arthur',
            'last_name' => 'Kabogoza',
            'gender' => 'male',
            'phone' => '+256703333444',
            'email' => 'arthur.k@zimbani.com',
            'status' => 'active',
        ]);

        // 1. Create user with linked employee_id
        $userPayload = [
            'name' => 'Arthur Kabogoza (Staff)',
            'email' => 'arthur.k@zimbani.com',
            'phone' => '+256703333444',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'employee_id' => $emp->id,
            'roles' => ['Customer Support Officer'],
        ];

        $createUserRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/users', $userPayload);
        $createUserRes->assertStatus(201)
            ->assertJsonPath('data.employee_id', $emp->id);

        $newUserUuid = $createUserRes->json('data.uuid');
        $newUser = User::where('uuid', $newUserUuid)->firstOrFail();

        // 2. Save Digital Signature on User Profile
        $sampleSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $sigRes = $this->actingAs($newUser, 'sanctum')
            ->putJson('/api/v1/user/profile', [
                'signature_data' => $sampleSignature,
            ]);
        $sigRes->assertStatus(200)
            ->assertJsonPath('data.user.signature_data', $sampleSignature);

        // Verify signature persists in DB
        $newUser->refresh();
        $this->assertEquals($sampleSignature, $newUser->signature_data);
    }
}
