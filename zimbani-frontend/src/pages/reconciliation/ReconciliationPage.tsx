import React, { useState, useEffect } from 'react'
import { MdCompareArrows, MdAccountBalance, MdLayers } from 'react-icons/md'
import { PaymentSimulationReconciliationTab } from '../payments/components/PaymentSimulationReconciliationTab'
import { EscrowReconciliationTab } from '../milestone-releases/components/EscrowReconciliationTab'
import { projectService } from '../../services/project.service'
import { Project } from '../../types/project.types'

export const ReconciliationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bank_batches' | 'escrow_reconciliation'>('bank_batches')
  const [projects, setProjects] = useState<Project[]>([])
  const [_loadingProjects, setLoadingProjects] = useState<boolean>(false)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true)
        const res = await projectService.getProjects({ per_page: 100 })
        setProjects(res.data || [])
      } catch (err) {
        console.error('Failed to load projects for escrow reconciliation', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'UGX') => {
    const val = Number(amount || 0)
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px', color: '#0d9488' }}>
            <MdCompareArrows />
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Reconciliation & Audit Clearing Desk
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>
          Reconciliation Manager & Finance Department: Cross-verify external bank statements (Stanbic Bank, Centenary Bank), Mobile Money settlements (MTN MoMo, Airtel Money), and escrow milestone release allocations against the Zimbani ledger.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActiveTab('bank_batches')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'bank_batches' ? '3px solid #0d9488' : '3px solid transparent',
            color: activeTab === 'bank_batches' ? '#0d9488' : '#64748b',
            fontWeight: activeTab === 'bank_batches' ? '600' : '500',
            cursor: 'pointer',
            fontSize: '15px',
            marginBottom: '-2px',
          }}
        >
          <MdAccountBalance /> Bank & MoMo Statement Batches
        </button>

        <button
          onClick={() => setActiveTab('escrow_reconciliation')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'escrow_reconciliation' ? '3px solid #0d9488' : '3px solid transparent',
            color: activeTab === 'escrow_reconciliation' ? '#0d9488' : '#64748b',
            fontWeight: activeTab === 'escrow_reconciliation' ? '600' : '500',
            cursor: 'pointer',
            fontSize: '15px',
            marginBottom: '-2px',
          }}
        >
          <MdLayers /> Escrow Account & Milestone Matching
        </button>
      </div>

      {/* Main Tab Content */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '24px',
          minHeight: '600px',
        }}
      >
        {activeTab === 'bank_batches' ? (
          <PaymentSimulationReconciliationTab />
        ) : (
          <EscrowReconciliationTab
            projects={projects}
            filterProject=""
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  )
}

export default ReconciliationPage
