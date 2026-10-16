import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MdArrowBack, MdSave } from 'react-icons/md'
import pettyCashService from '../../services/petty-cash.service'
import projectService from '../../services/project.service'
import siteService from '../../services/site.service'
import adminService from '../../services/admin.service'
import { useAuth } from '../../contexts/AuthContext'
import { Project } from '../../types/project.types'
import { Site } from '../../types/site.types'
import { AdminUser } from '../../types/admin.types'
import { PettyCashAccountStatus } from '../../types/petty-cash.types'
import '../contracts/ContractForm.css'
import './PettyCash.css'

export const PettyCashForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user } = useAuth()

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [projects, setProjects] = useState<Project[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Form Fields
  const [name, setName] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [custodianId, setCustodianId] = useState<string>('')
  const [floatLimit, setFloatLimit] = useState<number | string>(2000000)
  const [initialBalance, setInitialBalance] = useState<number | string>(500000)
  const [status, setStatus] = useState<PettyCashAccountStatus>('active')
  const [notes, setNotes] = useState<string>('')

  // Load Projects and Users
  useEffect(() => {
    projectService
      .getProjects({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setProjects(Array.isArray(raw) ? raw : [])
        if (!isEdit && raw.length > 0) {
          setProjectId(raw[0].uuid || raw[0].id.toString())
        }
      })
      .catch((err) => console.warn('Failed to load projects:', err))

    adminService
      .getUsers({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setUsers(Array.isArray(raw) ? raw : [])
        if (!isEdit && user) {
          setCustodianId(user.uuid)
        }
      })
      .catch(() => {
        // Fallback to logged-in user if non-admin cannot access admin/users
        if (user) {
          setUsers([user as any])
          setCustodianId(user.uuid)
        }
      })
  }, [isEdit, user])

  // Load Sites when Project changes
  useEffect(() => {
    if (!projectId) {
      setSites([])
      setSiteId('')
      return
    }

    siteService
      .getSites({ project_id: projectId, per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setSites(Array.isArray(raw) ? raw : [])
        if (raw.length > 0 && !isEdit) {
          setSiteId(raw[0].uuid || raw[0].id.toString())
        }
      })
      .catch((err) => console.warn('Failed to load sites:', err))
  }, [projectId, isEdit])

  // Fetch account data if editing
  useEffect(() => {
    if (!id) return
    setInitialLoading(true)
    pettyCashService
      .getPettyCashAccount(id)
      .then((acc) => {
        setName(acc.name || '')
        setProjectId(acc.project?.uuid || acc.project_id.toString())
        setSiteId(acc.site?.uuid || acc.site_id.toString())
        setCustodianId(acc.custodian?.uuid || acc.custodian_id.toString())
        setFloatLimit(acc.float_limit || 0)
        setStatus(acc.status)
        setNotes(acc.notes || '')
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load petty cash account.')
      })
      .finally(() => setInitialLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please provide a name for the site float account.')
      return
    }

    if (!projectId || !siteId) {
      setError('Please select both a project and a construction site.')
      return
    }

    if (!custodianId) {
      setError('Please designate an authorized custodian user.')
      return
    }

    const limitNum = Number(floatLimit)
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Float limit must be a positive number.')
      return
    }

    try {
      setLoading(true)
      if (isEdit && id) {
        await pettyCashService.updatePettyCashAccount(id, {
          name: name.trim(),
          custodian_id: custodianId,
          float_limit: limitNum,
          status,
          notes: notes.trim() || undefined,
        })
        navigate(`/petty-cash/${id}`)
      } else {
        const created = await pettyCashService.createPettyCashAccount({
          name: name.trim(),
          project_id: projectId,
          site_id: siteId,
          custodian_id: custodianId,
          float_limit: limitNum,
          initial_balance: Number(initialBalance) || 0,
          currency: 'UGX',
          notes: notes.trim() || undefined,
        })
        navigate(`/petty-cash/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save petty cash account.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="petty-cash-page" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading account details...</p>
      </div>
    )
  }

  return (
    <div className="contract-form-page">
      {/* Header */}
      <div className="contract-form-header">
        <Link to="/petty-cash" className="btn-back">
          <MdArrowBack size={20} /> Back to Petty Cash Accounts
        </Link>
        <h1>{isEdit ? 'Edit Site Float Account' : 'Register New Site Float Account'}</h1>
        <p>Configure authorized cash custody, site allocations, and maximum holding limits</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="contract-form-container">
        {/* Basic Information */}
        <div className="form-card">
          <h2 className="form-card-title">Float & Custody Information</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Account Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kasangati Phase 1 Emergency Site Float"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Project *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="form-select"
                disabled={isEdit}
                required
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.uuid || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Construction Site *</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="form-select"
                disabled={isEdit || !projectId}
                required
              >
                <option value="">Select Site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.uuid || s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Authorized Float Custodian *</label>
              <select
                value={custodianId}
                onChange={(e) => setCustodianId(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Select Site Custodian</option>
                {users.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {isEdit && (
              <div className="form-group">
                <label>Account Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PettyCashAccountStatus)}
                  className="form-select"
                  required
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Financial Limits */}
        <div className="form-card">
          <h2 className="form-card-title">Float Thresholds & Initial Balance</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Maximum Float Limit (UGX) *</label>
              <input
                type="number"
                min="10000"
                step="10000"
                value={floatLimit}
                onChange={(e) => setFloatLimit(e.target.value)}
                className="form-input"
                required
              />
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                Cap on site cash holding before replenishment freeze.
              </span>
            </div>

            {!isEdit && (
              <div className="form-group">
                <label>Initial Cash Allocation (UGX)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Initial cash disbursed to custodian upon creation.
                </span>
              </div>
            )}

            <div className="form-group full-width">
              <label>Notes / Custody Terms</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific rules, safe keeping location, authorized expense types for this float..."
                rows={3}
                className="form-textarea"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/petty-cash')}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            <MdSave size={20} /> {loading ? 'Saving Float...' : isEdit ? 'Update Account' : 'Open Site Float'}
          </button>
        </div>
      </form>
    </div>
  )
}
