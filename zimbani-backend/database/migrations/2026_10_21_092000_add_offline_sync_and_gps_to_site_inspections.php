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
        // 1. Add offline synchronization & GPS fields to site_inspections
        Schema::table('site_inspections', function (Blueprint $table) {
            if (!Schema::hasColumn('site_inspections', 'client_sync_id')) {
                $table->string('client_sync_id', 64)->nullable()->after('uuid')->index();
            }
            if (!Schema::hasColumn('site_inspections', 'device_id')) {
                $table->string('device_id', 64)->nullable()->after('client_sync_id');
            }
            if (!Schema::hasColumn('site_inspections', 'offline_created_at')) {
                $table->dateTime('offline_created_at')->nullable()->after('device_id');
            }
            if (!Schema::hasColumn('site_inspections', 'synced_at')) {
                $table->dateTime('synced_at')->nullable()->after('offline_created_at');
            }
            if (!Schema::hasColumn('site_inspections', 'sync_status')) {
                $table->enum('sync_status', ['synced', 'pending_sync', 'conflict_resolved'])
                    ->default('synced')
                    ->after('synced_at');
            }

            // GPS site verification
            if (!Schema::hasColumn('site_inspections', 'gps_latitude')) {
                $table->decimal('gps_latitude', 10, 7)->nullable()->after('conditions');
            }
            if (!Schema::hasColumn('site_inspections', 'gps_longitude')) {
                $table->decimal('gps_longitude', 10, 7)->nullable()->after('gps_latitude');
            }
            if (!Schema::hasColumn('site_inspections', 'gps_accuracy')) {
                $table->decimal('gps_accuracy', 6, 2)->nullable()->after('gps_longitude')->comment('Accuracy in meters');
            }

            // Construction milestone & pool linkages
            if (!Schema::hasColumn('site_inspections', 'milestone_savings_pool_id')) {
                $table->foreignId('milestone_savings_pool_id')
                    ->nullable()
                    ->after('milestone_id')
                    ->constrained('milestone_savings_pools')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('site_inspections', 'verified_milestone_percentage')) {
                $table->decimal('verified_milestone_percentage', 5, 2)
                    ->default(0.00)
                    ->after('score')
                    ->comment('Estimated completion % of milestone (0-100)');
            }

            if (!Schema::hasColumn('site_inspections', 'weather_condition')) {
                $table->string('weather_condition', 50)->nullable()->after('conditions');
            }
            if (!Schema::hasColumn('site_inspections', 'work_authorized')) {
                $table->boolean('work_authorized')->default(false)->after('weather_condition');
            }
        });

        // 2. Add offline sync & geo fields to punch_list_items
        Schema::table('punch_list_items', function (Blueprint $table) {
            if (!Schema::hasColumn('punch_list_items', 'client_sync_id')) {
                $table->string('client_sync_id', 64)->nullable()->after('uuid')->index();
            }
            if (!Schema::hasColumn('punch_list_items', 'offline_created_at')) {
                $table->dateTime('offline_created_at')->nullable()->after('client_sync_id');
            }
            if (!Schema::hasColumn('punch_list_items', 'synced_at')) {
                $table->dateTime('synced_at')->nullable()->after('offline_created_at');
            }
            if (!Schema::hasColumn('punch_list_items', 'gps_latitude')) {
                $table->decimal('gps_latitude', 10, 7)->nullable()->after('location_details');
            }
            if (!Schema::hasColumn('punch_list_items', 'gps_longitude')) {
                $table->decimal('gps_longitude', 10, 7)->nullable()->after('gps_latitude');
            }
            if (!Schema::hasColumn('punch_list_items', 'photo_url')) {
                $table->text('photo_url')->nullable()->after('description');
            }
        });

        // 3. Create or rebuild offline_sync_logs table
        if (!Schema::hasTable('offline_sync_logs')) {
            Schema::create('offline_sync_logs', function (Blueprint $table) {
                $table->id();
                $table->char('uuid', 36)->unique();
                $table->string('device_id', 64)->index();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('sync_type', 50)->default('walkthrough_audit_batch');
                $table->unsignedInteger('total_items_processed')->default(0);
                $table->unsignedInteger('total_conflicts')->default(0);
                $table->json('payload_summary')->nullable();
                $table->string('client_version', 20)->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->enum('status', ['success', 'partial_success', 'failed'])->default('success');
                $table->timestamps();

                $table->index(['user_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offline_sync_logs');

        Schema::table('punch_list_items', function (Blueprint $table) {
            $table->dropColumn([
                'client_sync_id',
                'offline_created_at',
                'synced_at',
                'gps_latitude',
                'gps_longitude',
                'photo_url',
            ]);
        });

        Schema::table('site_inspections', function (Blueprint $table) {
            $table->dropForeign(['milestone_savings_pool_id']);
            $table->dropColumn([
                'client_sync_id',
                'device_id',
                'offline_created_at',
                'synced_at',
                'sync_status',
                'gps_latitude',
                'gps_longitude',
                'gps_accuracy',
                'milestone_savings_pool_id',
                'verified_milestone_percentage',
                'weather_condition',
                'work_authorized',
            ]);
        });
    }
};
