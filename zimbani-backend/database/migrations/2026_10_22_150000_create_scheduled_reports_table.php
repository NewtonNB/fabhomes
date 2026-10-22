<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_reports', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name', 255);
            $table->string('report_type', 64); // financial_summary, client_activity, plot_allocation, construction_progress, cash_flow
            $table->string('frequency', 32)->default('weekly'); // daily, weekly, monthly
            $table->string('format', 16)->default('csv'); // csv, pdf, both
            $table->json('recipients'); // array of emails
            $table->json('filters')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_sent_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['report_type', 'is_active']);
            $table->index('frequency');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_reports');
    }
};
