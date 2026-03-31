import { useQuery } from 'react-query';
import api from '../api/http';

const fetchSummary = async () => {
  const { data } = await api.get('/dashboard/summary');
  return data;
};

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery(['dashboard-summary'], fetchSummary, {
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="page loading-text">Loading dashboard metrics...</div>;
  if (error) return <div className="page error-text">Failed to fetch dashboard summary.</div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Overview</h1>
        <p className="page-subtitle">Real-time pulse of your entire system.</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Monitors</h3>
          <p className="stat-value">{data.totalEndpoints}</p>
        </div>
        <div className="stat-card">
          <h3>Active Monitors</h3>
          <p className="stat-value">{data.activeEndpoints}</p>
        </div>
        <div className="stat-card">
          <h3>Global Uptime</h3>
          <p className="stat-value success-color">
            {data.uptimePct?.toFixed(2)}<span className="unit">%</span>
          </p>
        </div>
        <div className="stat-card">
          <h3>Failure Rate</h3>
          <p className="stat-value error-color">
            {data.errorRate?.toFixed(2)}<span className="unit">%</span>
          </p>
        </div>
        <div className="stat-card">
          <h3>Average Latency</h3>
          <p className="stat-value">
            {Math.round(data.avgLatencyMs)}<span className="unit">ms</span>
          </p>
        </div>
        <div className="stat-card">
          <h3>Total Heartbeats</h3>
          <p className="stat-value">{data.totalLogs}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
