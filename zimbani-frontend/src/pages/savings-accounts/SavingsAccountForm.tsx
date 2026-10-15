import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  MdArrowBack,
  MdSave,
  MdAccountBalance,
  MdCalculate,
} from 'react-icons/md'
import {
  AccountType,
  AccountStatus,
  CreateSavingsAccountInput,
  UpdateSavingsAccountInput,
} from '../../types/savings-account.types'
import { Client } from '../../types/client.types'
import { Unit } from '../../types/unit.types'
import { Project } from '../../types/project.types'
import savingsAccountService from '../../services/savings-account.service'
import clientService from '../../services/client.service'
import unitService from '../../services/unit.service'
import projectService from '../../services/project.service'
import './SavingsAccountForm.css'

export const SavingsAccountForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const initialClientId = searchParams.get('client_id') || ''

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [clients, setClients] = useState<Client[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Form Fields
  const [clientId, setClientId] = useState<string>(initialClientId)
  const [accountType, setAccountType] = useState<AccountType>('land_saving')
  const [schemeName, setSchemeName] = useState<string>('Zimbani Prime Land Scheme')
  const [targetAmount, setTargetAmount] = useState<number | string>(20000000)
  const [currency] = useState<string>('UGX')
  const [openedDate, setOpenedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [targetDate, setTargetDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [plotId, setPlotId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [status, setStatus] = useState<AccountStatus>('active')
  const [notes, setNotes] = useState<string>('')

  // Load Lookups
  useEffect(() => {
    clientService
      .getClients({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setClients(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load clients:', e))

    unitService
      .getUnits({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setUnits(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load units/plots:', e))

    projectService
      .getProjects({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setProjects(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load projects:', e))
  }, [])

  // Load Account if Edit
  useEffect(() => {
    if (!id) return
    setInitialLoading(true)

    savingsAccountService
      .getSavingsAccount(id)
      .then((acc) => {
        setClientId(acc.client?.uuid || acc.client?.id?.toString() || '')
        setAccountType(acc.account_type)
        setSchemeName(acc.scheme_name || '')
        setTargetAmount(acc.target_amount)
        setOpenedDate(acc.opened_date || '')
        setTargetDate(acc.target_date || '')
        setPlotId(acc.plot?.uuid || acc.plot?.id?.toString() || '')
        setProjectId(acc.project?.uuid || acc.project?.id?.toString() || '')
        setStatus(acc.status)
        setNotes(acc.notes || '')
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load savings account.')
      })
      .finally(() => {
        setInitialLoading(false)
      })
  }, [id])

  // Recommended Monthly Savings Calculator
  const calculateMonthlyTarget = () => {
    const target = Number(targetAmount)
    if (!target || target <= 0 || !targetDate || !openedDate) return null

    const start = new Date(openedDate)
    const end = new Date(targetDate)
    const diffMonths = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()))

    const monthlyAmount = Math.round(target / diffMonths)
    return {
      months: diffMonths,
      monthlyAmount,
    }
  }

  const calc = calculateMonthlyTarget()

  const handleSchemeTypeChange = (type: AccountType) => {
    setAccountType(type)
    if (type === 'land_saving') {
      setSchemeName('Zimbani Prime Land Scheme')
      setProjectId('')
    } else {
      setSchemeName('Affordable Construction Savings')
      setPlotId('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientId) {
      setError('Please select a client owner for this savings account.')
      return
    }

    const targetNum = Number(targetAmount)
    if (isNaN(targetNum) || targetNum <= 0) {
      setError('Target savings amount must be a positive number.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (isEdit && id) {
        const payload: UpdateSavingsAccountInput = {
          account_type: accountType,
          scheme_name: schemeName.trim() || undefined,
          target_amount: targetNum,
          status,
          opened_date: openedDate,
          target_date: targetDate || undefined,
          plot_id: plotId || null,
          project_id: projectId || null,
          notes: notes.trim() || undefined,
        }

        const updated = await savingsAccountService.updateSavingsAccount(id, payload)
        navigate(`/savings-accounts/${updated.uuid}`)
      } else {
        const payload: CreateSavingsAccountInput = {
          client_id: clientId,
          account_type: accountType,
          scheme_name: schemeName.trim() || undefined,
          target_amount: targetNum,
          currency,
          opened_date: openedDate,
          target_date: targetDate || undefined,
          plot_id: plotId || null,
          project_id: projectId || null,
          notes: notes.trim() || undefined,
        }

        const created = await savingsAccountService.createSavingsAccount(payload)
        navigate(`/savings-accounts/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save savings account. Please review inputs.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="savings-form-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading account details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="savings-form-container">
      {/* Header */}
      <div className="savings-form-header">
        <div className="savings-form-title">
          <button
            className="action-icon-btn"
            onClick={() => navigate('/savings-accounts')}
            title="Back to Accounts"
            style={{ marginRight: '0.5rem' }}
          >
            <MdArrowBack />
          </button>
          <div>
            <h1>
              <MdAccountBalance /> {isEdit ? 'Edit Savings Account' : 'Open Client Savings Account'}
            </h1>
            <p>
              {isEdit
                ? 'Update target budget, scheme classification, or linked properties.'
                : 'Enrol client into a structured installment savings scheme.'}
            </p>
          </div>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div className="savings-form-card">
        <form onSubmit={handleSubmit} className="standard-form">
          {/* Client Selection */}
          <div className="form-group">
            <label>Client Account Owner *</label>
            <select
              required
              disabled={isEdit}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.uuid || c.id}>
                  {c.first_name} {c.last_name} ({c.client_number || c.phone_primary || 'Client'})
                </option>
              ))}
            </select>
          </div>

          {/* Scheme Type Toggle */}
          <div className="form-row">
            <div className="form-group">
              <label>Savings Scheme Type *</label>
              <select
                value={accountType}
                onChange={(e) => handleSchemeTypeChange(e.target.value as AccountType)}
                required
              >
                <option value="land_saving">Land Saving Scheme (Acquiring Plot)</option>
                <option value="construction_saving">Construction Saving Scheme (Building Home)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Scheme Name / Product *</label>
              <input
                type="text"
                required
                placeholder="e.g. Zimbani Prime Land Scheme"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
              />
            </div>
          </div>

          {/* Target Financials */}
          <div className="form-row">
            <div className="form-group">
              <label>Target Savings Amount (UGX) *</label>
              <input
                type="number"
                step="50000"
                min="10000"
                required
                placeholder="e.g. 25000000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
              {Number(targetAmount) > 0 && (
                <small style={{ color: '#0284c7', fontWeight: 600, marginTop: '0.25rem' }}>
                  Preview: UGX {Number(targetAmount).toLocaleString()}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Target Completion Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Interactive Recommended Monthly Deposit Banner */}
          {calc && (
            <div className="calculator-callout">
              <MdCalculate className="calc-icon" />
              <div className="calc-text">
                <strong>
                  Recommended Savings: UGX {calc.monthlyAmount.toLocaleString()} / month
                </strong>
                <p>
                  Saving UGX {calc.monthlyAmount.toLocaleString()} monthly for {calc.months} months will achieve the UGX{' '}
                  {Number(targetAmount).toLocaleString()} goal on schedule.
                </p>
              </div>
            </div>
          )}

          {/* Scheme Specific Links */}
          {accountType === 'land_saving' ? (
            <div className="form-group">
              <label>Associated Plot / Land Unit (Optional)</label>
              <select
                value={plotId}
                onChange={(e) => setPlotId(e.target.value)}
              >
                <option value="">No specific plot pre-allocated</option>
                {units.map((u) => (
                  <option key={u.id} value={u.uuid || u.id}>
                    Plot {u.unit_number} {u.block_number ? `(Block ${u.block_number})` : ''} — UGX{' '}
                    {Number(u.current_price || 0).toLocaleString()}
                  </option>
                ))}
              </select>
              <small style={{ color: '#64748b' }}>
                Optionally lock this savings scheme to an existing reserved plot.
              </small>
            </div>
          ) : (
            <div className="form-group">
              <label>Associated Construction Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">No specific project attached</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.uuid || p.id}>
                    {p.name} ({p.code || 'Project'})
                  </option>
                ))}
              </select>
              <small style={{ color: '#64748b' }}>
                Optionally link to an active construction project budget.
              </small>
            </div>
          )}

          {/* Account Opening Date */}
          <div className="form-row">
            <div className="form-group">
              <label>Account Opening Date *</label>
              <input
                type="date"
                required
                value={openedDate}
                onChange={(e) => setOpenedDate(e.target.value)}
              />
            </div>

            {isEdit && (
              <div className="form-group">
                <label>Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AccountStatus)}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed / Target Reached</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="form-group">
            <label>Notes / Client Terms</label>
            <textarea
              rows={3}
              placeholder="Enter special agreement notes, installment preferences, or remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Form Actions */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '1.5rem 0 0 0' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/savings-accounts')}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <MdSave /> {loading ? 'Saving Account...' : isEdit ? 'Update Savings Account' : 'Open Savings Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SavingsAccountForm
