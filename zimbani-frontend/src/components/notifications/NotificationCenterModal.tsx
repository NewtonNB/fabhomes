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
  MdOutlineSchedule,
  MdPlayArrow,
  MdRefresh,
  MdSettings,
  MdBarChart,
  MdCampaign,
  MdReplay,
  MdFiberManualRecord,
  MdChat,
  MdAttachMoney,
  MdHourglassEmpty,
  MdHandshake,
  MdDoneAll,
  MdDone,
} from 'react-icons/md'
import {
  AppNotificationItem,
  DripSummaryResponse,
  DripTriggerItem,
  NotificationAnalyticsResponse,
  NotificationCategory,
  NotificationDispatchLogItem,
  NotificationPreferences,
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
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'whatsapp' | 'drips' | 'preferences' | 'analytics' | NotificationCategory
  >('all')
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [lastPage, setLastPage] = useState<number>(1)
  const [whatsappMessages, setWhatsAppMessages] = useState<WhatsAppMessageItem[]>([])

  // Drip Automation State
  const [dripSummary, setDripSummary] = useState<DripSummaryResponse | null>(null)
  const [dripLogs, setDripLogs] = useState<DripTriggerItem[]>([])
  const [runningDrip, setRunningDrip] = useState<boolean>(false)

  // Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false)

  // Analytics & Logs State
  const [analyticsData, setAnalyticsData] = useState<NotificationAnalyticsResponse | null>(null)
  const [dispatchLogs, setDispatchLogs] = useState<NotificationDispatchLogItem[]>([])
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null)

  // Campaign Broadcast State
  const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false)
  const [campaignTitle, setCampaignTitle] = useState<string>('')
  const [campaignMessage, setCampaignMessage] = useState<string>('')
  const [campaignSegment, setCampaignSegment] = useState<string>('all_clients')
  const [campaignChannels, setCampaignChannels] = useState<string[]>(['in_app', 'email'])
  const [broadcastingCampaign, setBroadcastingCampaign] = useState<boolean>(false)

  // Test Dispatch Form
  const [showTestForm, setShowTestForm] = useState<boolean>(false)
  const [testTitle, setTestTitle] = useState<string>('')
  const [testMessage, setTestMessage] = useState<string>('')
  const [testCategory, setTestCategory] = useState<string>('financial')
  const [testChannels] = useState<string[]>(['in_app', 'sms', 'email', 'whatsapp'])
  const [dispatchingTest, setDispatchingTest] = useState<boolean>(false)

  // WhatsApp Soft Reply State
  const [replyingWaId, setReplyingWaId] = useState<string | null>(null)
  const [waReplyText, setWaReplyText] = useState<string>('')
  const [sendingWaReply, setSendingWaReply] = useState<boolean>(false)

  const WA_SOFT_REPLIES = [
    { label: 'Receipt Verified', text: 'Hello! Your payment has been confirmed and official digital receipt is ready in your Client Vault.' },
    { label: 'Manager Calling', text: 'Thank you for reaching out. An estate relationship manager will call you today to assist.' },
    { label: 'Inspection Set', text: 'Your plot milestone inspection has been scheduled with our site engineer. We look forward to seeing you.' },
    { label: 'Deed Ready', text: 'Your land title deed and transfer documents are ready for viewing and collection.' },
    { label: 'General Help', text: 'Hello! Thank you for contacting Fab Homes. Please let us know how we can best assist your property journey today.' },
  ]

  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        if (activeTab === 'whatsapp') {
          const msgs = await notificationService.getWhatsAppMessages()
          setWhatsAppMessages(msgs || [])
          setTotalCount(msgs?.length || 0)
        } else if (activeTab === 'drips') {
          const [summaryData, logsData] = await Promise.all([
            notificationService.getDripSummary(),
            notificationService.getDripLogs({ per_page: 20 }),
          ])
          setDripSummary(summaryData)
          setDripLogs(logsData.data || [])
          setTotalCount(summaryData.total_triggers || 0)
        } else if (activeTab === 'preferences') {
          const prefs = await notificationService.getPreferences()
          setPreferences(prefs)
        } else if (activeTab === 'analytics') {
          const [analytics, logsRes] = await Promise.all([
            notificationService.getAnalytics(),
            notificationService.getDispatchLogs({ per_page: 30 }),
          ])
          setAnalyticsData(analytics)
          setDispatchLogs(logsRes.data || [])
          setTotalCount(analytics.total_dispatches || 0)
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

  const handleRunDrips = async (dryRun: boolean, workflow: string = 'all') => {
    setRunningDrip(true)
    try {
      const res = await notificationService.runDripsNow(dryRun, workflow)
      onNotify?.(
        `${dryRun ? 'Dry Run Simulated' : 'Automated Drips Dispatched'}: ${res.summary.total_triggered} triggered, ${res.summary.total_skipped} skipped`,
        'success'
      )
      fetchNotifications(1)
    } catch (err: any) {
      console.error('Failed to run drips', err)
      onNotify?.(err?.response?.data?.message || 'Failed to execute drip automation', 'error')
    } finally {
      setRunningDrip(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!preferences) return
    setSavingPrefs(true)
    try {
      const updated = await notificationService.updatePreferences(preferences)
      setPreferences(updated)
      onNotify?.('Notification preferences saved successfully', 'success')
    } catch (err: any) {
      console.error('Failed to save preferences', err)
      onNotify?.(err?.response?.data?.message || 'Failed to save preferences', 'error')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleRetryLog = async (logId: number) => {
    setRetryingLogId(logId)
    try {
      const retried = await notificationService.retryDispatchLog(logId)
      setDispatchLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, status: retried.status, error_message: retried.error_message } : l))
      )
      onNotify?.(`Dispatch log #${logId} retried successfully (${retried.status})`, 'success')
      const updatedAnalytics = await notificationService.getAnalytics()
      setAnalyticsData(updatedAnalytics)
    } catch (err: any) {
      console.error('Failed to retry dispatch log', err)
      onNotify?.(err?.response?.data?.message || 'Failed to retry dispatch log', 'error')
    } finally {
      setRetryingLogId(null)
    }
  }

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignTitle.trim() || !campaignMessage.trim()) return

    setBroadcastingCampaign(true)
    try {
      const res = await notificationService.sendCampaign({
        title: campaignTitle,
        message: campaignMessage,
        target_segment: campaignSegment,
        channels: campaignChannels,
        category: 'general',
      })
      onNotify?.(`Broadcast dispatched to ${res.total_dispatched} recipients in segment '${campaignSegment}'`, 'success')
      setShowCampaignModal(false)
      setCampaignTitle('')
      setCampaignMessage('')
      if (activeTab === 'analytics') {
        fetchNotifications(1)
      }
    } catch (err: any) {
      console.error('Failed campaign broadcast', err)
      onNotify?.(err?.response?.data?.message || 'Failed to dispatch broadcast', 'error')
    } finally {
      setBroadcastingCampaign(false)
    }
  }

  const handleSendWhatsAppSoftReply = async (phone: string, text: string) => {
    if (!text.trim()) return
    setSendingWaReply(true)
    try {
      const res = await notificationService.sendWhatsAppReply(phone, text)
      setWhatsAppMessages((prev) => [...prev, res])
      setReplyingWaId(null)
      setWaReplyText('')
      onNotify?.('WhatsApp soft reply sent successfully!', 'success')
    } catch (err: any) {
      console.error('Failed to send WhatsApp soft reply', err)
      onNotify?.(err?.response?.data?.message || 'Failed to send soft reply', 'error')
    } finally {
      setSendingWaReply(false)
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
              className="portal-btn-primary"
              style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                setShowCampaignModal(!showCampaignModal)
                setShowTestForm(false)
              }}
            >
              <MdCampaign /> {showCampaignModal ? 'Close Broadcast' : 'Broadcast'}
            </button>
            <button
              className="portal-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 10px' }}
              onClick={() => {
                setShowTestForm(!showTestForm)
                setShowCampaignModal(false)
              }}
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

        {/* Campaign Broadcast Drawer */}
        {showCampaignModal && (
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(30, 27, 75, 0.5)',
              borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MdCampaign /> Enterprise Multi-Channel Campaign Broadcast
            </h4>
            <form onSubmit={handleSendCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                    Target Audience Segment
                  </label>
                  <select
                    className="portal-input"
                    value={campaignSegment}
                    onChange={(e) => setCampaignSegment(e.target.value)}
                    style={{ fontSize: '13px', padding: '6px 10px', width: '100%' }}
                  >
                    <option value="all_clients">All Registered Clients</option>
                    <option value="active_savers">Active Savers (Land & Construction)</option>
                    <option value="plot_holders">Plot Holders & Active Reservations</option>
                    <option value="all_users">All System Users</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                    Delivery Channels
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', height: '36px' }}>
                    {(['in_app', 'email', 'sms', 'whatsapp'] as const).map((ch) => (
                      <label key={ch} style={{ fontSize: '12px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={campaignChannels.includes(ch)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCampaignChannels([...campaignChannels, ch])
                            } else {
                              setCampaignChannels(campaignChannels.filter((c) => c !== ch))
                            }
                          }}
                        />
                        {ch.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Campaign Title (e.g. Groundbreaking Ceremony Announcement)"
                  className="portal-input"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              <div>
                <textarea
                  placeholder="Broadcast Message Body..."
                  className="portal-input"
                  rows={2}
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  onClick={() => setShowCampaignModal(false)}
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={broadcastingCampaign || !campaignTitle.trim()}
                  style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MdSend /> {broadcastingCampaign ? 'Broadcasting...' : 'Broadcast Campaign'}
                </button>
              </div>
            </form>
          </div>
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
            <MdFiberManualRecord style={{ fontSize: '13px', color: '#22c55e' }} /> WhatsApp Cloud Stream
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'drips' ? 'active' : ''}`}
            onClick={() => setActiveTab('drips')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: activeTab === 'drips' ? '#38bdf8' : undefined,
              color: activeTab === 'drips' ? '#38bdf8' : undefined,
            }}
          >
            <MdOutlineSchedule style={{ fontSize: '14px' }} /> Automated Drips
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: activeTab === 'preferences' ? '#a855f7' : undefined,
              color: activeTab === 'preferences' ? '#c084fc' : undefined,
            }}
          >
            <MdSettings style={{ fontSize: '14px' }} /> Preferences
          </button>
          <button
            className={`notification-filter-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: activeTab === 'analytics' ? '#f59e0b' : undefined,
              color: activeTab === 'analytics' ? '#fbbf24' : undefined,
            }}
          >
            <MdBarChart style={{ fontSize: '14px' }} /> Analytics & Logs
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
                <MdChat style={{ fontSize: '42px', display: 'block', margin: '0 auto 8px', color: '#4ade80' }} />
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
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          {msg.status === 'read' ? (
                            <><MdDoneAll size={14} /> Read</>
                          ) : msg.status === 'delivered' ? (
                            <><MdDoneAll size={14} /> Delivered</>
                          ) : (
                            <><MdDone size={14} /> Sent</>
                          )}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#f1f5f9', lineHeight: 1.5, margin: '6px 0' }}>
                        {msg.body}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        <span>ID: {msg.wa_message_id?.substring(0, 24)}...</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                          {!isOutbound && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingWaId(replyingWaId === (msg.wa_message_id || msg.id?.toString()) ? null : (msg.wa_message_id || msg.id?.toString()))
                                setWaReplyText('')
                              }}
                              style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '4px',
                                color: '#38bdf8',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <MdSend size={11} /> Soft Reply
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Interactive Soft Reply Drawer for this inbound message */}
                      {!isOutbound && replyingWaId === (msg.wa_message_id || msg.id?.toString()) && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MdChat size={12} style={{ color: '#38bdf8' }} /> Pick a Soft Reply:
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {WA_SOFT_REPLIES.map((sr) => (
                              <button
                                key={sr.label}
                                type="button"
                                onClick={() => setWaReplyText(sr.text)}
                                style={{
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  color: '#4ade80',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                }}
                                title={sr.text}
                              >
                                + {sr.label}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={waReplyText}
                              onChange={(e) => setWaReplyText(e.target.value)}
                              placeholder="Type soft reply or choose preset above..."
                              style={{
                                flex: 1,
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                color: '#fff',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              disabled={sendingWaReply || !waReplyText.trim()}
                              onClick={() => handleSendWhatsAppSoftReply(msg.phone_number, waReplyText)}
                              style={{
                                background: '#16a34a',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                opacity: sendingWaReply || !waReplyText.trim() ? 0.6 : 1,
                              }}
                            >
                              <MdSend size={12} /> {sendingWaReply ? 'Sending...' : 'Send'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyingWaId(null)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '6px',
                                color: '#94a3b8',
                                padding: '6px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : activeTab === 'drips' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Action Controls */}
              <div
                style={{
                  background: 'rgba(30, 58, 138, 0.25)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MdOutlineSchedule style={{ color: '#38bdf8' }} />
                    Automated Drip Rules Engine
                  </h4>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Active schedule: daily at 08:00 AM • Idempotency lock active (no duplicate spam)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="portal-btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => handleRunDrips(true)}
                    disabled={runningDrip}
                  >
                    Simulate Dry Run
                  </button>
                  <button
                    className="portal-btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleRunDrips(false)}
                    disabled={runningDrip}
                  >
                    <MdPlayArrow /> {runningDrip ? 'Running...' : 'Run Drips Now'}
                  </button>
                  <button
                    className="portal-btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                    onClick={() => fetchNotifications(1)}
                  >
                    <MdRefresh />
                  </button>
                </div>
              </div>

              {/* Telemetry Stat Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                }}
              >
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Triggers</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {dripSummary?.total_triggers || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Dispatched</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>
                    {dripSummary?.dispatched_count || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Skipped (Anti-Spam)</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                    {dripSummary?.skipped_count || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Past 24 Hours</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>
                    {dripSummary?.past_24h || 0}
                  </div>
                </div>
              </div>

              {/* Active Drip Workflows Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <MdAttachMoney style={{ color: '#10b981' }} /> Target Savings Reminders
                    </span>
                    <span style={{ fontSize: '10px', background: '#15803d', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8' }}>
                    Alerts clients whose monthly target deposit is pending.
                  </p>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Channels: In-App, Email, SMS, WhatsApp
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <MdHourglassEmpty style={{ color: '#f59e0b' }} /> Plot Expiry Countdown
                    </span>
                    <span style={{ fontSize: '10px', background: '#15803d', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8' }}>
                    Statutory 14-day reservation countdown at 7d, 3d, 24h intervals.
                  </p>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Channels: In-App, Email, SMS, WhatsApp
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <MdConstruction style={{ color: '#06b6d4' }} /> Milestone Inspection Sign-Off
                    </span>
                    <span style={{ fontSize: '10px', background: '#15803d', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8' }}>
                    Nudges clients on inspections waiting &gt; 48 hours for Quick-PIN approval.
                  </p>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Channels: In-App, Email, WhatsApp
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <MdHandshake style={{ color: '#8b5cf6' }} /> Dormant Account Re-engagement
                    </span>
                    <span style={{ fontSize: '10px', background: '#15803d', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8' }}>
                    Recaps estate progress for clients inactive for 30+ days.
                  </p>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Channels: In-App, Email
                  </div>
                </div>
              </div>

              {/* Drip Audit History Table */}
              <div>
                <h4 style={{ margin: '8px 0 8px 0', fontSize: '14px', color: '#e2e8f0' }}>
                  Recent Automated Triggers ({dripLogs.length})
                </h4>
                {dripLogs.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                    No automated drip records logged yet. Click "Simulate Dry Run" to test evaluation.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dripLogs.map((log) => (
                      <div
                        key={log.uuid || log.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                background:
                                  log.campaign_type === 'savings_reminder'
                                    ? '#0369a1'
                                    : log.campaign_type === 'plot_expiry'
                                    ? '#b91c1c'
                                    : log.campaign_type === 'milestone_nudge'
                                    ? '#b45309'
                                    : '#4338ca',
                                color: '#fff',
                                padding: '1px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {log.campaign_type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                              {log.title}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: log.status === 'dispatched' ? '#4ade80' : log.is_dry_run ? '#facc15' : '#94a3b8',
                            }}
                          >
                            {log.is_dry_run ? 'DRY RUN' : log.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                          {log.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                          <span style={{ fontFamily: 'monospace' }}>Key: {log.trigger_key}</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'preferences' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'rgba(30, 27, 75, 0.3)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <h4 style={{ margin: '0 0 6px 0', color: '#f1f5f9', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MdSettings style={{ color: '#c084fc' }} /> Multi-Channel Delivery Channels
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#94a3b8' }}>
                  Choose which communications channels Fab Homes uses to deliver your statements, receipts, and alerts.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {[
                    { key: 'in_app', label: 'In-App Alerts', desc: 'Real-time dashboard popups and bell dropdown' },
                    { key: 'email', label: 'Email Notifications', desc: 'Branded PDF statements and receipts to inbox' },
                    { key: 'sms', label: 'SMS Instant Text', desc: 'Immediate carrier SMS alerts for financial credits' },
                    { key: 'whatsapp', label: 'WhatsApp Business', desc: 'Meta Cloud API interactive messages with quick buttons' },
                    { key: 'push', label: 'Web / Mobile Push', desc: 'Device push notifications when dashboard is backgrounded' },
                  ].map((item) => {
                    const isChecked = preferences?.channels?.[item.key as keyof typeof preferences.channels] ?? true
                    return (
                      <div
                        key={item.key}
                        style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid',
                          borderColor: isChecked ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          if (!preferences) return
                          setPreferences({
                            ...preferences,
                            channels: {
                              ...preferences.channels,
                              [item.key]: !isChecked,
                            },
                          })
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ marginTop: '2px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Category Subscriptions */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <h4 style={{ margin: '0 0 6px 0', color: '#f1f5f9', fontSize: '15px' }}>
                  Topic & Category Subscriptions
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#94a3b8' }}>
                  Select the domain updates you wish to receive alerts for.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { key: 'financial', label: 'Financial Transactions', desc: 'Deposits, payment receipts, escrow transfers' },
                    { key: 'construction', label: 'Construction Milestones', desc: 'Inspection sign-off, photo verification updates' },
                    { key: 'legal', label: 'Land & Title Deeds', desc: 'Plot reservations, cadastral surveys, deed handover' },
                    { key: 'support', label: 'Support Ticketing', desc: 'Client portal agent replies and inquiries' },
                    { key: 'general', label: 'Estate Developments', desc: 'Community announcements, webinars, promotions' },
                  ].map((cat) => {
                    const isChecked = preferences?.categories?.[cat.key as keyof typeof preferences.categories] ?? true
                    return (
                      <div
                        key={cat.key}
                        style={{
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          if (!preferences) return
                          setPreferences({
                            ...preferences,
                            categories: {
                              ...preferences.categories,
                              [cat.key]: !isChecked,
                            },
                          })
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{cat.label}</span>
                          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{cat.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quiet Hours / DND */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', color: '#f1f5f9', fontSize: '15px' }}>
                      Quiet Hours (Do Not Disturb)
                    </h4>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Suppress external SMS and WhatsApp alerts during sleeping hours (In-app alerts remain active)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.quiet_hours_enabled ?? false}
                    onChange={(e) => {
                      if (!preferences) return
                      setPreferences({
                        ...preferences,
                        quiet_hours_enabled: e.target.checked,
                      })
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {preferences?.quiet_hours_enabled && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_start || '22:00'}
                        onChange={(e) => setPreferences({ ...preferences, quiet_hours_start: e.target.value })}
                        className="portal-input"
                        style={{ fontSize: '13px', padding: '6px 10px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        End Time
                      </label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_end || '07:00'}
                        onChange={(e) => setPreferences({ ...preferences, quiet_hours_end: e.target.value })}
                        className="portal-input"
                        style={{ fontSize: '13px', padding: '6px 10px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        Timezone
                      </label>
                      <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                        {preferences.timezone || 'Africa/Kampala (EAT)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  className="portal-btn-primary"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  style={{ padding: '8px 24px', fontSize: '13px' }}
                >
                  {savingPrefs ? 'Saving Preferences...' : 'Save Notification Preferences'}
                </button>
              </div>
            </div>
          ) : activeTab === 'analytics' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Analytics Summary KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                }}
              >
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Dispatches</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {analyticsData?.total_dispatches || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Success Rate</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>
                    {analyticsData?.success_rate || 100}%
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Gateway Cost</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                    {Number(analyticsData?.total_cost_ugx || 0).toLocaleString()} UGX
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Failed Dispatches</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: (analyticsData?.failed_count || 0) > 0 ? '#ef4444' : '#94a3b8', marginTop: '4px' }}>
                    {analyticsData?.failed_count || 0}
                  </div>
                </div>
              </div>

              {/* Delivery Logs Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>
                    Multi-Channel Delivery Audit Trail ({dispatchLogs.length})
                  </h4>
                  <button
                    className="portal-btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => fetchNotifications(1)}
                  >
                    <MdRefresh /> Refresh Logs
                  </button>
                </div>

                {dispatchLogs.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                    No dispatch activity records found.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dispatchLogs.map((log) => {
                      const isFailed = log.status === 'failed'
                      return (
                        <div
                          key={log.uuid || log.id}
                          style={{
                            background: isFailed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid',
                            borderColor: isFailed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background:
                                    log.channel === 'sms'
                                      ? '#0284c7'
                                      : log.channel === 'email'
                                      ? '#7c3aed'
                                      : log.channel === 'whatsapp'
                                      ? '#16a34a'
                                      : '#475569',
                                  color: '#fff',
                                  padding: '1px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                {log.channel.toUpperCase()}
                              </span>
                              <span style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                {log.recipient_phone || log.recipient_email || `User #${log.recipient_id}`}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color:
                                    log.status === 'delivered'
                                      ? '#4ade80'
                                      : log.status === 'failed'
                                      ? '#f87171'
                                      : log.status === 'skipped_preference'
                                      ? '#38bdf8'
                                      : '#facc15',
                                }}
                              >
                                {log.status.toUpperCase().replace('_', ' ')}
                              </span>

                              {isFailed && (
                                <button
                                  className="portal-btn-secondary"
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    borderColor: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  onClick={() => handleRetryLog(log.id)}
                                  disabled={retryingLogId === log.id}
                                >
                                  <MdReplay /> {retryingLogId === log.id ? 'Retrying...' : 'Retry'}
                                </button>
                              )}
                            </div>
                          </div>

                          {log.notification && (
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: '4px 0 2px 0' }}>
                              {log.notification.title}
                            </div>
                          )}

                          {log.error_message && (
                            <div style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', margin: '4px 0' }}>
                              Error: {log.error_message}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            <span>
                              Gateway: {log.gateway_provider || 'native'} • ID: {log.gateway_message_id?.substring(0, 20) || 'N/A'} • Cost: {Number(log.cost_ugx || 0).toFixed(0)} UGX
                            </span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
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
