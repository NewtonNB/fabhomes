import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  MdDashboard, 
  MdFolder, 
  MdConstruction, 
  MdHome,
  MdPeople,
  MdSecurity,
  MdHistory,
  MdPersonOutline,
  MdReceipt,
  MdDescription,
  MdAssignment,
  MdInventory2,
  MdPrecisionManufacturing,
  MdFactCheck,
  MdHealthAndSafety,
  MdAccountBalance,
  MdReceiptLong,

  MdRequestQuote,
  MdAccountBalanceWallet,
  MdPayments,
  MdAssessment,
  MdVerified,
  MdClose,
  MdLandscape,
  MdMap,
  MdCompareArrows,
  MdLocationCity,
  MdSupportAgent
} from 'react-icons/md'
import './Sidebar.css'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

interface MenuItem {
  path: string
  label: string
  icon: React.ReactNode
  permission?: string
  children?: MenuItem[]
}

interface MenuSection {
  title?: string
  items: MenuItem[]
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const location = useLocation()
  const { user } = useAuth()

  // Debug: Log user data
  console.log('Sidebar - User:', user)
  console.log('Sidebar - Roles:', user?.roles)
  console.log('Sidebar - Permissions:', user?.permissions)

  // Check if user has permission
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true
    if (!user?.permissions) return false
    if (user.permissions.includes(permission)) return true

    // Handle "action module" (e.g. "view projects") -> "module.action" ("projects.view")
    const words = permission.trim().split(/\s+/)
    if (words.length === 2) {
      const [action, module] = words
      if (user.permissions.includes(`${module}.${action}`)) return true
      if (action === 'view' && user.permissions.includes(`${module}.view-any`)) return true
    }

    // Handle "module.action" (e.g. "projects.view") -> "view projects"
    if (permission.includes('.')) {
      const [module, action] = permission.split('.')
      if (user.permissions.includes(`${action} ${module}`)) return true
      if (action === 'view' && user.permissions.includes(`view-any ${module}`)) return true
    }

