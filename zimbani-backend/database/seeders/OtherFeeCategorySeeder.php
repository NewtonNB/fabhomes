<?php

namespace Database\Seeders;

use App\Models\OtherFeeCategory;
use Illuminate\Database\Seeder;

class OtherFeeCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'code' => 'legal_agreement',
                'name' => 'Legal Documentation & Sales Agreement Fee',
                'description' => 'Legal documentation preparation, sales agreement drafting, advocate attestation, and official witnessing.',
                'standard_amount' => 350000.00,
                'is_mandatory' => true,
                'is_active' => true,
            ],
            [
                'code' => 'boundary_survey',
                'name' => 'Boundary Opening & Survey Beacon Fee',
                'description' => 'Cadastral surveyor field mobilization, boundary opening, verification of corner coordinates, and physical boundary beacon installation.',
                'standard_amount' => 500000.00,
                'is_mandatory' => true,
                'is_active' => true,
            ],
            [
                'code' => 'title_deed_mutation',
                'name' => 'Title Deed Mutation & Registration Fee',
                'description' => 'Deed plan mutation, Ministry of Lands processing, stamp duty lodgment, and final Certificate of Title registration.',
                'standard_amount' => 850000.00,
                'is_mandatory' => false,
                'is_active' => true,
            ],
            [
                'code' => 'site_visit_tour',
                'name' => 'Estate Site Inspection & Tour Facilitation',
                'description' => 'Round-trip transport facilitation, site tour guide accompaniment, and on-site plot identification.',
                'standard_amount' => 50000.00,
                'is_mandatory' => false,
                'is_active' => true,
            ],
            [
                'code' => 'scheme_transfer_admin',
                'name' => 'Scheme / Plot Transfer Administration Fee',
                'description' => 'Administrative record updating and financial ledger adjustment for scheme swapping or plot re-allocation.',
                'standard_amount' => 100000.00,
                'is_mandatory' => false,
                'is_active' => true,
            ],
            [
                'code' => 'late_penalty_surcharge',
                'name' => 'Late Milestone Penalty Surcharge',
                'description' => 'Statutory late installment default surcharge as prescribed in the Fab Homes property sales agreement.',
                'standard_amount' => 150000.00,
                'is_mandatory' => false,
                'is_active' => true,
            ],
            [
                'code' => 'custom_misc',
                'name' => 'General Miscellaneous Fee',
                'description' => 'Ad-hoc operational, administrative, or statutory service fees.',
                'standard_amount' => 0.00,
                'is_mandatory' => false,
                'is_active' => true,
            ],
        ];

        foreach ($categories as $cat) {
            OtherFeeCategory::firstOrCreate(
                ['code' => $cat['code']],
                $cat
            );
        }

        $this->command?->info('Other Fee Categories seeded successfully.');
    }
}
