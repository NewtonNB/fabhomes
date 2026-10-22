import React, { useState, useEffect, useCallback } from 'react'
import {
  MdRefresh,
  MdSpeed,
  MdSensors,
  MdCreditCard,
  MdPhoneAndroid,
  MdAccountBalance,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  GatewayHealthSummary,
  GatewayHealthItem,
} from '../../../types/payment-integration.types'
import './GatewayHealthMonitor.css'

export const GatewayHealthMonitor: React.FC = () => {
  const [summary, setSummary] = useState<GatewayHealthSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [pingingAll, setPingingAll] = useState<boolean>(false)
  const [pingingGateway, setPingingGateway] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadHealth = useCallback(async () => {
    try {
      setLoading(true)
      const data = await paymentIntegrationService.getGatewayHealth()
      setSummary(data)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load gateway health metrics',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  const handlePingSingle = async (name: string) => {
    try {
      setPingingGateway(name)
      const res = await paymentIntegrationService.pingGateway(name)
      setFeedback({
        type: 'success',
        text: `${name.toUpperCase()} Ping: ${res.status.toUpperCase()} (${res.latency_ms} ms)`,
      })
      loadHealth()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Ping failed for ${name}: ${err.message}`,
      })
    } finally {
      setPingingGateway(null)
    }
  }

  const handlePingAll = async () => {
    try {
      setPingingAll(true)
      await paymentIntegrationService.pingAllGateways()
      setFeedback({
        type: 'success',
        text: 'All payment gateway adapters pinged successfully. Telemetry refreshed.',
      })
      loadHealth()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Batch ping failed: ${err.message}`,
      })
    } finally {
      setPingingAll(false)
    }
  }

  const getLatencyClass = (ms: number) => {
    if (ms < 150) return 'ghm-latency-fast'
    if (ms < 350) return 'ghm-latency-med'
    return 'ghm-latency-slow'
  }

  const getGatewayIcon = (name: string) => {
    switch (name) {
      case 'flutterwave':
      case 'pesapal':
        return <MdCreditCard size={20} color="#0284c7" />
      case 'mtn_momo':
      case 'airtel_money':
        return <MdPhoneAndroid size={20} color="#eab308" />
      case 'bank_transfer':
        return <MdAccountBalance size={20} color="#059669" />
      default:
        return <MdSensors size={20} color="#64748b" />
    }
  }

  return (
    <div className="ghm-container">
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="ghm-header-card">
        <div className="ghm-header-left">
          <h3 className="ghm-title">Gateway Health & Infrastructure SLA Monitor</h3>
          <p className="ghm-subtitle">
            Real-time ping probes, API endpoint availability, and round-trip latency benchmarks
          </p>
        </div>

        <div className="ghm-header-metrics">
          {summary && (
            <>
              <div
                className={`ghm-status-pill ghm-status-${summary.overall_status}`}
              >
                <span className="ghm-pulse-dot" />
                {summary.overall_status === 'operational'
                  ? 'All Gateways Operational'
                  : summary.overall_status === 'degraded'
                  ? 'Degraded Performance'
                  : 'Critical Outage'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <MdSpeed size={18} color="#64748b" />
                <span style={{ color: '#64748b' }}>Avg Latency:</span>
                <strong style={{ fontFamily: 'monospace' }}>{summary.average_latency_ms} ms</strong>
              </div>
            </>
          )}

          <button
            className="btn-primary"
            onClick={handlePingAll}
            disabled={pingingAll || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
          >
            <MdRefresh className={pingingAll ? 'ghm-spin' : ''} />
            {pingingAll ? 'Testing All...' : 'Ping All Gateways'}
          </button>
        </div>
      </div>

      {/* Gateways Grid */}
      {summary && (
        <div className="ghm-grid">
          {summary.gateways.map((gw: GatewayHealthItem) => (
            <div key={gw.id} className="ghm-card">
              <div>
                <div className="ghm-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getGatewayIcon(gw.name)}
                    <div>
                      <div className="ghm-gw-name">{gw.display_name.split(' (')[0]}</div>
                      <div className="ghm-gw-type">{gw.provider_type} · {gw.environment}</div>
                    </div>
                  </div>
                  <span
                    className={`ghm-status-pill ghm-status-${gw.status}`}
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    {gw.status}
                  </span>
                </div>

                <div className="ghm-card-metrics" style={{ marginTop: '16px' }}>
                  <div className="ghm-metric-row">
                    <span className="ghm-metric-label">Ping Latency:</span>
                    <span className={`ghm-latency-pill ${getLatencyClass(gw.latency_ms)}`}>
                      {gw.latency_ms} ms
                    </span>
                  </div>

                  <div className="ghm-metric-row">
                    <span className="ghm-metric-label">Uptime SLA:</span>
                    <span className="ghm-metric-val">{gw.uptime_percentage}%</span>
                  </div>

                  <div className="ghm-metric-row">
                    <span className="ghm-metric-label">Methods:</span>
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                      {gw.supported_methods.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ghm-card-bottom">
                <span className="ghm-last-check">
                  {gw.last_ping_at
                    ? `Checked ${new Date(gw.last_ping_at).toLocaleTimeString()}`
                    : 'Awaiting probe'}
                </span>

                <button
                  className="ghm-ping-btn"
                  onClick={() => handlePingSingle(gw.name)}
                  disabled={pingingGateway === gw.name || pingingAll}
                >
                  <MdRefresh className={pingingGateway === gw.name ? 'ghm-spin' : ''} />
                  {pingingGateway === gw.name ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Telemetry Logs */}
      {summary && summary.recent_logs && summary.recent_logs.length > 0 && (
        <div className="ghm-logs-table-container">
          <div className="ghm-logs-header">
            <h4 className="ghm-logs-title">Recent Gateway Probe Telemetry Logs</h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing last {summary.recent_logs.length} health checks
            </span>
          </div>

          <table className="ghm-table">
            <thead>
              <tr>
                <th>Gateway</th>
                <th>Status</th>
                <th>Latency (ms)</th>
                <th>HTTP Code</th>
                <th>Endpoint Tested</th>
                <th>Message</th>
                <th>Checked At</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {log.gateway_name.toUpperCase()}
                  </td>
                  <td>
                    <span
                      className={`ghm-status-pill ghm-status-${log.status}`}
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td>
                    <span className={`ghm-latency-pill ${getLatencyClass(log.latency_ms)}`}>
                      {log.latency_ms} ms
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{log.http_status || 200}</td>
                  <td style={{ color: '#64748b', fontSize: '11px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.endpoint_tested || 'Default API'}
                  </td>
                  <td style={{ color: '#334155' }}>{log.message}</td>
                  <td style={{ color: '#64748b', fontSize: '11px' }}>
                    {new Date(log.checked_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default GatewayHealthMonitor
