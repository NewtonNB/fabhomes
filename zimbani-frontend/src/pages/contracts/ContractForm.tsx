import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdSave } from 'react-icons/md'
import contractService from '../../services/contract.service'
import projectService from '../../services/project.service'
import siteService from '../../services/site.service'
import { Project } from '../../types/project.types'
import { Site } from '../../types/site.types'
import {
  TradeCategory,
  CreateContractPayload,
  UpdateContractPayload,
} from '../../types/contract.types'
import './ContractForm.css'

const TRADE_CATEGORIES: { value: TradeCategory; label: string }[] = [
  { value: 'masonry', label: 'Masonry & Concrete Works' },
  { value: 'electrical', label: 'Electrical Installation & Reticulation' },
  { value: 'plumbing', label: 'Plumbing & Drainage Engineering' },
  { value: 'roofing', label: 'Roofing, Trusses & Rainwater Goods' },
  { value: 'painting', label: 'Painting, Texturing & Surface Finishes' },
  { value: 'steelwork', label: 'Structural Steelwork & Metal Fabrication' },
  { value: 'carpentry', label: 'Carpentry, Joinery & Cabinetry' },
  { value: 'tiling', label: 'Floor, Wall & Wet Area Tiling' },
  { value: 'landscaping', label: 'External Works, Paving & Landscaping' },
  { value: 'earthworks', label: 'Earthworks, Excavation & Compaction' },
  { value: 'other', label: 'Specialist Subcontracting' },
]

