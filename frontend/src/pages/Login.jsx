import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/http';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="card">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required pattern="^\S+@\S+\.\S+$" title="Please enter a valid email address with a domain (e.g., test@example.com)" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
};

export default LoginPage;
