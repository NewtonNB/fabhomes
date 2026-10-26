<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SchemeTransfer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'client_id',
        'from_savings_account_id',
        'to_savings_account_id',
        'from_scheme_name',
        'to_scheme_name',
        'amount',
        'reason',
        'status',
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($transfer) {
            if (empty($transfer->uuid)) {
                $transfer->uuid = (string) Str::uuid();
            }
            if (empty($transfer->status)) {
                $transfer->status = 'pending';
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function fromAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'from_savings_account_id');
    }

    public function toAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class, 'to_savings_account_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
