<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClientSecurityProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'client_security_profiles';

    protected $fillable = [
        'uuid',
        'client_id',
        'user_id',
        'pin_hash',
        'pin_set_at',
        'pin_failed_attempts',
        'pin_locked_until',
        'biometric_enabled',
        'biometric_credential_id',
        'biometric_device_name',
        'biometric_registered_at',
        'two_factor_method',
        'preferred_language',
        'notification_channels',
        'pwa_installed',
        'pwa_installed_at',
        'last_active_device',
        'last_active_ip',
    ];

    protected $hidden = [
        'pin_hash',
    ];

    protected $casts = [
        'pin_set_at' => 'datetime',
        'pin_locked_until' => 'datetime',
        'biometric_enabled' => 'boolean',
        'biometric_registered_at' => 'datetime',
        'notification_channels' => 'array',
        'pwa_installed' => 'boolean',
        'pwa_installed_at' => 'datetime',
        'pin_failed_attempts' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($profile) {
            if (empty($profile->uuid)) {
                $profile->uuid = (string) Str::uuid();
            }
            if (empty($profile->notification_channels)) {
                $profile->notification_channels = [
                    'sms' => true,
                    'email' => true,
                    'whatsapp' => false,
                    'push' => true,
                ];
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Check if Quick-PIN is locked due to too many failed attempts
     */
    public function isPinLocked(): bool
    {
        if (!$this->pin_locked_until) {
            return false;
        }

        return now()->lt($this->pin_locked_until);
    }

    /**
     * Verify provided Quick-PIN
     */
    public function verifyPin(string $pin): bool
    {
        if (empty($this->pin_hash)) {
            return false;
        }

        return Hash::check($pin, $this->pin_hash);
    }

    /**
     * Set a new Quick-PIN
     */
    public function setPin(string $pin): void
    {
        $this->update([
            'pin_hash' => Hash::make($pin),
            'pin_set_at' => now(),
            'pin_failed_attempts' => 0,
            'pin_locked_until' => null,
        ]);
    }

    /**
     * Record a failed PIN entry attempt with progressive lockout
     */
    public function recordFailedPinAttempt(): int
    {
        $attempts = $this->pin_failed_attempts + 1;
        $lockedUntil = null;

        // Lock for 15 minutes after 5 failed attempts
        if ($attempts >= 5) {
            $lockedUntil = now()->addMinutes(15);
        }

        $this->update([
            'pin_failed_attempts' => $attempts,
            'pin_locked_until' => $lockedUntil,
        ]);

        return $attempts;
    }

    /**
     * Reset failed PIN attempts on successful verification
     */
    public function resetPinAttempts(): void
    {
        if ($this->pin_failed_attempts > 0 || $this->pin_locked_until !== null) {
            $this->update([
                'pin_failed_attempts' => 0,
                'pin_locked_until' => null,
            ]);
        }
    }
}
