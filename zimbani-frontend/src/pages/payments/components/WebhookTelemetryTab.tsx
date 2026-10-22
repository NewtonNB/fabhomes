import React, { useState, useEffect, useCallback } from 'react'
import {
  MdSecurity,
  MdVerified,
  MdWarning,
  MdRefresh,
  MdSearch,
  MdVisibility,
  MdReplay,
  MdClose,
  MdTimer,
  MdBlock,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  PaymentWebhookLog,
  WebhookMetrics,
} from '../../../types/payment-integration.types'
import './WebhookTelemetryTab.css'

export const WebhookTelemetryTab: React.FC = () => {
  const [logs, setLogs] = useState<PaymentWebhookLog[]>([])
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null)
  const [selectedLog, setSelectedLog] = useState<PaymentWebhookLog | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Load telemetry logs & metrics
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [logsRes, metricsRes] = await Promise.all([
        paymentIntegrationService.getWebhookLogs({
          provider: selectedProvider || undefined,
          status: selectedStatus || undefined,
          search: searchTerm || undefined,
          per_page: 50,
        }),
        paymentIntegrationService.getWebhookMetrics().catch(() => null),
      ])

      setLogs(logsRes.data || [])
      if (metricsRes) setMetrics(metricsRes)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load webhook logs',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedProvider, selectedStatus, searchTerm])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear feedback after 6s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Handle Manual Retry
  const handleRetry = async (id: number) => {
    try {
      setActionLoading(true)
      const res = await paymentIntegrationService.retryWebhook(id)
      setFeedback({ type: 'success', text: res.message || 'Webhook reprocessed successfully!' })
      if (selectedLog && selectedLog.id === id) {
        setSelectedLog(null)
      }
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to retry webhook',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="wht-container">
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Security & Ingestion KPI Bar */}
      {metrics && (
        <div className="wht-metrics-grid">
          <div className="wht-metric-card">
            <div className="wht-metric-header">
              <span className="wht-metric-title">Total Webhooks Ingested</span>
              <span style={{ color: '#0284c7', fontSize: '20px' }}>
                <MdSecurity />
              </span>
            </div>
            <div className="wht-metric-val">{metrics.total_webhooks_received}</div>
            <div className="wht-metric-subtext">All provider events captured</div>
          </div>

          <div className="wht-metric-card">
            <div className="wht-metric-header">
              <span className="wht-metric-title">Average Latency</span>
              <span style={{ color: '#16a34a', fontSize: '20px' }}>
                <MdTimer />
              </span>
            </div>
            <div className="wht-metric-val">{metrics.average_latency_ms} ms</div>
            <div className="wht-metric-subtext">Time to verify & post ledger</div>
          </div>

          <div className="wht-metric-card">
            <div className="wht-metric-header">
              <span className="wht-metric-title">Replay Attacks Blocked</span>
              <span style={{ color: '#d97706', fontSize: '20px' }}>
                <MdBlock />
              </span>
            </div>
            <div className="wht-metric-val">{metrics.replay_attacks_blocked}</div>
            <div className="wht-metric-subtext">Duplicate payloads discarded</div>
          </div>

          <div className="wht-metric-card">
            <div className="wht-metric-header">
              <span className="wht-metric-title">Signature Rejections</span>
              <span style={{ color: '#b91c1c', fontSize: '20px' }}>
                <MdWarning />
              </span>
            </div>
            <div className="wht-metric-val">{metrics.signature_rejections_count}</div>
            <div className="wht-metric-subtext">Untrusted / forged signatures</div>
          </div>

          <div className="wht-metric-card">
            <div className="wht-metric-header">
              <span className="wht-metric-title">Ingestion Success Rate</span>
              <span style={{ color: '#15803d', fontSize: '20px' }}>
                <MdVerified />
              </span>
            </div>
            <div className="wht-metric-val">{metrics.success_rate_percentage}%</div>
            <div className="wht-metric-subtext">Processed vs Failed</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="wht-filter-bar">
        <div className="wht-filter-group">
          <select
            className="dossier-input"
            style={{ width: 'auto' }}
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="">All Gateway Providers</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="pesapal">Pesapal</option>
            <option value="mtn_momo">MTN Mobile Money</option>
            <option value="airtel_money">Airtel Money</option>
            <option value="bank_transfer">Stanbic Bank EFT</option>
          </select>

          <select
            className="dossier-input"
            style={{ width: 'auto' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="processed">Processed</option>
            <option value="received">Received</option>
            <option value="failed">Failed / Dead-Letter</option>
            <option value="ignored">Ignored (Replay)</option>
          </select>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MdSearch
              style={{ position: 'absolute', left: '10px', color: '#94a3b8', fontSize: '18px' }}
            />
            <input
              type="text"
              placeholder="Search reference, IP, hash..."
              className="dossier-input"
              style={{ paddingLeft: '32px', width: '240px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={loadData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <MdRefresh /> Refresh Stream
        </button>
      </div>

      {/* Webhook Logs Table */}
      <div className="wht-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="wht-table">
            <thead>
              <tr>
                <th>Provider Driver</th>
                <th>Event Type</th>
                <th>External Ref / ID</th>
                <th>Cryptographic Seal</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Source IP</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No webhook telemetry events recorded matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <code style={{ fontSize: '12px', fontWeight: 700 }}>{log.provider}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#334155' }}>
                        {log.event_type || 'charge.event'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {log.external_reference || '—'}
                    </td>
                    <td>
                      {log.signature_valid ? (
                        <span className="badge-signature-valid">
                          <MdVerified /> Valid HMAC
                        </span>
                      ) : (
                        <span className="badge-signature-invalid">
                          <MdWarning /> Invalid
                        </span>
                      )}
                    </td>
                    <td>
                      {log.is_replay ? (
                        <span className="badge-replay">Replay Blocked</span>
                      ) : (
                        <span className={`status-badge ${log.status}`}>
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {log.processing_duration_ms > 0 ? `${log.processing_duration_ms} ms` : '< 1 ms'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => setSelectedLog(log)}
                          title="Inspect raw webhook payload & headers"
                        >
                          <MdVisibility />
                        </button>

                        {log.status === 'failed' && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#2563eb' }}
                            onClick={() => handleRetry(log.id)}
                            title="Retry dead-letter webhook"
                            disabled={actionLoading}
                          >
                            <MdReplay /> Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Webhook Payload & Headers Modal */}
      {selectedLog && (
        <div className="wht-modal-overlay">
          <div className="wht-modal-card">
            <div className="wht-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                  Webhook Event Telemetry ({selectedLog.provider})
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  UUID: {selectedLog.uuid} | Received: {new Date(selectedLog.created_at).toLocaleString()}
                </div>
              </div>

              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '20px',
                }}
                onClick={() => setSelectedLog(null)}
              >
                <MdClose />
              </button>
            </div>

            <div className="wht-modal-body">
              {/* Security Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Signature Valid:</span>{' '}
                  <strong>{selectedLog.signature_valid ? 'YES' : 'NO'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Is Replay Attack:</span>{' '}
                  <strong>{selectedLog.is_replay ? 'YES' : 'NO'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>IP Whitelisted:</span>{' '}
                  <strong>{selectedLog.ip_whitelisted ? 'YES' : 'NO'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Latency:</span>{' '}
                  <strong>{selectedLog.processing_duration_ms} ms</strong>
                </div>
              </div>

              {/* Error Trace if failed */}
              {selectedLog.processing_error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#991b1b',
                    fontSize: '13px',
                  }}
                >
                  <strong>Processing Error:</strong> {selectedLog.processing_error}
                  {selectedLog.next_retry_at && (
                    <div style={{ marginTop: '4px', fontSize: '12px' }}>
                      Next Scheduled Auto-Retry: {new Date(selectedLog.next_retry_at).toLocaleString()} (Retry #{selectedLog.retry_count}/{selectedLog.max_retries})
                    </div>
                  )}
                </div>
              )}

              {/* Headers */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  HTTP Request Headers
                </label>
                <pre className="wht-json-viewer">
                  {JSON.stringify(selectedLog.headers, null, 2)}
                </pre>
              </div>

              {/* Payload */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Raw Ingested JSON Payload
                </label>
                <pre className="wht-json-viewer">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div
              style={{
                padding: '14px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Payload Hash: <code>{selectedLog.payload_hash || '—'}</code>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </button>
                {selectedLog.status === 'failed' && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleRetry(selectedLog.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Retrying...' : 'Retry Ingestion'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WebhookTelemetryTab
