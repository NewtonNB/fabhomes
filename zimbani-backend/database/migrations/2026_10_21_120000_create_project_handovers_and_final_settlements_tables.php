<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Capstone Project Handovers & Occupancy Dossier Table
        Schema::create('project_handovers', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('handover_number', 50)->unique(); // HND-YYYYMM-XXXX
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->string('handover_title', 255);
            $table->enum('status', [
                'draft',
                'snags_pending',
                'dossier_review',
                'client_review',
                'approved_by_client',
                'keys_released',
                'closed',
            ])->default('draft');

            // Physical Milestone Clearance
            $table->boolean('substructure_cleared')->default(false);
            $table->boolean('superstructure_cleared')->default(false);
            $table->boolean('roofing_cleared')->default(false);
            $table->boolean('mep_cleared')->default(false);
            $table->boolean('finishes_cleared')->default(false);
            $table->boolean('all_milestones_verified')->default(false);

            // Punch List / Defect Clearance
            $table->unsignedInteger('total_snags_logged')->default(0);
            $table->unsignedInteger('total_snags_resolved')->default(0);
            $table->unsignedInteger('critical_snags_pending')->default(0);
            $table->boolean('snags_cleared')->default(false);

            // Handover Dossier & Municipal Permits Checklist
            $table->boolean('has_occupancy_permit')->default(false);
            $table->string('occupancy_permit_ref', 100)->nullable();
            $table->date('occupancy_permit_issued_at')->nullable();
            $table->boolean('has_as_built_drawings')->default(false);
            $table->string('as_built_drawings_ref', 100)->nullable();
            $table->boolean('has_mep_compliance_certs')->default(false);
            $table->text('mep_compliance_notes')->nullable();
            $table->boolean('has_warranty_manual')->default(false);
            $table->boolean('has_keys_inventory')->default(false);
            $table->unsignedInteger('key_sets_count')->default(0);

            // Deed of Handover & Key Release Sign-Off
            $table->foreignId('lead_architect_signed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('lead_architect_signed_at')->nullable();
            $table->foreignId('project_director_signed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('project_director_signed_at')->nullable();
            $table->timestamp('client_signed_at')->nullable();
            $table->string('client_signature_name', 150)->nullable();
            $table->string('client_signature_hash', 128)->nullable();
            $table->string('client_signoff_ip', 45)->nullable();
            $table->timestamp('keys_released_at')->nullable();
            $table->string('keys_received_by_name', 150)->nullable();
            $table->date('dlp_start_date')->nullable();
            $table->date('dlp_end_date')->nullable();
            $table->unsignedInteger('dlp_period_days')->default(365); // 365 Days DLP
            $table->text('handover_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status'], 'idx_ph_proj_status');
            $table->index(['client_id'], 'idx_ph_client');
            $table->index(['handover_number'], 'idx_ph_number');
        });

        // 2. Capstone Project Final Financial Settlements Table
        Schema::create('project_final_settlements', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('settlement_number', 50)->unique(); // FS-YYYYMM-XXXX
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('project_handover_id')->nullable()->constrained('project_handovers')->nullOnDelete();
            $table->string('currency', 3)->default('UGX');

            // Financial Balance Sheet (Amounts in UGX)
            $table->decimal('original_contract_sum', 15, 2)->default(0.00);
            $table->decimal('approved_variations_amount', 15, 2)->default(0.00);
            $table->decimal('material_escalation_amount', 15, 2)->default(0.00);
            $table->decimal('adjusted_contract_sum', 15, 2)->default(0.00); // original + variations + escalation
            $table->decimal('total_escrow_inflows', 15, 2)->default(0.00); // client deposits + milestone pool draws
            $table->decimal('total_subcontractor_paid', 15, 2)->default(0.00);
            $table->decimal('total_direct_expenses_paid', 15, 2)->default(0.00);
            $table->decimal('total_disbursements_paid', 15, 2)->default(0.00);
            $table->decimal('retention_withheld_total', 15, 2)->default(0.00);
            $table->decimal('retention_released_completion', 15, 2)->default(0.00);
            $table->decimal('retention_held_dlp', 15, 2)->default(0.00);
            $table->decimal('diaspora_fx_hedging_savings', 15, 2)->default(0.00);
            $table->decimal('gross_project_profit', 15, 2)->default(0.00);
            $table->decimal('profit_margin_percentage', 5, 2)->default(0.00);
            $table->decimal('final_settlement_balance', 15, 2)->default(0.00);
            $table->enum('settlement_direction', [
                'balanced',
                'client_payable',
                'client_refund',
            ])->default('balanced');

            // Audit Trail & Governance
            $table->enum('status', [
                'draft',
                'audited',
                'client_confirmed',
                'final_settled',
                'disputed',
            ])->default('draft');
            $table->foreignId('audited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('audited_at')->nullable();
            $table->timestamp('client_approved_at')->nullable();
            $table->timestamp('final_settled_at')->nullable();
            $table->text('settlement_notes')->nullable();
            $table->json('ledger_snapshot')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status'], 'idx_pfs_proj_status');
            $table->index(['client_id'], 'idx_pfs_client');
            $table->index(['settlement_number'], 'idx_pfs_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_final_settlements');
        Schema::dropIfExists('project_handovers');
    }
};
