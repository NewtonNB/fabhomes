<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveRequest;
use App\Models\MotherTitle;
use App\Models\MotherTitleTransfer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LegacyManualDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Departments
        $operationsDept = Department::firstOrCreate(
            ['code' => 'OPS-SURV'],
            [
                'name' => 'Survey & Land Operations',
                'description' => 'Cadastral surveying, deed plan preparation, title mutation, and estate physical planning.',
                'head_of_department' => 'Eng. Ssempa Godfrey',
                'is_active' => true,
            ]
        );

        $financeDept = Department::firstOrCreate(
            ['code' => 'FIN-ACCS'],
            [
                'name' => 'Finance & CashBook Accounting',
                'description' => 'Overall CashBook reconciliation, saving schemes treasury, disbursements, and refunds.',
                'head_of_department' => 'Aisha Namubiru',
                'is_active' => true,
            ]
        );

        $clientDept = Department::firstOrCreate(
            ['code' => 'CS-REL'],
            [
                'name' => 'Client Relations & Self-Service',
                'description' => 'Client onboarding, plot selections, digital signature verification, and communication.',
                'head_of_department' => 'Newton Tukamuhebwa',
                'is_active' => true,
            ]
        );

        // 2. Staff Employees
        $surveyorUser = User::where('email', 'surveyor@zimbani.com')->first();
        $financeUser = User::where('email', 'finance@zimbani.com')->first();
        $adminUser = User::where('email', 'admin@zimbani.com')->first();

        $empSurveyor = Employee::firstOrCreate(
            ['employee_number' => 'EMP-001'],
            [
                'uuid' => (string) Str::uuid(),
                'user_id' => $surveyorUser?->id,
                'department_id' => $operationsDept->id,
                'first_name' => 'Godfrey',
                'last_name' => 'Ssempa',
                'nin' => 'CM78012345678A',
                'gender' => 'male',
                'phone' => '+256782333444',
                'email' => 'surveyor@zimbani.com',
                'district' => 'Kampala',
                'position' => 'Senior Registered Land Surveyor',
                'salary_grade' => 'G-7',
                'base_salary' => 4500000.00,
                'date_joined' => Carbon::now()->subYears(3)->format('Y-m-d'),
                'status' => 'active',
            ]
        );

        $empFinance = Employee::firstOrCreate(
            ['employee_number' => 'EMP-002'],
            [
                'uuid' => (string) Str::uuid(),
                'user_id' => $financeUser?->id,
                'department_id' => $financeDept->id,
                'first_name' => 'Aisha',
                'last_name' => 'Namubiru',
                'nin' => 'CF85098765432B',
                'gender' => 'female',
                'phone' => '+256772111222',
                'email' => 'finance@zimbani.com',
                'district' => 'Wakiso',
                'position' => 'Chief Financial Officer & CashBook Manager',
                'salary_grade' => 'G-8',
                'base_salary' => 5200000.00,
                'date_joined' => Carbon::now()->subYears(4)->format('Y-m-d'),
                'status' => 'active',
            ]
        );

        $empAdmin = Employee::firstOrCreate(
            ['employee_number' => 'EMP-003'],
            [
                'uuid' => (string) Str::uuid(),
                'user_id' => $adminUser?->id,
                'department_id' => $clientDept->id,
                'first_name' => 'Newton',
                'last_name' => 'Tukamuhebwa',
                'nin' => 'CM90011223344C',
                'gender' => 'male',
                'phone' => '+256700000000',
                'email' => 'admin@zimbani.com',
                'district' => 'Kampala',
                'position' => 'Managing Director & Platform Architect',
                'salary_grade' => 'G-10',
                'base_salary' => 7500000.00,
                'date_joined' => Carbon::now()->subYears(5)->format('Y-m-d'),
                'status' => 'active',
            ]
        );

        // Update User models with employee_id linkage
        if ($surveyorUser) {
            $surveyorUser->update(['employee_id' => $empSurveyor->id]);
        }
        if ($financeUser) {
            $financeUser->update(['employee_id' => $empFinance->id]);
        }
        if ($adminUser) {
            $adminUser->update(['employee_id' => $empAdmin->id]);
        }

        // 3. Employee Leave Requests
        EmployeeLeaveRequest::firstOrCreate(
            ['employee_id' => $empSurveyor->id, 'start_date' => Carbon::now()->addDays(14)->format('Y-m-d')],
            [
                'uuid' => (string) Str::uuid(),
                'leave_type' => 'annual',
                'end_date' => Carbon::now()->addDays(21)->format('Y-m-d'),
                'days_count' => 7,
                'reason' => 'Annual family leave scheduled after completion of Mukono Greenfield boundary opening.',
                'status' => 'approved',
                'approved_by' => $adminUser?->id,
                'approved_at' => Carbon::now()->subDay(),
            ]
        );

        // 4. Mother Titles
        $titlesData = [
            [
                'record_no' => 'MT-2026-001',
                'phase' => 'Phase 1',
                'scheme' => 'Mukono',
                'title_no' => 'Kyaggwe Block 212 Plot 14',
                'block_no' => '212',
                'district' => 'Mukono',
                'sub_county' => 'Goma',
                'village' => 'Ntaawo',
                'estate_name' => 'Mukono Greenfield Heights Estate',
                'area_acres' => 25.50,
                'subdivision_date' => Carbon::now()->subMonths(6)->format('Y-m-d'),
                'date_of_return' => Carbon::now()->addDays(30)->format('Y-m-d'),
                'new_plot_no' => 'Plots 101 - 250',
                'title_status' => 'subdivided',
                'verified_by' => 'Eng. Ssempa Godfrey (Surveyor)',
                'notes' => 'Original Mailo mother title subdivided into 150 residential 50x100ft plots.',
            ],
            [
                'record_no' => 'MT-2026-002',
                'phase' => 'Phase 2',
                'scheme' => 'Wakiso',
                'title_no' => 'Busiro Block 355 Plot 88',
                'block_no' => '355',
                'district' => 'Wakiso',
                'sub_county' => 'Ssisa',
                'village' => 'Sunset Ridge',
                'estate_name' => 'Wakiso Sunset Estate',
                'area_acres' => 18.00,
                'subdivision_date' => Carbon::now()->subMonths(3)->format('Y-m-d'),
                'date_of_return' => Carbon::now()->addDays(15)->format('Y-m-d'),
                'new_plot_no' => 'Plots 1 - 90',
                'title_status' => 'with_surveyor',
                'verified_by' => 'Eng. Ssempa Godfrey (Surveyor)',
                'notes' => 'Cadastral surveying in progress for Phase 2 infrastructure opening.',
            ],
            [
                'record_no' => 'MT-2026-003',
                'phase' => 'Phase 2',
                'scheme' => 'Wakiso',
                'title_no' => 'Busiro Block 102 Plot 45',
                'block_no' => '102',
                'district' => 'Wakiso',
                'sub_county' => 'Kajjansi Town Council',
                'village' => 'Kajjansi Central',
                'estate_name' => 'Royal Palms Kajjansi Estate',
                'area_acres' => 12.50,
                'subdivision_date' => null,
                'date_of_return' => null,
                'new_plot_no' => null,
                'title_status' => 'in_safe',
                'verified_by' => 'Aisha Namubiru (Finance/Legal)',
                'notes' => 'Freehold mother title secured in head office strong room safe.',
            ],
            [
                'record_no' => 'MT-2026-004',
                'phase' => 'Phase 3',
                'scheme' => 'Jinja',
                'title_no' => 'Budondo Block 50 Plot 19',
                'block_no' => '50',
                'district' => 'Jinja',
                'sub_county' => 'Budondo',
                'village' => 'Nile View Ridge',
                'estate_name' => 'Nile Vista Estate Jinja',
                'area_acres' => 40.00,
                'subdivision_date' => null,
                'date_of_return' => Carbon::now()->addDays(45)->format('Y-m-d'),
                'new_plot_no' => null,
                'title_status' => 'at_ministry',
                'verified_by' => 'Ministry of Lands Zonal Office (MZO Jinja)',
                'notes' => 'Submitted to Ministry of Lands Zonal Office for deed plan preparation and area schedule approval.',
            ],
            [
                'record_no' => 'MT-2026-005',
                'phase' => 'Phase 4',
                'scheme' => 'Wakiso',
                'title_no' => 'Busiro Block 288 Plot 9',
                'block_no' => '288',
                'district' => 'Wakiso',
                'sub_county' => 'Bulenga',
                'village' => 'Bulenga Heights',
                'estate_name' => 'Bulenga Heights Commercial & Residential',
                'area_acres' => 8.20,
                'subdivision_date' => Carbon::now()->subMonths(1)->format('Y-m-d'),
                'date_of_return' => null,
                'new_plot_no' => 'Plots 1 - 42',
                'title_status' => 'subdivided',
                'verified_by' => 'Eng. Ssempa Godfrey (Surveyor)',
                'notes' => 'Subdivision completed; client individual title processing underway.',
            ],
        ];

        foreach ($titlesData as $td) {
            $mt = MotherTitle::firstOrCreate(['record_no' => $td['record_no']], array_merge($td, ['uuid' => (string) Str::uuid()]));

            // Add movement / loan transfer tracking for My Fab Title tab
            if ($mt->title_status === 'with_surveyor') {
                MotherTitleTransfer::firstOrCreate(
                    ['mother_title_id' => $mt->id, 'status' => 'out_on_loan'],
                    [
                        'uuid' => (string) Str::uuid(),
                        'date_taken' => Carbon::now()->subDays(5)->format('Y-m-d'),
                        'date_of_return' => Carbon::now()->addDays(15)->format('Y-m-d'),
                        'verified_by' => 'Eng. Ssempa Godfrey (Surveyor)',
                        'purpose' => 'Cadastral boundary confirmation & access road pegging',
                        'remarks' => 'Taken for field operations in Wakiso Sunset Estate.',
                    ]
                );
            } elseif ($mt->title_status === 'at_ministry') {
                MotherTitleTransfer::firstOrCreate(
                    ['mother_title_id' => $mt->id, 'status' => 'out_on_loan'],
                    [
                        'uuid' => (string) Str::uuid(),
                        'date_taken' => Carbon::now()->subDays(12)->format('Y-m-d'),
                        'date_of_return' => Carbon::now()->addDays(45)->format('Y-m-d'),
                        'verified_by' => 'Ministry Liaison Officer Okello',
                        'purpose' => 'Area schedule signature & white page mutation',
                        'remarks' => 'Lodged at MZO Jinja under transaction ref MZO-JNJ-2026-8812.',
                    ]
                );
            }
        }
    }
}
