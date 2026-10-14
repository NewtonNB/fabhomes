<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    /**
     * Super Admin bypasses all checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission([
            'view tasks', 'manage tasks', 'tasks.view', 'tasks.view-any', 'tasks.view-assigned'
        ]);
    }

    public function view(User $user, Task $task): bool
    {
        if ($task->assigned_to === $user->id) {
            return true;
        }

        return $user->hasAnyPermission([
            'view tasks', 'manage tasks', 'tasks.view', 'tasks.view-any'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'create tasks', 'manage tasks', 'tasks.create'
        ]);
    }

    public function update(User $user, Task $task): bool
    {
        // Assigned user can update their task progress/status
        if ($task->assigned_to === $user->id && $user->hasAnyPermission(['tasks.update', 'tasks.complete', 'edit tasks'])) {
            return true;
        }

        return $user->hasAnyPermission([
            'edit tasks', 'manage tasks', 'tasks.update'
        ]);
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->hasAnyPermission([
            'delete tasks', 'manage tasks', 'tasks.delete'
        ]);
    }

    public function assign(User $user, Task $task): bool
    {
        return $user->hasAnyPermission([
            'assign tasks', 'manage tasks', 'tasks.assign'
        ]);
    }

    public function complete(User $user, Task $task): bool
    {
        if ($task->assigned_to === $user->id) {
            return true;
        }

        return $user->hasAnyPermission([
            'complete tasks', 'manage tasks', 'tasks.complete', 'tasks.update'
        ]);
    }
}
