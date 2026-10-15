import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdSave,
  MdFactCheck,
  MdAdd,
  MdDeleteOutline,
  MdAutoAwesome,
} from 'react-icons/md'
import {
  InspectionType,
  InspectionStatus,
  ChecklistItem,
  CreateSiteInspectionInput,
  UpdateSiteInspectionInput,
} from '../../types/inspection.types'
import { Site } from '../../types/site.types'
import { Project } from '../../types/project.types'
import { Task } from '../../types/task.types'
import { AdminUser } from '../../types/admin.types'
import inspectionService from '../../services/inspection.service'
import { siteService } from '../../services/site.service'
import { projectService } from '../../services/project.service'
import taskService from '../../services/task.service'
import { adminService } from '../../services/admin.service'
import './InspectionForm.css'

const CHECKLIST_TEMPLATES: Record<InspectionType, string[]> = {
  foundation: [
    'Excavation dimensions and depth adhere to structural blueprints',
    'Subgrade soil bearing capacity tested and certified',
    'Blinding concrete placed and cured appropriately',
    'Reinforcement steel rebar sizes, spacing, and lap lengths compliant',
    'Concrete cover spacers placed correctly beneath bars',
    'Damp-proof membrane / moisture barrier installed without punctures',
  ],
  concrete_pre_pour: [
    'Formwork aligns plumb, rigid, and adequately braced against hydrostatic pressure',
    'All reinforcement steel tied securely and free from loose rust/debris',
    'Conduit, plumbing sleeves, and embedded anchor bolts positioned correctly',
    'Slump cone and concrete test cylinder molds ready on site',
    'Form release oil applied evenly without contaminating rebar',
    'Concrete vibrators and backup vibrator tested and operational',
  ],
  structural_framing: [
    'Columns, beams, and slabs dimensional tolerances within building code limits',
    'Bolted and welded structural connections verified against engineering schedules',
    'Lateral load bracing and shear tie requirements satisfied',
    'Deflection and camber inspection for pre-stressed / reinforced spans',
    'Lintels correctly seated across all openings with mandatory bearings',
  ],
  masonry: [
    'Block / brick compressive strength batch certs verified',
    'Mortar mix proportions and consistency adhere to specs',
    'Wall alignment, plumb lines, and level courses checked',
    'Damp-proof course (DPC) laid continuously without gaps',
    'Wall ties securely embedded at specified vertical and horizontal intervals',
  ],
  plumbing_rough_in: [
    'Drain, waste, and vent (DWV) slope gradients verified (min 1:50)',
    'Water supply pressure test held at 10 bar without drop for 2 hours',
    'All pipe supports, hangers, and acoustic isolators spaced correctly',
    'Cleanout and inspection chamber access points accessible',
    'Roof and external wall pipe penetrations weather-tightly sleeved',
  ],
  electrical_rough_in: [
    'Conduit diameters, bends, and pull box placements compliant',
    'Cable insulation resistance megger testing carried out and logged',
    'Consumer unit / distribution board location and height verified',
    'Earthing electrode system and bonding conductors installed',
    'Backboxes set flush to future finished plaster / tile level',
  ],
  waterproofing: [
    'Substrate surface cleaned, smoothed, and primed thoroughly',
    'Waterproofing membrane thickness, overlaps, and torching seams verified',
    'Fillet angles and vertical wall upturns reach minimum 300mm above finished level',
    '24-hour ponding flood test performed without leakage beneath slab',
    'Protective screed or drainage layer installed promptly over membrane',
  ],
  finishing: [
    'Internal plaster surface flatness, sharpness of reveals, and lack of cracking',
    'Paint finishes show even coverage, no brush marks, runs, or blemishes',
    'Floor and wall tiling lines straight, level, and joints uniformly grouted',
    'Internal doors and architectural hardware swing freely and latch securely',
    'Window sashes operate smoothly and perimeter weather sealants neat',
  ],
  handover_audit: [
    'All punch list and defect rectification items closed and verified',
    'Full MEP commissioning test: all lights, sockets, taps, and drains operational',
    'All keys, remotes, operations manuals, and warranties compiled in handover pack',
    'Deep sparkle cleaning completed across all rooms, windows, and fixtures',
    'Meter readings (power & water) officially logged for billing transfer',
  ],
  safety_environmental: [
    'Edge protection, perimeter guardrails, and scaffold tags fully valid',
    'Mandatory PPE compliance: helmets, high-vis vests, steel-toe boots, eye protection',
    'First aid stations, eye-wash kits, and fire extinguishers accessible & inspected',
    'Chemical, hazardous paint, and fuel storage bunded and ventilated',
    'Site waste segregation and disposal bins properly organized',
  ],
  other: [
    'Compliance with project specifications and drawings',
    'Materials quality and manufacturer test certificates',
    'Workmanship meets architectural and structural standards',
    'Cleanliness and safety conditions satisfactory',
  ],
}

