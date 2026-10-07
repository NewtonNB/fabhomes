<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Activity extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'type',
        'entity_type',
        'entity_id',
        'description',
        'properties',
        'ip_address',
        'user_agent',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'properties' => 'array',
        ];
    }

    /**
     * Get the user that performed the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the entity that the activity was performed on (polymorphic).
     */
    public function entity()
    {
        if ($this->entity_type && $this->entity_id) {
            return $this->entity_type::find($this->entity_id);
        }
        return null;
    }

    /**
     * Scope to filter activities by user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter activities by entity.
     */
    public function scopeByEntity($query, $entityType, $entityId = null)
    {
        $query->where('entity_type', $entityType);
        
        if ($entityId) {
            $query->where('entity_id', $entityId);
        }
        
        return $query;
    }

    /**
     * Scope to filter activities by type.
     */
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }
}
