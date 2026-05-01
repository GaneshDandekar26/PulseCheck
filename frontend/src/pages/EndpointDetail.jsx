import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../api/http';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

// --- Reusable Components ---

const useCountUp = (endValue, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = parseFloat(endValue) || 0;
    if (end === 0) {
      setCount(endValue);
      return;
    }
    
    const isFloat = endValue.toString().includes('.');
    const totalFrames = Math.round((duration / 1000) * 60);
    let currentFrame = 0;
    
    const timer = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const currentCount = progress * end;
      
      setCount(isFloat ? currentCount.toFixed(2) : Math.floor(currentCount));
      
      if (currentFrame === totalFrames) {
        clearInterval(timer);
        setCount(endValue);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [endValue, duration]);

  return count;
};

const StatCard = ({ label, value, unit, color, icon, index }) => {
  const animatedValue = useCountUp(value, 1000);
  const colorClass = color ? `color-${color}` : 'color-info';
  
  return (
    <div className={`stat-card ${colorClass}`} style={{ animationDelay: `${index * 50}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>{label}</h3>
        <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{icon}</span>
      </div>
      <p className="stat-value">
        {animatedValue}
        {unit && <span className="unit">{unit}</span>}
      </p>
      <div className="stat-progress">
        <div className="stat-progress-bar"></div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <p style={{ color: '#8892b0', fontSize: '0.8rem', margin: '0 0 0.3rem' }}>{payload[0].payload.exactTime}</p>
        <p style={{ color: '#818cf8', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
          {payload[0].value} ms
        </p>
      </div>
    );
  }
  return null;
};

const Accordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="accordion">
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{title}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  );
};

// --- Mock Data ---
const MOCK_UPTIME_SEGMENTS = Array.from({ length: 45 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (45 - i));
  const rand = Math.random();
  let status = 'up';
  let latency = Math.floor(Math.random() * 30) + 40;
  if (rand > 0.95) { status = 'down'; latency = 0; }
  else if (rand > 0.85) { status = 'degraded'; latency = Math.floor(Math.random() * 100) + 100; }
  
  return { date: date.toLocaleDateString(), status, latency };
});

const MOCK_TIMELINE_ALERTS = [
  { id: 1, title: 'API Gateway Recovered', message: 'Latency returned to normal (<100ms)', time: '10 mins ago', type: 'recovery' },
  { id: 2, title: 'Database High Latency', message: 'Read latency spiked to 450ms', time: '2 hours ago', type: 'warning' },
  { id: 3, title: 'Connection Timeout', message: 'Endpoint unreachable (Timeout > 1000ms)', time: 'Yesterday', type: 'incident' },
];

const MOCK_RESPONSE = {
  headers: {
    "content-type": "application/json; charset=utf-8",
    "x-powered-by": "Express",
    "date": new Date().toUTCString(),
    "connection": "keep-alive"
  },
  body: {
    status: "ok",
    uptime: 1450239,
    version: "1.0.4",
    services: {
      database: "healthy",
      cache: "healthy"
    }
  }
};

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

  if (isStatsLoading || isLogsLoading) {
    return <div className="page loading-text">Loading endpoint details…</div>;
  }

  // Ensure logs are sorted oldest to newest for the chart (left to right)
  const logsArr = logsData?.results || [];
  const chartData = [...logsArr].reverse().map(log => {
    const d = new Date(log.timestamp);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exactTime: d.toLocaleString(),
      latencyMs: log.latencyMs,
      isUp: log.isUp,
    };
  });

  return (
    <div className="page fade-in">
      <Link to="/endpoints" className="btn-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        ← Back to Monitors
      </Link>
      
      <div className="detail-header-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="detail-header-info">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {endpoint?.name || 'Unknown Endpoint'}
            {endpoint?.isActive ? (
              <span className="status-badge badge-active pulsing-dot" style={{ fontSize: '0.75rem' }}>Active</span>
            ) : (
              <span className="status-badge badge-paused" style={{ fontSize: '0.75rem' }}>Paused</span>
            )}
          </h1>
          <p className="page-subtitle" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="method-badge">{endpoint?.method || 'GET'}</span>
            <span className="url-cell" style={{ display: 'inline-block', verticalAlign: 'middle', fontSize: '1rem' }}>
              {endpoint?.url || '...'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>
              • Last checked: 2 min ago
            </span>
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Pause Monitor</button>
            <button className="btn-text" style={{ border: '1px solid transparent' }}>Edit Monitor</button>
          </div>
          <div className="pill-toggle-group">
            <button className={`pill-toggle ${timeWindow === '1h' ? 'active' : ''}`} onClick={() => setTimeWindow('1h')}>1 Hour</button>
            <button className={`pill-toggle ${timeWindow === '6h' ? 'active' : ''}`} onClick={() => setTimeWindow('6h')}>6 Hours</button>
            <button className={`pill-toggle ${timeWindow === '24h' ? 'active' : ''}`} onClick={() => setTimeWindow('24h')}>24 Hours</button>
            <button className={`pill-toggle ${timeWindow === '7d' ? 'active' : ''}`} onClick={() => setTimeWindow('7d')}>7 Days</button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem', marginTop: '2rem' }}>
        <StatCard index={1} label="Total Pings" value={stats?.total || 0} icon="📡" color="info" />
        <StatCard index={2} label="Avg Latency" value={Math.round(stats?.avgLatencyMs || 0)} unit="ms" icon="⚡" color="warning" />
        <StatCard index={3} label="Uptime" value={Number(stats?.uptimePct || 0).toFixed(2)} unit="%" icon="📈" color="success" />
        <StatCard index={4} label="Error Rate" value={Number(stats?.errorRate || 0).toFixed(2)} unit="%" icon="⚠️" color="error" />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Latency Over Time</h3>
          {chartData.length > 0 ? (
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#5a6580" 
                    tick={{ fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#5a6580" 
                    tick={{ fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `${val}ms`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  
                  <ReferenceLine y={500} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '500ms', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <ReferenceLine y={1000} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '1s', fill: 'rgba(239, 68, 68, 0.6)', fontSize: 10 }} />

                  <Area 
                    type="monotone" 
                    dataKey="latencyMs" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fill="url(#latencyGradient)"
                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-muted" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📊</div>
              No log data available yet
            </div>
          )}
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Uptime Status</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--success-text)', background: 'var(--success-soft)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              30-day uptime: 100.00%
            </span>
          </div>
          <div className="uptime-bar-container">
            {MOCK_UPTIME_SEGMENTS.map((seg, i) => (
              <div 
                key={i} 
                className={`uptime-segment status-${seg.status}`} 
                title={`${seg.date}\nStatus: ${seg.status.toUpperCase()}\nLatency: ${seg.latency}ms`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem' }} className="text-muted">
            <span>45 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="dashboard-split" style={{ marginTop: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
        {/* Alerts Timeline */}
        <div className="chart-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '2rem', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
            Alert History
          </h3>
          <div className="timeline">
            {MOCK_TIMELINE_ALERTS.map(alert => (
              <div key={alert.id} className={`timeline-item ${alert.type}`}>
                <div className="timeline-dot" />
                <div className="timeline-header">
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{alert.title}</span>
                  <span className="timeline-time">{alert.time}</span>
                </div>
                <div className="timeline-desc">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Preview */}
        <div>
          <Accordion title="Response Preview (Last Successful Ping)">
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="status-badge badge-active" style={{ background: '#10b981', color: '#fff', border: 'none' }}>200 OK</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Fetched at {new Date().toLocaleTimeString()}</span>
            </div>
            
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Response Headers</h4>
            <div className="code-block" style={{ marginBottom: '1.5rem' }}>
              {Object.entries(MOCK_RESPONSE.headers).map(([k, v]) => (
                <div key={k}><span style={{ color: '#79c0ff' }}>{k}</span>: <span style={{ color: '#a5d6ff' }}>{v}</span></div>
              ))}
            </div>

            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Response Body</h4>
            <pre className="code-block" style={{ margin: 0, color: '#d2a8ff' }}>
              {JSON.stringify(MOCK_RESPONSE.body, null, 2)}
            </pre>
          </Accordion>
        </div>
      </div>

    </div>
  );
};

export default EndpointDetail;
