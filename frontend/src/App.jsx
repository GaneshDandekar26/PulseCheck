import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import EndpointDetail from './pages/EndpointDetail';
import EndpointsPage from './pages/Endpoints';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected Routes wrapped with PrivateRoute */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/endpoints" element={<PrivateRoute><EndpointsPage /></PrivateRoute>} />
      <Route path="/endpoints/:id" element={<PrivateRoute><EndpointDetail /></PrivateRoute>} />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
