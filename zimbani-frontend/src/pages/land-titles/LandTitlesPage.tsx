import React, { useState, useEffect } from 'react'
import {
  MdLandscape,
  MdVerified,
  MdMap,
  MdAdd,
  MdRefresh,
  MdCheckCircle,
  MdFactCheck,
  MdHome,
  MdClose
} from 'react-icons/md'
import motherTitleService, { MotherTitle } from '../../services/mother-title.service'
import { ClientLandTitleDeedsTab } from '../client-portal/components/ClientLandTitleDeedsTab'
import unitService from '../../services/unit.service'
import clientService from '../../services/client.service'
import { Unit } from '../../types/unit.types'
import { Client } from '../../types/client.types'
import { useNavigate } from 'react-router-dom'

export const LandTitlesPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'mother_title' | 'fab_titles' | 'plot_selection' | 'client_titles' | 'selection_status'>('mother_title')
  const [motherTitles, setMotherTitles] = useState<MotherTitle[]>([])
  const [, setSubdivisions] = useState<any[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true); void loading;
  const [selectedMotherTitle, setSelectedMotherTitle] = useState<MotherTitle | null>(null)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [phaseFilter, setPhaseFilter] = useState('')
  const [schemeFilter, setSchemeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [isAddMotherOpen, setIsAddMotherOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isPlotSelectModalOpen, setIsPlotSelectModalOpen] = useState(false)
  const [selectedPlotForAllocation, setSelectedPlotForAllocation] = useState<Unit | null>(null)
  const [allocatingClientId, setAllocatingClientId] = useState<string>('')

  // Form State: Mother Title
  const [motherForm, setMotherForm] = useState({
    phase: 'Phase 1',
    scheme: 'Mukono',
    title_no: '',
    block_no: '',
    district: 'Mukono',
    sub_county: 'Goma',
    village: '',
    estate_name: '',
    area_acres: 20,
    subdivision_date: '',
    title_status: 'in_safe' as const,
    verified_by: 'Eng. Patrick Musisi',
    notes: '',
  })

  // Form State: Transfer
  const [transferForm, setTransferForm] = useState({
    date_taken: new Date().toISOString().split('T')[0],
    date_of_return: '',
    verified_by: '',
    purpose: 'Ministry Zonal Office Mutation & Cadastral Opening',
    remarks: '',
  })

  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchMotherTitles = async () => {
    try {
      setLoading(true)
      const res = await motherTitleService.getMotherTitles({
        phase: phaseFilter || undefined,
        scheme: schemeFilter || undefined,
        title_status: statusFilter || undefined,
        search: searchTerm || undefined,
      })
      const list = res.data || []
      setMotherTitles(list)
      if (list.length > 0 && !selectedMotherTitle) {
        setSelectedMotherTitle(list[0])
      }

      // Also fetch subdivisions
      const subRes = await motherTitleService.getSubdivisions({ per_page: 50 })
      setSubdivisions(subRes.data || [])
    } catch (err: any) {
      showNotice(err.message || 'Failed to load mother titles', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnitsAndClients = async () => {
    try {
      const [uRes, cRes] = await Promise.allSettled([
        unitService.getUnits({ per_page: 100 }),
        clientService.getClients({ per_page: 100 }),
      ])
      if (uRes.status === 'fulfilled') setUnits(uRes.value.data || [])
      if (cRes.status === 'fulfilled') setClients(cRes.value.data || [])
    } catch (err) {
      console.warn('Could not load units or clients', err)
    }
  }

  useEffect(() => {
    fetchMotherTitles()
    fetchUnitsAndClients()
  }, [phaseFilter, schemeFilter, statusFilter])

  const handleCreateMotherTitle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await motherTitleService.createMotherTitle(motherForm)
      showNotice('Mother title deed registered successfully.')
      setIsAddMotherOpen(false)
      fetchMotherTitles()
    } catch (err: any) {
      showNotice(err.response?.data?.message || err.message || 'Failed to register mother title', 'error')
    }
  }

  const handleRecordTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMotherTitle) return
    try {
      await motherTitleService.recordTransfer(selectedMotherTitle.id, transferForm)
      showNotice(`Mother title ${selectedMotherTitle.title_no} recorded as out with surveyor/ministry.`)
      setIsTransferOpen(false)
      fetchMotherTitles()
    } catch (err: any) {
      showNotice(err.response?.data?.message || err.message || 'Failed to record transfer', 'error')
    }
  }

  const handleReturnTransfer = async (transferId: number) => {
    try {
      await motherTitleService.returnTransfer(transferId)
      showNotice('Mother title returned and safely checked back into vault.')
      fetchMotherTitles()
    } catch (err: any) {
      showNotice(err.message || 'Failed to return title', 'error')
    }
  }

  const handleAllocatePlot = async () => {
    if (!selectedPlotForAllocation || !allocatingClientId) {
      showNotice('Please select both a plot and a client', 'error')
      return
    }

    try {
      await unitService.reserveUnit(selectedPlotForAllocation.uuid, {
        client_id: String(allocatingClientId),
        reservation_notes: 'Allocated via Titles Management Plot Selection Desk',
      })
      showNotice(`Plot ${selectedPlotForAllocation.unit_number} allocated to client successfully.`)
      setIsPlotSelectModalOpen(false)
      fetchUnitsAndClients()
    } catch (err: any) {
      showNotice(err.response?.data?.message || err.message || 'Allocation failed', 'error')
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px', color: '#0d9488' }}><MdVerified /></span>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Titles Management & Cadastral Operations
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Surveyor Department: Mother titles registry, cadastral mutation, plot selection, and client deed conveyance
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsAddMotherOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdAdd /> + Add Mother Title
          </button>
          <button
            onClick={() => navigate('/estate-map')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdMap /> View Estate Map
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: '14px',
          fontWeight: '500',
        }}>
          {notification.msg}
        </div>
      )}

      {/* 5 Tab Navigation (Page 4 Reference) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px 12px 0 0',
        border: '1px solid #e2e8f0',
        borderBottom: 'none',
        display: 'flex',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('mother_title')}
          style={{
            padding: '16px 20px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'mother_title' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'mother_title' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <MdVerified /> Mother Title Management
        </button>

        <button
          onClick={() => setActiveTab('fab_titles')}
          style={{
            padding: '16px 20px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'fab_titles' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'fab_titles' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <MdHome /> My Fab Title Management
        </button>

        <button
          onClick={() => setActiveTab('plot_selection')}
          style={{
            padding: '16px 20px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'plot_selection' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'plot_selection' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <MdLandscape /> Plot Selection
        </button>

        <button
          onClick={() => setActiveTab('client_titles')}
          style={{
            padding: '16px 20px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'client_titles' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'client_titles' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <MdFactCheck /> Client Title Management
        </button>

        <button
          onClick={() => setActiveTab('selection_status')}
          style={{
            padding: '16px 20px',
            border: 'none',
            background: 'none',
            fontWeight: '700',
            fontSize: '14px',
            color: activeTab === 'selection_status' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'selection_status' ? '3px solid #0d9488' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <MdCheckCircle /> Selection Status (Cadastral Pipeline)
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0 0 12px 12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Tab 1: Mother Title Management */}
        {activeTab === 'mother_title' && (
          <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search title no, estate, district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMotherTitles()}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '240px' }}
              />

              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="">All Phases</option>
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Phase 3">Phase 3</option>
                <option value="Phase 4">Phase 4</option>
                <option value="Jinja">Jinja</option>
              </select>

              <select
                value={schemeFilter}
                onChange={(e) => setSchemeFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="">All Schemes</option>
                <option value="Mukono">Mukono</option>
                <option value="Wakiso">Wakiso</option>
                <option value="Jinja">Jinja</option>
                <option value="Busega">Busega</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
              >
                <option value="">All Custody Statuses</option>
                <option value="in_safe">In Vault Safe</option>
                <option value="with_surveyor">With Surveyor</option>
                <option value="at_ministry">At Ministry Zonal Office</option>
                <option value="subdivided">Subdivided</option>
              </select>

              <button
                onClick={fetchMotherTitles}
                style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
              >
                <MdRefresh /> Refresh
              </button>
            </div>

            {/* Mother Titles Master Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginBottom: '24px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '12px 14px' }}>Record No</th>
                  <th style={{ padding: '12px 14px' }}>Title No / Block</th>
                  <th style={{ padding: '12px 14px' }}>Phase & Scheme</th>
                  <th style={{ padding: '12px 14px' }}>Estate Name</th>
                  <th style={{ padding: '12px 14px' }}>District / Village</th>
                  <th style={{ padding: '12px 14px' }}>Area (Acres)</th>
                  <th style={{ padding: '12px 14px' }}>Subdivision Date</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {motherTitles.map((t) => {
                  const isSelected = selectedMotherTitle?.id === t.id
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedMotherTitle(t)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0d9488' }}>{t.record_no}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                        {t.title_no}
                        {t.block_no && <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Block {t.block_no}</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}>
                        {t.phase} • <span style={{ fontWeight: '600' }}>{t.scheme}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '500' }}>{t.estate_name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{t.district} {t.village ? `(${t.village})` : ''}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700' }}>{t.area_acres}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {t.subdivision_date ? new Date(t.subdivision_date).toLocaleDateString() : 'Pending'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          backgroundColor: t.title_status === 'in_safe' ? '#dcfce7' : t.title_status === 'with_surveyor' ? '#fef3c7' : '#e0e7ff',
                          color: t.title_status === 'in_safe' ? '#15803d' : t.title_status === 'with_surveyor' ? '#b45309' : '#4338ca',
                        }}>
                          {t.title_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMotherTitle(t)
                            setTransferForm({ ...transferForm, verified_by: t.verified_by || 'Eng. Patrick Musisi' })
                            setIsTransferOpen(true)
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Transfer / Out
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mother Title Details & Transfer Sub-Table (Page 4 Reference Layout) */}
            {selectedMotherTitle && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px',
              }}>
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    Mother Title Specifications ({selectedMotherTitle.record_no})
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div><span style={{ color: '#64748b' }}>Estate:</span> <strong>{selectedMotherTitle.estate_name}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Title No:</span> <strong>{selectedMotherTitle.title_no}</strong></div>
                    <div><span style={{ color: '#64748b' }}>District:</span> {selectedMotherTitle.district}</div>
                    <div><span style={{ color: '#64748b' }}>SubCounty:</span> {selectedMotherTitle.sub_county || 'Central'}</div>
                    <div><span style={{ color: '#64748b' }}>Verified By:</span> {selectedMotherTitle.verified_by || 'Cadastral Surveyor'}</div>
                    <div><span style={{ color: '#64748b' }}>Total Acres:</span> <strong>{selectedMotherTitle.area_acres} Acres</strong></div>
                  </div>
                  {selectedMotherTitle.notes && (
                    <p style={{ marginTop: '10px', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                      Notes: {selectedMotherTitle.notes}
                    </p>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                      Mother Title Transfer History (Movement Track)
                    </h3>
                    <button
                      onClick={() => setIsTransferOpen(true)}
                      style={{ padding: '4px 10px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      + Record Movement
                    </button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                        <th style={{ padding: '6px' }}>Date Taken</th>
                        <th style={{ padding: '6px' }}>Date Return</th>
                        <th style={{ padding: '6px' }}>Verified By</th>
                        <th style={{ padding: '6px' }}>Purpose</th>
                        <th style={{ padding: '6px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedMotherTitle.transfers || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                            Title is in safe vault; no active loan transfers.
                          </td>
                        </tr>
                      ) : (
                        (selectedMotherTitle.transfers || []).map(tr => (
                          <tr key={tr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px' }}>{new Date(tr.date_taken).toLocaleDateString()}</td>
                            <td style={{ padding: '6px' }}>{tr.date_of_return ? new Date(tr.date_of_return).toLocaleDateString() : 'Open'}</td>
                            <td style={{ padding: '6px', fontWeight: '600' }}>{tr.verified_by}</td>
                            <td style={{ padding: '6px' }}>{tr.purpose}</td>
                            <td style={{ padding: '6px' }}>
                              {tr.status === 'out_on_loan' ? (
                                <button
                                  onClick={() => handleReturnTransfer(tr.id)}
                                  style={{ padding: '2px 6px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                                >
                                  Return to Safe
                                </button>
                              ) : (
                                <span style={{ color: '#16a34a', fontWeight: '700' }}>RETURNED</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Fab Title Management */}
        {activeTab === 'fab_titles' && (
          <div>
            <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
              Corporate company-owned titles, freehold and mailo parcels in Fab Homes Uganda custody.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {motherTitles.map((t, idx) => (
                <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0d9488' }}>CORP-DEED-{idx + 1}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d' }}>
                      IN CUSTODY
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{t.estate_name}</h4>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                    Title: <strong>{t.title_no}</strong> • District: <strong>{t.district}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span>Registered Acreage: <strong>{t.area_acres} Acres</strong></span>
                    <span>Phase: <strong>{t.phase}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Plot Selection */}
        {activeTab === 'plot_selection' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ color: '#64748b', fontSize: '13px' }}>
                Select estate plots from surveyed subdivisions to assign or reserve for clients.
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0d9488' }}>
                Available Inventory: {units.filter(u => u.status === 'available').length} plots
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px' }}>Plot Number</th>
                  <th style={{ padding: '12px' }}>Estate / Site</th>
                  <th style={{ padding: '12px' }}>Dimensions / Size</th>
                  <th style={{ padding: '12px' }}>Price (UGX)</th>
                  <th style={{ padding: '12px' }}>Current Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Selection Action</th>
                </tr>
              </thead>
              <tbody>
                {units.slice(0, 20).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0d9488' }}>{u.unit_number}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{u.site?.name || 'Mukono Greenfield'}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{(u as any).size || (u.area ? `${u.area} ${u.area_unit || 'sqm'}` : '50 x 100 ft (0.12 Dec)')}</td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>
                      {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(Number((u as any).price || u.current_price || u.base_price) || 25000000)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: u.status === 'available' ? '#dcfce7' : u.status === 'reserved' ? '#fef3c7' : '#e0e7ff',
                        color: u.status === 'available' ? '#15803d' : u.status === 'reserved' ? '#b45309' : '#4338ca',
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {u.status === 'available' ? (
                        <button
                          onClick={() => {
                            setSelectedPlotForAllocation(u)
                            setAllocatingClientId(clients[0]?.id?.toString() || '')
                            setIsPlotSelectModalOpen(true)
                          }}
                          style={{ padding: '4px 10px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Select & Allocate
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Allocated ({u.client?.name || 'Reserved'})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Client Title Management */}
        {activeTab === 'client_titles' && (
          <div>
            <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
              Full deeds registry for all clients holding plot contracts with registered land conveyance stages.
            </div>
            <ClientLandTitleDeedsTab
              onNotify={showNotice}
              onExplorePlots={() => setActiveTab('plot_selection')}
            />
          </div>
        )}

        {/* Tab 5: Selection Status (Cadastral Conveyance Pipeline) */}
        {activeTab === 'selection_status' && (
          <div>
            <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
              Ministry of Lands, Housing & Urban Development (MLHUD) Cadastral Status Pipeline for client plots.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { stage: '1. Boundary Opening', desc: 'Cadastral beacons pinned & surveyed', count: '18 Plots' },
                { stage: '2. Ministry Mutation', desc: 'Mother title subdivision file at MZO', count: '12 Plots' },
                { stage: '3. Deed Plan Approval', desc: 'Cartographic job cards & prints approved', count: '9 Plots' },
                { stage: '4. Title Registration', desc: 'White page & folio assigned by registrar', count: '15 Plots' },
                { stage: '5. Handover to Client', desc: 'Original certificate of title delivered', count: '24 Plots' },
              ].map((s, idx) => (
                <div key={idx} style={{ padding: '16px', borderRadius: '10px', border: '1px solid #ccfbf1', backgroundColor: '#f0fdfa' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f766e' }}>{s.stage}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{s.desc}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0d9488', marginTop: '8px' }}>{s.count}</div>
                </div>
              ))}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px' }}>Plot Ref</th>
                  <th style={{ padding: '12px' }}>Client</th>
                  <th style={{ padding: '12px' }}>Estate / Scheme</th>
                  <th style={{ padding: '12px' }}>Current Ministry Stage</th>
                  <th style={{ padding: '12px' }}>Progress %</th>
                  <th style={{ padding: '12px' }}>Estimated Handover</th>
                </tr>
              </thead>
              <tbody>
                {units.filter(u => u.status !== 'available').map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0f766e' }}>{u.unit_number}</td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{u.client?.name || 'Client Holder'}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{u.site?.name || 'Mukono Heights'}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#0284c7' }}>Deed Plan Approved</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '75%', backgroundColor: '#0d9488', height: '100%' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>75%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>15 Dec 2026</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Mother Title Modal */}
      {isAddMotherOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '640px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#0d9488', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Register Mother Title Deed</h3>
              <button onClick={() => setIsAddMotherOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer' }}><MdClose /></button>
            </div>
            <form onSubmit={handleCreateMotherTitle} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Phase</label>
                  <select
                    value={motherForm.phase}
                    onChange={(e) => setMotherForm({ ...motherForm, phase: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                    <option value="Jinja">Jinja</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Scheme</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mukono"
                    value={motherForm.scheme}
                    onChange={(e) => setMotherForm({ ...motherForm, scheme: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Title No</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kyaggwe Block 180 Plot 45"
                    value={motherForm.title_no}
                    onChange={(e) => setMotherForm({ ...motherForm, title_no: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Block No</label>
                  <input
                    type="text"
                    placeholder="e.g. 180"
                    value={motherForm.block_no}
                    onChange={(e) => setMotherForm({ ...motherForm, block_no: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Estate Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mukono Greenfield Heights"
                    value={motherForm.estate_name}
                    onChange={(e) => setMotherForm({ ...motherForm, estate_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>District</label>
                  <input
                    type="text"
                    required
                    value={motherForm.district}
                    onChange={(e) => setMotherForm({ ...motherForm, district: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Area in Acres</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={motherForm.area_acres}
                    onChange={(e) => setMotherForm({ ...motherForm, area_acres: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Verified By</label>
                  <input
                    type="text"
                    value={motherForm.verified_by}
                    onChange={(e) => setMotherForm({ ...motherForm, verified_by: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Notes</label>
                <textarea
                  rows={2}
                  value={motherForm.notes}
                  onChange={(e) => setMotherForm({ ...motherForm, notes: e.target.value })}
                  placeholder="Subdivision notes, deed particulars..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddMotherOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#0d9488', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Save Mother Title</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Transfer Modal */}
      {isTransferOpen && selectedMotherTitle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#0d9488', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Record Title Transfer ({selectedMotherTitle.record_no})</h3>
              <button onClick={() => setIsTransferOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}><MdClose /></button>
            </div>
            <form onSubmit={handleRecordTransfer} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Date Taken</label>
                <input
                  type="date"
                  required
                  value={transferForm.date_taken}
                  onChange={(e) => setTransferForm({ ...transferForm, date_taken: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Expected Date of Return</label>
                <input
                  type="date"
                  value={transferForm.date_of_return}
                  onChange={(e) => setTransferForm({ ...transferForm, date_of_return: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Verified By (Receiving Officer)</label>
                <input
                  type="text"
                  required
                  value={transferForm.verified_by}
                  onChange={(e) => setTransferForm({ ...transferForm, verified_by: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Purpose of Transfer</label>
                <input
                  type="text"
                  required
                  value={transferForm.purpose}
                  onChange={(e) => setTransferForm({ ...transferForm, purpose: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsTransferOpen(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0d9488', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Record Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plot Allocation Modal */}
      {isPlotSelectModalOpen && selectedPlotForAllocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#0d9488', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Allocate Plot {selectedPlotForAllocation.unit_number}</h3>
              <button onClick={() => setIsPlotSelectModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}><MdClose /></button>
            </div>
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Assigning <strong>Plot {selectedPlotForAllocation.unit_number}</strong> ({(selectedPlotForAllocation as any).size || (selectedPlotForAllocation.area ? `${selectedPlotForAllocation.area} ${selectedPlotForAllocation.area_unit || 'sqm'}` : '50x100ft')}) in <strong>{selectedPlotForAllocation.site?.name || 'Estate'}</strong> to client:
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Select Client</label>
                <select
                  value={allocatingClientId}
                  onChange={(e) => setAllocatingClientId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name || `${c.first_name} ${c.last_name}`} ({c.client_number || `CL-${c.id}`})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsPlotSelectModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleAllocatePlot} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0d9488', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Confirm Allocation</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandTitlesPage
