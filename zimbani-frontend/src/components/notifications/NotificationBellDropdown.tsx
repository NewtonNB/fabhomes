import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MdNotifications,
  MdSavings,
  MdConstruction,
  MdDescription,
  MdHelpOutline,
  MdSecurity,
  MdInfo,
  MdCheck,
} from 'react-icons/md'
import {
  AppNotificationItem,
  NotificationCategory,
  NotificationSummaryResponse,
} from '../../types/notification.types'
import { notificationService } from '../../services/notification.service'
import './NotificationCenter.css'

interface NotificationBellDropdownProps {
  onOpenFullCenter?: () => void
  onNavigateAction?: (url: string) => void
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  onOpenFullCenter,
  onNavigateAction,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [summary, setSummary] = useState<NotificationSummaryResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchSummary = useCallback(async () => {
    try {
      const data = await notificationService.getSummary()
      setSummary(data)
    } catch (err) {
      // Silently catch to avoid interrupting user session
      console.warn('Could not fetch notifications summary', err)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    // Poll every 30 seconds for real-time notifications
    const interval = setInterval(fetchSummary, 30000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await notificationService.markAllAsRead()
      await fetchSummary()
    } catch (err) {
      console.error('Failed to mark all as read', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notif: AppNotificationItem) => {
    try {
      if (!notif.read_at) {
        await notificationService.markAsRead(notif.uuid || notif.id)
        fetchSummary()
      }
    } catch (err) {
      console.error('Failed to mark read', err)
    }

    setIsOpen(false)
    if (notif.action_url && onNavigateAction) {
      onNavigateAction(notif.action_url)
    }
  }

  const renderCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'financial':
        return <MdSavings />
      case 'construction':
        return <MdConstruction />
      case 'legal':
        return <MdDescription />
      case 'support':
        return <MdHelpOutline />
      case 'security':
        return <MdSecurity />
      default:
        return <MdInfo />
    }
  }

  const unreadCount = summary?.unread_count || 0
  const recentItems = summary?.recent || []

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchSummary()
        }}
        aria-label="View notifications"
        title="Notifications"
      >
        <MdNotifications />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-title">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="notification-btn-link"
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <MdCheck /> Mark all read
              </button>
            )}
          </div>

          <div className="notification-list-mini">
            {recentItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                <MdNotifications style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>No notifications yet</p>
              </div>
            ) : (
              recentItems.map((item) => (
                <div
                  key={item.uuid || item.id}
                  className={`notification-item-mini ${!item.read_at ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className={`notification-icon-box ${item.category}`}>
                    {renderCategoryIcon(item.category)}
                  </div>
                  <div className="notification-content-mini">
                    <div className="notification-title-mini">{item.title}</div>
                    <div className="notification-desc-mini">{item.message}</div>
                    <div className="notification-time-mini">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} • {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              className="notification-view-all-btn"
              onClick={() => {
                setIsOpen(false)
                onOpenFullCenter?.()
              }}
            >
              Open Notification Center &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default NotificationBellDropdown
