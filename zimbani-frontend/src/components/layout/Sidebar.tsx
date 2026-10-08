import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Sidebar.css'

interface MenuItem {
  path: string
  label: string
  icon: string
  permission?: string
  children?: MenuItem[]
}

const Sidebar = () => {
  const location = useLocation()
  const { user } = useAuth()

  // Check if user has permission
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true
    if (!user?.permissions) return false
    return user.permissions.some((p: any) => p.name === permission)
  }

  // Check if user has any role
  const hasRole = (roles: string[]): boolean => {
    if (!user?.roles) return false
    return user.roles.some((r: any) => roles.includes(r.name))
  }

  // Menu structure
  const menuItems: MenuItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
    },
    {
      path: '/companies',
      label: 'Companies',
      icon: '🏢',
      permission: 'view companies',
    },
    {
      path: '/projects',
      label: 'Projects',
      icon: '📁',
      permission: 'view projects',
    },
    {
      path: '/sites',
      label: 'Sites',
      icon: '🏗️',
      permission: 'view sites',
    },
    {
      path: '/units',
      label: 'Units',
      icon: '🏠',
      permission: 'view units',
    },
  ]

  // Only show admin menu to Super Admin and Company Admin
  const adminMenuItems: MenuItem[] = hasRole(['Super Admin', 'Company Admin'])
    ? [
        {
          path: '/admin',
          label: 'Administration',
          icon: '⚙️',
          children: [
            {
              path: '/admin/users',
              label: 'Users',
              icon: '👥',
              permission: 'view users',
            },
            {
              path: '/admin/roles',
              label: 'Roles & Permissions',
              icon: '🔐',
              permission: 'view roles',
            },
            {
              path: '/admin/activities',
              label: 'Activity Logs',
              icon: '📋',
              permission: 'view activities',
            },
          ],
        },
      ]
    : []

  const allMenuItems = [...menuItems, ...adminMenuItems]

  const isActive = (path: string): boolean => {
    if (path === '/dashboard') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  const renderMenuItem = (item: MenuItem) => {
    // Check permission
    if (!hasPermission(item.permission)) {
      return null
    }

    // If has children, render as expandable group
    if (item.children) {
      return (
        <div key={item.path} className="menu-group">
          <div className="menu-group-label">
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </div>
          <div className="menu-group-items">
            {item.children.map((child) => renderMenuItem(child))}
          </div>
        </div>
      )
    }

    // Regular menu item
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
      >
        <span className="menu-icon">{item.icon}</span>
        <span className="menu-label">{item.label}</span>
      </Link>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Menu</h2>
      </div>
      <nav className="sidebar-menu">
        {allMenuItems.map((item) => renderMenuItem(item))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info-sidebar">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">
              {user?.roles?.[0]?.name || 'User'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
