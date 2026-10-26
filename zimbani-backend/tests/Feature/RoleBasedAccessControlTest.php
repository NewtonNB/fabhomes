<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleBasedAccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $financeManager;
    protected User $surveyorManager;
    protected User $clientUser;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create permissions
        $permissions = [
            'users.view', 'users.create', 'users.update', 'users.delete',
            'roles.view', 'roles.create', 'roles.update',
            'cashbook.view', 'cashbook.manage',
            'refunds.view', 'refunds.create', 'refunds.approve',
            'mother-titles.view', 'mother-titles.create',
            'employees.view', 'employees.create',
            'sites.view', 'plots.view',
            'accounts.view', 'payments.view', 'transactions.view',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        // 2. Create roles
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $financeRole = Role::firstOrCreate(['name' => 'Finance Manager', 'guard_name' => 'web']);
        $surveyorRole = Role::firstOrCreate(['name' => 'Surveyor Manager', 'guard_name' => 'web']);
        $clientRole = Role::firstOrCreate(['name' => 'Client', 'guard_name' => 'web']);

        // 3. Assign permissions to roles
        $financeRole->syncPermissions([
            'cashbook.view', 'cashbook.manage',
            'refunds.view', 'refunds.create',
            'accounts.view', 'payments.view', 'transactions.view',
        ]);

        $surveyorRole->syncPermissions([
            'mother-titles.view', 'mother-titles.create',
            'sites.view', 'plots.view',
        ]);

        $clientRole->syncPermissions([
            'accounts.view', 'payments.view',
        ]);

        // 4. Create test users
        $this->superAdmin = User::factory()->create([
            'email' => 'admin@zimbani.com',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->superAdmin->assignRole($superAdminRole);

        $this->financeManager = User::factory()->create([
            'email' => 'finance@zimbani.com',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->financeManager->assignRole($financeRole);

        $this->surveyorManager = User::factory()->create([
            'email' => 'surveyor@zimbani.com',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->surveyorManager->assignRole($surveyorRole);

        $this->clientUser = User::factory()->create([
            'email' => 'client@zimbani.com',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->clientUser->assignRole($clientRole);
    }

    /**
     * Test 1: User login payload returns roles and granular permissions.
     */
    public function test_user_login_payload_includes_roles_and_permissions(): void
    {
        $response = $this->postJson('/api/v1/login', [
            'login' => 'finance@zimbani.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'user' => [
                    'uuid',
                    'name',
                    'email',
                    'roles',
                    'permissions',
                ],
                'token',
            ],
        ]);

        $data = $response->json('data.user');
        $this->assertContains('Finance Manager', $data['roles']);
        $this->assertContains('cashbook.view', $data['permissions']);
        $this->assertContains('refunds.view', $data['permissions']);
    }

    /**
     * Test 2: Super Admin has universal access to restricted admin endpoints.
     */
    public function test_super_admin_has_universal_access_to_admin_endpoints(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum');

        $response = $this->getJson('/api/v1/admin/users');
        $response->assertStatus(200);

        $cashbookResponse = $this->getJson('/api/v1/cashbook/overall');
        $cashbookResponse->assertStatus(200);
    }

    /**
     * Test 3: Non-Admin role (e.g. Client) is blocked with 403 on admin endpoints.
     */
    public function test_unauthorized_user_is_forbidden_from_admin_endpoints(): void
    {
        $this->actingAs($this->clientUser, 'sanctum');

        $response = $this->getJson('/api/v1/admin/users');
        $response->assertStatus(403);
        $response->assertJsonFragment([
            'success' => false,
            'message' => 'You do not have the required role to perform this action',
        ]);
    }

    /**
     * Test 4: Finance Manager can access cashbook and refunds.
     */
    public function test_finance_manager_can_access_financial_modules(): void
    {
        $this->actingAs($this->financeManager, 'sanctum');

        $cashbookResponse = $this->getJson('/api/v1/cashbook/overall');
        $cashbookResponse->assertStatus(200);

        $refundsResponse = $this->getJson('/api/v1/payment-refunds');
        $refundsResponse->assertStatus(200);
    }

    /**
     * Test 5: Surveyor Manager can access mother-titles.
     */
    public function test_surveyor_manager_can_access_mother_titles(): void
    {
        $this->actingAs($this->surveyorManager, 'sanctum');

        $titlesResponse = $this->getJson('/api/v1/mother-titles');
        $titlesResponse->assertStatus(200);
    }

    /**
     * Test 6: User without cashbook permission is blocked with 403.
     */
    public function test_user_without_cashbook_permission_is_forbidden(): void
    {
        $this->actingAs($this->clientUser, 'sanctum');

        $cashbookResponse = $this->getJson('/api/v1/cashbook/overall');
        $cashbookResponse->assertStatus(403);
        $cashbookResponse->assertJsonFragment([
            'success' => false,
            'message' => 'You do not have permission to perform this action',
        ]);
    }
}
