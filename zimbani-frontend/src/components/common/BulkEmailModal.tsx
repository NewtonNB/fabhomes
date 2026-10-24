import React, { useState } from 'react'
import { MdEmail, MdClose, MdSend, MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md'
import notificationService from '../../services/notification.service'

interface BulkEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (msg: string) => void
  defaultPhase?: string
  initialRecipients?: string[]
}

const SCHEMES_BY_PHASE: Record<string, string[]> = {
  'Phase 1': ['Mukono Greenfield Heights', 'Ntaawo Phase 1', 'Seeta Ridge'],
  'Phase 2': ['Royal Palms Kajjansi', 'Wakiso Sunset', 'Ssisa Hill View'],
  'Phase 3': ['Nile Vista Estate Jinja', 'Budondo Acres', 'Wakitaka Plains'],
  'Phase 4': ['Busega Commercial Plots', 'Bulenga Heights', 'Mityana Road Green'],
  'Phase 5': ['Entebbe Lakeside Phase 5', 'Abayita Ababiri Gardens', 'Katabi Oasis'],
  'Phase 6': ['Gayaza Central Estate', 'Kasangati Heights', 'Kira Smart City'],
  'Phase 7': ['Lugazi Sugar Valley', 'Namawojjolo Highway Plots'],
  'Jinja': ['Nile Vista Estate Jinja', 'Wakitaka Industrial Park', 'Jinja City Parcels'],
}

export const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultPhase = 'Phase 1',
}) => {
  const [phase, setPhase] = useState<string>(defaultPhase)
  const [targetType, setTargetType] = useState<'selected_schemes' | 'all_clients'>('selected_schemes')
  const [availableSchemes, setAvailableSchemes] = useState<string[]>(SCHEMES_BY_PHASE[defaultPhase] || [])
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePhaseChange = (newPhase: string) => {
    setPhase(newPhase)
    const schemes = SCHEMES_BY_PHASE[newPhase] || ['General Estate Plots']
    setAvailableSchemes(schemes)
    setSelectedSchemes([])
  }

  const handleToggleScheme = (schemeName: string) => {
    setSelectedSchemes(prev =>
      prev.includes(schemeName) ? prev.filter(s => s !== schemeName) : [...prev, schemeName]
    )
  }

  const handleSelectAllSchemes = () => {
    if (selectedSchemes.length === availableSchemes.length) {
      setSelectedSchemes([])
    } else {
      setSelectedSchemes([...availableSchemes])
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both subject and message content.')
      return
    }

    if (targetType === 'selected_schemes' && selectedSchemes.length === 0) {
      setError('Please select at least one scheme or choose "All Clients".')
      return
    }

    try {
      setSending(true)
      setError(null)

      await notificationService.sendCampaign({
        title: subject || `Bulk Email - ${targetType === 'all_clients' ? 'All Clients' : phase}`,
        message: message,
        target_segment: targetType === 'all_clients' ? 'all' : `phase_${phase.toLowerCase().replace(/\s+/g, '_')}`,
        channels: ['email'],
      })

      if (onSuccess) {
        onSuccess(`Bulk email successfully queued for ${targetType === 'all_clients' ? 'all registered clients' : `${selectedSchemes.length} schemes in ${phase}`}.`)
      }
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to send bulk email.')
    } finally {
      setSending(false)
    }
  }

  return (
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
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#0d9488',
          color: '#ffffff',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}><MdEmail /></span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Bulk Email Send</h2>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                Send targeted announcements to clients by phase or schemes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer' }}
          >
            <MdClose />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Phase & Target */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Select Phase
              </label>
              <select
                value={phase}
                onChange={(e) => handlePhaseChange(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
              >
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Phase 3">Phase 3</option>
                <option value="Phase 4">Phase 4</option>
                <option value="Phase 5">Phase 5</option>
                <option value="Phase 6">Phase 6</option>
                <option value="Phase 7">Phase 7</option>
                <option value="Jinja">Jinja</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Target Recipients
              </label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'selected_schemes'}
                    onChange={() => setTargetType('selected_schemes')}
                  />
                  Selected Schemes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'all_clients'}
                    onChange={() => setTargetType('all_clients')}
                  />
                  All Clients
                </label>
              </div>
            </div>
          </div>

          {/* Schemes Multi-Select Checklist */}
          {targetType === 'selected_schemes' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Schemes in {phase} ({availableSchemes.length})
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllSchemes}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {selectedSchemes.length === availableSchemes.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                {availableSchemes.map((scheme) => {
                  const isChecked = selectedSchemes.includes(scheme)
                  return (
                    <button
                      key={scheme}
                      type="button"
                      onClick={() => handleToggleScheme(scheme)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: isChecked ? '1px solid #0d9488' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#ccfbf1' : '#ffffff',
                        color: isChecked ? '#0f766e' : '#334155',
                        fontSize: '12px',
                        fontWeight: isChecked ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isChecked ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
                      {scheme}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important Update: Title Processing Progress for Mukono Greenfield"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              required
            />
          </div>

          {/* Message Content */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                Message Body
              </label>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {message.length} characters
              </span>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Dear Client, We are pleased to notify you..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' }}
              required
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontWeight: '600',
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MdSend /> {sending ? 'Broadcasting...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BulkEmailModal