    return false
  }

  // Check if user has any role
  const hasRole = (roles: string[]): boolean => {
    if (!user?.roles) return false
    return user.roles.some((userRole) => roles.includes(userRole))
  }

  // Menu structure grouped into distinct functional sections
  const menuSections: MenuSection[] = [
    {
      title: 'Overview',
      items: [
        {
          path: '/dashboard',
          label: 'Executive Dashboard',
          icon: <MdDashboard />,
        },
      ],
    },
    {
      title: 'Land & Estates',
      items: [
        {
          path: '/estates',
          label: 'Estates & Parcels',
          icon: <MdLocationCity />,
          permission: 'view sites',
        },
        {
          path: '/plots',
          label: 'Plots & Allocations',
          icon: <MdLandscape />,
          permission: 'view units',
        },
        {
          path: '/land-titles',
          label: 'Land Titles & Deeds',
          icon: <MdVerified />,
          permission: 'view sites',
        },
        {
          path: '/estate-map',
          label: 'Interactive Estate Map',
          icon: <MdMap />,
          permission: 'view sites',
        },
      ],
    },
    {
      title: 'Savings & Finance',
      items: [
        {
          path: '/savings-accounts?type=land_saving',
          label: 'Land Saving Scheme',
          icon: <MdLandscape />,
          permission: 'view accounts',
        },
        {
          path: '/savings-accounts?type=construction_saving',
          label: 'Construction Saving Scheme',
          icon: <MdConstruction />,
          permission: 'view accounts',
        },
        {
          path: '/savings-accounts',
          label: 'All Savings Accounts',
          icon: <MdAccountBalance />,
          permission: 'view accounts',
        },
        {
          path: '/payments',
          label: 'Payments & Collections',
          icon: <MdReceipt />,
          permission: 'view payments',
        },
        {
          path: '/transactions',
          label: 'Financial Ledger',
          icon: <MdReceiptLong />,
          permission: 'view transactions',
        },
        {
          path: '/petty-cash',
          label: 'Petty Cash & Floats',
          icon: <MdAccountBalanceWallet />,
          permission: 'view petty cash',
        },
        {
          path: '/expenses',
          label: 'Expense Claims',
          icon: <MdPayments />,
          permission: 'view expenses',
        },
        {
          path: '/payment-certificates',
          label: 'Payment Certificates',
          icon: <MdRequestQuote />,
          permission: 'view certificates',
        },
      ],
    },
    {
      title: 'Reconciliation',
      items: [
        {
          path: '/reconciliation',
          label: 'Bank & MoMo Reconciliation',
          icon: <MdCompareArrows />,
          permission: 'view payments',
        },
        {
          path: '/reconciliation/escrow',
          label: 'Escrow Milestone Matching',
          icon: <MdFactCheck />,
          permission: 'view payments',
        },
      ],
    },
    {
      title: 'Construction Projects',
      items: [
        {
          path: '/projects',
          label: 'Construction Projects',
          icon: <MdFolder />,
          permission: 'view projects',
        },
        {
          path: '/tasks',
          label: 'Milestones & Tasks',
          icon: <MdAssignment />,
          permission: 'view tasks',
        },
        {
          path: '/milestone-releases',
          label: 'Milestone Releases',
          icon: <MdFactCheck />,
          permission: 'view payments',
        },
        {
          path: '/inspections',
          label: 'Quality & Inspections',
          icon: <MdFactCheck />,
          permission: 'view inspections',
        },
        {
          path: '/materials',
          label: 'Materials & Inventory',
          icon: <MdInventory2 />,
          permission: 'view materials',
        },
        {
          path: '/equipment',
          label: 'Equipment & Machinery',
          icon: <MdPrecisionManufacturing />,
          permission: 'view equipment',
        },
        {
          path: '/daily-logs',
          label: 'Daily Logs & Safety',
          icon: <MdHealthAndSafety />,
          permission: 'view daily-logs',
        },
      ],
    },
    {
      title: 'Clients & Support',
      items: [
        {
          path: '/clients',
          label: 'Client Directory (KYC)',
          icon: <MdPersonOutline />,
          permission: 'view clients',
        },
        {
          path: '/documents',
          label: 'Digital Document Vault',
          icon: <MdDescription />,
          permission: 'view documents',
        },
        {
          path: '/support-tickets',
          label: 'Customer Support Desk',
          icon: <MdSupportAgent />,
          permission: 'view clients',
        },
        {
          path: '/client-portal',
          label: 'Client Self-Service PWA',
          icon: <MdHome />,
        },
        {
          path: '/client-portal/milestones',
          label: 'Client Milestone Portal',
          icon: <MdVerified />,
          permission: 'view sites',
        },
      ],
    },
    {
      title: 'Reports & BI',
      items: [
        {
          path: '/financial-reports',
          label: 'Financial & Scheme Analytics',
          icon: <MdAssessment />,
          permission: 'view transactions',
        },
      ],
    },
  ]

  // Only show admin menu to Super Admin and Company Admin
  const adminSection: MenuSection | null = hasRole(['Super Admin', 'Company Admin'])
    ? {
        title: 'Administration',
        items: [
          {
            path: '/admin/users',
            label: 'Staff & Client Users',
            icon: <MdPeople />,
            permission: 'view users',
          },
          {
            path: '/admin/roles',
            label: 'Roles & Granular RBAC',
            icon: <MdSecurity />,
            permission: 'view roles',
          },
          {
            path: '/admin/activities',
            label: 'Security & Audit Logs',
            icon: <MdHistory />,
            permission: 'view activities',
          },
        ],
      }
    : null

  const allSections: MenuSection[] = adminSection ? [...menuSections, adminSection] : menuSections

  const isActive = (path: string): boolean => {
    if (path === '/dashboard') {
      return location.pathname === path
    }
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === path
    }
    if (path === '/savings-accounts') {
      return location.pathname === '/savings-accounts' && !location.search.includes('type=')
    }
    return location.pathname.startsWith(path)
  }

  const renderMenuItem = (item: MenuItem) => {
    // Super Admin bypasses all permission checks
    const isSuperAdmin = user?.roles?.includes('Super Admin')
    
    // Check permission (Super Admin sees everything)
    if (!isSuperAdmin && !hasPermission(item.permission)) {
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

    const handleNavigate = () => {
      if (onClose && window.innerWidth <= 1024) {
        onClose()
      }
    }

    // Regular menu item
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
        onClick={() => {
          handleNavigate()
        }}
      >
        <span className="menu-icon">{item.icon}</span>
        <span className="menu-label">{item.label}</span>
      </Link>
    )
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Menu</h2>
        {onClose && (
          <button 
            type="button"
            className="btn-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <MdClose />
          </button>
        )}
      </div>
      <nav className="sidebar-menu">
        {allSections.map((section, idx) => {
          const isSuperAdmin = user?.roles?.includes('Super Admin')
          const visibleItems = section.items.filter((item) => {
            if (isSuperAdmin) return true
            return hasPermission(item.permission)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={section.title || idx} className="sidebar-section">
              {section.title && (
                <div className="sidebar-section-title">
                  <span>{section.title}</span>
                </div>
              )}
              <div className="sidebar-section-items">
                {visibleItems.map((item) => renderMenuItem(item))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info-sidebar">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">
              {user?.roles?.[0] || 'User'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
