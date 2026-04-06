import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../api/http';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const EndpointDetail = () => {
  const { id } = useParams();
  const [timeWindow, setTimeWindow] = useState('1h');

  // Fetch Endpoint details (from list)
  const { data: endpoints = [] } = useQuery(['endpoints'], async () => {
    const { data } = await api.get('/endpoints');
    return data;
  });
  const endpoint = endpoints.find(e => e._id === id);

  // Fetch Stats (reacts to timeWindow)
  const { data: stats, isLoading: isStatsLoading } = useQuery(
    ['endpointStats', id, timeWindow],
    async () => {
      const { data } = await api.get(`/endpoints/${id}/stats?window=${timeWindow}`);
      return data;
    }
  );

  // Fetch Logs (we'll fetch a fixed 100 for the Linechart & Uptime bar)
  const { data: logsData, isLoading: isLogsLoading } = useQuery(
    ['endpointLogs', id],
    async () => {
      const { data } = await api.get(`/endpoints/${id}/logs?limit=100&page=1`);
      return data;
    }
  );

  // Fetch Alerts
  const { data: alertsData, isLoading: isAlertsLoading } = useQuery(
    ['endpointAlerts', id],
    async () => {
      const { data } = await api.get(`/alerts/${id}/history?limit=50`);
      return data;
    }
  );

  if (isStatsLoading || isLogsLoading || isAlertsLoading) {
    return <div className="page loading-text">Loading endpoint details...</div>;
  }

  // Ensure logs are sorted oldest to newest for the chart (left to right)
  const logsArr = logsData?.results || [];
  const chartData = [...logsArr].reverse().map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latencyMs: log.latencyMs,
    isUp: log.isUp,
  }));

  const alerts = alertsData?.results || [];

  return (
    <div className="page fade-in">
      <Link to="/dashboard" className="btn-text" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
        &larr; Back to Dashboard
      </Link>
      
      <div className="detail-header-wrapper">
        <div className="detail-header-info">
          <h1>
            {endpoint?.name || 'Unknown Endpoint'}
            {endpoint?.isActive ? (
              <span className="status-badge badge-active" style={{ fontSize: '0.9rem' }}>Active</span>
            ) : (
              <span className="status-badge badge-paused" style={{ fontSize: '0.9rem' }}>Paused</span>
            )}
          </h1>
          <p className="page-subtitle" style={{ marginTop: '0.5rem' }}>
            <span className="method-badge" style={{ marginRight: '0.75rem' }}>{endpoint?.method || 'GET'}</span>
            <span className="url-cell" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
              {endpoint?.url || '...'}
            </span>
          </p>
        </div>
        
        <div>
          <select 
            className="time-window-select" 
            value={timeWindow} 
            onChange={(e) => setTimeWindow(e.target.value)}
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <h3>Total Pings ({timeWindow})</h3>
          <p className="stat-value">{stats?.total || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Avg Latency</h3>
          <p className="stat-value">{Math.round(stats?.avgLatencyMs || 0)} <span className="unit">ms</span></p>
        </div>
        <div className="stat-card">
          <h3>Uptime</h3>
          <p className="stat-value">{Number(stats?.uptimePct || 0).toFixed(2)}%</p>
        </div>
        <div className="stat-card">
          <h3>Error Rate</h3>
          <p className="stat-value">{Number(stats?.errorRate || 0).toFixed(2)}%</p>
        </div>
      </div>

      <div className="charts-grid">
        {/* Latency Chart */}
        <div className="chart-card">
          <h3>Latency Over Time (Recent)</h3>
          {chartData.length > 0 ? (
            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="latencyMs" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No log data available yet.</div>
          )}
        </div>

        {/* Custom Uptime Bar */}
        <div className="chart-card">
          <h3>Recent Uptime Status</h3>
          <div className="uptime-bar-container">
            {chartData.length > 0 ? (
              chartData.map((log, index) => (
                <div 
                  key={index} 
                  className={`uptime-segment ${log.isUp ? 'up' : 'down'}`} 
                  title={`Time: ${log.time} | Status: ${log.isUp ? 'Up' : 'Down'} | Latency: ${log.latencyMs}ms`}
                />
              ))
            ) : (
              <div className="uptime-segment" />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.85rem' }} className="text-muted">
            <span>Older</span>
            <span>Newer</span>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontWeight: 600 }}>Alert History</h3>
        
        {alerts.length === 0 ? (
          <div className="text-muted" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            No alerts triggered.
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Triggered At</th>
                <th>Resolved At</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => (
                <tr key={alert._id}>
                  <td>
                    <span className={`alert-type-badge alert-type-${alert.alertRuleId?.type || 'unknown'}`}>
                      {alert.alertRuleId?.type || 'Unknown'}
                    </span>
                  </td>
                  <td>{new Date(alert.triggeredAt).toLocaleString()}</td>
                  <td>
                    {alert.resolvedAt 
                      ? new Date(alert.resolvedAt).toLocaleString() 
                      : <span className="text-danger">Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default EndpointDetail;
