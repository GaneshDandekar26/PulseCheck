import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../api/http';

const fetchSummary = async () => {
  const { data } = await api.get('/dashboard/summary');
  return data;
};

const StatCard = ({ label, value, unit, color, icon }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h3>{label}</h3>
      <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{icon}</span>
    </div>
    <p className={`stat-value ${color || ''}`}>
      {value}
      {unit && <span className="unit">{unit}</span>}
    </p>
  </div>
);

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
        <StatCard
          label="Total Monitors"
          value={data.totalEndpoints}
          icon="📡"
        />
        <StatCard
          label="Active Monitors"
          value={data.activeEndpoints}
          icon="✅"
        />
        <StatCard
          label="Global Uptime"
          value={data.uptimePct?.toFixed(2)}
          unit="%"
          color="success-color"
          icon="📈"
        />
        <StatCard
          label="Failure Rate"
          value={data.errorRate?.toFixed(2)}
          unit="%"
          color="error-color"
          icon="⚠️"
        />
        <StatCard
          label="Avg Latency"
          value={Math.round(data.avgLatencyMs)}
          unit="ms"
          icon="⚡"
        />
        <StatCard
          label="Total Heartbeats"
          value={data.totalLogs?.toLocaleString()}
          icon="💓"
        />
      </div>
    </div>
  );
};

export default DashboardPage;
