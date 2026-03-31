import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/http';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/auth/register', { email: email.trim(), password });
      setMessage('Registration successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="page">
      <h1>Register</h1>
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
        {message && <p className="success">{message}</p>}
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
