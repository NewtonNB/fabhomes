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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('document_number')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('document_type'); // contract, id_proof, receipt, floor_plan, permit, survey, inspection_report, kyc, title_deed, other
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size'); // in bytes
            $table->string('file_extension', 10)->nullable();
            
            // Polymorphic relation to Project, Site, Unit, Client, Payment, etc.
            $table->nullableMorphs('documentable');
            
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->string('status')->default('active'); // active, archived, expired
            $table->date('expiry_date')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->json('metadata')->nullable();
            
            $table->softDeletes();
            $table->timestamps();

            $table->index('document_type');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
