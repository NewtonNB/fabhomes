<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaterialRequisition extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'material_requisitions';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'uuid',
        'requisition_number',
        'site_id',
        'project_id',
        'requested_by',
        'approved_by',
        'approved_at',
        'status',
        'priority',
        'required_by_date',
        'total_estimated_cost',
        'currency',
        'items',
        'notes',
        'rejection_reason',
        'delivered_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'required_by_date' => 'date',
        'approved_at' => 'datetime',
        'delivered_at' => 'datetime',
        'total_estimated_cost' => 'decimal:2',
        'items' => 'array',
        'deleted_at' => 'datetime',
    ];

    /**
     * Booted model events.
     */
    protected static function booted(): void
    {
        static::creating(function ($req) {
            if (empty($req->uuid)) {
                $req->uuid = (string) Str::uuid();
            }

            if (empty($req->requisition_number)) {
                $req->requisition_number = static::generateRequisitionNumber();
            }

            if (auth()->check() && empty($req->requested_by)) {
                $req->requested_by = auth()->id();
            }

            // Calculate total estimated cost if not set
            if (empty($req->total_estimated_cost) && is_array($req->items)) {
                $total = 0;
                foreach ($req->items as $item) {
                    $total += (float) ($item['total_cost'] ?? (($item['quantity'] ?? 0) * ($item['estimated_unit_cost'] ?? 0)));
                }
                $req->total_estimated_cost = $total;
            }
        });
    }

    /**
     * Generate unique requisition number: REQ-YYYYMMDD-XXXX
     */
    public static function generateRequisitionNumber(): string
    {
        $date = now()->format('Ymd');
        $last = static::whereDate('created_at', now())->latest('id')->first();
        $sequence = $last ? intval(substr($last->requisition_number, -4)) + 1 : 1;
        return 'REQ-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Route model binding uses UUID.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Site for which requisition was made.
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    /**
     * Associated project (optional).
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Staff member who requested the materials.
     */
    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * Manager who approved or rejected the requisition.
     */
    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Polymorphic documents (e.g. delivery notes, invoices).
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Approve requisition.
     */
    public function approve(int $approverId): void
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);
    }

    /**
     * Reject requisition.
     */
    public function reject(int $approverId, string $reason): void
    {
        $this->update([
            'status' => 'rejected',
            'approved_by' => $approverId,
            'approved_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Mark as delivered and automatically restock associated materials.
     */
    public function markDelivered(): void
    {
        $this->update([
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);

        // Restock inventory for each delivered line item
        if (is_array($this->items)) {
            foreach ($this->items as $item) {
                if (!empty($item['material_id'])) {
                    $material = Material::find($item['material_id']);
                    if ($material) {
                        $material->adjustStock(
                            (float) ($item['quantity'] ?? 0),
                            "Restocked from delivered requisition {$this->requisition_number}"
                        );
                    }
                }
            }
        }
    }
}
