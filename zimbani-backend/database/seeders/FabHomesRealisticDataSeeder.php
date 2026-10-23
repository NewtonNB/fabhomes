<?php

namespace Database\Seeders;

use App\Models\BankReconciliationBatch;
use App\Models\Client;
use App\Models\Company;
use App\Models\LandTitleDeed;
use App\Models\Payment;
use App\Models\Project;
use App\Models\SavingsAccount;
use App\Models\Site;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FabHomesRealisticDataSeeder extends Seeder
{
    public function run(): void
    {
        DB::beginTransaction();

        try {
            // 1. Get or create primary company
            $company = Company::firstOrCreate(
                ['name' => 'Fab Homes Uganda Limited'],
                [
                    'uuid' => (string) Str::uuid(),
                    'email' => 'info@fabhomesug.com',
                    'phone' => '+256 393 000 111',
                    'address' => 'Plot 12 Lugogo Bypass, Kampala, Uganda',
                    'country' => 'Uganda',
                    'status' => 'active',
                ]
            );

            // 1b. Create parent land project
            $project = Project::firstOrCreate(
                ['code' => 'PRJ-EST-2026'],
                [
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $company->id,
                    'name' => 'Fab Homes Land Acquisition & Estate Development',
                    'description' => 'Flagship land acquisition, subdivision, and estate development projects across Greater Kampala Metropolitan Area.',
                    'project_type' => 'residential',
                    'status' => 'active',
                    'completion_percentage' => 45.0,
                    'start_date' => Carbon::now()->subYear(),
                    'end_date' => Carbon::now()->addYears(2),
                    'budget' => 2500000000,
                    'currency' => 'UGX',
                    'country' => 'Uganda',
                    'city' => 'Kampala',
                ]
            );

            // 2. Ensure Super Admin and key staff exist
            $admin = User::firstOrCreate(
                ['email' => 'admin@zimbani.com'],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Newton Tukamuhebwa (Super Admin)',
                    'phone' => '+256700000000',
                    'password' => bcrypt('password'),
                    'status' => 'active',
                ]
            );
            $admin->syncRoles(['Super Admin']);

            $financeManager = User::firstOrCreate(
                ['email' => 'finance@zimbani.com'],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Aisha Namubiru (Finance Manager)',
                    'phone' => '+256772111222',
                    'password' => bcrypt('password'),
                    'status' => 'active',
                ]
            );
            $financeManager->syncRoles(['Finance Officer']);

            $surveyor = User::firstOrCreate(
                ['email' => 'surveyor@zimbani.com'],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Eng. Ssempa Godfrey (Surveyor Manager)',
                    'phone' => '+256782333444',
                    'password' => bcrypt('password'),
                    'status' => 'active',
                ]
            );
            $surveyor->syncRoles(['Site Manager']);

            // 3. Clean up the repetitive "WhatsApp Subscriber" test accounts
            $waClients = Client::where('first_name', 'like', '%WhatsApp%')->get();
            foreach ($waClients as $wc) {
                SavingsAccount::where('client_id', $wc->id)->delete();
                $wc->delete();
            }

            // 4. Seed Estates (Sites)
            $estatesData = [
                [
                    'name' => 'Matugga Green Valley Estate',
                    'code' => 'EST-MAT-01',
                    'site_type' => 'residential_complex',
                    'status' => 'active',
                    'address' => 'Matugga-Gombe Road',
                    'city' => 'Matugga',
                    'region' => 'Wakiso District',
                    'total_area' => 50.0,
                    'buildable_area' => 42.0,
                    'total_units' => 80,
                    'allocated_budget' => 500000000,
                    'description' => 'Prime planned estate in Matugga with standard 50x100 ft and 100x100 ft plots, water, and electricity on-site.',
                ],
                [
                    'name' => 'Budo Heights Estate',
                    'code' => 'EST-BUD-02',
                    'site_type' => 'residential_complex',
                    'status' => 'active',
                    'address' => 'Budo Junior Road, Hilltop Area',
                    'city' => 'Budo',
                    'region' => 'Wakiso District',
                    'total_area' => 30.0,
                    'buildable_area' => 26.0,
                    'total_units' => 45,
                    'allocated_budget' => 450000000,
                    'description' => 'Prestigious hilltop views of Kampala and Entebbe Expressway with private Mailo tenure.',
                ],
                [
                    'name' => 'Gayaza Hillview Estate',
                    'code' => 'EST-GAY-03',
                    'site_type' => 'residential_complex',
                    'status' => 'active',
                    'address' => 'Gayaza-Zirobwe Road, Mile 14',
                    'city' => 'Gayaza',
                    'region' => 'Wakiso District',
                    'total_area' => 35.0,
                    'buildable_area' => 30.0,
                    'total_units' => 50,
                    'allocated_budget' => 380000000,
                    'description' => 'Gentle sloping arable residential plots with ready freehold title deeds and solar street lighting.',
                ],
                [
                    'name' => 'Kigo Royal Palms Estate',
                    'code' => 'EST-KIG-04',
                    'site_type' => 'mixed_use',
                    'status' => 'active',
                    'address' => 'Kigo Serena Corridor, Lake Victoria',
                    'city' => 'Kigo',
                    'region' => 'Wakiso District',
                    'total_area' => 25.0,
                    'buildable_area' => 20.0,
                    'total_units' => 30,
                    'allocated_budget' => 850000000,
                    'description' => 'Luxury gated residential enclave overlooking Lake Victoria, designated for high-end custom villas.',
                ],
            ];

            $seededEstates = [];
            foreach ($estatesData as $ed) {
                $site = Site::firstOrCreate(
                    ['code' => $ed['code']],
                    array_merge($ed, [
                        'uuid' => (string) Str::uuid(),
                        'project_id' => $project->id,
                        'country' => 'Uganda',
                        'currency' => 'UGX',
                        'supervisor_id' => $surveyor->id,
                        'start_date' => Carbon::now()->subMonths(6),
                        'expected_completion_date' => Carbon::now()->addMonths(18),
                    ])
                );
                $seededEstates[$ed['code']] = $site;
            }

            // 5. Seed Realistic Clients & User Logins
            $clientsData = [
                [
                    'first_name' => 'Ronald',
                    'last_name' => 'Mukasa',
                    'client_number' => 'FAB-CLI-1001',
                    'email' => 'ronald.mukasa@gmail.com',
                    'phone_primary' => '+256772123456',
                    'district' => 'Kampala',
                    'city' => 'Kampala',
                    'address_line1' => 'Plot 45 Bukoto Street',
                    'id_type' => 'national_id',
                    'id_number' => 'CM8501210459KL',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                ],
                [
                    'first_name' => 'Grace',
                    'last_name' => 'Nakato',
                    'client_number' => 'FAB-CLI-1002',
                    'email' => 'grace.nakato@yahoo.com',
                    'phone_primary' => '+256782654321',
                    'district' => 'Wakiso',
                    'city' => 'Nansana',
                    'address_line1' => 'Nabweru Road',
                    'id_type' => 'national_id',
                    'id_number' => 'CF9003420891MM',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                ],
                [
                    'first_name' => 'David',
                    'last_name' => 'Kato',
                    'client_number' => 'FAB-CLI-1003',
                    'email' => 'd.kato@diaspora.org.uk',
                    'phone_primary' => '+447911122233',
                    'phone_secondary' => '+256701987654',
                    'district' => 'Diaspora (UK)',
                    'city' => 'London',
                    'address_line1' => '24 Greenford Road, Harrow',
                    'id_type' => 'passport',
                    'id_number' => 'UGA984210',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                ],
                [
                    'first_name' => 'Sarah',
                    'last_name' => 'Babirye',
                    'client_number' => 'FAB-CLI-1004',
                    'email' => 'sarah.babirye@mulago.org',
                    'phone_primary' => '+256774332211',
                    'district' => 'Kampala',
                    'city' => 'Wandegeya',
                    'address_line1' => 'Mulago Hospital Quarters',
                    'id_type' => 'national_id',
                    'id_number' => 'CF8205560123PP',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                ],
                [
                    'first_name' => 'Brian',
                    'last_name' => 'Ochieng',
                    'client_number' => 'FAB-CLI-1005',
                    'email' => 'brian.ochieng@logistics.co.ug',
                    'phone_primary' => '+256755887766',
                    'district' => 'Wakiso',
                    'city' => 'Entebbe',
                    'address_line1' => 'Airport Road, Entebbe',
                    'id_type' => 'national_id',
                    'id_number' => 'CM8809910432ZZ',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                ],
                [
                    'first_name' => 'Brenda',
                    'last_name' => 'Atuhaire',
                    'client_number' => 'FAB-CLI-1006',
                    'email' => 'brenda.atuhaire@gmail.com',
                    'phone_primary' => '+256702445566',
                    'district' => 'Mbarara',
                    'city' => 'Mbarara',
                    'address_line1' => 'High Street, Mbarara City',
                    'id_type' => 'national_id',
                    'id_number' => 'CF9402120987QQ',
                    'status' => 'active',
                    'kyc_status' => 'verified',
                ],
            ];

            $seededClients = [];
            foreach ($clientsData as $cd) {
                $clientUser = User::firstOrCreate(
                    ['email' => $cd['email']],
                    [
                        'uuid' => (string) Str::uuid(),
                        'name' => $cd['first_name'] . ' ' . $cd['last_name'],
                        'phone' => $cd['phone_primary'],
                        'password' => bcrypt('password'),
                        'status' => 'active',
                    ]
                );
                $clientUser->syncRoles(['Client']);

                $client = Client::firstOrCreate(
                    ['client_number' => $cd['client_number']],
                    array_merge($cd, [
                        'uuid' => (string) Str::uuid(),
                        'user_id' => $clientUser->id,
                        'country' => 'Uganda',
                        'kyc_verified_at' => Carbon::now()->subMonths(2),
                        'kyc_verified_by' => $admin->id,
                        'nok_name' => 'Next of Kin for ' . $cd['first_name'],
                        'nok_relationship' => 'Spouse',
                        'nok_phone' => '+256700112233',
                    ])
                );
                $seededClients[$cd['client_number']] = $client;
            }

            // 6. Seed Plots (Units)
            $plotsData = [
                [
                    'estate_code' => 'EST-MAT-01',
                    'unit_number' => 'PLOT-MAT-014',
                    'block_number' => 'Block 284',
                    'name' => 'Plot 14 (50x100 ft) Matugga',
                    'area' => 5000.0,
                    'area_unit' => 'sq_ft',
                    'base_price' => 35000000,
                    'current_price' => 35000000,
                    'status' => 'reserved',
                    'client_number' => 'FAB-CLI-1001',
                    'tenure' => 'mailo',
                    'title_number' => 'WAK-284-014',
                    'deed_number' => 'DEED-2026-MAT014',
                    'survey_stage' => 'deed_plan',
                    'survey_progress' => 85,
                ],
                [
                    'estate_code' => 'EST-MAT-01',
                    'unit_number' => 'PLOT-MAT-015',
                    'block_number' => 'Block 284',
                    'name' => 'Plot 15 (50x100 ft) Matugga',
                    'area' => 5000.0,
                    'area_unit' => 'sq_ft',
                    'base_price' => 35000000,
                    'current_price' => 35000000,
                    'status' => 'available',
                    'tenure' => 'mailo',
                    'title_number' => 'WAK-284-015',
                    'deed_number' => 'DEED-2026-MAT015',
                    'survey_stage' => 'boundary_survey',
                    'survey_progress' => 50,
                ],
                [
                    'estate_code' => 'EST-BUD-02',
                    'unit_number' => 'PLOT-BUD-022',
                    'block_number' => 'Block 112',
                    'name' => 'Plot 22 (100x100 ft) Budo Heights',
                    'area' => 10000.0,
                    'area_unit' => 'sq_ft',
                    'base_price' => 65000000,
                    'current_price' => 65000000,
                    'status' => 'reserved',
                    'client_number' => 'FAB-CLI-1002',
                    'tenure' => 'mailo',
                    'title_number' => 'WAK-112-022',
                    'deed_number' => 'DEED-2026-BUD022',
                    'survey_stage' => 'boundary_survey',
                    'survey_progress' => 40,
                ],
                [
                    'estate_code' => 'EST-GAY-03',
                    'unit_number' => 'PLOT-GAY-008',
                    'block_number' => 'Block 305',
                    'name' => 'Plot 8 (50x100 ft) Gayaza Hillview',
                    'area' => 5000.0,
                    'area_unit' => 'sq_ft',
                    'base_price' => 28000000,
                    'current_price' => 28000000,
                    'status' => 'sold',
                    'client_number' => 'FAB-CLI-1004',
                    'tenure' => 'freehold',
                    'title_number' => 'WAK-305-008',
                    'deed_number' => 'DEED-2026-GAY008',
                    'survey_stage' => 'deed_handover',
                    'survey_progress' => 100,
                ],
                [
                    'estate_code' => 'EST-KIG-04',
                    'unit_number' => 'PLOT-KIG-005',
                    'block_number' => 'Block 401',
                    'name' => 'Plot 5 (100x100 ft Lake View) Kigo',
                    'area' => 10000.0,
                    'area_unit' => 'sq_ft',
                    'base_price' => 120000000,
                    'current_price' => 120000000,
                    'status' => 'reserved',
                    'client_number' => 'FAB-CLI-1003',
                    'tenure' => 'leasehold',
                    'title_number' => 'WAK-401-005',
                    'deed_number' => 'DEED-2026-KIG005',
                    'survey_stage' => 'ministry_mutation',
                    'survey_progress' => 70,
                ],
                [
                    'estate_code' => 'EST-MAT-01',
                    'unit_number' => 'PLOT-MAT-020',
                    'block_number' => 'Block 284',
                    'name' => 'Plot 20 (50x100 ft Corner) Matugga',
                    'area' => 5000.0,
                    'area_unit' => 'sq_ft',
                    'base_price' => 38000000,
                    'current_price' => 38000000,
                    'status' => 'available',
                    'tenure' => 'mailo',
                    'title_number' => 'WAK-284-020',
                    'deed_number' => 'DEED-2026-MAT020',
                    'survey_stage' => 'boundary_survey',
                    'survey_progress' => 30,
                ],
            ];

            $seededPlots = [];
            foreach ($plotsData as $pd) {
                $site = $seededEstates[$pd['estate_code']];
                $assignedClient = isset($pd['client_number']) ? $seededClients[$pd['client_number']] : null;

                $unit = Unit::firstOrCreate(
                    ['unit_number' => $pd['unit_number']],
                    [
                        'uuid' => (string) Str::uuid(),
                        'name' => $pd['name'],
                        'site_id' => $site->id,
                        'project_id' => $project->id,
                        'unit_type' => 'plot',
                        'status' => $pd['status'],
                        'block_number' => $pd['block_number'],
                        'area' => $pd['area'],
                        'area_unit' => $pd['area_unit'],
                        'base_price' => $pd['base_price'],
                        'current_price' => $pd['current_price'],
                        'currency' => 'UGX',
                        'client_id' => $assignedClient?->user_id,
                        'reserved_date' => $assignedClient ? Carbon::now()->subMonths(3) : null,
                    ]
                );
                $seededPlots[$pd['unit_number']] = $unit;

                // Create Land Title Deed record
                LandTitleDeed::firstOrCreate(
                    ['title_number' => $pd['title_number']],
                    [
                        'uuid' => (string) Str::uuid(),
                        'deed_number' => $pd['deed_number'],
                        'unit_id' => $unit->id,
                        'client_id' => $assignedClient?->id ?? $seededClients['FAB-CLI-1001']->id,
                        'project_id' => $project->id,
                        'tenure_type' => $pd['tenure'],
                        'overall_stage' => $pd['survey_stage'],
                        'overall_progress_percentage' => $pd['survey_progress'],
                        'surveyor_name' => 'Eng. Ssempa Godfrey (Reg. No. 412/SURV)',
                        'cadastral_survey_status' => 'completed',
                        'cadastral_survey_date' => Carbon::now()->subMonths(4),
                        'boundary_opening_status' => 'completed',
                        'beacon_coordinates' => [
                            ['beacon' => 'BK1', 'lat' => 0.4521, 'lng' => 32.5123],
                            ['beacon' => 'BK2', 'lat' => 0.4528, 'lng' => 32.5130],
                            ['beacon' => 'BK3', 'lat' => 0.4519, 'lng' => 32.5135],
                            ['beacon' => 'BK4', 'lat' => 0.4512, 'lng' => 32.5127],
                        ],
                        'ministry_zonal_office' => 'Wakiso Ministry Zonal Office (MZO)',
                        'zonal_reference_number' => 'WAK/MZO/2026/' . rand(1000, 9999),
                        'deed_plan_number' => 'DP-' . rand(10000, 99999) . '/2026',
                        'handover_status' => $pd['status'] === 'sold' ? 'handed_over' : 'in_custody',
                        'estimated_completion_date' => Carbon::now()->addMonths(2),
                        'notes' => 'Authentic title deed process under Fab Homes Uganda Land Scheme.',
                    ]
                );
            }

            // 7. Seed Diverse & Realistic Savings Accounts
            $savingsData = [
                // Ronald Mukasa - Matugga Plot 14 Land Saving
                [
                    'account_number' => 'SAV-LND-2026-001',
                    'client' => $seededClients['FAB-CLI-1001'],
                    'account_type' => 'land_saving',
                    'scheme_name' => 'Matugga Green Valley Land Saving Scheme',
                    'target_amount' => 35000000,
                    'current_balance' => 28000000, // 80%
                    'status' => 'active',
                    'plot' => $seededPlots['PLOT-MAT-014'],
                    'notes' => 'Plot 14 allocated; saving for final 20% balance before deed handover.',
                ],
                // Grace Nakato - Budo Heights Land Saving
                [
                    'account_number' => 'SAV-LND-2026-002',
                    'client' => $seededClients['FAB-CLI-1002'],
                    'account_type' => 'land_saving',
                    'scheme_name' => 'Budo Heights Land Saving Scheme',
                    'target_amount' => 65000000,
                    'current_balance' => 26000000, // 40%
                    'status' => 'active',
                    'plot' => $seededPlots['PLOT-BUD-022'],
                    'notes' => 'Plot 22 reserved; monthly standing order deposit of UGX 2,500,000.',
                ],
                // David Kato - Kigo Royal Palms Land Saving (Diaspora)
                [
                    'account_number' => 'SAV-LND-2026-003',
                    'client' => $seededClients['FAB-CLI-1003'],
                    'account_type' => 'land_saving',
                    'scheme_name' => 'Kigo Royal Palms Premium Land Scheme',
                    'target_amount' => 120000000,
                    'current_balance' => 90000000, // 75%
                    'status' => 'active',
                    'plot' => $seededPlots['PLOT-KIG-005'],
                    'notes' => 'UK diaspora client; foreign remittance converted to UGX via Stanbic Bank.',
                ],
                // Dr. Sarah Babirye - Gayaza Land Completed
                [
                    'account_number' => 'SAV-LND-2026-004',
                    'client' => $seededClients['FAB-CLI-1004'],
                    'account_type' => 'land_saving',
                    'scheme_name' => 'Gayaza Hillview Land Acquisition Scheme',
                    'target_amount' => 28000000,
                    'current_balance' => 28000000, // 100%
                    'status' => 'active',
                    'plot' => $seededPlots['PLOT-GAY-008'],
                    'notes' => 'Target 100% achieved! Title registration finalized and handed over.',
                ],
                // Dr. Sarah Babirye - Gayaza 4-Bedroom Construction Scheme
                [
                    'account_number' => 'SAV-CST-2026-101',
                    'client' => $seededClients['FAB-CLI-1004'],
                    'account_type' => 'construction_saving',
                    'scheme_name' => 'Gayaza 4-Bedroom Executive Bungalow Construction Scheme',
                    'target_amount' => 140000000,
                    'current_balance' => 70000000, // 50%
                    'status' => 'active',
                    'plot' => $seededPlots['PLOT-GAY-008'],
                    'notes' => 'Construction Saving Scheme: Foundation and Walling milestone pools funded.',
                ],
                // Brian Ochieng - Modern Villa Construction Saving
                [
                    'account_number' => 'SAV-CST-2026-102',
                    'client' => $seededClients['FAB-CLI-1005'],
                    'account_type' => 'construction_saving',
                    'scheme_name' => 'Lake View 3-Bedroom Contemporary House Scheme',
                    'target_amount' => 95000000,
                    'current_balance' => 38000000, // 40%
                    'status' => 'active',
                    'notes' => 'Phase 1 Substructure milestone pool allocated.',
                ],
                // Brenda Atuhaire - Flexible Land Scheme Starter
                [
                    'account_number' => 'SAV-LND-2026-005',
                    'client' => $seededClients['FAB-CLI-1006'],
                    'account_type' => 'land_saving',
                    'scheme_name' => 'Matugga Green Valley Starter Scheme',
                    'target_amount' => 35000000,
                    'current_balance' => 7000000, // 20%
                    'status' => 'active',
                    'notes' => 'Enrolled via Mobile Money; initial 20% commitment saved.',
                ],
            ];

            foreach ($savingsData as $sd) {
                $acc = SavingsAccount::firstOrCreate(
                    ['account_number' => $sd['account_number']],
                    [
                        'uuid' => (string) Str::uuid(),
                        'client_id' => $sd['client']->id,
                        'account_type' => $sd['account_type'],
                        'scheme_name' => $sd['scheme_name'],
                        'target_amount' => $sd['target_amount'],
                        'current_balance' => $sd['current_balance'],
                        'currency' => 'UGX',
                        'status' => $sd['status'],
                        'opened_date' => Carbon::now()->subMonths(rand(3, 10)),
                        'target_date' => Carbon::now()->addMonths(rand(6, 18)),
                        'plot_id' => isset($sd['plot']) ? $sd['plot']->id : null,
                        'project_id' => $project->id,
                        'notes' => $sd['notes'],
                        'created_by' => $admin->id,
                    ]
                );

                // Create a matching deposit transaction and payment record
                $payment = Payment::firstOrCreate(
                    ['payment_number' => 'PAY-DEP-' . substr($acc->account_number, -7)],
                    [
                        'uuid' => (string) Str::uuid(),
                        'client_id' => $sd['client']->id,
                        'savings_account_id' => $acc->id,
                        'amount' => $sd['current_balance'],
                        'currency' => 'UGX',
                        'payment_method' => 'bank_transfer',
                        'payment_date' => Carbon::now()->subDays(rand(2, 20)),
                        'status' => 'verified',
                        'reference_number' => 'REF-' . rand(100000, 999999),
                        'notes' => 'Verified deposit credited to ' . $acc->account_number,
                    ]
                );

                Transaction::firstOrCreate(
                    ['transaction_number' => 'TXN-ACC-' . substr($acc->account_number, -7)],
                    [
                        'uuid' => (string) Str::uuid(),
                        'account_id' => $acc->id,
                        'client_id' => $sd['client']->id,
                        'payment_id' => $payment->id,
                        'transaction_type' => 'credit',
                        'amount' => $sd['current_balance'],
                        'balance_before' => 0,
                        'balance_after' => $sd['current_balance'],
                        'currency' => 'UGX',
                        'status' => 'completed',
                        'description' => 'Savings deposit - ' . $sd['scheme_name'],
                        'transaction_date' => Carbon::now()->subDays(rand(2, 20)),
                        'value_date' => Carbon::now()->subDays(rand(2, 20)),
                        'created_by' => $admin->id,
                    ]
                );
            }

            // 8. Seed Bank Reconciliation Batches
            $reconBatches = [
                [
                    'batch_number' => 'REC-STB-2026-10',
                    'bank_name' => 'Stanbic Bank Uganda (Corporate Escrow)',
                    'account_number' => '9030012384912',
                    'currency' => 'UGX',
                    'statement_period_start' => Carbon::now()->subDays(30),
                    'statement_period_end' => Carbon::now(),
                    'opening_balance' => 145000000,
                    'closing_balance' => 235000000,
                    'total_credits' => 90000000,
                    'total_debits' => 0,
                    'total_entries_count' => 12,
                    'matched_entries_count' => 11,
                    'unmatched_entries_count' => 1,
                    'variance_amount' => 500000,
                    'status' => 'discrepancy_flagged',
                    'reconciled_by' => $financeManager->id,
                ],
                [
                    'batch_number' => 'REC-MTN-2026-10',
                    'bank_name' => 'MTN Mobile Money Aggregator (B2B)',
                    'account_number' => 'MM-FAB-8842',
                    'currency' => 'UGX',
                    'statement_period_start' => Carbon::now()->subDays(15),
                    'statement_period_end' => Carbon::now(),
                    'opening_balance' => 20000000,
                    'closing_balance' => 52500000,
                    'total_credits' => 32500000,
                    'total_debits' => 0,
                    'total_entries_count' => 18,
                    'matched_entries_count' => 18,
                    'unmatched_entries_count' => 0,
                    'variance_amount' => 0,
                    'status' => 'reconciled',
                    'reconciled_by' => $financeManager->id,
                    'reconciled_at' => Carbon::now()->subDays(1),
                ],
            ];

            foreach ($reconBatches as $rb) {
                BankReconciliationBatch::firstOrCreate(
                    ['batch_number' => $rb['batch_number']],
                    array_merge($rb, ['uuid' => (string) Str::uuid()])
                );
            }

            // 9. Seed Customer Support Tickets
            $ticketsData = [
                [
                    'ticket_number' => 'TKT-2026-0041',
                    'client' => $seededClients['FAB-CLI-1001'],
                    'subject' => 'Deed Plan Status Inquiry for Matugga Plot 14',
                    'category' => 'title_deed',
                    'priority' => 'medium',
                    'status' => 'open',
                    'message' => 'Hello Fab Homes team, I have reached 80% on my land savings account. Could you please give me an update on when the survey beacon placement will be physically inspected?',
                ],
                [
                    'ticket_number' => 'TKT-2026-0042',
                    'client' => $seededClients['FAB-CLI-1003'],
                    'subject' => 'Remittance Confirmation - UK Transfer for Kigo Plot 5',
                    'category' => 'payment_issue',
                    'priority' => 'high',
                    'status' => 'resolved',
                    'message' => 'I wired GBP 5,000 yesterday via Stanbic international transfer. Kindly confirm receipt and allocate to SAV-LND-2026-003.',
                ],
            ];

            foreach ($ticketsData as $td) {
                $ticket = SupportTicket::firstOrCreate(
                    ['ticket_number' => $td['ticket_number']],
                    [
                        'uuid' => (string) Str::uuid(),
                        'client_id' => $td['client']->id,
                        'user_id' => $td['client']->user_id ?? $admin->id,
                        'subject' => $td['subject'],
                        'category' => $td['category'],
                        'priority' => $td['priority'],
                        'status' => $td['status'],
                        'last_replied_at' => Carbon::now()->subHours(4),
                    ]
                );

                SupportTicketMessage::firstOrCreate(
                    ['support_ticket_id' => $ticket->id],
                    [
                        'uuid' => (string) Str::uuid(),
                        'user_id' => $td['client']->user_id ?? $admin->id,
                        'sender_type' => 'client',
                        'sender_name' => $td['client']->first_name . ' ' . $td['client']->last_name,
                        'message' => $td['message'],
                        'is_internal_note' => false,
                    ]
                );
            }

            DB::commit();
            echo "FabHomesRealisticDataSeeder completed successfully!\n";
        } catch (\Throwable $e) {
            DB::rollBack();
            echo "Seeder failed: " . $e->getMessage() . "\n" . $e->getFile() . ':' . $e->getLine() . "\n" . $e->getTraceAsString() . "\n";
            throw $e;
        }
    }
}
