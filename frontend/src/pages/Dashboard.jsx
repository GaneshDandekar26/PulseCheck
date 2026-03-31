import { useQuery } from 'react-query';
import api from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const fetchSummary = async () => {
  const { data } = await api.get('/dashboard/summary');
  return data;
};

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery(['dashboard-summary'], fetchSummary);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) return <div className="page">Loading...</div>;
  if (error) return <div className="page">Failed to load dashboard</div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button className="auth-btn" style={{ width: 'auto', padding: '0.6rem 1.2rem', marginTop: 0 }} onClick={handleLogout}>Logout</button>
      </div>
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
