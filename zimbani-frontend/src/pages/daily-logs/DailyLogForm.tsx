import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdSave,
  MdAccessTime,
} from 'react-icons/md'
import {
  WeatherCondition,
  DailyLogStatus,
  CreateSiteDailyLogInput,
  UpdateSiteDailyLogInput,
} from '../../types/daily-log.types'
import { Site } from '../../types/site.types'
import { Project } from '../../types/project.types'
import { AdminUser } from '../../types/admin.types'
import dailyLogService from '../../services/daily-log.service'
import { siteService } from '../../services/site.service'
import { projectService } from '../../services/project.service'
import { adminService } from '../../services/admin.service'
import './DailyLogForm.css'

export const DailyLogForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [sites, setSites] = useState<Site[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Form Fields
  const [siteId, setSiteId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('sunny')
  const [temperatureCelsius, setTemperatureCelsius] = useState<number | string>('28.0')
  const [workDelayedByWeather, setWorkDelayedByWeather] = useState<boolean>(false)
  const [delayHours, setDelayHours] = useState<number | string>(0)
  const [laborHeadcount, setLaborHeadcount] = useState<number | string>(15)
  const [subcontractorHeadcount, setSubcontractorHeadcount] = useState<number | string>(5)
  const [workPerformedSummary, setWorkPerformedSummary] = useState<string>('')
  const [delaysOrImpediments, setDelaysOrImpediments] = useState<string>('')
  const [materialsReceivedNotes, setMaterialsReceivedNotes] = useState<string>('')
  const [equipmentOnSiteNotes, setEquipmentOnSiteNotes] = useState<string>('')
  const [visitorsLog, setVisitorsLog] = useState<string>('')
  const [supervisorId, setSupervisorId] = useState<string>('')
  const [status, setStatus] = useState<DailyLogStatus>('submitted')
  const [notes, setNotes] = useState<string>('')

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

    adminService
      .getUsers({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setUsers(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load users:', e))
  }, [])

  // Load Log if Edit
  useEffect(() => {
    if (!id) return
    setInitialLoading(true)

    dailyLogService
      .getDailyLog(id)
      .then((log) => {
        setSiteId(log.site?.uuid || log.site?.id?.toString() || '')
        setProjectId(log.project?.uuid || log.project?.id?.toString() || '')
        setLogDate(log.log_date || '')
        setWeatherCondition(log.weather_condition)
        setTemperatureCelsius(log.temperature_celsius !== null && log.temperature_celsius !== undefined ? log.temperature_celsius : '')
        setWorkDelayedByWeather(log.work_delayed_by_weather)
        setDelayHours(log.delay_hours || 0)
        setLaborHeadcount(log.labor_headcount || 0)
        setSubcontractorHeadcount(log.subcontractor_headcount || 0)
        setWorkPerformedSummary(log.work_performed_summary || '')
        setDelaysOrImpediments(log.delays_or_impediments || '')
        setMaterialsReceivedNotes(log.materials_received_notes || '')
        setEquipmentOnSiteNotes(log.equipment_on_site_notes || '')
        setVisitorsLog(log.visitors_log || '')
        setSupervisorId(log.supervisor?.uuid || log.supervisor?.id?.toString() || '')
        setStatus(log.status)
        setNotes(log.notes || '')
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load daily log')
      })
      .finally(() => {
        setInitialLoading(false)
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteId || !logDate || !workPerformedSummary.trim()) {
      setError('Site, Log Date, and Work Performed Summary are required.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (isEdit && id) {
        const updatePayload: UpdateSiteDailyLogInput = {
          site_id: siteId,
          project_id: projectId || null,
          log_date: logDate,
          weather_condition: weatherCondition,
          temperature_celsius: temperatureCelsius !== '' ? Number(temperatureCelsius) : null,
          work_delayed_by_weather: workDelayedByWeather,
          delay_hours: Number(delayHours) || 0,
          labor_headcount: Number(laborHeadcount) || 0,
          subcontractor_headcount: Number(subcontractorHeadcount) || 0,
          work_performed_summary: workPerformedSummary,
          delays_or_impediments: delaysOrImpediments || null,
          materials_received_notes: materialsReceivedNotes || null,
          equipment_on_site_notes: equipmentOnSiteNotes || null,
          visitors_log: visitorsLog || null,
          supervisor_id: supervisorId || null,
          status,
          notes: notes || null,
        }
        await dailyLogService.updateDailyLog(id, updatePayload)
        navigate(`/daily-logs/${id}`)
      } else {
        const createPayload: CreateSiteDailyLogInput = {
          site_id: siteId,
          project_id: projectId || null,
          log_date: logDate,
          weather_condition: weatherCondition,
          temperature_celsius: temperatureCelsius !== '' ? Number(temperatureCelsius) : null,
          work_delayed_by_weather: workDelayedByWeather,
          delay_hours: Number(delayHours) || 0,
          labor_headcount: Number(laborHeadcount) || 0,
          subcontractor_headcount: Number(subcontractorHeadcount) || 0,
          work_performed_summary: workPerformedSummary,
          delays_or_impediments: delaysOrImpediments || null,
          materials_received_notes: materialsReceivedNotes || null,
          equipment_on_site_notes: equipmentOnSiteNotes || null,
          visitors_log: visitorsLog || null,
          supervisor_id: supervisorId || null,
          notes: notes || null,
        }
        const created = await dailyLogService.createDailyLog(createPayload)
        navigate(`/daily-logs/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save daily log')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="daily-log-form-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading daily log form...</p>
      </div>
    )
  }

  return (
    <div className="daily-log-form-container">
      {/* Header */}
      <div className="daily-log-form-header">
        <h1>
          <MdAccessTime style={{ color: '#0284c7' }} />
          {isEdit ? 'Edit Daily Supervisor Log' : 'Create Site Daily Log'}
        </h1>
        <Link to="/daily-logs" className="btn btn-secondary">
          <MdArrowBack /> Back to Daily Logs
        </Link>
      </div>

      {error && <div className="alert-banner error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Site, Date & Weather */}
        <div className="form-card">
          <div className="form-section-title">Date, Site & Environmental Conditions</div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Construction Site *</label>
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
                <option value="">None / General Site</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.uuid || p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Log Date *</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Weather Condition *</label>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value as WeatherCondition)}
              >
                <option value="sunny">Sunny / Clear</option>
                <option value="clear">Clear Night</option>
                <option value="partly_cloudy">Partly Cloudy</option>
                <option value="cloudy">Overcast / Cloudy</option>
                <option value="light_rain">Light Drizzle / Rain</option>
                <option value="heavy_rain">Heavy Downpour</option>
                <option value="stormy">Thunderstorm</option>
                <option value="high_winds">High Winds / Dust</option>
              </select>
            </div>

            <div className="form-group">
              <label>Temperature (°C)</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 28.5"
                value={temperatureCelsius}
                onChange={(e) => setTemperatureCelsius(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Designated Site Supervisor</label>
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

          <div className="form-grid-2" style={{ marginTop: '0.5rem', alignItems: 'center' }}>
            <label className="filter-checkbox" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={workDelayedByWeather}
                onChange={(e) => setWorkDelayedByWeather(e.target.checked)}
              />
              Site Work Delayed by Weather?
            </label>

            {workDelayedByWeather && (
              <div className="form-group">
                <label>Total Hours Lost / Stoppage (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={delayHours}
                  onChange={(e) => setDelayHours(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Labor & Progress */}
        <div className="form-card">
          <div className="form-section-title">Daily Labor & Work Activities</div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Direct Labor Headcount *</label>
              <input
                type="number"
                min="0"
                required
                value={laborHeadcount}
                onChange={(e) => setLaborHeadcount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Subcontractor Headcount</label>
              <input
                type="number"
                min="0"
                value={subcontractorHeadcount}
                onChange={(e) => setSubcontractorHeadcount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Total Site Workforce</label>
              <div
                style={{
                  padding: '0.55rem 0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  color: '#0284c7',
                }}
              >
                {(Number(laborHeadcount) || 0) + (Number(subcontractorHeadcount) || 0)} Total
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>Work Performed Summary *</label>
            <textarea
              rows={4}
              required
              placeholder="Detail construction activities completed today by trade (masonry, steel bending, concrete pouring, electrical piping, plumbing rough-in, etc.)..."
              value={workPerformedSummary}
              onChange={(e) => setWorkPerformedSummary(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>Delays, Obstacles or Pending Approvals</label>
            <textarea
              rows={2}
              placeholder="Note any engineering clarification RFIs, supply delays, or site impediments..."
              value={delaysOrImpediments}
              onChange={(e) => setDelaysOrImpediments(e.target.value)}
            />
          </div>
        </div>

        {/* Section 3: Logistics & Notes */}
        <div className="form-card">
          <div className="form-section-title">Site Logistics, Deliveries & Visitors</div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Materials Received on Site</label>
              <textarea
                rows={2}
                placeholder="e.g. 500 bags Tororo Cement, 2 trucks river sand delivered"
                value={materialsReceivedNotes}
                onChange={(e) => setMaterialsReceivedNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Equipment & Machinery Operating on Site</label>
              <textarea
                rows={2}
                placeholder="e.g. CAT Excavator 320 operating 7 hours, 2 concrete mixers active"
                value={equipmentOnSiteNotes}
                onChange={(e) => setEquipmentOnSiteNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Visitors & Inspector Log</label>
              <input
                type="text"
                placeholder="e.g. Municipal building inspector, client representative visit"
                value={visitorsLog}
                onChange={(e) => setVisitorsLog(e.target.value)}
              />
            </div>

            {isEdit && (
              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as DailyLogStatus)}>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>Additional Notes / Remarks</label>
            <textarea
              rows={2}
              placeholder="General remarks or instructions for the next work shift..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions-bar">
          <Link to="/daily-logs" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Daily Log' : 'Save & Submit Log'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DailyLogForm