export const InspectionForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [sites, setSites] = useState<Site[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Form Fields
  const [title, setTitle] = useState<string>('')
  const [inspectionType, setInspectionType] = useState<InspectionType>('foundation')
  const [siteId, setSiteId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [taskId, setTaskId] = useState<string>('')
  const [inspectorId, setInspectorId] = useState<string>('')
  const [supervisorId, setSupervisorId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [summaryNotes, setSummaryNotes] = useState<string>('')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])

  // Edit specific fields
  const [status, setStatus] = useState<InspectionStatus>('scheduled')
  const [score, setScore] = useState<number | string>('')
  const [conditions, setConditions] = useState<string>('')

  // Load Lookups
  useEffect(() => {
    siteService
      .getSites({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setSites(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load sites:', e))

    projectService
      .getProjects({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setProjects(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load projects:', e))

    taskService
      .getTasks({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setTasks(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load tasks:', e))

    adminService
      .getUsers({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setUsers(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load users:', e))
  }, [])

  // Auto-populate checklist on create when type changes (if checklist empty or matches another preset)
  const loadTemplateChecklist = (type: InspectionType) => {
    const defaultTexts = CHECKLIST_TEMPLATES[type] || CHECKLIST_TEMPLATES.other
    const newItems: ChecklistItem[] = defaultTexts.map((text) => ({
      item_text: text,
      category: type,
      status: 'pending',
      notes: '',
    }))
    setChecklistItems(newItems)
  }

  // Load existing inspection if in Edit mode
  useEffect(() => {
    if (!id) {
      // In create mode, populate initial template
      loadTemplateChecklist('foundation')
      return
    }

    setInitialLoading(true)
    inspectionService
      .getInspection(id)
      .then((data) => {
        setTitle(data.title)
        setInspectionType(data.inspection_type)
        setSiteId(data.site?.uuid || data.site?.id?.toString() || '')
        setProjectId(data.project?.uuid || data.project?.id?.toString() || '')
        setTaskId(data.task?.uuid || data.task?.id?.toString() || '')
        setInspectorId(data.inspector?.uuid || data.inspector?.id?.toString() || '')
        setSupervisorId(data.supervisor?.uuid || data.supervisor?.id?.toString() || '')
        setScheduledDate(data.scheduled_date || '')
        setSummaryNotes(data.summary_notes || '')
        setStatus(data.status)
        setScore(data.score !== null && data.score !== undefined ? data.score : '')
        setConditions(data.conditions || '')

        if (Array.isArray(data.checklist_items) && data.checklist_items.length > 0) {
          setChecklistItems(data.checklist_items)
        } else {
          loadTemplateChecklist(data.inspection_type)
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load inspection details')
      })
      .finally(() => {
        setInitialLoading(false)
      })
  }, [id])

  const handleTypeChange = (newType: InspectionType) => {
    setInspectionType(newType)
    if (!title || title.includes('Inspection')) {
      const formatted = newType.replace(/_/g, ' ')
      setTitle(`${formatted.charAt(0).toUpperCase() + formatted.slice(1)} Quality Inspection`)
    }
    // Only offer to replace checklist if created from scratch
    if (!isEdit && checklistItems.length <= 6) {
      loadTemplateChecklist(newType)
    }
  }

  const handleAddChecklistItem = () => {
    setChecklistItems([
      ...checklistItems,
      {
        item_text: '',
        category: inspectionType,
        status: 'pending',
        notes: '',
      },
    ])
  }

  const handleUpdateChecklistItemText = (index: number, text: string) => {
    const updated = [...checklistItems]
    updated[index] = { ...updated[index], item_text: text }
    setChecklistItems(updated)
  }

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !siteId || !scheduledDate) {
      setError('Title, Site, and Scheduled Date are required.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const cleanedChecklist = checklistItems
        .filter((item) => item.item_text.trim().length > 0)
        .map((item) => ({
          item_text: item.item_text.trim(),
          category: item.category || inspectionType,
          status: item.status || 'pending',
          notes: item.notes || '',
        }))

      if (isEdit && id) {
        const updatePayload: UpdateSiteInspectionInput = {
          title,
          inspection_type: inspectionType,
          site_id: siteId,
          project_id: projectId || null,
          task_id: taskId || null,
          inspector_id: inspectorId || null,
          supervisor_id: supervisorId || null,
          scheduled_date: scheduledDate,
          summary_notes: summaryNotes || null,
          checklist_items: cleanedChecklist,
          status,
          score: score !== '' ? Number(score) : null,
          conditions: conditions || null,
        }
        await inspectionService.updateInspection(id, updatePayload)
        navigate(`/inspections/${id}`)
      } else {
        const createPayload: CreateSiteInspectionInput = {
          title,
          inspection_type: inspectionType,
          site_id: siteId,
          project_id: projectId || null,
          task_id: taskId || null,
          inspector_id: inspectorId || null,
          supervisor_id: supervisorId || null,
          scheduled_date: scheduledDate,
          summary_notes: summaryNotes || null,
          checklist_items: cleanedChecklist,
        }
        const created = await inspectionService.createInspection(createPayload)
        navigate(`/inspections/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save inspection')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="inspection-form-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading inspection form...</p>
      </div>
    )
  }

  return (
    <div className="inspection-form-container">
      {/* Header */}
      <div className="inspection-form-header">
        <h1>
          <MdFactCheck style={{ color: '#0284c7' }} />
          {isEdit ? 'Edit Quality Inspection' : 'Schedule Quality Inspection'}
        </h1>
        <Link to="/inspections" className="btn btn-secondary">
          <MdArrowBack /> Back to Inspections
        </Link>
      </div>

      {error && <div className="alert-banner error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Overview */}
        <div className="form-card">
          <div className="form-section-title">
            <span>Inspection Details</span>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Inspection Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Foundation Pre-Pour Inspection"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Inspection Type *</label>
              <select
                value={inspectionType}
                onChange={(e) => handleTypeChange(e.target.value as InspectionType)}
              >
                <option value="foundation">Foundation</option>
                <option value="concrete_pre_pour">Concrete Pre-Pour</option>
                <option value="structural_framing">Structural Framing</option>
                <option value="masonry">Masonry</option>
                <option value="plumbing_rough_in">Plumbing Rough-In</option>
                <option value="electrical_rough_in">Electrical Rough-In</option>
                <option value="waterproofing">Waterproofing</option>
                <option value="finishing">Finishing</option>
                <option value="handover_audit">Handover Audit</option>
                <option value="safety_environmental">Safety & Environmental</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Site *</label>
              <select required value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">Select Construction Site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.uuid || s.id}>
                    {s.site_name || s.name} ({s.site_code || s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Project (Optional)</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">None / Not Project Specific</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.uuid || p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Task / Milestone Reference</label>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">None / General Inspection</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.uuid || t.id}>
                    {t.task_number}: {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Scheduled Inspection Date *</label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Assigned Inspector</label>
              <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
                <option value="">Select Inspector</option>
                {users.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.name} ({u.roles?.join(', ') || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Supervisor for Sign-off</label>
              <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                <option value="">Select Supervisor</option>
                {users.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.name} ({u.roles?.join(', ') || 'Supervisor'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEdit && (
            <div className="form-grid-3" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as InspectionStatus)}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="passed">Passed</option>
                  <option value="passed_with_conditions">Passed with Conditions</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  placeholder="e.g. 95"
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Clearance Conditions</label>
                <input
                  type="text"
                  placeholder="Optional remediation notes"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label>Inspection Brief / Summary Notes</label>
            <textarea
              rows={2}
              placeholder="Provide background, scope, or safety prerequisites for the inspector..."
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Section 2: Checklist Builder */}
        <div className="form-card">
          <div className="form-section-title">
            <span>Quality Checklist Criteria</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadTemplateChecklist(inspectionType)}
              title="Reset checklist to standard template for selected inspection type"
            >
              <MdAutoAwesome /> Reset to Preset Template
            </button>
          </div>

          <div className="checklist-builder-list">
            {checklistItems.map((item, index) => (
              <div key={index} className="checklist-builder-item">
                <span className="checklist-item-num">{index + 1}.</span>
                <input
                  type="text"
                  placeholder="Enter quality check requirement or verification criterion..."
                  value={item.item_text}
                  onChange={(e) => handleUpdateChecklistItemText(index, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-remove-item"
                  onClick={() => handleRemoveChecklistItem(index)}
                  title="Remove criterion"
                >
                  <MdDeleteOutline />
                </button>
              </div>
            ))}
          </div>

          <div className="checklist-actions-bar">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddChecklistItem}
            >
              <MdAdd /> Add Custom Check Item
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {checklistItems.length} checklist items configured
            </span>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions-bar">
          <Link to="/inspections" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Inspection' : 'Schedule Inspection'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default InspectionForm
