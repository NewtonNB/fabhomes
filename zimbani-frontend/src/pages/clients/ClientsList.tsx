import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { clientService } from '../../services/client.service'
import { Client, ClientFilters } from '../../types/client.types'
import { PaginatedResponse } from '../../types/common.types'
import './ClientsList.css'

const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [pagination, setPagination] = useState<PaginatedResponse<Client>['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    status: undefined,
    kyc_status: undefined,
    page: 1,
    per_page: 15,
  })

  useEffect(() => {
    fetchClients()
  }, [filters])

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await clientService.getClients(filters)
      setClients(response.data)
      setPagination(response.meta)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clients')
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFilters({ ...filters, page: 1 })
  }

  const handleDelete = async (uuid: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return
    }

    try {
      await clientService.deleteClient(uuid)
      fetchClients()
    } catch (err: any) {
      alert(err.message || 'Failed to delete client')
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-success'
      case 'inactive':
        return 'badge-secondary'
      case 'suspended':
        return 'badge-warning'
      case 'closed':
        return 'badge-danger'
      default:
        return 'badge-secondary'
    }
  }

  const getKycBadgeClass = (kycStatus: string) => {
    switch (kycStatus) {
      case 'verified':
        return 'badge-success'
      case 'pending':
        return 'badge-warning'
      case 'rejected':
        return 'badge-danger'
      default:
        return 'badge-secondary'
    }
  }

  return (
    <div className="clients-list-page">
      <div className="page-header">
        <div>
          <h1>Clients Management</h1>
          <p className="page-subtitle">Manage your property buyers and clients</p>
        </div>
        <Link to="/clients/new" className="btn btn-primary">
          + Add New Client
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name, client number, email, phone..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="search-input"
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div className="filter-controls">
          <select
            value={filters.status || ''}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value || undefined, page: 1 })
            }
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.kyc_status || ''}
            onChange={(e) =>
              setFilters({ ...filters, kyc_status: e.target.value || undefined, page: 1 })
            }
            className="filter-select"
          >
            <option value="">All KYC Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filters.per_page}
            onChange={(e) =>
              setFilters({ ...filters, per_page: Number(e.target.value), page: 1 })
            }
            className="filter-select"
          >
            <option value="15">15 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client Number</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Status</th>
              <th>KYC Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center">
                  <div className="spinner"></div>
                  <p>Loading clients...</p>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">
                  <p>No clients found</p>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link to={`/clients/${client.uuid}`} className="link-primary">
                      {client.client_number}
                    </Link>
                  </td>
                  <td>
                    <strong>{client.full_name}</strong>
                  </td>
                  <td>
                    {client.email && <div>{client.email}</div>}
                    <div>{client.phone_primary}</div>
                  </td>
                  <td>{client.city || client.country || '-'}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(client.status)}`}>
                      {formatStatus(client.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getKycBadgeClass(client.kyc_status)}`}>
                      {formatStatus(client.kyc_status)}
                    </span>
                  </td>
                  <td>{new Date(client.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        to={`/clients/${client.uuid}`}
                        className="btn btn-sm btn-secondary"
                        title="View Details"
                      >
                        View
                      </Link>
                      <Link
                        to={`/clients/${client.uuid}/edit`}
                        className="btn btn-sm btn-secondary"
                        title="Edit"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(client.uuid)}
                        className="btn btn-sm btn-danger"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && clients.length > 0 && pagination && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {pagination.from} to {pagination.to} of {pagination.total} clients
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
              disabled={pagination.current_page === 1}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
              disabled={pagination.current_page === pagination.last_page}
              className="btn btn-secondary btn-sm"
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
