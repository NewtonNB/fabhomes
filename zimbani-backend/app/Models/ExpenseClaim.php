<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExpenseClaim extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'claim_number',
        'claimant_id',
        'petty_cash_account_id',
        'project_id',
        'site_id',
        'claim_type',
        'expense_category',
        'title',
        'expense_date',
        'total_amount',
        'currency',
        'payment_method',
        'vendor_name',
        'vendor_tin',
        'receipt_number',
        'description',
        'status',
        'site_manager_id',
        'site_manager_signed_at',
        'site_manager_notes',
        'finance_officer_id',
        'finance_officer_approved_at',
        'finance_officer_notes',
        'admin_id',
        'admin_authorized_at',
        'admin_notes',
        'paid_by',
        'paid_at',
        'payment_reference',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'expense_date' => 'date',
        'site_manager_signed_at' => 'datetime',
        'finance_officer_approved_at' => 'datetime',
        'admin_authorized_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($claim) {
            if (empty($claim->uuid)) {
                $claim->uuid = (string) Str::uuid();
            }

            if (empty($claim->claim_number)) {
                $claim->claim_number = static::generateClaimNumber();
            }

            if (empty($claim->currency)) {
                $claim->currency = 'UGX';
            }

            if (empty($claim->status)) {
                $claim->status = 'draft';
            }
        });
    }

    /**
     * Generate unique claim sequence: EXP-YYYYMMDD-XXXX
     */
    public static function generateClaimNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->claim_number, -4)) + 1 : 1;

        return 'EXP-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    // Relationships

    public function claimant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimant_id');
    }

    public function pettyCashAccount(): BelongsTo
    {
        return $this->belongsTo(PettyCashAccount::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ExpenseItem::class, 'expense_claim_id');
    }

    public function siteManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'site_manager_id');
    }

    public function financeOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finance_officer_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // Recalculate total amount from line items

    public function recalculateTotal(): void
    {
        $itemsTotal = (float) $this->items()->sum('total_price');
        if ($itemsTotal > 0) {
            $this->total_amount = $itemsTotal;
            $this->save();
        }
    }

    // Multi-tier Workflow Methods

    public function submit(): bool
    {
        $this->status = 'submitted';
        return $this->save();
    }

    public function verifySiteManager($user, ?string $notes = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'verified_by_site_manager';
        $this->site_manager_id = $userId;
        $this->site_manager_signed_at = now();
        $this->site_manager_notes = $notes;
        return $this->save();
    }

    public function approveFinance($user, ?string $notes = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'approved_by_finance';
        $this->finance_officer_id = $userId;
        $this->finance_officer_approved_at = now();
        $this->finance_officer_notes = $notes;
        return $this->save();
    }

    public function authorizeAdmin($user, ?string $notes = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'authorized_by_admin';
        $this->admin_id = $userId;
        $this->admin_authorized_at = now();
        $this->admin_notes = $notes;
        return $this->save();
    }

    public function reimburse($user, ?string $reference = null, ?int $pettyCashAccountId = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'reimbursed';
        $this->paid_by = $userId;
        $this->paid_at = now();
        $this->payment_reference = $reference;

        $targetFloatId = $pettyCashAccountId ?? $this->petty_cash_account_id;
        if ($targetFloatId && $this->payment_method === 'petty_cash') {
            $float = PettyCashAccount::find($targetFloatId);
            if ($float) {
                $float->disburse(
                    (float) $this->total_amount,
                    "Reimbursement for Claim {$this->claim_number}: {$this->title}",
                    $this->id,
                    $reference,
                    $userId
                );
            }
        }

        return $this->save();
    }

    public function reject($user, string $reason): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        $this->status = 'rejected';
        $this->rejection_reason = $reason . " (Rejected by User #{$userId} on " . now()->toDateTimeString() . ")";
        return $this->save();
    }
}