export const ContractForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [projects, setProjects] = useState<Project[]>([])
  const [sites, setSites] = useState<Site[]>([])

  // Form Fields
  const [projectId, setProjectId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [subcontractorName, setSubcontractorName] = useState<string>('')
  const [subcontractorContactPerson, setSubcontractorContactPerson] = useState<string>('')
  const [subcontractorPhone, setSubcontractorPhone] = useState<string>('')
  const [subcontractorEmail, setSubcontractorEmail] = useState<string>('')
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState<string>('')
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>('masonry')
  const [scopeOfWork, setScopeOfWork] = useState<string>('')
  const [contractSum, setContractSum] = useState<number | string>(25000000)
  const [currency] = useState<string>('UGX')
  const [retentionPercentage, setRetentionPercentage] = useState<number | string>(5.00)
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<string>(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [paymentTerms, setPaymentTerms] = useState<string>(
    'Interim payment certificates based on bi-weekly valuations. 5% retention held until completion and defects clearance.'
  )
  const [notes, setNotes] = useState<string>('')

  // Load Lookups
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
      .catch((e) => console.warn('Failed to load projects:', e))

    siteService
      .getSites({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setSites(Array.isArray(raw) ? raw : [])
        if (!isEdit && raw.length > 0) {
          setSiteId(raw[0].uuid || raw[0].id.toString())
        }
      })
      .catch((e) => console.warn('Failed to load sites:', e))
  }, [isEdit])

  // Load Existing Contract for Edit
  useEffect(() => {
    if (isEdit && id) {
      setInitialLoading(true)
      contractService
        .getSubcontractorContract(id)
        .then((contract) => {
          setTitle(contract.title || '')
          setSubcontractorName(contract.subcontractor_name || '')
          setSubcontractorContactPerson(contract.subcontractor_contact_person || '')
          setSubcontractorPhone(contract.subcontractor_phone || '')
          setSubcontractorEmail(contract.subcontractor_email || '')
          setTaxIdentificationNumber(contract.tax_identification_number || '')
          setTradeCategory(contract.trade_category || 'masonry')
          setScopeOfWork(contract.scope_of_work || '')
          setContractSum(contract.contract_sum || 0)
          setRetentionPercentage(contract.retention_percentage ?? 5.00)
          setStartDate(contract.start_date || '')
          setExpectedCompletionDate(contract.expected_completion_date || '')
          setPaymentTerms(contract.payment_terms || '')
          setNotes(contract.notes || '')
          if (contract.project) setProjectId(contract.project.uuid || contract.project.id.toString())
          if (contract.site) setSiteId(contract.site.uuid || contract.site.id.toString())
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'Failed to load contract details.')
        })
        .finally(() => {
          setInitialLoading(false)
        })
    }
  }, [isEdit, id])

  // Computed Retention
  const numSum = Number(contractSum) || 0
  const numRetentionRate = Number(retentionPercentage) || 0
  const calculatedRetention = Math.round(numSum * (numRetentionRate / 100))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!projectId || !siteId) {
      setError('Please select a project and a construction site.')
      return
    }

    if (!title.trim() || !subcontractorName.trim() || !subcontractorPhone.trim() || !scopeOfWork.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (numSum <= 0) {
      setError('Contract sum must be greater than zero.')
      return
    }

    try {
      setLoading(true)
      if (isEdit && id) {
        const payload: UpdateContractPayload = {
          project_id: projectId,
          site_id: siteId,
          title,
          subcontractor_name: subcontractorName,
          subcontractor_contact_person: subcontractorContactPerson || undefined,
          subcontractor_phone: subcontractorPhone,
          subcontractor_email: subcontractorEmail || undefined,
          tax_identification_number: taxIdentificationNumber || undefined,
          trade_category: tradeCategory,
          scope_of_work: scopeOfWork,
          contract_sum: numSum,
          currency,
          retention_percentage: numRetentionRate,
          start_date: startDate,
          expected_completion_date: expectedCompletionDate,
          payment_terms: paymentTerms || undefined,
          notes: notes || undefined,
        }
        await contractService.updateSubcontractorContract(id, payload)
        navigate(`/contracts/${id}`)
      } else {
        const payload: CreateContractPayload = {
          project_id: projectId,
          site_id: siteId,
          title,
          subcontractor_name: subcontractorName,
          subcontractor_contact_person: subcontractorContactPerson || undefined,
          subcontractor_phone: subcontractorPhone,
          subcontractor_email: subcontractorEmail || undefined,
          tax_identification_number: taxIdentificationNumber || undefined,
          trade_category: tradeCategory,
          scope_of_work: scopeOfWork,
          contract_sum: numSum,
          currency,
          retention_percentage: numRetentionRate,
          start_date: startDate,
          expected_completion_date: expectedCompletionDate,
          payment_terms: paymentTerms || undefined,
          notes: notes || undefined,
        }
        const created = await contractService.createSubcontractorContract(payload)
        navigate(`/contracts/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save subcontractor contract.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="contract-form-container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p>Loading contract details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="contract-form-container">
      <div className="form-header">
        <div>
          <h1>{isEdit ? 'Edit Subcontractor Contract' : 'Create Subcontractor Contract'}</h1>
          <p>Define trade subcontract terms, work breakdown, and retention provisions.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/contracts')}>
          <MdArrowBack /> Back to Contracts
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-card">
        {/* Section 1: Project & Site Linkage */}
        <div className="form-section-title">1. Site & Project Linkage</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Project <span className="required">*</span>
            </label>
            <select
              className="form-control"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.uuid || p.id}>
                  {p.name} {p.code ? `(${p.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              Construction Site <span className="required">*</span>
            </label>
            <select
              className="form-control"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              required
            >
              <option value="">-- Select Site --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.uuid || s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Subcontractor Details */}
        <div className="form-section-title">2. Subcontractor Information</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Subcontractor / Trade Entity Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Kampala Roofing & Steel Structures Ltd"
              value={subcontractorName}
              onChange={(e) => setSubcontractorName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Eng. Joseph Mukasa"
              value={subcontractorContactPerson}
              onChange={(e) => setSubcontractorContactPerson(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Phone Number <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. +256 772 123 456"
              value={subcontractorPhone}
              onChange={(e) => setSubcontractorPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. contracts@kampalaroofing.co.ug"
              value={subcontractorEmail}
              onChange={(e) => setSubcontractorEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tax Identification Number (TIN)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 1002345678"
              value={taxIdentificationNumber}
              onChange={(e) => setTaxIdentificationNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Section 3: Trade & Scope */}
        <div className="form-section-title">3. Contract Scope & Trade Category</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Contract Title / Package <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Structural Steel Trusses and Gauge 28 Roofing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Trade Category <span className="required">*</span>
            </label>
            <select
              className="form-control"
              value={tradeCategory}
              onChange={(e) => setTradeCategory(e.target.value as TradeCategory)}
              required
            >
              {TRADE_CATEGORIES.map((trade) => (
                <option key={trade.value} value={trade.value}>
                  {trade.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>
            Scope of Work & Specifications <span className="required">*</span>
          </label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Detailed description of works, milestones, materials to be furnished, and quality standards..."
            value={scopeOfWork}
            onChange={(e) => setScopeOfWork(e.target.value)}
            required
          />
        </div>

        {/* Section 4: Financial Sums & Retention */}
        <div className="form-section-title">4. Financial Terms & Retention</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Total Contract Sum (UGX) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              className="form-control"
              value={contractSum}
              onChange={(e) => setContractSum(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Retention Percentage (%) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="form-control"
              value={retentionPercentage}
              onChange={(e) => setRetentionPercentage(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Dynamic Calculation Helper Card */}
        <div className="retention-helper-card">
          <div className="retention-item">
            <span className="retention-label">Contract Sum</span>
            <span className="retention-value">UGX {numSum.toLocaleString()}</span>
          </div>
          <div className="retention-item">
            <span className="retention-label">Retention Rate</span>
            <span className="retention-value">{numRetentionRate}%</span>
          </div>
          <div className="retention-item">
            <span className="retention-label">Retained Fund Pool</span>
            <span className="retention-value" style={{ color: '#d97706' }}>
              UGX {calculatedRetention.toLocaleString()}
            </span>
          </div>
          <div className="retention-item">
            <span className="retention-label">Net Certified Payable Pool</span>
            <span className="retention-value" style={{ color: '#16a34a' }}>
              UGX {(numSum - calculatedRetention).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Section 5: Timeline & Payment Terms */}
        <div className="form-section-title">5. Timeline & Payment Protocol</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Commencement Date <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Expected Completion Date <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={expectedCompletionDate}
              onChange={(e) => setExpectedCompletionDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Payment Terms & Valuation Cadence</label>
          <textarea
            className="form-control"
            rows={2}
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. Bi-weekly valuation certificates upon site inspection sign-off..."
          />
        </div>

        <div className="form-group">
          <label>Internal Administrative Notes</label>
          <textarea
            className="form-control"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Procurement references, evaluation remarks, or performance conditions..."
          />
        </div>

        <div className="form-footer">
          <button type="button" className="btn-secondary" onClick={() => navigate('/contracts')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Contract' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ContractForm
