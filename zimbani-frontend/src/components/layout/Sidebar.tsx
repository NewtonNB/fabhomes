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
  MdSupportAgent,
  MdMoneyOff,
  MdBadge
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

  // Check if user is Super Admin
  const isSuperAdmin = user?.roles?.some((r) => r.toLowerCase() === 'super admin') || false

  // Check if user has permission
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true
    if (isSuperAdmin) return true
    if (!user?.permissions || user.permissions.length === 0) return false

    // Support multiple permissions separated by pipe '|'
    const reqList = permission.split('|').map((p) => p.trim())

    return reqList.some((req) => {
      if (user.permissions!.includes(req)) return true

      // Handle "action module" (e.g. "view projects", "view petty cash") -> "module.action"
      const words = req.split(/\s+/)
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
        if (candidates.some((c) => user.permissions!.includes(c))) return true
        if (action === 'view') {
          if (candidates.some((c) => user.permissions!.includes(c.replace('.view', '.view-any')))) return true
        }
        if (action === 'edit') {
          if (candidates.some((c) => user.permissions!.includes(c.replace('.edit', '.update')))) return true
        }
      }

      // Handle "module.action" (e.g. "projects.view", "petty-cash.view") -> "view projects"
      if (req.includes('.')) {
        const [module, action] = req.split('.')
        const spaceModule = module.replace(/[-_]/g, ' ')
        if (user.permissions!.includes(`${action} ${module}`)) return true
        if (user.permissions!.includes(`${action} ${spaceModule}`)) return true
        if (action === 'view') {
          if (user.permissions!.includes(`view-any ${module}`)) return true
          if (user.permissions!.includes(`view-any ${spaceModule}`)) return true
        }
        if (action === 'update') {
          if (user.permissions!.includes(`edit ${module}`)) return true
          if (user.permissions!.includes(`edit ${spaceModule}`)) return true
        }
      }

      return false
    })
  }

  // Check if user has any of the specified roles
  const hasRole = (roles: string[]): boolean => {
    if (isSuperAdmin) return true
    if (!user?.roles) return false
    return user.roles.some((userRole) =>
      roles.some((r) => r.toLowerCase() === userRole.toLowerCase())
    )
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
          permission: 'sites.view|sites.view-any',
        },
        {
          path: '/plots',
          label: 'Plots & Allocations',
          icon: <MdLandscape />,
          permission: 'plots.view|units.view',
        },
        {
          path: '/land-titles',
          label: 'Land Titles & Deeds',
          icon: <MdVerified />,
          permission: 'mother-titles.view|sites.view',
        },
        {
          path: '/estate-map',
          label: 'Interactive Estate Map',
          icon: <MdMap />,
          permission: 'sites.view|plots.view',
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
          permission: 'accounts.view',
        },
        {
          path: '/savings-accounts?type=construction_saving',
          label: 'Construction Saving Scheme',
          icon: <MdConstruction />,
          permission: 'accounts.view',
        },
        {
          path: '/savings-accounts?type=tuzimbe_group',
          label: 'Tuzimbe Group Scheme',
          icon: <MdPeople />,
          permission: 'accounts.view',
        },
        {
          path: '/savings-accounts',
          label: 'All Savings Accounts',
          icon: <MdAccountBalance />,
          permission: 'accounts.view',
        },
        {
          path: '/payments',
          label: 'Payments & Collections',
          icon: <MdReceipt />,
          permission: 'payments.view',
        },
        {
          path: '/transactions',
          label: 'Financial Ledger',
          icon: <MdReceiptLong />,
          permission: 'transactions.view',
        },
        {
          path: '/cashbook',
          label: 'The CashBook',
          icon: <MdAccountBalanceWallet />,
          permission: 'cashbook.view|transactions.view',
        },
        {
          path: '/client-refunds',
          label: 'Client Refunds',
          icon: <MdMoneyOff />,
          permission: 'refunds.view|payments.view',
        },
        {
          path: '/scheme-transfers',
          label: 'Scheme Transfers',
          icon: <MdCompareArrows />,
          permission: 'accounts.view|payments.view',
        },
        {
          path: '/other-fees',
          label: 'Other Fees Management',
          icon: <MdReceiptLong />,
          permission: 'payments.view|accounts.view',
        },
        {
          path: '/petty-cash',
          label: 'Petty Cash & Floats',
          icon: <MdAccountBalanceWallet />,
          permission: 'petty-cash.view',
        },
        {
          path: '/expenses',
          label: 'Expense Claims',
          icon: <MdPayments />,
          permission: 'expenses.view',
        },
        {
          path: '/payment-certificates',
          label: 'Payment Certificates',
          icon: <MdRequestQuote />,
          permission: 'certificates.view',
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
          permission: 'reconciliation.view|payments.view',
        },
        {
          path: '/reconciliation/escrow',
          label: 'Escrow Milestone Matching',
          icon: <MdFactCheck />,
          permission: 'reconciliation.view|payments.view',
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
          permission: 'projects.view',
        },
        {
          path: '/tasks',
          label: 'Milestones & Tasks',
          icon: <MdAssignment />,
          permission: 'tasks.view',
        },
        {
          path: '/milestone-releases',
          label: 'Milestone Releases',
          icon: <MdFactCheck />,
          permission: 'payments.view|certificates.view',
        },
        {
          path: '/inspections',
          label: 'Quality & Inspections',
          icon: <MdFactCheck />,
          permission: 'inspections.view',
        },
        {
          path: '/materials',
          label: 'Materials & Inventory',
          icon: <MdInventory2 />,
          permission: 'materials.view',
        },
        {
          path: '/equipment',
          label: 'Equipment & Machinery',
          icon: <MdPrecisionManufacturing />,
          permission: 'equipment.view',
        },
        {
          path: '/daily-logs',
          label: 'Daily Logs & Safety',
          icon: <MdHealthAndSafety />,
          permission: 'daily-logs.view|safety.view',
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
          permission: 'clients.view',
        },
        {
          path: '/documents',
          label: 'Digital Document Vault',
          icon: <MdDescription />,
          permission: 'documents.view',
        },
        {
          path: '/support-tickets',
          label: 'Customer Support Desk',
          icon: <MdSupportAgent />,
          permission: 'clients.view|notifications.view',
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
          permission: 'sites.view|projects.view',
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
          permission: 'reports.view-financial|transactions.view',
        },
      ],
    },
  ]

  // Administration menu for Super Admin, Company Admin, or authorized roles
  const adminSection: MenuSection | null = hasRole(['Super Admin', 'Company Admin']) || hasPermission('employees.view|users.view|roles.view|audit-logs.view')
    ? {
        title: 'Administration',
        items: [
          {
            path: '/employees',
            label: 'Employees & HR',
            icon: <MdBadge />,
            permission: 'employees.view|users.view',
          },
          {
            path: '/admin/users',
            label: 'Staff & Client Users',
            icon: <MdPeople />,
            permission: 'users.view',
          },
          {
            path: '/admin/roles',
            label: 'Roles & Granular RBAC',
            icon: <MdSecurity />,
            permission: 'roles.view',
          },
          {
            path: '/admin/activities',
            label: 'Security & Audit Logs',
            icon: <MdHistory />,
            permission: 'audit-logs.view',
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
    if (!isSuperAdmin && !hasPermission(item.permission)) {
      return null
    }

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
        <div className="sidebar-brand">
          <img src="/fab-homes-logo-transparent.png" alt="Fab Homes" className="sidebar-logo-img" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Fab Homes</span>
            <span className="sidebar-brand-tagline">“Live your dream”</span>
          </div>
        </div>
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
