<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DefectLiabilityCertificate extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'defect_liability_certificates';

    protected $fillable = [
        'uuid',
        'certificate_number',
        'certificate_type',
        'project_id',
        'unit_id',
        'contract_id',
        'client_id',
        'retention_fund_id',
        'commencement_date',
        'maturity_date',
        'retention_pool_amount',
        'deductions_amount',
        'net_release_amount',
        'currency',
        'open_snags_count',
        'resolved_snags_count',
        'qs_signed_by',
        'qs_signed_at',
        'engineer_signed_by',
        'engineer_signed_at',
        'client_signed_at',
        'status',
        'inspection_notes',
        'certificate_notes',
    ];

    protected $casts = [
        'commencement_date' => 'date',
        'maturity_date' => 'date',
        'retention_pool_amount' => 'decimal:2',
        'deductions_amount' => 'decimal:2',
        'net_release_amount' => 'decimal:2',
        'qs_signed_at' => 'datetime',
        'engineer_signed_at' => 'datetime',
        'client_signed_at' => 'datetime',
        'open_snags_count' => 'integer',
        'resolved_snags_count' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($cert) {
            if (empty($cert->uuid)) {
                $cert->uuid = (string) Str::uuid();
            }
            if (empty($cert->certificate_number)) {
                $cert->certificate_number = static::generateCertificateNumber($cert->certificate_type ?? 'practical_completion');
            }
        });
    }

    public static function generateCertificateNumber(string $type): string
    {
        $prefix = match ($type) {
            'practical_completion' => 'PCC',
            'defect_clearance' => 'DCC',
            'final_handover' => 'FHC',
            'retention_release' => 'DLC',
            default => 'DLC',
        };

        $month = date('Ym');
        $fullPrefix = "{$prefix}-{$month}";
        $latest = static::where('certificate_number', 'like', "{$fullPrefix}-%")
            ->orderBy('id', 'desc')
            ->value('certificate_number');

        $nextSeq = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $m)) {
            $nextSeq = ((int) $m[1]) + 1;
        }

        return sprintf('%s-%04d', $fullPrefix, $nextSeq);
    }

    // Relationships
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SubcontractorContract::class, 'contract_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function retentionFund(): BelongsTo
    {
        return $this->belongsTo(RetentionFund::class, 'retention_fund_id');
    }

    public function qsUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'qs_signed_by');
    }

    public function engineerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'engineer_signed_by');
    }

    public function punchListItems(): HasMany
    {
        return $this->hasMany(PunchListItem::class, 'defect_liability_certificate_id');
    }

    public function retentionTransactions(): HasMany
    {
        return $this->hasMany(RetentionTransaction::class, 'defect_liability_certificate_id');
    }
}
