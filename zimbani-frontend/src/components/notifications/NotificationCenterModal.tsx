import React, { useState, useEffect, useCallback } from 'react'
import {
  MdClose,
  MdSavings,
  MdConstruction,
  MdDescription,
  MdHelpOutline,
  MdSecurity,
  MdInfo,
  MdCheckCircle,
  MdDeleteOutline,
  MdArrowForward,
  MdSend,
} from 'react-icons/md'
import {
  AppNotificationItem,
  NotificationCategory,
  WhatsAppMessageItem,
} from '../../types/notification.types'
import { notificationService } from '../../services/notification.service'
import './NotificationCenter.css'

interface NotificationCenterModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigateAction?: (url: string) => void
  onNotify?: (msg: string, type: 'success' | 'error') => void
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateAction,
  onNotify,
}) => {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'whatsapp' | NotificationCategory>('all')
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [lastPage, setLastPage] = useState<number>(1)
  const [whatsappMessages, setWhatsAppMessages] = useState<WhatsAppMessageItem[]>([])

  // Test Dispatch Form
  const [showTestForm, setShowTestForm] = useState<boolean>(false)
  const [testTitle, setTestTitle] = useState<string>('')
  const [testMessage, setTestMessage] = useState<string>('')
  const [testCategory, setTestCategory] = useState<string>('financial')
  const [testChannels] = useState<string[]>(['in_app', 'sms', 'email', 'whatsapp'])
  const [dispatchingTest, setDispatchingTest] = useState<boolean>(false)

  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        if (activeTab === 'whatsapp') {
          const msgs = await notificationService.getWhatsAppMessages()
          setWhatsAppMessages(msgs || [])
          setTotalCount(msgs?.length || 0)
        } else {
          const filters: any = { page, per_page: 20 }
          if (activeTab === 'unread') {
            filters.unread_only = true
          } else if (activeTab !== 'all') {
            filters.category = activeTab
          }

          const res = await notificationService.getNotifications(filters)
          setNotifications(res.data || [])
          setCurrentPage(res.current_page || 1)
          setLastPage(res.last_page || 1)
          setTotalCount(res.total || 0)
        }
      } catch (err: any) {
        console.error('Failed to load notifications or WhatsApp activity', err)
        onNotify?.('Failed to load notification activity', 'error')
      } finally {
        setLoading(false)
      }
    },
    [activeTab, onNotify]
  )

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1)
    }
  }, [isOpen, activeTab, fetchNotifications])

  if (!isOpen) return null

  const handleMarkAsRead = async (item: AppNotificationItem) => {
    if (item.read_at) return
    try {
      const updated = await notificationService.markAsRead(item.uuid || item.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, read_at: updated.read_at } : n))
      )
    } catch (err) {
      console.error('Failed to mark read', err)
    }
  }

  const handleDismiss = async (item: AppNotificationItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await notificationService.dismiss(item.uuid || item.id)
      setNotifications((prev) => prev.filter((n) => n.id !== item.id))
      setTotalCount((c) => Math.max(0, c - 1))
      onNotify?.('Notification dismissed', 'success')
    } catch (err) {
      console.error('Failed to dismiss', err)
      onNotify?.('Failed to dismiss notification', 'error')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      onNotify?.('All notifications marked as read', 'success')
      fetchNotifications(currentPage)
    } catch (err) {
      console.error('Failed to mark all as read', err)
      onNotify?.('Failed to mark all as read', 'error')
    }
  }

  const handleActionClick = (item: AppNotificationItem) => {
    handleMarkAsRead(item)
    onClose()
    if (item.action_url && onNavigateAction) {
      onNavigateAction(item.action_url)
    }
  }

  const handleSendTestDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testTitle.trim() || !testMessage.trim()) return

    setDispatchingTest(true)
    try {
      await notificationService.dispatchTest({
        title: testTitle,
        message: testMessage,
        category: testCategory,
        channels: testChannels,
      })
      onNotify?.('Test multi-channel notification dispatched (In-App, SMS, Email, WhatsApp)', 'success')
      setShowTestForm(false)
      setTestTitle('')
      setTestMessage('')
      fetchNotifications(1)
    } catch (err: any) {
      console.error('Failed test dispatch', err)
      onNotify?.(err?.response?.data?.message || 'Failed test dispatch', 'error')
    } finally {
      setDispatchingTest(false)
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

  return (
    <div className="portal-modal-overlay" onClick={onClose}>
      <div
        className="portal-modal-card notification-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="portal-modal-header" style={{ padding: '16px 20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
              Notification Center
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {totalCount} total alerts across SMS, Email, and In-App
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="portal-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 10px' }}
              onClick={() => setShowTestForm(!showTestForm)}
            >
              {showTestForm ? 'Close Test' : 'Test Dispatch'}
            </button>
            <button
              className="portal-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 10px' }}
              onClick={handleMarkAllRead}
            >
              <MdCheckCircle style={{ marginRight: '4px' }} /> Mark All Read
            </button>
            <button
              className="portal-modal-close"
              onClick={onClose}
              style={{ marginLeft: '4px' }}
            >
              <MdClose />
            </button>
          </div>
        </div>

        {/* Test Dispatch Drawer */}
        {showTestForm && (
          <form
            onSubmit={handleSendTestDispatch}
            style={{
              background: '#090d16',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
              Dispatch Test Multi-Channel Alert
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Alert Title"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <select
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              >
                <option value="financial">Financial</option>
                <option value="construction">Construction</option>
                <option value="legal">Legal & Title</option>
                <option value="support">Support</option>
                <option value="security">Security</option>
                <option value="general">General</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Message Body..."
                required
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                style={{
                  flex: 1,
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <button
                type="submit"
                disabled={dispatchingTest}
                className="portal-btn-primary"
                style={{ fontSize: '12px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <MdSend /> {dispatchingTest ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        <div className="notification-filter-tabs">
          <button
            className={`notification-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Unread
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            Financial
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'construction' ? 'active' : ''}`}
            onClick={() => setActiveTab('construction')}
          >
            Construction
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'legal' ? 'active' : ''}`}
            onClick={() => setActiveTab('legal')}
          >
            Title Deeds
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            Support
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: activeTab === 'whatsapp' ? '#22c55e' : undefined,
              color: activeTab === 'whatsapp' ? '#4ade80' : undefined,
            }}
          >
            <span style={{ fontSize: '13px' }}>🟢</span> WhatsApp Cloud Stream
          </button>
        </div>

        {/* Notifications Scroll List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="portal-spinner" />
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading activity...</p>
            </div>
          ) : activeTab === 'whatsapp' ? (
            whatsappMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>💬</span>
                <h4 style={{ margin: '0 0 4px 0', color: '#f1f5f9' }}>No WhatsApp activity logged</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Outbound deposit receipts and inbound client commands will appear here in real-time.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {whatsappMessages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound'
                  return (
                    <div
                      key={msg.uuid || msg.id}
                      style={{
                        background: isOutbound ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid',
                        borderColor: isOutbound ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isOutbound ? '#15803d' : '#1d4ed8',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {isOutbound ? 'OUTBOUND TEMPLATE' : 'INBOUND COMMAND'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {msg.phone_number}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: msg.status === 'read' ? '#38bdf8' : msg.status === 'delivered' ? '#34d399' : '#fbbf24',
                          }}
                        >
                          {msg.status === 'read' ? '✓✓ Read' : msg.status === 'delivered' ? '✓✓ Delivered' : '✓ Sent'}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#f1f5f9', lineHeight: 1.5, margin: '6px 0' }}>
                        {msg.body}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        <span>ID: {msg.wa_message_id?.substring(0, 24)}...</span>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <MdCheckCircle style={{ fontSize: '48px', color: '#34d399', opacity: 0.8, marginBottom: '8px' }} />
              <h4 style={{ margin: '0 0 4px 0', color: '#f1f5f9' }}>All caught up!</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                You have no notifications matching this filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((item) => (
                <div
                  key={item.uuid || item.id}
                  onClick={() => handleMarkAsRead(item)}
                  style={{
                    background: item.read_at ? 'rgba(15, 23, 42, 0.6)' : 'rgba(30, 58, 138, 0.25)',
                    border: '1px solid',
                    borderColor: item.read_at ? 'rgba(255, 255, 255, 0.08)' : 'rgba(59, 130, 246, 0.4)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div className={`notification-icon-box ${item.category}`}>
                    {renderCategoryIcon(item.category)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        {item.title}
                      </span>
                      {item.priority === 'high' || item.priority === 'urgent' ? (
                        <span
                          style={{
                            fontSize: '10px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                        >
                          {item.priority.toUpperCase()}
                        </span>
                      ) : null}
                      {!item.read_at && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: '#38bdf8',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {item.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.action_url && (
                          <button
                            className="portal-btn-primary"
                            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActionClick(item)
                            }}
                          >
                            View Details <MdArrowForward />
                          </button>
                        )}
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                          }}
                          title="Dismiss notification"
                          onClick={(e) => handleDismiss(item, e)}
                        >
                          <MdDeleteOutline />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with pagination */}
        {lastPage > 1 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            <span>
              Page {currentPage} of {lastPage}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="portal-btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => fetchNotifications(currentPage - 1)}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                Previous
              </button>
              <button
                className="portal-btn-secondary"
                disabled={currentPage >= lastPage}
                onClick={() => fetchNotifications(currentPage + 1)}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default NotificationCenterModal
