import React, { useState } from 'react'
import { MdSupportAgent } from 'react-icons/md'
import { ClientSupportTicketsTab } from '../client-portal/components/ClientSupportTicketsTab'

export const SupportTicketsPage: React.FC = () => {
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const handleNotify = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px', color: '#0d9488' }}>
            <MdSupportAgent />
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Client Support & Service Desk
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>
          Customer Support & Client Relationship Management: Respond to diaspora and local subscriber inquiries, clarify savings scheme balances, assist with plot reservations, and expedite title deed documentation.
        </p>
      </div>

      {notification && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Main Support Tickets Component */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '20px',
          minHeight: '650px',
        }}
      >
        <ClientSupportTicketsTab onNotify={handleNotify} />
      </div>
    </div>
  )
}

export default SupportTicketsPage
