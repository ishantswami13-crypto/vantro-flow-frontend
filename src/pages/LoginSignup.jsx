import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function LoginSignup({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        const response = await axios.post(`${API_BASE}/api/auth/signup`, {
          email, phone, business_name: businessName
        });
        onLogin(response.data.user);
      } else {
        const response = await axios.post(`${API_BASE}/api/auth/login`, { email });
        onLogin(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🚀 Vantro Flow</h1>
        <p>Collections Management for Indian MSMEs</p>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <input type="text" placeholder="Business Name" value={businessName}
                onChange={(e) => setBusinessName(e.target.value)} required />
              <input type="tel" placeholder="Phone Number" value={phone}
                onChange={(e) => setPhone(e.target.value)} required />
            </>
          )}
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="toggle-auth">
          {isSignup ? 'Already have account? ' : "Don't have account? "}
          <button type="button" onClick={() => setIsSignup(!isSignup)} className="link-btn">
            {isSignup ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginSignup;
