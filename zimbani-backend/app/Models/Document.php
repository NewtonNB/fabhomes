<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'document_number',
        'title',
        'description',
        'document_type',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'file_extension',
        'documentable_type',
        'documentable_id',
        'uploaded_by',
        'status',
        'expiry_date',
        'is_verified',
        'verified_by',
        'verified_at',
        'metadata',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'expiry_date' => 'date',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected $appends = [
        'file_url',
        'formatted_file_size',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($doc) {
            if (empty($doc->uuid)) {
                $doc->uuid = (string) Str::uuid();
            }

            if (empty($doc->document_number)) {
                $doc->document_number = static::generateDocumentNumber();
            }
        });
    }

    /**
     * Generate unique document number: DOC-YYYYMMDD-XXXX
     */
    public static function generateDocumentNumber(): string
    {
        $date = now()->format('Ymd');
        $lastDoc = static::whereDate('created_at', now())
            ->latest('id')
            ->first();

        $sequence = $lastDoc ? intval(substr($lastDoc->document_number, -4)) + 1 : 1;

        return 'DOC-' . $date . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Route key is uuid
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * File URL accessor
     */
    public function getFileUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->file_path);
    }

    /**
     * Human-readable file size accessor
     */
    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }

    // Relationships

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // State helpers

    public function verify(int $userId): bool
    {
        return $this->update([
            'is_verified' => true,
            'verified_by' => $userId,
            'verified_at' => now(),
        ]);
    }

    public function archive(): bool
    {
        return $this->update(['status' => 'archived']);
    }

    // Scopes

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('document_type', $type);
    }
}
