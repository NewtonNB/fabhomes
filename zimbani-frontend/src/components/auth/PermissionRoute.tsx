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

    const matchesSingle = (req: string): boolean => {
      const trimmed = req.trim()
      if (userPerms.includes(trimmed)) return true

      // Handle pipe-delimited sub-check e.g. "cashbook.view|transactions.view"
      if (trimmed.includes('|')) {
        return trimmed.split('|').some((sub) => matchesSingle(sub))
      }

      // Handle "action module" (e.g. "view projects", "view petty cash") -> "module.action"
      const words = trimmed.split(/\s+/)
      if (words.length >= 2) {
        const action = words[0]
        const moduleHyphen = words.slice(1).join('-')
        const moduleUnderscore = words.slice(1).join('_')
        const moduleDirect = words.slice(1).join('')
        const candidates = [
          `${moduleHyphen}.${action}`,
          `${moduleUnderscore}.${action}`,
          `${moduleDirect}.${action}`,
        ]
        if (candidates.some((c) => userPerms.includes(c))) return true
        if (action === 'view') {
          if (candidates.some((c) => userPerms.includes(c.replace('.view', '.view-any')))) return true
        }
        if (action === 'edit') {
          if (candidates.some((c) => userPerms.includes(c.replace('.edit', '.update')))) return true
        }
      }

      // Handle "module.action" (e.g. "projects.view", "petty-cash.view") -> "view projects"
      if (trimmed.includes('.')) {
        const [module, action] = trimmed.split('.')
        const spaceModule = module.replace(/[-_]/g, ' ')
        if (userPerms.includes(`${action} ${module}`)) return true
        if (userPerms.includes(`${action} ${spaceModule}`)) return true
        if (action === 'view') {
          if (userPerms.includes(`view-any ${module}`)) return true
          if (userPerms.includes(`view-any ${spaceModule}`)) return true
        }
        if (action === 'update') {
          if (userPerms.includes(`edit ${module}`)) return true
          if (userPerms.includes(`edit ${spaceModule}`)) return true
        }
      }

      return false
    }

    if (requireAll) {
      hasPermissionAccess = requiredPermissions.every(matchesSingle)
    } else {
      hasPermissionAccess = requiredPermissions.some(matchesSingle)
    }
  }

  // If user lacks either role or permission
  if (!hasRoleAccess || !hasPermissionAccess) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />
    }

    if (showForbiddenMessage) {
      return (
        <div className="forbidden-container" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Back to Dashboard
          </Link>
        </div>
      )
    }

    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default PermissionRoute
