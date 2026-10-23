import React, { useState } from 'react'
import { ClientLandTitleDeedsTab } from '../client-portal/components/ClientLandTitleDeedsTab'
import { useNavigate } from 'react-router-dom'
import { MdLandscape, MdVerified, MdMap } from 'react-icons/md'

export const LandTitlesPage: React.FC = () => {
  const navigate = useNavigate()
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const handleNotify = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px', color: '#0d9488' }}><MdVerified /></span>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Land Titles & Cadastral Deeds Management
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>
            Surveyor Department: Track Mailo, Freehold, Leasehold titles, deed plan approvals, beacon coordinates, and client handovers across Fab Homes estates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/estate-map')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <MdMap /> View Estate Map
          </button>
          <button
            onClick={() => navigate('/plots')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <MdLandscape /> Plots & Allocations
          </button>
        </div>
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

      {/* Embedded High-Fidelity Deeds Engine */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '20px' }}>
        <ClientLandTitleDeedsTab
          onNotify={handleNotify}
          onExplorePlots={() => navigate('/plots')}
        />
      </div>
    </div>
  )
}

export default LandTitlesPage
