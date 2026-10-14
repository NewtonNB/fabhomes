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
  MdToggleOff
} from 'react-icons/md'
import { clientService } from '../../services/client.service'
import { Client } from '../../types/client.types'
import './ClientsList.css'

const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)

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
    } catch (err: any) {
      // Revert on failure
      setClients(prev => prev.map(c => c.uuid === client.uuid ? { ...c, status: client.status } : c))
      alert(err.message || 'Failed to update client status')
    } finally {
      setToggleLoading(null)
    }
  }

  const handleDelete = async (uuid: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return

    try {
      await clientService.deleteClient(uuid)
      setClients(prev => prev.filter(c => c.uuid !== uuid))
    } catch (err: any) {
      alert(err.message || 'Failed to delete client')
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

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
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
                          onClick={() => handleDelete(client.uuid)}
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
    </div>
  )
}

export default ClientsList
