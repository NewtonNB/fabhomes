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
        // 1. Departments Table
        if (!Schema::hasTable('departments')) {
            Schema::create('departments', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code')->unique();
                $table->text('description')->nullable();
                $table->string('head_of_department')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 2. Employees Table
        if (!Schema::hasTable('employees')) {
            Schema::create('employees', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('employee_number')->unique();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                
                $table->string('first_name');
                $table->string('last_name');
                $table->string('nin')->nullable()->unique();
                $table->enum('gender', ['male', 'female'])->default('male');
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('district')->nullable();
                $table->string('position')->nullable();
                $table->string('salary_grade')->nullable();
                $table->decimal('base_salary', 15, 2)->default(0.00);
                $table->date('date_joined')->nullable();
                $table->enum('status', ['active', 'on_leave', 'suspended', 'terminated'])->default('active');
                $table->text('digital_signature')->nullable();
                $table->json('metadata')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->index('employee_number');
                $table->index(['status', 'gender']);
                $table->index('department_id');
            });
        }

        // 3. Employee Leave Requests Table
        if (!Schema::hasTable('employee_leave_requests')) {
            Schema::create('employee_leave_requests', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
                
                $table->enum('leave_type', ['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid'])->default('annual');
                $table->date('start_date');
                $table->date('end_date');
                $table->integer('days_count')->default(1);
                $table->text('reason')->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->text('rejection_reason')->nullable();

                $table->timestamps();

                $table->index(['employee_id', 'status']);
                $table->index('start_date');
            });
        }

        // 4. Mother Titles Table
        if (!Schema::hasTable('mother_titles')) {
            Schema::create('mother_titles', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('record_no')->unique();
                $table->string('phase')->default('Phase 1');
                $table->string('scheme')->default('Mukono');
                $table->string('title_no'); // e.g. Busiro Block 450 Plot 12
                $table->string('block_no')->nullable();
                $table->string('district')->default('Wakiso');
                $table->string('sub_county')->nullable();
                $table->string('village')->nullable();
                $table->string('estate_name');
                $table->decimal('area_acres', 10, 2)->default(0.00);
                $table->date('subdivision_date')->nullable();
                $table->date('date_of_return')->nullable();
                $table->string('new_plot_no')->nullable();
                $table->enum('title_status', ['in_safe', 'with_surveyor', 'at_ministry', 'subdivided', 'transferred'])->default('in_safe');
                $table->string('verified_by')->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->index('record_no');
                $table->index('title_no');
                $table->index(['phase', 'scheme']);
                $table->index('title_status');
            });
        }

        // 5. Mother Title Transfers Tracking Table
        if (!Schema::hasTable('mother_title_transfers')) {
            Schema::create('mother_title_transfers', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->foreignId('mother_title_id')->constrained('mother_titles')->onDelete('cascade');
                
                $table->date('date_taken');
                $table->date('date_of_return')->nullable();
                $table->string('verified_by');
                $table->string('purpose')->default('Ministry Mutation / Cadastral Survey');
                $table->enum('status', ['out_on_loan', 'returned', 'overdue'])->default('out_on_loan');
                $table->text('remarks')->nullable();

                $table->timestamps();

                $table->index('mother_title_id');
                $table->index('status');
            });
        }

        // 6. Enhance payment_refunds table with deduction calculation & manual fields
        Schema::table('payment_refunds', function (Blueprint $table) {
            if (!Schema::hasColumn('payment_refunds', 'phase_name')) {
                $table->string('phase_name')->nullable()->after('client_id');
            }
            if (!Schema::hasColumn('payment_refunds', 'scheme_name')) {
                $table->string('scheme_name')->nullable()->after('phase_name');
            }
            if (!Schema::hasColumn('payment_refunds', 'notice_date')) {
                $table->date('notice_date')->nullable()->after('scheme_name');
            }
            if (!Schema::hasColumn('payment_refunds', 'deduction_percentage')) {
                $table->decimal('deduction_percentage', 5, 2)->default(0.00)->after('amount');
            }
            if (!Schema::hasColumn('payment_refunds', 'deduction_amount')) {
                $table->decimal('deduction_amount', 15, 2)->default(0.00)->after('deduction_percentage');
            }
            if (!Schema::hasColumn('payment_refunds', 'balance_after_refund')) {
                $table->decimal('balance_after_refund', 15, 2)->default(0.00)->after('deduction_amount');
            }
            if (!Schema::hasColumn('payment_refunds', 'withdrawal_reason')) {
                $table->text('withdrawal_reason')->nullable()->after('reason_description');
            }
            if (!Schema::hasColumn('payment_refunds', 'payment_method')) {
                $table->string('payment_method')->default('bank_transfer')->after('withdrawal_reason');
            }
            if (!Schema::hasColumn('payment_refunds', 'notes')) {
                $table->text('notes')->nullable()->after('payment_method');
            }
        });

        // 7. Enhance users table with digital signature and employee link
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'signature_data')) {
                $table->longText('signature_data')->nullable()->after('metadata');
            }
            if (!Schema::hasColumn('users', 'employee_id')) {
                $table->foreignId('employee_id')->nullable()->after('signature_data')->constrained('employees')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'employee_id')) {
                $table->dropForeign(['employee_id']);
                $table->dropColumn('employee_id');
            }
            if (Schema::hasColumn('users', 'signature_data')) {
                $table->dropColumn('signature_data');
            }
        });

        Schema::table('payment_refunds', function (Blueprint $table) {
            $table->dropColumn([
                'phase_name',
                'scheme_name',
                'notice_date',
                'deduction_percentage',
                'deduction_amount',
                'balance_after_refund',
                'withdrawal_reason',
                'payment_method',
                'notes',
            ]);
        });

        Schema::dropIfExists('mother_title_transfers');
        Schema::dropIfExists('mother_titles');
        Schema::dropIfExists('employee_leave_requests');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('departments');
    }
};
