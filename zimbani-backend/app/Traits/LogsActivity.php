<?php

namespace App\Traits;

use App\Models\Activity;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    /**
     * Log an activity.
     *
     * @param string $type
     * @param string $description
     * @param mixed $entity
     * @param array $properties
     * @return Activity
     */
    protected function logActivity(
        string $type,
        string $description,
        $entity = null,
        array $properties = []
    ): Activity {
        $user = Auth::user();
        $request = request();

        return Activity::create([
            'user_id' => $user?->id,
            'type' => $type,
            'entity_type' => $entity ? get_class($entity) : null,
            'entity_id' => $entity?->id ?? null,
            'description' => $description,
            'properties' => $properties,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    /**
     * Log a created activity.
     */
    protected function logCreated($entity, array $properties = []): Activity
    {
        $entityName = class_basename($entity);
        return $this->logActivity(
            'created',
            "Created {$entityName}: {$this->getEntityIdentifier($entity)}",
            $entity,
            array_merge(['attributes' => $entity->toArray()], $properties)
        );
    }

    /**
     * Log an updated activity.
     */
    protected function logUpdated($entity, array $oldValues = [], array $newValues = []): Activity
    {
        $entityName = class_basename($entity);
        return $this->logActivity(
            'updated',
            "Updated {$entityName}: {$this->getEntityIdentifier($entity)}",
            $entity,
            [
                'old' => $oldValues,
                'new' => $newValues,
            ]
        );
    }

    /**
     * Log a deleted activity.
     */
    protected function logDeleted($entity, array $properties = []): Activity
    {
        $entityName = class_basename($entity);
        return $this->logActivity(
            'deleted',
            "Deleted {$entityName}: {$this->getEntityIdentifier($entity)}",
            $entity,
            array_merge(['attributes' => $entity->toArray()], $properties)
        );
    }

    /**
     * Log a restored activity.
     */
    protected function logRestored($entity, array $properties = []): Activity
    {
        $entityName = class_basename($entity);
        return $this->logActivity(
            'restored',
            "Restored {$entityName}: {$this->getEntityIdentifier($entity)}",
            $entity,
            $properties
        );
    }

    /**
     * Log a login activity.
     */
    protected function logLogin($user): Activity
    {
        return $this->logActivity(
            'login',
            "User logged in: {$user->email}",
            $user
        );
    }

    /**
     * Log a logout activity.
     */
    protected function logLogout($user): Activity
    {
        return $this->logActivity(
            'logout',
            "User logged out: {$user->email}",
            $user
        );
    }

    /**
     * Log a role assignment activity.
     */
    protected function logRoleAssignment($user, array $roles): Activity
    {
        return $this->logActivity(
            'role_assigned',
            "Roles assigned to {$user->name}",
            $user,
            ['roles' => $roles]
        );
    }

    /**
     * Log a permission assignment activity.
     */
    protected function logPermissionAssignment($entity, array $permissions): Activity
    {
        $entityName = class_basename($entity);
        $identifier = $this->getEntityIdentifier($entity);
        return $this->logActivity(
            'permission_assigned',
            "Permissions assigned to {$entityName}: {$identifier}",
            $entity,
            ['permissions' => $permissions]
        );
    }

    /**
     * Get a readable identifier for an entity.
     */
    private function getEntityIdentifier($entity): string
    {
        if (isset($entity->name)) {
            return $entity->name;
        }
        if (isset($entity->email)) {
            return $entity->email;
        }
        if (isset($entity->uuid)) {
            return $entity->uuid;
        }
        return $entity->id ?? 'Unknown';
    }
}
