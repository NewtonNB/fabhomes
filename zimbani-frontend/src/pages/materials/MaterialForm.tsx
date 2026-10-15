import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdSave,
  MdInventory2,
  MdStore,
  MdLocalShipping,
  MdClose,
} from 'react-icons/md'
import {
  MaterialCategory,
  CreateMaterialInput,
} from '../../types/material.types'
import { Site } from '../../types/site.types'
import materialService from '../../services/material.service'
import { siteService } from '../../services/site.service'
import './MaterialForm.css'

export const MaterialForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Sites lookup
  const [sites, setSites] = useState<Site[]>([])

  // Form Fields
  const [name, setName] = useState<string>('')
  const [category, setCategory] = useState<MaterialCategory>('cement')
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('bags')
  const [unitCost, setUnitCost] = useState<number | string>('')
  const [currency, setCurrency] = useState<string>('UGX')
  const [siteId, setSiteId] = useState<string>('')
  const [currentStock, setCurrentStock] = useState<number | string>('')
  const [minimumStockLevel, setMinimumStockLevel] = useState<number | string>(10)
  const [reorderQuantity, setReorderQuantity] = useState<number | string>(20)
  const [storageLocation, setStorageLocation] = useState<string>('')
  const [supplierName, setSupplierName] = useState<string>('')
  const [supplierContact, setSupplierContact] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // Load sites
  useEffect(() => {
    siteService
      .getSites({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setSites(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load sites:', e))
  }, [])

  // If edit mode, load existing material
  useEffect(() => {
    if (isEdit && id) {
      setInitialLoading(true)
      materialService
        .getMaterial(id)
        .then((mat) => {
          setName(mat.name)
          setCategory(mat.category)
          setUnitOfMeasure(mat.unit_of_measure)
          setUnitCost(mat.unit_cost)
          setCurrency(mat.currency || 'UGX')
          setSiteId(mat.site?.id ? String(mat.site.id) : '')
          setCurrentStock(mat.current_stock)
          setMinimumStockLevel(mat.minimum_stock_level)
          setReorderQuantity(mat.reorder_quantity)
          setStorageLocation(mat.storage_location || '')
          setSupplierName(mat.supplier_name || '')
          setSupplierContact(mat.supplier_contact || '')
          setDescription(mat.description || '')
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'Failed to load material details')
        })
        .finally(() => setInitialLoading(false))
    }
  }, [isEdit, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Material name is required.')
      return
    }

    if (!siteId) {
      setError('Please select a site.')
      return
    }

    if (!unitCost || Number(unitCost) < 0) {
      setError('Please provide a valid unit cost.')
      return
    }

    try {
      setLoading(true)

      const payload: CreateMaterialInput = {
        name: name.trim(),
        category,
        unit_of_measure: unitOfMeasure.trim(),
        unit_cost: Number(unitCost),
        currency,
        site_id: siteId,
        current_stock: currentStock !== '' ? Number(currentStock) : 0,
        minimum_stock_level: minimumStockLevel !== '' ? Number(minimumStockLevel) : 0,
        reorder_quantity: reorderQuantity !== '' ? Number(reorderQuantity) : 0,
        storage_location: storageLocation.trim() || undefined,
        supplier_name: supplierName.trim() || undefined,
        supplier_contact: supplierContact.trim() || undefined,
        description: description.trim() || undefined,
      }

      if (isEdit && id) {
        await materialService.updateMaterial(id, payload)
      } else {
        await materialService.createMaterial(payload)
      }

      navigate('/materials')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save material')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="material-form-container">
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading material details...
        </div>
      </div>
    )
  }

  return (
    <div className="material-form-container">
      {/* Header */}
      <div className="material-form-header">
        <div className="material-form-header-title">
          <h1>
            <MdInventory2 style={{ color: '#2563eb' }} />
            {isEdit ? 'Edit Material' : 'Add New Material'}
          </h1>
          <p>{isEdit ? 'Update stock parameters and pricing' : 'Register a material into site inventory'}</p>
        </div>
        <Link to="/materials" className="btn btn-secondary">
          <MdArrowBack /> Back to Materials
        </Link>
      </div>

      {/* Error alert */}
      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button className="btn-icon" onClick={() => setError(null)}>
            <MdClose />
          </button>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="material-form-card">
        {/* Section 1: Basic Information */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdInventory2 /> Basic Material Information
          </h2>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Material Name *</label>
              <input
                type="text"
                placeholder="e.g. Tororo Portland Pozzolana Cement 50kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                required
              >
                <option value="cement">Cement</option>
                <option value="steel">Steel</option>
                <option value="aggregates">Aggregates (Sand / Stone)</option>
                <option value="timber">Timber</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="finishing">Finishing (Tiles / Gypsum)</option>
                <option value="masonry">Masonry (Blocks / Bricks)</option>
                <option value="tools">Tools & Equipment</option>
                <option value="paint">Paint & Coatings</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Unit of Measure *</label>
              <input
                type="text"
                placeholder="e.g. bags, kg, pieces, tonnes, liters"
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Unit Cost *</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="UGX">UGX (Ugandan Shilling)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Site Location & Inventory Quantities */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdStore /> Site & Inventory Stock Control
          </h2>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Destination Site *</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
              >
                <option value="">Select Site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Storage Location on Site</label>
              <input
                type="text"
                placeholder="e.g. Warehouse A - Bay 3, Container 2"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label>Initial Current Stock</label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="0"
              />
              <span className="form-help">Available on site right now</span>
            </div>

            <div className="form-group">
              <label>Minimum Stock Level</label>
              <input
                type="number"
                min="0"
                step="any"
                value={minimumStockLevel}
                onChange={(e) => setMinimumStockLevel(e.target.value)}
                placeholder="10"
              />
              <span className="form-help">Triggers low stock alert when reached</span>
            </div>

            <div className="form-group">
              <label>Reorder Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(e.target.value)}
                placeholder="20"
              />
              <span className="form-help">Standard batch replenishment size</span>
            </div>
          </div>
        </div>

        {/* Section 3: Supplier Details */}
        <div className="form-section">
          <h2 className="form-section-title">
            <MdLocalShipping /> Supplier & Vendor Information
          </h2>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Supplier / Vendor Name</label>
              <input
                type="text"
                placeholder="e.g. Tororo Cement Limited, Roofings Ltd"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Supplier Contact Info</label>
              <input
                type="text"
                placeholder="Phone or email e.g. +256 700 000000"
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description / Technical Specifications</label>
            <textarea
              rows={3}
              placeholder="Enter quality grade, standard compliance (UNBS/ISO), or application notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <Link to="/materials" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Material' : 'Create Material'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MaterialForm
