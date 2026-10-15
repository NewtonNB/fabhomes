import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdEdit,
  MdFactCheck,
  MdReportProblem,
  MdAssignmentTurnedIn,
  MdPlaylistAddCheck,
  MdCloudUpload,
  MdClose,
  MdVerified,
} from 'react-icons/md'
import {
  SiteInspection,
  ChecklistItem,
  CompleteInspectionInput,
  SignOffInspectionInput,
  CreatePunchListItemInput,
} from '../../types/inspection.types'
import { Document } from '../../types/document.types'
import inspectionService from '../../services/inspection.service'
import documentService from '../../services/document.service'
import { DocumentUploadModal } from '../../components/documents/DocumentUploadModal'
import { DocumentsTable } from '../../components/documents/DocumentsTable'
import './InspectionDetails.css'

export const InspectionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [inspection, setInspection] = useState<SiteInspection | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Assessment modal
  const [assessModalOpen, setAssessModalOpen] = useState<boolean>(false)
  const [assessmentStatus, setAssessmentStatus] = useState<'passed' | 'failed' | 'passed_with_conditions'>('passed')
  const [assessmentScore, setAssessmentScore] = useState<number>(100)
  const [assessmentChecklist, setAssessmentChecklist] = useState<ChecklistItem[]>([])
  const [assessmentNotes, setAssessmentNotes] = useState<string>('')
  const [assessmentConditions, setAssessmentConditions] = useState<string>('')

  // Sign off modal
  const [signOffModalOpen, setSignOffModalOpen] = useState<boolean>(false)
  const [signOffNotes, setSignOffNotes] = useState<string>('')

  // Quick defect modal
  const [defectModalOpen, setDefectModalOpen] = useState<boolean>(false)
  const [defectTitle, setDefectTitle] = useState<string>('')
  const [defectCategory, setDefectCategory] = useState<any>('structural')
  const [defectSeverity, setDefectSeverity] = useState<any>('medium')
  const [defectLocation, setDefectLocation] = useState<string>('')
  const [defectDesc, setDefectDesc] = useState<string>('')

  // Document upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  const fetchInspection = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await inspectionService.getInspection(id)
      setInspection(data)
      setAssessmentStatus(data.status === 'scheduled' || data.status === 'in_progress' ? 'passed' : (data.status as any))
      setAssessmentScore(data.score ?? 100)
      setAssessmentNotes(data.summary_notes || '')
      setAssessmentConditions(data.conditions || '')
      setAssessmentChecklist(
        Array.isArray(data.checklist_items) && data.checklist_items.length > 0
          ? JSON.parse(JSON.stringify(data.checklist_items))
          : [],
      )

      // Fetch Polymorphic Documents
      if (data.id) {
        documentService
          .getDocuments({
            documentable_type: 'site_inspections',
            documentable_id: data.id.toString(),
            per_page: 50,
          })
          .then((res: any) => {
            const raw = res?.data?.data || res?.data || (Array.isArray(res) ? res : [])
            setDocuments(Array.isArray(raw) ? raw : [])
          })
          .catch(() => {})
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load inspection')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInspection()
  }, [id])

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setError(null)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Handle Assessment Submit
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspection) return

    try {
      setActionLoading(true)
      const input: CompleteInspectionInput = {
        status: assessmentStatus,
        score: assessmentScore,
        checklist_items: assessmentChecklist,
        summary_notes: assessmentNotes,
        conditions: assessmentStatus === 'passed_with_conditions' ? assessmentConditions : undefined,
      }
      await inspectionService.completeInspection(inspection.uuid, input)
      setAssessModalOpen(false)
      triggerSuccess('Inspection checklist completed!')
      fetchInspection()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete assessment')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Sign-off Submit
  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspection) return

    try {
      setActionLoading(true)
      const input: SignOffInspectionInput = {
        sign_off_notes: signOffNotes,
      }
      await inspectionService.signOffInspection(inspection.uuid, input)
      setSignOffModalOpen(false)
      triggerSuccess('Supervisor sign-off recorded!')
      fetchInspection()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to sign off')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Quick Defect Submit
  const handleDefectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspection || !defectTitle.trim()) return

    try {
      setActionLoading(true)
      const input: CreatePunchListItemInput = {
        title: defectTitle,
        site_id: inspection.site?.uuid || inspection.site?.id || '',
        site_inspection_id: inspection.uuid,
        category: defectCategory,
        severity: defectSeverity,
        location_details: defectLocation || undefined,
        description: defectDesc || undefined,
      }
      await inspectionService.createPunchItem(input)
      setDefectModalOpen(false)
      setDefectTitle('')
      setDefectLocation('')
      setDefectDesc('')
      triggerSuccess('Punch defect logged under this inspection!')
      fetchInspection()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to log defect')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !inspection) {
    return (
      <div className="inspection-details-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading inspection details...</p>
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className="inspection-details-container">
        <p>Inspection record not found.</p>
        <Link to="/inspections" className="btn btn-secondary">
          <MdArrowBack /> Back to Inspections
        </Link>
      </div>
    )
  }

  return (
    <div className="inspection-details-container">
      {/* Header */}
      <div className="details-header">
        <div className="details-title-group">
          <h1>
            <MdFactCheck style={{ color: '#0284c7' }} /> {inspection.title}
          </h1>
          <p className="details-subtitle">
            {inspection.inspection_number} •{' '}
            <span style={{ textTransform: 'capitalize' }}>
              {inspection.inspection_type?.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
        <div className="details-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/inspections')}>
            <MdArrowBack /> Back
          </button>
          <button className="btn btn-secondary" onClick={() => setDefectModalOpen(true)}>
            <MdReportProblem style={{ color: '#ea580c' }} /> Log Defect
          </button>
          <button className="btn btn-primary" onClick={() => setAssessModalOpen(true)}>
            <MdPlaylistAddCheck /> Run Checklist
          </button>
          {inspection.supervisor && !inspection.is_signed_off && (
            <button className="btn btn-success" onClick={() => setSignOffModalOpen(true)}>
              <MdAssignmentTurnedIn /> Sign Off
            </button>
          )}
          <Link to={`/inspections/${inspection.uuid}/edit`} className="btn btn-secondary">
            <MdEdit /> Edit
          </Link>
        </div>
      </div>

      {successMessage && <div className="alert-banner success">{successMessage}</div>}
      {error && <div className="alert-banner error">{error}</div>}

      {/* Supervisor Sign-off Banner */}
      {inspection.is_signed_off ? (
        <div className="signoff-banner">
          <MdVerified className="signoff-banner-icon" />
          <div>
            <strong>Officially Signed Off</strong> by {inspection.supervisor?.name || 'Supervisor'} on{' '}
            {inspection.signed_off_at ? new Date(inspection.signed_off_at).toLocaleDateString() : '—'}.
            {inspection.sign_off_notes && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                "{inspection.sign_off_notes}"
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="signoff-banner pending">
          <MdAssignmentTurnedIn className="signoff-banner-icon" />
          <div>
            <strong>Supervisor Sign-off Pending</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              Designated supervisor:{' '}
              <strong>{inspection.supervisor?.name || 'Not assigned yet'}</strong>. Sign-off is
              required after checklist completion for milestone sign-off compliance.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="details-grid">
        {/* Left Column: Checklist & Defects */}
        <div>
          {/* Checklist Card */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>Quality Checklist Criteria ({inspection.checklist_items?.length || 0})</h2>
              {inspection.score !== null && (
                <span
                  className={`score-badge ${
                    (inspection.score || 0) >= 80 ? 'high' : (inspection.score || 0) >= 50 ? 'mid' : 'low'
                  }`}
                >
                  Score: {inspection.score}%
                </span>
              )}
            </div>

            {(!inspection.checklist_items || inspection.checklist_items.length === 0) ? (
              <p style={{ color: '#64748b' }}>No checklist items attached to this inspection.</p>
            ) : (
              <table className="checklist-detail-table">
                <thead>
                  <tr>
                    <th>Item Requirement</th>
                    <th>Result</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.checklist_items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{item.item_text}</td>
                      <td>
                        <span className={`badge badge-${item.status}`}>{item.status}</span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.825rem' }}>{item.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Punch List / Defect Items */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>Punch List & Defects ({inspection.punch_list_items?.length || 0})</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDefectModalOpen(true)}
              >
                <MdReportProblem style={{ color: '#ea580c' }} /> Add Defect
              </button>
            </div>

            {(!inspection.punch_list_items || inspection.punch_list_items.length === 0) ? (
              <p style={{ color: '#64748b' }}>Zero defects logged under this inspection.</p>
            ) : (
              <table className="checklist-detail-table">
                <thead>
                  <tr>
                    <th>Defect #</th>
                    <th>Title & Location</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.punch_list_items.map((punch) => (
                    <tr key={punch.uuid}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {punch.item_number}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{punch.title}</div>
                        {punch.location_details && (
                          <small style={{ color: '#64748b' }}>{punch.location_details}</small>
                        )}
                      </td>
                      <td>
                        <span className={`badge severity-${punch.severity}`}>{punch.severity}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${punch.status}`}>
                          {punch.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Documents & Photos */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>Inspection Photos & Evidence ({documents.length})</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setUploadModalOpen(true)}
              >
                <MdCloudUpload /> Upload Photos
              </button>
            </div>

            {documents.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                No inspection photos or laboratory test reports uploaded yet.
              </p>
            ) : (
              <DocumentsTable
                documents={documents}
                onRefresh={() => fetchInspection()}
              />
            )}
          </div>
        </div>

        {/* Right Column: Meta Information */}
        <div>
          <div className="details-card">
            <div className="details-card-header">
              <h2>Inspection Status</h2>
            </div>
            <div className="meta-info-list">
              <div className="meta-info-row">
                <span className="meta-label">Overall Status</span>
                <span className={`badge badge-${inspection.status}`}>
                  {inspection.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Quality Score</span>
                <span className="meta-value">
                  {inspection.score !== null ? `${inspection.score}%` : 'Not assessed'}
                </span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Scheduled Date</span>
                <span className="meta-value">{inspection.scheduled_date || '—'}</span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Inspected Date</span>
                <span className="meta-value">
                  {inspection.inspected_at
                    ? new Date(inspection.inspected_at).toLocaleDateString()
                    : 'Pending execution'}
                </span>
              </div>
            </div>
          </div>

          <div className="details-card">
            <div className="details-card-header">
              <h2>Site & Context</h2>
            </div>
            <div className="meta-info-list">
              <div className="meta-info-row">
                <span className="meta-label">Site</span>
                <span className="meta-value">{inspection.site?.name || '—'}</span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Project</span>
                <span className="meta-value">{inspection.project?.name || '—'}</span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Unit</span>
                <span className="meta-value">{inspection.unit?.unit_number || 'General Site'}</span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Task</span>
                <span className="meta-value">{inspection.task?.title || 'General'}</span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Assigned Inspector</span>
                <span className="meta-value">{inspection.inspector?.name || 'Unassigned'}</span>
              </div>
              <div className="meta-info-row">
                <span className="meta-label">Supervisor</span>
                <span className="meta-value">{inspection.supervisor?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {inspection.summary_notes && (
            <div className="details-card">
              <div className="details-card-header">
                <h2>Summary Notes</h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                {inspection.summary_notes}
              </p>
            </div>
          )}

          {inspection.conditions && (
            <div className="details-card" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
              <div className="details-card-header" style={{ borderColor: '#fde68a' }}>
                <h2 style={{ color: '#b45309' }}>Clearance Conditions</h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>
                {inspection.conditions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Modal */}
      {assessModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Run Checklist Assessment</h2>
              <button className="modal-close-btn" onClick={() => setAssessModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSaveAssessment}>
              <div className="modal-body">
                <div className="checklist-runner-container">
                  {assessmentChecklist.map((item, idx) => (
                    <div key={idx} className="checklist-runner-row">
                      <div className="checklist-runner-header">
                        <span className="checklist-runner-text">{item.item_text}</span>
                        <div className="checklist-status-buttons">
                          <button
                            type="button"
                            className={`status-btn-opt pass ${item.status === 'pass' ? 'active' : ''}`}
                            onClick={() => {
                              const updated = [...assessmentChecklist]
                              updated[idx] = { ...updated[idx], status: 'pass' }
                              setAssessmentChecklist(updated)
                            }}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            className={`status-btn-opt fail ${item.status === 'fail' ? 'active' : ''}`}
                            onClick={() => {
                              const updated = [...assessmentChecklist]
                              updated[idx] = { ...updated[idx], status: 'fail' }
                              setAssessmentChecklist(updated)
                            }}
                          >
                            Fail
                          </button>
                          <button
                            type="button"
                            className={`status-btn-opt na ${item.status === 'na' ? 'active' : ''}`}
                            onClick={() => {
                              const updated = [...assessmentChecklist]
                              updated[idx] = { ...updated[idx], status: 'na' }
                              setAssessmentChecklist(updated)
                            }}
                          >
                            N/A
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Add inspection notes or observations..."
                        value={item.notes || ''}
                        onChange={(e) => {
                          const updated = [...assessmentChecklist]
                          updated[idx] = { ...updated[idx], notes: e.target.value }
                          setAssessmentChecklist(updated)
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Overall Result</label>
                    <select
                      value={assessmentStatus}
                      onChange={(e) => setAssessmentStatus(e.target.value as any)}
                    >
                      <option value="passed">Passed</option>
                      <option value="passed_with_conditions">Passed with Conditions</option>
                      <option value="failed">Failed / Action Required</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={assessmentScore}
                      onChange={(e) => setAssessmentScore(Number(e.target.value))}
                    />
                  </div>
                </div>

                {assessmentStatus === 'passed_with_conditions' && (
                  <div className="form-group">
                    <label>Conditions Required</label>
                    <textarea
                      rows={2}
                      placeholder="Specify requirements..."
                      value={assessmentConditions}
                      onChange={(e) => setAssessmentConditions(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Summary Notes</label>
                  <textarea
                    rows={3}
                    placeholder="General observations..."
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssessModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Submit Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign-off Modal */}
      {signOffModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Supervisor Sign-off</h2>
              <button className="modal-close-btn" onClick={() => setSignOffModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSignOffSubmit}>
              <div className="modal-body">
                <p>
                  Confirming sign-off for <strong>{inspection.title}</strong> (Score:{' '}
                  {inspection.score ?? 100}%).
                </p>
                <div className="form-group">
                  <label>Sign-off Notes / Authority Comments</label>
                  <textarea
                    rows={4}
                    placeholder="Confirmation notes..."
                    value={signOffNotes}
                    onChange={(e) => setSignOffNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSignOffModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Signing off...' : 'Sign Off & Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Defect Modal */}
      {defectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Log Defect for {inspection.inspection_number}</h2>
              <button className="modal-close-btn" onClick={() => setDefectModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleDefectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Defect Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Concrete honeycombing on column C2"
                    value={defectTitle}
                    onChange={(e) => setDefectTitle(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={defectCategory}
                      onChange={(e) => setDefectCategory(e.target.value)}
                    >
                      <option value="structural">Structural</option>
                      <option value="architectural">Architectural</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="finishing">Finishing</option>
                      <option value="safety">Safety</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select
                      value={defectSeverity}
                      onChange={(e) => setDefectSeverity(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Location Details</label>
                  <input
                    type="text"
                    placeholder="e.g. Ground floor north wing"
                    value={defectLocation}
                    onChange={(e) => setDefectLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Remediation instructions..."
                    value={defectDesc}
                    onChange={(e) => setDefectDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDefectModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Logging...' : 'Log Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Polymorphic Document Upload Modal */}
      {uploadModalOpen && (
        <DocumentUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            setUploadModalOpen(false)
            fetchInspection()
            triggerSuccess('Inspection photo / report uploaded!')
          }}
          defaultDocumentableType="site_inspections"
          defaultDocumentableId={inspection.id.toString()}
          title="Upload Inspection Photo or Report"
        />
      )}
    </div>
  )
}

export default InspectionDetails
