import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MdArrowBack, MdSave, MdCalculate } from 'react-icons/md'
import certificateService from '../../services/certificate.service'
import contractService from '../../services/contract.service'
import { SubcontractorContract } from '../../types/contract.types'
import {
  CertificateType,
  CreateCertificatePayload,
  UpdateCertificatePayload,
} from '../../types/certificate.types'
import '../contracts/ContractForm.css'
import './CertificateForm.css'

export const CertificateForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const initialContractUuid = searchParams.get('contract_id') || ''

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [contracts, setContracts] = useState<SubcontractorContract[]>([])
  const [selectedContract, setSelectedContract] = useState<SubcontractorContract | null>(null)

  // Form Fields
  const [contractId, setContractId] = useState<string>(initialContractUuid)
  const [certificateType, setCertificateType] = useState<CertificateType>('interim')
  const [valuationPeriodStart, setValuationPeriodStart] = useState<string>(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [valuationPeriodEnd, setValuationPeriodEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [valuationDate, setValuationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const [grossAmount, setGrossAmount] = useState<number | string>(10000000)
  const [previousGrossAmount, setPreviousGrossAmount] = useState<number | string>(0)
  const [materialsOnSiteValue, setMaterialsOnSiteValue] = useState<number | string>(0)
  const [retentionRate, setRetentionRate] = useState<number | string>(5.00)
  const [withholdingTaxRate, setWithholdingTaxRate] = useState<number | string>(6.00)
  const [otherDeductions, setOtherDeductions] = useState<number | string>(0)
  const [currency] = useState<string>('UGX')

  const [description, setDescription] = useState<string>('')
  const [measurementSheetSummary, setMeasurementSheetSummary] = useState<string>('')

  // Load active contracts for dropdown
  useEffect(() => {
    contractService
      .getSubcontractorContracts({ per_page: 100 } as any)
      .then((res) => {
        const items = res?.data || []
        setContracts(items)
        if (initialContractUuid) {
          const match = items.find((c) => c.uuid === initialContractUuid || c.id.toString() === initialContractUuid)
          if (match) {
            setSelectedContract(match)
            setContractId(match.uuid)
            setRetentionRate(match.retention_percentage || 5.00)
            setPreviousGrossAmount(match.total_certified_gross || 0)
          }
        }
      })
      .catch((e) => console.warn('Failed to load contracts:', e))
  }, [initialContractUuid])

  // Load existing certificate for edit
  useEffect(() => {
    if (isEdit && id) {
      setInitialLoading(true)
      certificateService
        .getPaymentCertificate(id)
        .then((cert) => {
          setContractId(cert.contract?.uuid || cert.contract_id.toString())
          setCertificateType(cert.certificate_type || 'interim')
          setValuationPeriodStart(cert.valuation_period_start || '')
          setValuationPeriodEnd(cert.valuation_period_end || '')
          setValuationDate(cert.valuation_date || '')
          setGrossAmount(cert.gross_amount || 0)
          setPreviousGrossAmount(cert.previous_gross_amount || 0)
          setMaterialsOnSiteValue(cert.materials_on_site_value || 0)
          setRetentionRate(cert.retention_rate ?? 5.00)
          setWithholdingTaxRate(cert.withholding_tax_rate ?? 6.00)
          setOtherDeductions(cert.other_deductions || 0)
          setDescription(cert.description || '')
          setMeasurementSheetSummary(cert.measurement_sheet_summary || '')
          if (cert.contract) {
            setSelectedContract(cert.contract)
          }
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'Failed to load certificate.')
        })
        .finally(() => {
          setInitialLoading(false)
        })
    }
  }, [isEdit, id])

  const handleContractChange = (uuid: string) => {
    setContractId(uuid)
    const match = contracts.find((c) => c.uuid === uuid || c.id.toString() === uuid)
    setSelectedContract(match || null)
    if (match) {
      setRetentionRate(match.retention_percentage || 5.00)
      setPreviousGrossAmount(match.total_certified_gross || 0)
    }
  }

  // Live Valuation Calculations
  const gross = Number(grossAmount) || 0
  const prevGross = Number(previousGrossAmount) || 0
  const currentGross = Math.max(0, gross - prevGross)
  const matValue = Number(materialsOnSiteValue) || 0
  const subtotalValuation = currentGross + matValue

  const retRate = Number(retentionRate) || 0
  const retentionDeduction = Math.round(subtotalValuation * (retRate / 100))

  const whtRate = Number(withholdingTaxRate) || 0
  const whtDeduction = Math.round(subtotalValuation * (whtRate / 100))

  const other = Number(otherDeductions) || 0
  const netCertifiedPayable = Math.max(0, subtotalValuation - retentionDeduction - whtDeduction - other)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!contractId) {
      setError('Please select a subcontractor contract.')
      return
    }

    if (!description.trim()) {
      setError('Please enter a description for this valuation.')
      return
    }

    if (gross <= 0 && certificateType !== 'retention_release') {
      setError('Gross valuation must be greater than zero.')
      return
    }

    try {
      setLoading(true)
      if (isEdit && id) {
        const payload: UpdateCertificatePayload = {
          valuation_period_start: valuationPeriodStart,
          valuation_period_end: valuationPeriodEnd,
          valuation_date: valuationDate,
          certificate_type: certificateType,
          gross_amount: gross,
          previous_gross_amount: prevGross,
          materials_on_site_value: matValue,
          retention_rate: retRate,
          withholding_tax_rate: whtRate,
          other_deductions: other,
          currency,
          description,
          measurement_sheet_summary: measurementSheetSummary || undefined,
        }
        await certificateService.updatePaymentCertificate(id, payload)
        navigate(`/certificates/${id}`)
      } else {
        const payload: CreateCertificatePayload = {
          contract_id: contractId,
          valuation_period_start: valuationPeriodStart,
          valuation_period_end: valuationPeriodEnd,
          valuation_date: valuationDate,
          certificate_type: certificateType,
          gross_amount: gross,
          previous_gross_amount: prevGross,
          materials_on_site_value: matValue,
          retention_rate: retRate,
          withholding_tax_rate: whtRate,
          other_deductions: other,
          currency,
          description,
          measurement_sheet_summary: measurementSheetSummary || undefined,
        }
        const created = await certificateService.createPaymentCertificate(payload)
        navigate(`/certificates/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save payment certificate.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="cert-form-container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p>Loading certificate details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cert-form-container">
      <div className="form-header">
        <div>
          <h1>{isEdit ? 'Edit Payment Certificate' : 'Issue Subcontractor Payment Certificate'}</h1>
          <p>Prepare valuation certificate with automated retention and statutory URA 6% withholding tax deduction.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/payment-certificates')}>
          <MdArrowBack /> Back
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-card">
        {/* Section 1: Contract Selection */}
        <div className="form-section-title">1. Subcontractor Contract & Site Linkage</div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>
              Subcontractor Contract <span className="required">*</span>
            </label>
            <select
              className="form-control"
              value={contractId}
              onChange={(e) => handleContractChange(e.target.value)}
              disabled={isEdit}
              required
            >
              <option value="">-- Select Subcontractor Contract --</option>
              {contracts.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.contract_number} &bull; {c.subcontractor_name} &bull; {c.title} ({c.trade_category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedContract && (
          <div className="retention-helper-card" style={{ marginBottom: '1.5rem' }}>
            <div className="retention-item">
              <span className="retention-label">Contract Sum</span>
              <span className="retention-value">UGX {Number(selectedContract.contract_sum || 0).toLocaleString()}</span>
            </div>
            <div className="retention-item">
              <span className="retention-label">Previously Certified</span>
              <span className="retention-value" style={{ color: '#0284c7' }}>
                UGX {Number(selectedContract.total_certified_gross || 0).toLocaleString()}
              </span>
            </div>
            <div className="retention-item">
              <span className="retention-label">Trade</span>
              <span className="retention-value">{selectedContract.trade_category}</span>
            </div>
            <div className="retention-item">
              <span className="retention-label">Site / Project</span>
              <span className="retention-value">{selectedContract.site?.name || 'Site'}</span>
            </div>
          </div>
        )}

        {/* Section 2: Valuation Period & Type */}
        <div className="form-section-title">2. Valuation Period & Certificate Type</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Certificate Type <span className="required">*</span>
            </label>
            <select
              className="form-control"
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value as CertificateType)}
              required
            >
              <option value="interim">Interim Valuation</option>
              <option value="practical_completion">Practical Completion Valuation</option>
              <option value="final">Final Account Valuation</option>
              <option value="retention_release">Retention Release Certificate</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Valuation Date <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Valuation Period Start <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={valuationPeriodStart}
              onChange={(e) => setValuationPeriodStart(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Valuation Period End <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={valuationPeriodEnd}
              onChange={(e) => setValuationPeriodEnd(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Section 3: Financial Quantities & Rates */}
        <div className="form-section-title">3. Physical Works Valuation & Statutory Deductions</div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Cumulative Gross Valuation to Date (UGX) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="form-control"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Previously Certified Gross Amount (UGX) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="form-control"
              value={previousGrossAmount}
              onChange={(e) => setPreviousGrossAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Value of Materials Unincorporated on Site (UGX)</label>
            <input
              type="number"
              step="any"
              min="0"
              className="form-control"
              value={materialsOnSiteValue}
              onChange={(e) => setMaterialsOnSiteValue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Retention Rate (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="form-control"
              value={retentionRate}
              onChange={(e) => setRetentionRate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>URA Withholding Tax Rate (%) - Standard 6%</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="form-control"
              value={withholdingTaxRate}
              onChange={(e) => setWithholdingTaxRate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Other Allowable Deductions (Advances / Contra Charges) (UGX)</label>
            <input
              type="number"
              step="any"
              min="0"
              className="form-control"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
            />
          </div>
        </div>

        {/* Live Calculation Sheet Card */}
        <div className="valuation-calculator-box">
          <h3>
            <MdCalculate /> Live Valuation & Net Certified Payable Breakdown
          </h3>
          <div className="calc-sheet">
            <div className="calc-row">
              <span className="calc-label">Cumulative Gross Work Completed</span>
              <span className="calc-val">UGX {gross.toLocaleString()}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Less Previous Cumulative Gross Certified</span>
              <span className="calc-val">- UGX {prevGross.toLocaleString()}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Current Valuation Period Gross Work</span>
              <span className="calc-val" style={{ color: '#38bdf8' }}>UGX {currentGross.toLocaleString()}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Plus Materials on Site (Unincorporated)</span>
              <span className="calc-val">+ UGX {matValue.toLocaleString()}</span>
            </div>
            <div className="calc-row subtotal">
              <span className="calc-label">Gross Certified Subtotal</span>
              <span className="calc-val">UGX {subtotalValuation.toLocaleString()}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Less Retention Held ({retRate}%)</span>
              <span className="calc-val" style={{ color: '#fbbf24' }}>- UGX {retentionDeduction.toLocaleString()}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Less URA Withholding Tax ({whtRate}%)</span>
              <span className="calc-val" style={{ color: '#f87171' }}>- UGX {whtDeduction.toLocaleString()}</span>
            </div>
            {other > 0 && (
              <div className="calc-row">
                <span className="calc-label">Less Other Deductions</span>
                <span className="calc-val" style={{ color: '#f87171' }}>- UGX {other.toLocaleString()}</span>
              </div>
            )}
            <div className="calc-row net">
              <span className="calc-label">NET CERTIFIED PAYABLE TO SUBCONTRACTOR</span>
              <span className="calc-val">UGX {netCertifiedPayable.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Narrative & Measurement Sheet */}
        <div className="form-section-title">4. Works Description & Site Measurement Summary</div>
        <div className="form-group">
          <label>
            Certificate Narrative / Summary of Works <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Valuation #2: Completion of roof truss members and purlins on Block B."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Site Measurement Sheet Summary / Inspection Remarks</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Reference quantity takeoff sheet, dimensional checks, verified delivery notes, or site manager comments..."
            value={measurementSheetSummary}
            onChange={(e) => setMeasurementSheetSummary(e.target.value)}
          />
        </div>

        <div className="form-footer">
          <button type="button" className="btn-secondary" onClick={() => navigate('/payment-certificates')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Certificate' : 'Issue Certificate'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CertificateForm
