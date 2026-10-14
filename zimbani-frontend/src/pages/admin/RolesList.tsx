import React, { useState, useEffect, useMemo } from 'react'
import { 
  MdSecurity, 
  MdAdd, 
  MdEdit, 
  MdDelete, 
  MdPeople, 
  MdClose,
  MdRefresh,
  MdLock,
  MdSearch,
  MdCheckCircle,
  MdRadioButtonUnchecked
} from 'react-icons/md'
import adminService from '../../services/admin.service'
import { Role, Permission } from '../../types/admin.types'
import './RolesList.css'

const RolesList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissionsGrouped, setPermissionsGrouped] = useState<Record<string, Permission[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Roles Search Filter
  const [roleSearch, setRoleSearch] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleName, setRoleName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [permSearch, setPermSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [rolesData, permsData] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissions(),
      ])
      setRoles(rolesData || [])
      setPermissionsGrouped(permsData || {})
    } catch (err: any) {
      setError(err.message || 'Failed to load roles and permissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenCreateModal = () => {
    setEditingRole(null)
    setRoleName('')
    setSelectedPermissions([])
    setPermSearch('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (role: Role) => {
    setEditingRole(role)
    setRoleName(role.name)
    setSelectedPermissions(role.permissions?.map(p => p.name) || [])
    setPermSearch('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingRole(null)
  }

  const handleTogglePermission = (permName: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permName) 
        ? prev.filter(p => p !== permName) 
        : [...prev, permName]
    )
  }

  const handleToggleGroup = (groupPerms: Permission[]) => {
    const groupNames = groupPerms.map(p => p.name)
    const allSelected = groupNames.every(name => selectedPermissions.includes(name))

    if (allSelected) {
      // Deselect all in group
      setSelectedPermissions(prev => prev.filter(name => !groupNames.includes(name)))
    } else {
      // Select all in group
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupNames])))
    }
  }

  // Total permissions count
  const allPermissionsList = useMemo(() => {
    return Object.values(permissionsGrouped).flat()
  }, [permissionsGrouped])

  const totalPermissionsCount = allPermissionsList.length || 1

  const handleSelectAllGlobal = () => {
    setSelectedPermissions(allPermissionsList.map(p => p.name))
  }

  const handleClearAllGlobal = () => {
    setSelectedPermissions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      if (editingRole) {
        // Update permissions for role
        await adminService.assignRolePermissions(editingRole.id, selectedPermissions)
        setSuccessMessage(`Permissions for role "${roleName}" updated successfully`)
      } else {
        // Create new role
        await adminService.createRole({
          name: roleName,
          permissions: selectedPermissions,
        })
        setSuccessMessage(`Role "${roleName}" created successfully`)
      }

      handleCloseModal()
      fetchData()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setFormError(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRole = async (role: Role) => {
    if (['Super Admin', 'Company Admin'].includes(role.name)) {
      alert(`System role "${role.name}" cannot be deleted.`)
      return
    }

    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return
    }

    try {
      setSuccessMessage(`Role "${role.name}" deleted successfully`)
      fetchData()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete role')
    }
  }

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles
    const q = roleSearch.toLowerCase()
    return roles.filter(r => r.name.toLowerCase().includes(q))
  }, [roles, roleSearch])

  // Filtered Permissions in Modal
  const filteredPermissionsGrouped = useMemo(() => {
    if (!permSearch.trim()) return permissionsGrouped
    const q = permSearch.toLowerCase()
    const result: Record<string, Permission[]> = {}

    Object.entries(permissionsGrouped).forEach(([group, perms]) => {
      const matched = perms.filter(p => p.name.toLowerCase().includes(q) || group.toLowerCase().includes(q))
      if (matched.length > 0) {
        result[group] = matched
      }
    })

    return result
  }, [permissionsGrouped, permSearch])

  const selectedPercentage = Math.round((selectedPermissions.length / totalPermissionsCount) * 100)

  return (
    <div className="roles-management-container">
      {/* Header */}
      <div className="roles-header">
        <div>
          <h1>Roles & Permissions</h1>
          <p className="page-subtitle">Configure granular role-based access control and system authority scopes</p>
        </div>
        <div className="roles-actions">
          <button className="btn-secondary" onClick={fetchData} title="Refresh">
            <MdRefresh /> Refresh
          </button>
          <button className="btn-add-role" onClick={handleOpenCreateModal}>
            <MdAdd /> Create Role
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="alert-box alert-success">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}
      {error && (
        <div className="alert-box alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="roles-summary-banner">
        <div className="summary-item">
          <span className="summary-label">Configured Roles</span>
          <span className="summary-val">{roles.length}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <span className="summary-label">System Permissions</span>
          <span className="summary-val">{totalPermissionsCount}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <span className="summary-label">Modules Protected</span>
          <span className="summary-val">{Object.keys(permissionsGrouped).length}</span>
        </div>
      </div>

      {/* Search Bar for Roles */}
      <div className="roles-filter-bar">
        <div className="search-box-roles">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search roles..."
            value={roleSearch}
            onChange={e => setRoleSearch(e.target.value)}
          />
          {roleSearch && (
            <button className="clear-search-btn" onClick={() => setRoleSearch('')}>
              <MdClose />
            </button>
          )}
        </div>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="state-cell" style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Loading security roles...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="state-cell" style={{ padding: '60px 0', textAlign: 'center' }}>
          <MdSecurity className="empty-state-icon" />
          <h3>No Roles Found</h3>
          <p>No security roles matched your search criteria.</p>
        </div>
      ) : (
        <div className="roles-cards-grid">
          {filteredRoles.map(role => {
            const isProtected = ['Super Admin', 'Company Admin'].includes(role.name)
            const rolePermsCount = role.permissions?.length || 0
            const coveragePct = Math.round((rolePermsCount / totalPermissionsCount) * 100)

            return (
              <div key={role.id} className="role-card">
                <div className="role-card-header">
                  <div className="role-title-box">
                    <div className="role-icon-box">
                      <MdSecurity />
                    </div>
                    <div>
                      <h3 className="role-name">{role.name}</h3>
                      <div className="role-users-meta">
                        <MdPeople /> {role.users_count || 0} assigned users
                      </div>
                    </div>
                  </div>
                  {isProtected && (
                    <span className="protected-badge" title="Protected System Role">
                      <MdLock /> System
                    </span>
                  )}
                </div>

                <div className="role-card-body">
                  <div className="role-perms-header">
                    <span>Permissions Scope ({rolePermsCount} of {totalPermissionsCount})</span>
                    <span className="coverage-pct">{coveragePct}%</span>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div className="role-progress-bar-track">
                    <div 
                      className="role-progress-bar-fill" 
                      style={{ width: `${Math.max(coveragePct, 2)}%` }}
                    ></div>
                  </div>

                  <div className="role-perms-cloud">
                    {role.permissions && role.permissions.length > 0 ? (
                      role.permissions.slice(0, 8).map(p => (
                        <span key={p.id} className="perm-tag">
                          {p.name}
                        </span>
                      ))
                    ) : (
                      <span className="no-perms-text">No permissions assigned</span>
                    )}
                    {role.permissions && role.permissions.length > 8 && (
                      <span className="perm-more-tag">
                        +{role.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="role-card-footer">
                  <button 
                    className="btn-edit-role"
                    onClick={() => handleOpenEditModal(role)}
                  >
                    <MdEdit /> Edit Permissions
                  </button>
                  {!isProtected && (
                    <button 
                      className="btn-delete-role"
                      onClick={() => handleDeleteRole(role)}
                      title="Delete Role"
                    >
                      <MdDelete />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Role Modal with Live Permission Search & Selection Counters */}
      {isModalOpen && (
        <div className="modal-backdrop-admin">
          <div className="modal-card-admin role-modal">
            <div className="modal-header-admin">
              <div>
                <h3>{editingRole ? `Edit Permissions: ${editingRole.name}` : 'Create Security Role'}</h3>
                <span className="modal-sub">Configure granular functional capabilities</span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <MdClose />
              </button>
            </div>

            {formError && (
              <div className="modal-error-alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form-admin">
              <div className="form-group-admin">
                <label>Role Name *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingRole}
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  placeholder="e.g. Finance Officer"
                />
              </div>

              {/* Dynamic Selection Meter */}
              <div className="selection-meter-card">
                <div className="meter-labels">
                  <span className="meter-count-text">
                    <strong>{selectedPermissions.length}</strong> of {totalPermissionsCount} permissions granted
                  </span>
                  <span className="meter-pct-badge">{selectedPercentage}%</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${selectedPercentage}%` }}></div>
                </div>
                <div className="meter-quick-actions">
                  <button type="button" className="btn-meter-action" onClick={handleSelectAllGlobal}>
                    <MdCheckCircle /> Select All
                  </button>
                  <button type="button" className="btn-meter-action" onClick={handleClearAllGlobal}>
                    <MdRadioButtonUnchecked /> Clear All
                  </button>
                </div>
              </div>

              {/* Dynamic Permissions Filter Input */}
              <div className="modal-perm-search-box">
                <MdSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter permissions by name or module..."
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                />
                {permSearch && (
                  <button type="button" className="clear-search-btn" onClick={() => setPermSearch('')}>
                    <MdClose />
                  </button>
                )}
              </div>

              {/* Permissions Matrix */}
              <div className="permissions-matrix-container">
                {Object.keys(filteredPermissionsGrouped).length === 0 ? (
                  <div className="no-perms-matched">
                    No permissions match "{permSearch}"
                  </div>
                ) : (
                  Object.entries(filteredPermissionsGrouped).map(([group, perms]) => {
                    const groupPermNames = perms.map(p => p.name)
                    const allInGroup = groupPermNames.every(name => selectedPermissions.includes(name))
                    const selectedInGroupCount = perms.filter(p => selectedPermissions.includes(p.name)).length
                    
                    return (
                      <div key={group} className="perm-group-card">
                        <div className="perm-group-header">
                          <div className="group-title-with-count">
                            <span className="group-name">{group.toUpperCase()}</span>
                            <span className="group-count-pill">{selectedInGroupCount}/{perms.length}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-toggle-group"
                            onClick={() => handleToggleGroup(perms)}
                          >
                            {allInGroup ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="perm-group-items">
                          {perms.map(p => {
                            const isChecked = selectedPermissions.includes(p.name)
                            return (
                              <label key={p.id} className={`perm-check-item ${isChecked ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.name)}
                                />
                                <span>{p.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="modal-actions-admin">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingRole ? 'Save Permissions' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RolesList
