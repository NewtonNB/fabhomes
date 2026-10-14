import React, { useState, useEffect, useMemo } from 'react'
import { 
  MdPersonAdd, 
  MdSearch, 
  MdEdit, 
  MdDelete, 
  MdSecurity, 
  MdCheckCircle, 
  MdPending, 
  MdBlock, 
  MdClose,
  MdRefresh,
  MdToggleOn,
  MdToggleOff
} from 'react-icons/md'
import adminService from '../../services/admin.service'
import { AdminUser, UserFormData, Role } from '../../types/admin.types'
import './UsersList.css'

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Dynamic Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    status: 'active',
    roles: [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Dynamic Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminService.getUsers({
        role: roleFilter || undefined,
      })
      const userList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray((response as any)?.data?.data)
          ? (response as any).data.data
          : Array.isArray(response)
            ? (response as any)
            : []
      setUsers(userList)
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const rolesData = await adminService.getRoles()
      setRoles(rolesData || [])
    } catch (err) {
      console.error('Failed to load roles list', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [roleFilter])

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      status: 'active',
      roles: [],
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      status: user.status,
      roles: user.roles || [],
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  const handleRoleToggle = (roleName: string) => {
    setFormData(prev => {
      const currentRoles = prev.roles || []
      const exists = currentRoles.includes(roleName)
      return {
        ...prev,
        roles: exists ? currentRoles.filter(r => r !== roleName) : [...currentRoles, roleName]
      }
    })
  }

  // Dynamic Instant Inline Status Toggle
  const handleToggleStatus = async (user: AdminUser, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'

    // Optimistic UI Update
    setUsers(prev => prev.map(u => u.uuid === user.uuid ? { ...u, status: nextStatus } : u))
    setSuccessMessage(`User "${user.name}" status updated to ${nextStatus}`)
    setTimeout(() => setSuccessMessage(null), 3000)

    try {
      await adminService.updateUser(user.uuid, { status: nextStatus })
    } catch (err: any) {
      // Revert if error
      setUsers(prev => prev.map(u => u.uuid === user.uuid ? { ...u, status: user.status } : u))
      setError(err.message || 'Failed to update user status')
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      if (editingUser) {
        const updatePayload: Partial<UserFormData> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          status: formData.status,
        }
        if (formData.password) {
          updatePayload.password = formData.password
        }
        await adminService.updateUser(editingUser.uuid, updatePayload)
        
        if (formData.roles) {
          await adminService.assignUserRoles(editingUser.uuid, formData.roles)
        }
        
        setSuccessMessage(`User "${formData.name}" updated successfully`)
      } else {
        await adminService.createUser(formData)
        setSuccessMessage(`User "${formData.name}" created successfully`)
      }

      handleCloseModal()
      fetchUsers()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setFormError(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Are you sure you want to deactivate user "${user.name}"?`)) {
      return
    }

    try {
      await adminService.deleteUser(user.uuid)
      setSuccessMessage(`User "${user.name}" deactivated successfully`)
      fetchUsers()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete user')
    }
  }

  // Metrics
  const totalUsers = users.length
  const activeCount = users.filter(u => u.status === 'active').length
  const pendingCount = users.filter(u => u.status === 'pending').length
  const inactiveCount = users.filter(u => u.status === 'inactive' || u.status === 'suspended').length

  // Filtered Users (Dynamic Client-side)
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (statusFilter && u.status !== statusFilter) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const nameMatch = u.name.toLowerCase().includes(q)
        const emailMatch = u.email.toLowerCase().includes(q)
        const phoneMatch = (u.phone || '').toLowerCase().includes(q)
        const roleMatch = (u.roles || []).some(r => r.toLowerCase().includes(q))
        return nameMatch || emailMatch || phoneMatch || roleMatch
      }

      return true
    })
  }, [users, statusFilter, searchTerm])

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  return (
    <div className="users-management-container">
      {/* Header */}
      <div className="users-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">Configure administrative operators, assign permissions, and oversee system accounts</p>
        </div>
        <div className="users-actions">
          <button className="btn-secondary" onClick={fetchUsers} title="Refresh">
            <MdRefresh /> Refresh
          </button>
          <button className="btn-add-user" onClick={handleOpenCreateModal}>
            <MdPersonAdd /> Add New User
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

      {/* Stats Cards */}
      <div className="users-stats-grid">
        <div className="stat-card total">
          <div className="stat-icon-wrapper">
            <MdSecurity />
          </div>
          <div>
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{totalUsers}</div>
            <div className="stat-sub">Registered accounts</div>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon-wrapper">
            <MdCheckCircle />
          </div>
          <div>
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-sub">Operational access</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon-wrapper">
            <MdPending />
          </div>
          <div>
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-sub">Awaiting verification</div>
          </div>
        </div>
        <div className="stat-card suspended">
          <div className="stat-icon-wrapper">
            <MdBlock />
          </div>
          <div>
            <div className="stat-label">Inactive / Suspended</div>
            <div className="stat-value">{inactiveCount}</div>
            <div className="stat-sub">Restricted accounts</div>
          </div>
        </div>
      </div>

      {/* Quick Status Chips */}
      <div className="category-chips-row" style={{ marginBottom: '16px' }}>
        {[
          { id: '', label: 'All Users', count: totalUsers },
          { id: 'active', label: 'Active', count: activeCount },
          { id: 'pending', label: 'Pending', count: pendingCount },
          { id: 'suspended', label: 'Suspended / Inactive', count: inactiveCount },
        ].map(chip => (
          <button
            key={chip.id}
            className={`filter-chip ${statusFilter === chip.id ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter(chip.id)
              setCurrentPage(1)
            }}
          >
            <span>{chip.label}</span>
            <span className="chip-badge">{chip.count}</span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="users-filters-bar">
        <div className="search-form-admin">
          <MdSearch className="search-icon-admin" />
          <input
            type="text"
            placeholder="Live search by name, email, phone, or role..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <MdClose />
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-card">
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Roles</th>
                <th>Status / Dynamic Toggle</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="state-cell">
                    <div className="spinner"></div>
                    <p>Loading user accounts...</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="state-cell">
                    <MdSecurity className="empty-state-icon" />
                    <h3>No Users Found</h3>
                    <p>Try adjusting your search criteria or add a new user account.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.uuid}>
                    <td>
                      <div className="user-profile-cell">
                        <div className="user-avatar-badge">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="user-cell-name">{u.name}</div>
                          <div className="user-cell-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="user-cell-phone">{u.phone || '—'}</span>
                    </td>
                    <td>
                      <div className="roles-badges-cell">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map(r => (
                            <span key={r} className="badge badge-role">
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {/* Dynamic Inline Status Switcher */}
                      <button 
                        className={`status-toggle-pill ${u.status === 'active' ? 'active-pill' : 'suspended-pill'}`}
                        onClick={e => handleToggleStatus(u, e)}
                        title={`Click to switch status to ${u.status === 'active' ? 'suspended' : 'active'}`}
                      >
                        {u.status === 'active' ? <MdToggleOn className="toggle-icon on" /> : <MdToggleOff className="toggle-icon off" />}
                        <span className="status-name">{u.status}</span>
                      </button>
                    </td>
                    <td>
                      <span className="user-cell-date">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell">
                        <button
                          className="btn-action edit"
                          onClick={() => handleOpenEditModal(u)}
                          title="Edit User"
                        >
                          <MdEdit />
                        </button>
                        <button
                          className="btn-action delete"
                          onClick={() => handleDeleteUser(u)}
                          title="Deactivate User"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination */}
        {filteredUsers.length > 0 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)} - {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
            </div>

            <div className="pagination-controls">
              <div className="page-size-selector">
                <span>Per page:</span>
                <select 
                  value={pageSize} 
                  onChange={e => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>

              <div className="pagination-buttons">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop-admin">
          <div className="modal-card-admin">
            <div className="modal-header-admin">
              <h3>{editingUser ? 'Edit User Details' : 'Create New User Account'}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <MdClose />
              </button>
            </div>

            {formError && (
              <div className="modal-error-alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="modal-form-admin">
              <div className="form-group-admin">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Nakato"
                />
              </div>

              <div className="form-group-admin">
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@zimbani.com"
                />
              </div>

              <div className="form-row-admin">
                <div className="form-group-admin">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+256 700 000 000"
                  />
                </div>

                <div className="form-group-admin">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="form-group-admin">
                <label>Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={8}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Min. 8 characters'}
                />
              </div>

              <div className="form-group-admin">
                <label>Assign Roles</label>
                <div className="roles-checkboxes-grid">
                  {roles.map(r => (
                    <label key={r.id} className="role-checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.roles?.includes(r.name) || false}
                        onChange={() => handleRoleToggle(r.name)}
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions-admin">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersList
