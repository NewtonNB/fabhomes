import React, { useState, useEffect, useCallback } from 'react'
import {
  MdHelpOutline,
  MdAdd,
  MdSearch,
  MdChatBubbleOutline,
  MdSend,
  MdClose,
  MdCheckCircle,
  MdSupportAgent,
  MdRefresh,
} from 'react-icons/md'
import {
  SupportTicketItem,
  CreateTicketPayload,
} from '../../../types/client-portal-vault.types'
import { clientPortalVaultService } from '../../../services/client-portal-vault.service'
import { echoService } from '../../../services/echo.service'
import './ClientVaultTab.css'

interface ClientSupportTicketsTabProps {
  onNotify?: (message: string, type: 'success' | 'error') => void
}

export const ClientSupportTicketsTab: React.FC<ClientSupportTicketsTabProps> = ({
  onNotify,
}) => {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([])
  const [openCount, setOpenCount] = useState<number>(0)
  const [resolvedCount, setResolvedCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modal / Thread State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null)
  const [threadLoading, setThreadLoading] = useState<boolean>(false)
  const [replyText, setReplyText] = useState<string>('')
  const [submittingReply, setSubmittingReply] = useState<boolean>(false)

  // New Ticket Form State
  const [newSubject, setNewSubject] = useState<string>('')
  const [newCategory, setNewCategory] = useState<CreateTicketPayload['category']>('savings_query')
  const [newPriority, setNewPriority] = useState<CreateTicketPayload['priority']>('medium')
  const [newMessage, setNewMessage] = useState<string>('')
  const [creatingTicket, setCreatingTicket] = useState<boolean>(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientPortalVaultService.getTickets()
      setTickets(data.tickets || [])
      setOpenCount(data.open_count || 0)
      setResolvedCount(data.resolved_count || 0)
    } catch (err: any) {
      console.error('Failed to load support tickets', err)
      onNotify?.(err?.response?.data?.message || 'Failed to load tickets', 'error')
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const openTicketThread = async (ticket: SupportTicketItem) => {
    setSelectedTicket(ticket)
    setThreadLoading(true)
    try {
      const details = await clientPortalVaultService.getTicketDetails(ticket.id)
      setSelectedTicket(details)
    } catch (err: any) {
      console.error('Failed to load ticket details', err)
      onNotify?.('Failed to load conversation details', 'error')
    } finally {
      setThreadLoading(false)
    }
  }

  // Real-Time WebSocket Listener for live chat updates
  useEffect(() => {
    if (!selectedTicket?.id) return

    const unsubscribe = echoService.onTicketMessage(selectedTicket.id, (newMsg) => {
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== selectedTicket.id) return prev
        const existing = prev.messages || []
        if (existing.some((m) => m.id === newMsg.id || m.uuid === newMsg.uuid)) {
          return prev
        }
        return {
          ...prev,
          messages: [...existing, newMsg],
          message_count: (prev.message_count || 0) + 1,
          last_message: newMsg.message,
        }
      })
    })

    return () => {
      unsubscribe()
    }
  }, [selectedTicket?.id])

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newMessage.trim()) {
      onNotify?.('Please provide both a subject and message.', 'error')
      return
    }

    setCreatingTicket(true)
    try {
      const created = await clientPortalVaultService.createTicket({
        subject: newSubject,
        category: newCategory,
        priority: newPriority,
        message: newMessage,
      })
      onNotify?.(`Ticket ${created.ticket_number} created successfully.`, 'success')
      setShowCreateModal(false)
      setNewSubject('')
      setNewMessage('')
      await fetchTickets()
      openTicketThread(created)
    } catch (err: any) {
      console.error('Failed to create ticket', err)
      onNotify?.(err?.response?.data?.message || 'Failed to create ticket', 'error')
    } finally {
      setCreatingTicket(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return

    setSubmittingReply(true)
    try {
      await clientPortalVaultService.replyTicket(selectedTicket.id, replyText.trim())
      setReplyText('')
      onNotify?.('Reply sent successfully', 'success')
      // Refresh thread
      const updated = await clientPortalVaultService.getTicketDetails(selectedTicket.id)
      setSelectedTicket(updated)
      // Also refresh background list
      fetchTickets()
    } catch (err: any) {
      console.error('Failed to send reply', err)
      onNotify?.(err?.response?.data?.message || 'Failed to send reply', 'error')
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket) return
    if (!window.confirm('Are you sure you want to mark this ticket as resolved?')) return

    try {
      const closed = await clientPortalVaultService.closeTicket(selectedTicket.id)
      onNotify?.('Ticket marked as resolved', 'success')
      setSelectedTicket(closed)
      fetchTickets()
    } catch (err: any) {
      console.error('Failed to close ticket', err)
      onNotify?.(err?.response?.data?.message || 'Failed to close ticket', 'error')
    }
  }

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'open' && t.status === 'resolved') return false
    if (statusFilter === 'resolved' && t.status !== 'resolved') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchSub = t.subject.toLowerCase().includes(q)
      const matchNum = t.ticket_number.toLowerCase().includes(q)
      const matchCat = t.category.toLowerCase().includes(q)
      return matchSub || matchNum || matchCat
    }
    return true
  })

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'plot-status-sold'
      case 'high':
        return 'plot-status-reserved'
      case 'medium':
        return 'plot-status-available'
      default:
        return 'status-badge-neutral'
    }
  }

  const formatCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'savings_query':
        return 'Savings & Deposits'
      case 'plot_reservation':
        return 'Plot Reservation'
      case 'title_deed':
        return 'Title Deed Transfer'
      case 'construction_snag':
        return 'Construction & Snags'
      case 'payment_issue':
        return 'Payment & Billing'
      default:
        return 'General Query'
    }
  }

  return (
    <div className="vault-container">
      {/* Header & Metric Cards */}
      <div className="plots-header-row">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
            Customer Support & Concierge Ticketing
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Get direct assistance from your dedicated estate manager, account officer, and construction engineers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="portal-btn-secondary"
            onClick={fetchTickets}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <MdRefresh /> Refresh
          </button>
          <button
            className="portal-btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <MdAdd /> Open New Ticket
          </button>
        </div>
      </div>

      {/* Metric Stat Boxes */}
      <div className="statement-summary-boxes">
        <div className="statement-box">
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Active Open Tickets</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8' }}>{openCount}</div>
        </div>
        <div className="statement-box">
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Resolved Inquiries</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>{resolvedCount}</div>
        </div>
        <div className="statement-box">
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Total Inquiries Logged</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9' }}>{tickets.length}</div>
        </div>
        <div className="statement-box">
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Average Response SLA</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa' }}>&lt; 2 hrs</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="plots-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="plots-search-box">
          <MdSearch className="plots-search-icon" />
          <input
            type="text"
            placeholder="Search tickets by title, number or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="plot-filters-row">
          <button
            className={`plot-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Tickets ({tickets.length})
          </button>
          <button
            className={`plot-filter-pill ${statusFilter === 'open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('open')}
          >
            Open / In Progress ({openCount})
          </button>
          <button
            className={`plot-filter-pill ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="plots-loading-state">
          <div className="portal-spinner" />
          <p>Loading support tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="plots-empty-state">
          <MdHelpOutline style={{ fontSize: '48px', color: '#64748b', marginBottom: '12px' }} />
          <h3>No support tickets found</h3>
          <p>
            {searchQuery
              ? 'No tickets match your search criteria.'
              : 'You have no tickets currently under this filter. Need assistance? Open a new ticket.'}
          </p>
          <button
            className="portal-btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MdAdd /> Open New Ticket
          </button>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map((t) => (
            <div
              key={t.uuid || t.id}
              className="ticket-item-card"
              onClick={() => openTicketThread(t)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                    {t.ticket_number}
                  </span>
                  <span className={`plot-status-badge ${getPriorityBadgeClass(t.priority)}`}>
                    {t.priority.toUpperCase()}
                  </span>
                  <span className={`plot-status-badge ${t.status === 'resolved' ? 'plot-status-available' : 'plot-status-reserved'}`}>
                    {t.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Category: <strong>{formatCategoryLabel(t.category)}</strong>
                  </span>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
                  {t.subject}
                </div>

                {t.last_message && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', maxWidth: '650px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    &ldquo;{t.last_message}&rdquo;
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, textAlign: 'right' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#cbd5e1', justifyContent: 'flex-end' }}>
                    <MdChatBubbleOutline /> {t.message_count || 1} msgs
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="portal-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    openTicketThread(t)
                  }}
                >
                  View Thread
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Details & Chat Thread Modal */}
      {selectedTicket && (
        <div className="portal-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div
            className="portal-modal-card"
            style={{ maxWidth: '700px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700, fontSize: '13px' }}>
                    {selectedTicket.ticket_number}
                  </span>
                  <span className={`plot-status-badge ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                    {selectedTicket.priority.toUpperCase()}
                  </span>
                  <span className={`plot-status-badge ${selectedTicket.status === 'resolved' ? 'plot-status-available' : 'plot-status-reserved'}`}>
                    {selectedTicket.status.toUpperCase()}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
                  {selectedTicket.subject}
                </h3>
              </div>
              <button className="portal-modal-close" onClick={() => setSelectedTicket(null)}>
                <MdClose />
              </button>
            </div>

            <div style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--portal-border)', fontSize: '12px', color: '#94a3b8' }}>
                <div>
                  <strong>Category:</strong> {formatCategoryLabel(selectedTicket.category)} |{' '}
                  <strong>Assigned Agent:</strong> {selectedTicket.assigned_agent || 'Concierge Team'}
                </div>
                {selectedTicket.status !== 'resolved' && (
                  <button
                    className="portal-btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px', color: '#34d399', borderColor: '#34d399' }}
                    onClick={handleCloseTicket}
                  >
                    <MdCheckCircle style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Mark Resolved
                  </button>
                )}
              </div>

              {/* Chat Thread Messages */}
              <div className="chat-thread-container">
                {threadLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div className="portal-spinner" />
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>Loading conversation history...</p>
                  </div>
                ) : (selectedTicket.messages || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    No messages yet in this ticket thread.
                  </div>
                ) : (
                  selectedTicket.messages?.map((m) => {
                    const isClient = m.sender_type === 'client'
                    return (
                      <div
                        key={m.uuid || m.id}
                        className={`chat-bubble ${isClient ? 'client' : 'agent'}`}
                      >
                        <div className="chat-sender-name">
                          {isClient ? 'You' : m.sender_name || 'Fab Homes Support Agent'}
                        </div>
                        <div>{m.message}</div>
                        <div className="chat-timestamp">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Reply Input Box */}
              {selectedTicket.status !== 'resolved' ? (
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '16px' }}>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message or clarification here..."
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--portal-border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      resize: 'none',
                    }}
                  />
                  <button
                    className="portal-btn-primary"
                    disabled={submittingReply || !replyText.trim()}
                    onClick={handleSendReply}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 16px',
                    }}
                  >
                    <MdSend /> {submittingReply ? 'Sending...' : 'Send'}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '12px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', color: '#34d399', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
                  This ticket is marked as resolved. If you need further help, please create a new inquiry.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Ticket Modal */}
      {showCreateModal && (
        <div className="portal-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="portal-modal-card"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdSupportAgent style={{ color: '#38bdf8', fontSize: '20px' }} />
                Open Support Inquiry
              </h3>
              <button className="portal-modal-close" onClick={() => setShowCreateModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g., Query regarding milestone 3 foundation certificate"
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--portal-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Inquiry Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid var(--portal-border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    <option value="savings_query">Savings & Deposits</option>
                    <option value="plot_reservation">Plot Reservation</option>
                    <option value="title_deed">Title Deed Transfer</option>
                    <option value="construction_snag">Construction & Snags</option>
                    <option value="payment_issue">Payment & Invoicing</option>
                    <option value="general">General Support</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid var(--portal-border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    <option value="low">Low - General query</option>
                    <option value="medium">Medium - Standard follow-up</option>
                    <option value="high">High - Urgent attention</option>
                    <option value="urgent">Urgent - Immediate blocker</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Please provide full details about your request, plot reference, or question..."
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--portal-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={creatingTicket}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {creatingTicket ? 'Submitting...' : 'Submit Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default ClientSupportTicketsTab
