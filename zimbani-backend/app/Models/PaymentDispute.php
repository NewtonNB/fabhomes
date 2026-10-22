<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PaymentDispute extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'payment_disputes';

    protected $fillable = [
        'uuid',
        'dispute_number',
        'payment_id',
        'payment_intent_id',
        'client_id',
        'refund_id',
        'dispute_source',
        'disputed_amount',
        'currency',
        'reason',
        'evidence_deadline',
        'status',
        'evidence_files',
        'resolution_notes',
        'resolved_at',
        'resolved_by',
        'metadata',
    ];

    protected $casts = [
        'disputed_amount' => 'decimal:2',
        'evidence_deadline' => 'datetime',
        'resolved_at' => 'datetime',
        'evidence_files' => 'array',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->dispute_number)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->dispute_number = sprintf('DSP-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function refund(): BelongsTo
    {
        return $this->belongsTo(PaymentRefund::class, 'refund_id');
    }

    public function resolvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
