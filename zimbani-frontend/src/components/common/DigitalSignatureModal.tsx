import React, { useRef, useState, useEffect } from 'react'
import { MdEdit, MdClose, MdSave, MdRefresh, MdCloudUpload } from 'react-icons/md'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'

interface DigitalSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (signatureDataUrl: string) => void
  existingSignature?: string
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingSignature,
}) => {
  const { user, refreshUser } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(existingSignature || (user as any)?.signature_data || null)
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    if (isOpen && mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'))
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignatureData(null)
    setHasDrawn(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setSignatureData(dataUrl)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!signatureData) {
      setError('Please draw or upload a signature before saving.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Save to user profile via backend API
      await api.put('/user/profile', {
        signature_data: signatureData,
      })

      if (refreshUser) {
        await refreshUser()
      }

      if (onSuccess) {
        onSuccess(signatureData)
      }

      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save digital signature.')
    } finally {
      setSaving(false)
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
        maxWidth: '560px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#0f766e',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}><MdEdit /></span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Digital Signatures Pad</h2>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                Capture your signature to sign official certificates, statements & deeds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '22px', cursor: 'pointer' }}
          >
            <MdClose />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {/* Mode Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <button
              onClick={() => setMode('draw')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: 'none',
                fontWeight: '600',
                color: mode === 'draw' ? '#0f766e' : '#64748b',
                borderBottom: mode === 'draw' ? '2px solid #0f766e' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <MdEdit /> Draw Signature
            </button>
            <button
              onClick={() => setMode('upload')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: 'none',
                fontWeight: '600',
                color: mode === 'upload' ? '#0f766e' : '#64748b',
                borderBottom: mode === 'upload' ? '2px solid #0f766e' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <MdCloudUpload /> Upload Image
            </button>
          </div>

          {mode === 'draw' ? (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                Use your mouse or touchpad to write your signature in the box below:
              </p>
              <div style={{
                border: '2px dashed #94a3b8',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ display: 'block', width: '100%', height: '180px', cursor: 'crosshair', touchAction: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {hasDrawn ? 'Signature detected' : 'Awaiting stroke...'}
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MdRefresh /> Clear Canvas
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                Upload a scanned transparent PNG or high-contrast JPG of your signature:
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  fontSize: '13px',
                }}
              />
              {signatureData && (
                <div style={{ marginTop: '14px', textAlign: 'center', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Signature Preview:</span>
                  <img src={signatureData} alt="Preview" style={{ maxHeight: '100px', maxWidth: '100%', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '4px' }} />
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !signatureData}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: '600',
                cursor: saving || !signatureData ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MdSave /> {saving ? 'Saving...' : 'Save Signature'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DigitalSignatureModal
