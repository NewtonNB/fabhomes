import React from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface PermissionRouteProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean
  fallbackPath?: string
  showForbiddenMessage?: boolean
}

/**
 * PermissionRoute component
 * Restricts access to routes based on user roles and permissions.
 * Super Admin bypasses all checks.
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  permissions,
  roles,
  requireAll = false,
  fallbackPath,
  showForbiddenMessage = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className="loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Super Admin has universal access to all routes
  const isSuperAdmin = user.roles && user.roles.some((r) => r.toLowerCase() === 'super admin')
  if (isSuperAdmin) {
    return <>{children}</>
  }

  // Check roles if specified
  let hasRoleAccess = true
  if (roles && roles.length > 0) {
    if (!user.roles || user.roles.length === 0) {
      hasRoleAccess = false
    } else {
      hasRoleAccess = roles.some((requiredRole) =>
        user.roles.some((r) => r.toLowerCase() === requiredRole.toLowerCase())
      )
    }
  }

  // Check permissions if specified
  let hasPermissionAccess = true
  const requiredPermissions = permissions || (permission ? [permission] : [])

  if (requiredPermissions.length > 0) {
    const userPerms = user.permissions || []

    const matchesPerm = (req: string): boolean => {
      if (userPerms.includes(req)) return true

      // Handle "action module" (e.g. "view projects") -> "module.action" ("projects.view")
      const words = req.trim().split(/\s+/)
      if (words.length === 2) {
        const [action, module] = words
        if (userPerms.includes(`${module}.${action}`)) return true
        if (action === 'view' && userPerms.includes(`${module}.view-any`)) return true
        if (action === 'edit' && userPerms.includes(`${module}.update`)) return true
      }

      // Handle "module.action" (e.g. "projects.view") -> "view projects"
      if (req.includes('.')) {
        const [module, action] = req.split('.')
        if (userPerms.includes(`${action} ${module}`)) return true
        if (action === 'view' && userPerms.includes(`view-any ${module}`)) return true
        if (action === 'update' && userPerms.includes(`edit ${module}`)) return true
      }

      return false
    }

    if (requireAll) {
      hasPermissionAccess = requiredPermissions.every(matchesPerm)
    } else {
      hasPermissionAccess = requiredPermissions.some(matchesPerm)
    }
  }

  // If user lacks either role or permission
  const isAuthorized = hasRoleAccess && hasPermissionAccess

  if (!isAuthorized) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />
    }

    if (showForbiddenMessage) {
      return (
        <div
          style={{
            maxWidth: '600px',
            margin: '4rem auto',
            padding: '2.5rem',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.75rem' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            You do not have the required permissions to view this resource. Please contact your system administrator if you believe this is an error.
          </p>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#059669',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            ← Return to Dashboard
          </Link>
        </div>
      )
    }

    // Default to redirecting to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default PermissionRoute
