<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Traits\LogsActivity;

class Client extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'uuid',
        'client_number',
        'user_id',
        // Personal Information
        'first_name',
        'middle_name',
        'last_name',
        'date_of_birth',
        'gender',
        // Contact Information
        'email',
        'phone_primary',
        'phone_secondary',
        'address_line1',
        'address_line2',
        'city',
        'district',
        'country',
        'postal_code',
        // Identification
        'id_type',
        'id_number',
        'id_expiry_date',
        // Next of Kin
        'nok_name',
        'nok_relationship',
        'nok_phone',
        'nok_address',
        // Status
        'status',
        'kyc_status',
        'kyc_verified_at',
        'kyc_verified_by',
        // Metadata
        'notes',
        'tags',
        // Audit
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'id_expiry_date' => 'date',
        'kyc_verified_at' => 'datetime',
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot function to auto-generate UUID and client number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($client) {
            if (empty($client->uuid)) {
                $client->uuid = (string) Str::uuid();
            }
            if (empty($client->client_number)) {
                $client->client_number = self::generateClientNumber();
            }
        });
    }

    /**
     * Generate unique client number
     */
    private static function generateClientNumber(): string
    {
        $prefix = 'FAB-CLI-';
        $lastClient = self::withTrashed()
            ->where('client_number', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        if ($lastClient) {
            $lastNumber = (int) str_replace($prefix, '', $lastClient->client_number);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Get route key name for route model binding
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Relationships
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function units()
    {
        return $this->hasMany(Unit::class);
    }

    public function savingsAccounts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SavingsAccount::class, 'client_id');
    }

    public function landSavingAccounts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SavingsAccount::class, 'client_id')->where('account_type', 'land_saving');
    }

    public function constructionSavingAccounts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SavingsAccount::class, 'client_id')->where('account_type', 'construction_saving');
    }

    public function transactions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Transaction::class, 'client_id')->latest('transaction_date');
    }

    public function milestoneVerifications(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MilestoneVerification::class, 'client_id');
    }

    public function milestonePaymentReleases(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MilestonePaymentRelease::class, 'client_id');
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function kycVerifiedBy()
    {
        return $this->belongsTo(User::class, 'kyc_verified_by');
    }

    public function handovers()
    {
        return $this->hasMany(ProjectHandover::class, 'client_id');
    }

    public function finalSettlements()
    {
        return $this->hasMany(ProjectFinalSettlement::class, 'client_id');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeVerified($query)
    {
        return $query->where('kyc_status', 'verified');
    }

    public function scopePending($query)
    {
        return $query->where('kyc_status', 'pending');
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('client_number', 'like', "%{$search}%")
              ->orWhere('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%")
              ->orWhere('phone_primary', 'like', "%{$search}%");
        });
    }

    /**
     * Accessors
     */
    public function getFullNameAttribute(): string
    {
        $name = $this->first_name;
        if ($this->middle_name) {
            $name .= ' ' . $this->middle_name;
        }
        $name .= ' ' . $this->last_name;
        return $name;
    }

    public function getFullAddressAttribute(): ?string
    {
        $parts = array_filter([
            $this->address_line1,
            $this->address_line2,
            $this->city,
            $this->district,
            $this->country,
        ]);

        return !empty($parts) ? implode(', ', $parts) : null;
    }

    /**
     * Helper Methods
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isVerified(): bool
    {
        return $this->kyc_status === 'verified';
    }

    public function isPending(): bool
    {
        return $this->kyc_status === 'pending';
    }

    public function verifyKyc(User $verifiedBy): void
    {
        $this->update([
            'kyc_status' => 'verified',
            'kyc_verified_at' => now(),
            'kyc_verified_by' => $verifiedBy->id,
        ]);
    }

    public function rejectKyc(): void
    {
        $this->update([
            'kyc_status' => 'rejected',
        ]);
    }
}
