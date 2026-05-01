import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../api/http';

const fetchSummary = async () => {
  const { data } = await api.get('/dashboard/summary');
  return data;
};

// 1. Custom hook for count up animation
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

// 2. Updated StatCard with animations and styling
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

// --- MOCK DATA ---
const MOCK_LATENCY_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  latency: Math.floor(Math.random() * 40) + 40, // 40-80ms
})).map(d => (d.latency > 75 ? { ...d, latency: 120 } : d)); // add a few spikes

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

const MOCK_ALERTS = [
  { id: 1, title: 'API Gateway Recovered', message: 'Latency returned to normal (<100ms)', time: '10 mins ago', type: 'recovery' },
  { id: 2, title: 'Database High Latency', message: 'Read latency spiked to 450ms', time: '2 hours ago', type: 'warning' },
];

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery(['dashboard-summary'], fetchSummary, {
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="page loading-text">Loading dashboard metrics…</div>;
  if (error) return <div className="page error-text">Failed to fetch dashboard summary.</div>;

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Overview</h1>
          <p className="page-subtitle">Real-time pulse of your entire system</p>
        </div>
        <Link to="/endpoints" className="btn-primary" style={{ textDecoration: 'none' }}>
          View All Monitors →
        </Link>
      </div>

      <div className="dashboard-grid">
        <StatCard index={1} label="Total Monitors" value={data.totalEndpoints} icon="📡" color="info" />
        <StatCard index={2} label="Active Monitors" value={data.activeEndpoints} icon="✅" color="info" />
        <StatCard index={3} label="Global Uptime" value={data.uptimePct?.toFixed(2) || '0.00'} unit="%" color="success" icon="📈" />
        <StatCard index={4} label="Failure Rate" value={data.errorRate?.toFixed(2) || '0.00'} unit="%" color="error" icon="⚠️" />
        <StatCard index={5} label="Avg Latency" value={Math.round(data.avgLatencyMs) || 0} unit="ms" color="warning" icon="⚡" />
        <StatCard index={6} label="Total Heartbeats" value={data.totalLogs} icon="💓" color="info" />
      </div>

      {/* New Split Layout */}
      <div className="dashboard-split">
        {/* Left Column: Latency Chart */}
        <div className="chart-card">
          <h3>Global Latency (24h)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={MOCK_LATENCY_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#8892b0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8892b0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}ms`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorLatency)" 
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Status & Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="chart-card">
            <h3>Overall Uptime (45 days)</h3>
            <div className="uptime-bar-container">
              {MOCK_UPTIME_SEGMENTS.map((seg, i) => (
                <div 
                  key={i} 
                  className={`uptime-segment status-${seg.status}`} 
                  title={`${seg.date}\nStatus: ${seg.status.toUpperCase()}\nLatency: ${seg.latency}ms`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8892b0' }}>
              <span>45 days ago</span>
              <span>100% Uptime</span>
              <span>Today</span>
            </div>
          </div>

          <div className="chart-card" style={{ flex: 1 }}>
            <h3>Recent Alerts</h3>
            <div className="recent-alerts">
              {MOCK_ALERTS.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  <div className="alert-header">
                    <span>{alert.title}</span>
                    <span>{alert.time}</span>
                  </div>
                  <div className="alert-message">{alert.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
