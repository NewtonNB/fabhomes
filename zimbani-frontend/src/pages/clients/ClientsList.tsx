import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  MdSearch, 
  MdAdd, 
  MdVisibility, 
  MdEdit, 
  MdDelete, 
  MdCheckCircle, 
  MdCancel, 
  MdRefresh,
  MdToggleOn,
  MdToggleOff,
  MdWarning
} from 'react-icons/md'
import { clientService } from '../../services/client.service'
import { Client } from '../../types/client.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './ClientsList.css'

const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)

  // Soft Replies & Confirm Modal States
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Dynamic Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'active' | 'pending_kyc' | 'verified_kyc' | 'inactive'>('all')

  // Dynamic Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await clientService.getClients({ per_page: 100 })
      
      // Robust unpacking
      const rawList = (response as any)?.data?.data || (response as any)?.data || (Array.isArray(response) ? response : [])
      setClients(Array.isArray(rawList) ? rawList : [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clients')
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Optimistic Inline Status Toggle
  const handleToggleStatus = async (client: Client) => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active'
    setToggleLoading(client.uuid)

    // Optimistic UI update
    setClients(prev => prev.map(c => c.uuid === client.uuid ? { ...c, status: newStatus } : c))

    try {
      await clientService.updateClient(client.uuid, { status: newStatus })
      setActionFeedback({
        type: 'success',
        message: `Client "${client.first_name} ${client.last_name}" status updated to ${newStatus}.`
      })
    } catch (err: any) {
      // Revert on failure
      setClients(prev => prev.map(c => c.uuid === client.uuid ? { ...c, status: client.status } : c))
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to update client status'
      })
    } finally {
      setToggleLoading(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return

    setDeletingClient(true)
    try {
      await clientService.deleteClient(clientToDelete.uuid)
      setClients(prev => prev.filter(c => c.uuid !== clientToDelete.uuid))
      setActionFeedback({
        type: 'success',
        message: `Client "${clientToDelete.first_name} ${clientToDelete.last_name}" was successfully deleted.`
      })
      setClientToDelete(null)
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to delete client. Check if client has active plots or savings accounts.'
      })
    } finally {
      setDeletingClient(false)
    }
  }

  // Dynamic Metrics for Category Chips
  const counts = useMemo(() => {
    return {
      all: clients.length,
      active: clients.filter(c => c.status === 'active').length,
      pending_kyc: clients.filter(c => c.kyc_status === 'pending').length,
      verified_kyc: clients.filter(c => c.kyc_status === 'verified').length,
      inactive: clients.filter(c => c.status === 'inactive' || c.status === 'suspended' || c.status === 'closed').length,
    }
  }, [clients])

  // Instant Search & Category Filtering
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Category match
      if (selectedCategory === 'active' && c.status !== 'active') return false
      if (selectedCategory === 'pending_kyc' && c.kyc_status !== 'pending') return false
      if (selectedCategory === 'verified_kyc' && c.kyc_status !== 'verified') return false
      if (selectedCategory === 'inactive' && (c.status === 'active')) return false

      // Search match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const fullName = (c.full_name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase()
        const email = (c.email || '').toLowerCase()
        const phone = (c.phone_primary || '').toLowerCase()
        const clientNum = (c.client_number || '').toLowerCase()

        return fullName.includes(query) || email.includes(query) || phone.includes(query) || clientNum.includes(query)
      }

      return true
    })
  }, [clients, selectedCategory, searchTerm])

  // Pagination Slice
  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredClients.slice(startIndex, startIndex + pageSize)
  }, [filteredClients, currentPage, pageSize])

  const startIndex = filteredClients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredClients.length)

  return (
    <div className="clients-page">
      {/* Top Bar */}
      <div className="clients-top-bar">
        <div className="clients-title-area">
          <h1>Clients Management</h1>
          <p className="clients-subtitle">Manage property buyers, KYC documents, and account status</p>
        </div>
        <div className="clients-header-actions">
          <button className="category-chip" onClick={fetchClients} title="Refresh Client List">
            <MdRefresh /> Refresh
          </button>
          <Link to="/clients/new" className="btn-primary-action">
            <MdAdd /> Add New Client
          </Link>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`alert ${actionFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: actionFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: actionFeedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${actionFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
            {actionFeedback.type === 'success' ? <MdCheckCircle size={18} color="#059669" /> : <MdWarning size={18} color="#dc2626" />}
            {actionFeedback.message}
          </span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <MdWarning size={18} /> {error}
          </span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Dynamic Category Filter Chips */}
      <div className="clients-category-chips">
        <button
          className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
        >
          All Clients <span className="chip-count">{counts.all}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'active' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('active'); setCurrentPage(1); }}
        >
          Active <span className="chip-count">{counts.active}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'pending_kyc' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('pending_kyc'); setCurrentPage(1); }}
        >
          Pending KYC <span className="chip-count">{counts.pending_kyc}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'verified_kyc' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('verified_kyc'); setCurrentPage(1); }}
        >
          Verified KYC <span className="chip-count">{counts.verified_kyc}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'inactive' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('inactive'); setCurrentPage(1); }}
        >
          Inactive / Suspended <span className="chip-count">{counts.inactive}</span>
        </button>
      </div>

      {/* Dynamic Instant Search Bar */}
      <div className="clients-search-card">
        <div className="search-input-wrapper">
          <MdSearch className="search-icon-inside" />
          <input
            type="text"
            className="client-search-field"
            placeholder="Instant search by client name, client #, email, phone number..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="search-results-info">
          Found {filteredClients.length} of {clients.length} clients
        </div>
      </div>

      {/* Data Table */}
      <div className="clients-table-container">
        {loading ? (
          <div className="clients-loading">
            <div className="spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="clients-empty">
            {clients.length === 0 ? 'No clients found in the database.' : 'No clients match your filter criteria.'}
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client #</th>
                <th>Client Name</th>
                <th>Contact Details</th>
                <th>KYC Status</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client) => {
                const displayName = client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client'
                return (
                  <tr key={client.uuid || client.id}>
                    <td>
                      <span className="client-number-badge">{client.client_number || 'N/A'}</span>
                    </td>
                    <td>
                      <div className="client-primary-name">{displayName}</div>
                      <div className="contact-email">{client.country || 'Uganda'}</div>
                    </td>
                    <td>
                      <div className="contact-meta">{client.phone_primary}</div>
                      <div className="contact-email">{client.email || 'No email registered'}</div>
                    </td>
                    <td>
                      <span className={`kyc-badge ${client.kyc_status}`}>
                        {client.kyc_status === 'verified' && <MdCheckCircle style={{ marginRight: 4 }} />}
                        {client.kyc_status === 'rejected' && <MdCancel style={{ marginRight: 4 }} />}
                        {client.kyc_status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`status-switch-pill ${client.status}`}
                        onClick={() => handleToggleStatus(client)}
                        disabled={toggleLoading === client.uuid}
                        title="Click to toggle status"
                      >
                        {client.status === 'active' ? (
                          <>
                            <MdToggleOn style={{ fontSize: 18 }} /> Active
                          </>
                        ) : (
                          <>
                            <MdToggleOff style={{ fontSize: 18 }} /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <Link to={`/clients/${client.uuid}`} className="action-icon-btn" title="View Details">
                          <MdVisibility />
                        </Link>
                        <Link to={`/clients/edit/${client.uuid}`} className="action-icon-btn" title="Edit Client">
                          <MdEdit />
                        </Link>
                        <button
                          className="action-icon-btn delete"
                          onClick={() => setClientToDelete(client)}
                          title="Delete Client"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredClients.length > 0 && (
        <div className="clients-pagination">
          <div className="pagination-left">
            <span>
              Showing {startIndex} - {endIndex} of {filteredClients.length} clients
            </span>
            <select
              className="page-size-dropdown"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value="10">10 per page</option>
              <option value="15">15 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>

          <div className="pagination-controls">
            <button
              className="page-nav-btn"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="page-info-label">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="page-nav-btn"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Client Deletion */}
      <ConfirmDialog
        isOpen={Boolean(clientToDelete)}
        title="Delete Client"
        message={`Are you sure you want to delete "${clientToDelete?.first_name} ${clientToDelete?.last_name}"? This action will remove the client profile.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingClient}
        onConfirm={handleConfirmDelete}
        onClose={() => setClientToDelete(null)}
      />
    </div>
  )
}

export default ClientsList
