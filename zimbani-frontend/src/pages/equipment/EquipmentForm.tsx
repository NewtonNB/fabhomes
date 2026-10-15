import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdSave,
  MdPrecisionManufacturing,
  MdConstruction,
  MdAttachMoney,
  MdBuild,
} from 'react-icons/md'
import {
  EquipmentType,
  EquipmentStatus,
  EquipmentCondition,
  EquipmentOwnership,
  CreateEquipmentInput,
} from '../../types/equipment.types'
import { Site } from '../../types/site.types'
import { AdminUser } from '../../types/admin.types'
import equipmentService from '../../services/equipment.service'
import { siteService } from '../../services/site.service'
import { adminService } from '../../services/admin.service'
import './EquipmentForm.css'

export const EquipmentForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Form Fields
  const [name, setName] = useState<string>('')
  const [type, setType] = useState<EquipmentType>('earthmoving')
  const [modelNumber, setModelNumber] = useState<string>('')
  const [serialNumber, setSerialNumber] = useState<string>('')
  const [registrationNumber, setRegistrationNumber] = useState<string>('')
  const [ownershipType, setOwnershipType] = useState<EquipmentOwnership>('owned')

  // Financials
  const [hourlyRate, setHourlyRate] = useState<number | string>('')
  const [dailyRate, setDailyRate] = useState<number | string>('')
  const [currency, setCurrency] = useState<string>('UGX')
  const [purchasePrice, setPurchasePrice] = useState<number | string>('')
  const [purchaseDate, setPurchaseDate] = useState<string>('')
  const [supplierOrVendor, setSupplierOrVendor] = useState<string>('')

  // Allocation & Status
  const [currentSiteId, setCurrentSiteId] = useState<string>('')
  const [assignedOperatorId, setAssignedOperatorId] = useState<string>('')
  const [status, setStatus] = useState<EquipmentStatus>('available')
  const [condition, setCondition] = useState<EquipmentCondition>('good')
  const [totalHoursOperated, setTotalHoursOperated] = useState<number | string>(0)

  // Servicing
  const [lastServiceDate, setLastServiceDate] = useState<string>('')
  const [nextServiceDueDate, setNextServiceDueDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Load Sites & Users
  useEffect(() => {
    siteService
      .getSites({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setSites(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load sites:', e))

    adminService
      .getUsers({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setUsers(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load users:', e))
  }, [])

  // If edit mode, load existing equipment
  useEffect(() => {
    if (isEdit && id) {
      setInitialLoading(true)
      equipmentService
        .getEquipmentItem(id)
        .then((eq) => {
          setName(eq.name)
          setType(eq.type)
          setModelNumber(eq.model_number || '')
          setSerialNumber(eq.serial_number || '')
          setRegistrationNumber(eq.registration_number || '')
          setOwnershipType(eq.ownership_type)
          setHourlyRate(eq.hourly_rate ?? '')
          setDailyRate(eq.daily_rate ?? '')
          setCurrency(eq.currency || 'UGX')
          setPurchasePrice(eq.purchase_price ?? '')
          setPurchaseDate(eq.purchase_date || '')
          setSupplierOrVendor(eq.supplier_or_vendor || '')
          setCurrentSiteId(eq.current_site?.id ? String(eq.current_site.id) : '')
          setAssignedOperatorId(eq.assigned_operator?.uuid || (eq.assigned_operator?.id ? String(eq.assigned_operator.id) : ''))
          setStatus(eq.status)
          setCondition(eq.condition)
          setTotalHoursOperated(eq.total_hours_operated ?? 0)
          setLastServiceDate(eq.last_service_date || '')
          setNextServiceDueDate(eq.next_service_due_date || '')
          setNotes(eq.notes || '')
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'Failed to load equipment details')
        })
        .finally(() => setInitialLoading(false))
    }
  }, [isEdit, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Machinery name is required.')
      return
    }

    setLoading(true)
    const payload: CreateEquipmentInput = {
      name: name.trim(),
      type,
      model_number: modelNumber.trim() || null,
      serial_number: serialNumber.trim() || null,
      registration_number: registrationNumber.trim() || null,
      ownership_type: ownershipType,
      hourly_rate: hourlyRate !== '' ? Number(hourlyRate) : null,
      daily_rate: dailyRate !== '' ? Number(dailyRate) : null,
      currency,
      purchase_price: purchasePrice !== '' ? Number(purchasePrice) : null,
      purchase_date: purchaseDate || null,
      supplier_or_vendor: supplierOrVendor.trim() || null,
      current_site_id: currentSiteId ? currentSiteId : null,
      assigned_operator_id: assignedOperatorId ? assignedOperatorId : null,
      status,
      condition,
      total_hours_operated: Number(totalHoursOperated) || 0,
      last_service_date: lastServiceDate || null,
      next_service_due_date: nextServiceDueDate || null,
      notes: notes.trim() || null,
    }

    try {
      if (isEdit && id) {
        await equipmentService.updateEquipment(id, payload)
      } else {
        await equipmentService.createEquipment(payload)
      }
      navigate('/equipment')
    } catch (err: any) {
      const resp = err?.response?.data
      if (resp?.errors) {
        const firstErr = Object.values(resp.errors)[0]
        setError(Array.isArray(firstErr) ? firstErr[0] : String(firstErr))
      } else {
        setError(resp?.message || 'Failed to save equipment record')
      }
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="equipment-form-container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading machinery details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="equipment-form-container">
      {/* Header */}
      <div className="equipment-form-header">
        <div className="equipment-form-header-title">
          <h1>
            <MdPrecisionManufacturing /> {isEdit ? 'Edit Machinery' : 'Register New Machinery'}
          </h1>
          <p>
            {isEdit
              ? 'Update specifications, operating rates, and allocation status'
              : 'Add heavy plant or machinery to the central fleet catalog'}
          </p>
        </div>
        <div>
          <Link to="/equipment" className="btn-secondary">
            <MdArrowBack /> Back to Fleet
          </Link>
        </div>
      </div>

      {/* Alert */}
      {error && (
        <div className="alert-box alert-danger">
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="equipment-form-card">
        {/* Section 1: Identification & Specifications */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdPrecisionManufacturing /> 1. Machinery Identification
          </h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>
                Machine Name / Label <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CAT 320D Hydraulic Excavator"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Machinery Type <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value as EquipmentType)}
                required
              >
                <option value="earthmoving">Earthmoving (Excavators, Bulldozers, Loaders)</option>
                <option value="lifting">Lifting (Cranes, Hoists, Forklifts)</option>
                <option value="concrete">Concrete (Mixers, Pumps, Vibrators)</option>
                <option value="transport">Transport (Dump Trucks, Tippers)</option>
                <option value="compaction">Compaction (Rollers, Compactors)</option>
                <option value="generators">Generators & Power Units</option>
                <option value="power_tools">Power Tools & Handheld Plant</option>
                <option value="other">Other Plant / Machinery</option>
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Model Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CAT 320D"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Serial / Chassis #</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. SN-892348-UG"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Registration / License Plate</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. UBF 120X"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Ownership, Rates & Commercials */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdAttachMoney /> 2. Ownership & Cost Rates
          </h2>
          <div className="form-grid-3">
            <div className="form-group">
              <label>
                Ownership Type <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={ownershipType}
                onChange={(e) => setOwnershipType(e.target.value as EquipmentOwnership)}
                required
              >
                <option value="owned">Company Owned</option>
                <option value="leased">Leased</option>
                <option value="rented">Rented / Hired</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hourly Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                placeholder="e.g. 150000"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Daily Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                placeholder="e.g. 1200000"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Currency</label>
              <select
                className="form-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="UGX">UGX (Ugandan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Purchase / Lease Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                placeholder="e.g. 250000000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Purchase Date</label>
              <input
                type="date"
                className="form-control"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Vendor / Supplier / Rental Company</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Mantrac Uganda Ltd"
              value={supplierOrVendor}
              onChange={(e) => setSupplierOrVendor(e.target.value)}
            />
          </div>
        </div>

        {/* Section 3: Site Allocation & Operational Status */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdConstruction /> 3. Current Location & Operational Status
          </h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Current Assigned Site</label>
              <select
                className="form-control"
                value={currentSiteId}
                onChange={(e) => setCurrentSiteId(e.target.value)}
              >
                <option value="">Central Yard (Unallocated)</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || s.site_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Primary Assigned Operator</label>
              <select
                className="form-control"
                value={assignedOperatorId}
                onChange={(e) => setAssignedOperatorId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.name} ({u.roles?.join(', ') || u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Operational Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
            </div>

            <div className="form-group">
              <label>Physical Condition</label>
              <select
                className="form-control"
                value={condition}
                onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>

            <div className="form-group">
              <label>Lifetime Operating Hours</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-control"
                placeholder="0"
                value={totalHoursOperated}
                onChange={(e) => setTotalHoursOperated(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Maintenance Schedule & Remarks */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdBuild /> 4. Servicing & Notes
          </h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Last Serviced Date</label>
              <input
                type="date"
                className="form-control"
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Next Service Due Date</label>
              <input
                type="date"
                className="form-control"
                value={nextServiceDueDate}
                onChange={(e) => setNextServiceDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>General Notes / Maintenance Instructions</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Fuel type, special operating precautions, warranty terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Link to="/equipment" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Machinery' : 'Register Machinery'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EquipmentForm
