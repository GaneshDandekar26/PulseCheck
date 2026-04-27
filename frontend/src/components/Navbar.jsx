import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">💓 PulseCheck</span>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
          Dashboard
        </Link>
        <Link to="/endpoints" className={`nav-link ${isActive('/endpoints')}`}>
          Monitors
        </Link>
      </div>
      <div className="navbar-actions">
        <button className="nav-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
