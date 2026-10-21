<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectFinalSettlement extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'uuid',
        'settlement_number',
        'project_id',
        'unit_id',
        'client_id',
        'project_handover_id',
        'currency',
        'original_contract_sum',
        'approved_variations_amount',
        'material_escalation_amount',
        'adjusted_contract_sum',
        'total_escrow_inflows',
        'total_subcontractor_paid',
        'total_direct_expenses_paid',
        'total_disbursements_paid',
        'retention_withheld_total',
        'retention_released_completion',
        'retention_held_dlp',
        'diaspora_fx_hedging_savings',
        'gross_project_profit',
        'profit_margin_percentage',
        'final_settlement_balance',
        'settlement_direction',
        'status',
        'audited_by',
        'audited_at',
        'client_approved_at',
        'final_settled_at',
        'settlement_notes',
        'ledger_snapshot',
    ];

    protected $casts = [
        'original_contract_sum' => 'decimal:2',
        'approved_variations_amount' => 'decimal:2',
        'material_escalation_amount' => 'decimal:2',
        'adjusted_contract_sum' => 'decimal:2',
        'total_escrow_inflows' => 'decimal:2',
        'total_subcontractor_paid' => 'decimal:2',
        'total_direct_expenses_paid' => 'decimal:2',
        'total_disbursements_paid' => 'decimal:2',
        'retention_withheld_total' => 'decimal:2',
        'retention_released_completion' => 'decimal:2',
        'retention_held_dlp' => 'decimal:2',
        'diaspora_fx_hedging_savings' => 'decimal:2',
        'gross_project_profit' => 'decimal:2',
        'profit_margin_percentage' => 'decimal:2',
        'final_settlement_balance' => 'decimal:2',
        'ledger_snapshot' => 'array',
        'audited_at' => 'datetime',
        'client_approved_at' => 'datetime',
        'final_settled_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->settlement_number)) {
                $count = self::whereYear('created_at', date('Y'))->count() + 1;
                $model->settlement_number = sprintf('FS-%s%02d-%04d', date('Y'), date('m'), $count);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function handover(): BelongsTo
    {
        return $this->belongsTo(ProjectHandover::class, 'project_handover_id');
    }

    public function auditedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'audited_by');
    }
}
