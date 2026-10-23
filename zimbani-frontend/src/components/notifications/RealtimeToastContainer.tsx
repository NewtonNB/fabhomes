import React, { useState, useEffect } from 'react'
import {
  MdClose,
  MdSavings,
  MdConstruction,
  MdDescription,
  MdHelpOutline,
  MdSecurity,
  MdNotificationsActive,
  MdArrowForward,
} from 'react-icons/md'
import { echoService } from '../../services/echo.service'

export interface RealtimeToastItem {
  id: string
  title: string
  message: string
  category?: string
  action_url?: string
  created_at: string
}

interface RealtimeToastContainerProps {
  userId?: number
  onNavigateAction?: (url: string) => void
}

export const RealtimeToastContainer: React.FC<RealtimeToastContainerProps> = ({
  userId,
  onNavigateAction,
}) => {
  const [toasts, setToasts] = useState<RealtimeToastItem[]>([])

  useEffect(() => {
    if (!userId) return

    // 1. Listen for new in-app notifications
    const unbindNotification = echoService.onClientEvent(
      userId,
      'notification.received',
      (data) => {
        addToast({
          id: data.uuid || String(Date.now()),
          title: data.title || 'New Notification',
          message: data.message || '',
          category: data.category || 'general',
          action_url: data.action_url,
          created_at: data.created_at || new Date().toISOString(),
        })
      }
    )

    // 2. Listen for instant deposit confirmations
    const unbindDeposit = echoService.onClientEvent(
      userId,
      'savings.deposit_confirmed',
      (data) => {
        const amt = data.amount ? Number(data.amount).toLocaleString() + ' UGX' : 'Funds'
        addToast({
          id: 'dep-' + Date.now(),
          title: `Deposit Credited: ${amt}`,
          message: `Your account ${data.account_number} was successfully updated.`,
          category: 'financial',
          action_url: '/client-portal?tab=savings',
          created_at: new Date().toISOString(),
        })
      }
    )

    // 3. Listen for milestone inspection certifications
    const unbindMilestone = echoService.onClientEvent(
      userId,
      'milestone.inspection_updated',
      (data) => {
        addToast({
          id: 'ms-' + Date.now(),
          title: `Milestone Ready: ${data.milestone_name || 'Inspection'}`,
          message: 'Site inspection certified. Review photos and enter your PIN to sign off.',
          category: 'construction',
          action_url: '/client-portal?tab=milestones',
          created_at: new Date().toISOString(),
        })
      }
    )

    return () => {
      unbindNotification()
      unbindDeposit()
      unbindMilestone()
    }
  }, [userId])

  const addToast = (toast: RealtimeToastItem) => {
    setToasts((prev) => [toast, ...prev.slice(0, 3)]) // keep at most 4 toasts visible

    // Auto-dismiss after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 7000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const renderIcon = (cat?: string) => {
    switch (cat) {
      case 'financial':
        return <MdSavings style={{ color: '#34d399' }} />
      case 'construction':
        return <MdConstruction style={{ color: '#fbbf24' }} />
      case 'legal':
        return <MdDescription style={{ color: '#a78bfa' }} />
      case 'support':
        return <MdHelpOutline style={{ color: '#38bdf8' }} />
      case 'security':
        return <MdSecurity style={{ color: '#f43f5e' }} />
      default:
        return <MdNotificationsActive style={{ color: '#38bdf8' }} />
    }
  }

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 380,
        width: '90%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            animation: 'dropdown-fade 0.25s ease-out',
          }}
        >
          <div
            style={{
              fontSize: 22,
              background: 'rgba(59, 130, 246, 0.15)',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {renderIcon(t.category)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                {t.title}
              </span>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 2,
                  fontSize: 14,
                }}
              >
                <MdClose />
              </button>
            </div>

            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
              {t.message}
            </p>

            {t.action_url && onNavigateAction && (
              <button
                className="portal-btn-primary"
                style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => {
                  removeToast(t.id)
                  onNavigateAction(t.action_url!)
                }}
              >
                View Now <MdArrowForward />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
export default RealtimeToastContainer
