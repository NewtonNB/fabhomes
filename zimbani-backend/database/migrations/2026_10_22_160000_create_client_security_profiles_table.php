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
        Schema::create('client_security_profiles', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // Quick-PIN Authentication (4-6 digits bcrypt hash)
            $table->string('pin_hash')->nullable();
            $table->timestamp('pin_set_at')->nullable();
            $table->unsignedTinyInteger('pin_failed_attempts')->default(0);
            $table->timestamp('pin_locked_until')->nullable();

            // Biometric Authentication (WebAuthn / Device Key)
            $table->boolean('biometric_enabled')->default(false);
            $table->string('biometric_credential_id', 255)->nullable()->index();
            $table->string('biometric_device_name', 100)->nullable();
            $table->timestamp('biometric_registered_at')->nullable();

            // Two-Factor and Notification Preferences
            $table->string('two_factor_method', 30)->default('none'); // none, email_otp, sms_otp
            $table->string('preferred_language', 10)->default('en');
            $table->json('notification_channels')->nullable(); // {"sms": true, "email": true, "whatsapp": false, "push": true}

            // PWA Installation & Session Audit
            $table->boolean('pwa_installed')->default(false);
            $table->timestamp('pwa_installed_at')->nullable();
            $table->string('last_active_device', 150)->nullable();
            $table->string('last_active_ip', 45)->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['client_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_security_profiles');
    }
};
