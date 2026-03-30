import { useQuery } from 'react-query';
import api from '../api/http';

const fetchSummary = async () => {
  const { data } = await api.get('/dashboard/summary');
  return data;
};

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery(['dashboard-summary'], fetchSummary);

  if (isLoading) return <div className="page">Loading...</div>;
  if (error) return <div className="page">Failed to load dashboard</div>;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <div className="card">
        <p>Total endpoints: {data.totalEndpoints}</p>
        <p>Active endpoints: {data.activeEndpoints}</p>
        <p>Total logs: {data.totalLogs}</p>
        <p>Avg latency: {Math.round(data.avgLatencyMs)} ms</p>
        <p>Uptime: {data.uptimePct?.toFixed(2)}%</p>
        <p>Error rate: {data.errorRate?.toFixed(2)}%</p>
      </div>
    </div>
  );
};

export default DashboardPage;
