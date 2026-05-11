import React, { useState, useEffect } from 'react';
import './App.css';
import LoginSignup from './pages/LoginSignup';
import Dashboard from './pages/Dashboard';
import PriorityList from './pages/PriorityList';
import MessageGenerator from './pages/MessageGenerator';
import Metrics from './pages/Metrics';
import CallHistory from './pages/CallHistory';
import PaymentTracking from './pages/PaymentTracking';
import Analytics from './pages/Analytics';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('vantro_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('vantro_user', JSON.stringify(userData));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vantro_user');
    setCurrentPage('login');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <LoginSignup onLogin={handleLogin} />;

  const navItems = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'priority', label: '📞 Priority List' },
    { key: 'message', label: '💬 Messages' },
    { key: 'payments', label: '💰 Payments' },
    { key: 'calls', label: '📋 Call History' },
    { key: 'analytics', label: '📈 Analytics' },
    { key: 'metrics', label: '🎯 Metrics' },
  ];

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="logo">🚀 Vantro Flow</h1>
          <nav className="nav-links">
            {navItems.map(item => (
              <button
                key={item.key}
                className={currentPage === item.key ? 'active' : ''}
                onClick={() => setCurrentPage(item.key)}
              >
                {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </nav>
        </div>
      </header>
      <main className="main-content">
        <div className="user-greeting">
          <p>Welcome, <strong>{user.business_name}</strong> 👋</p>
        </div>
        {currentPage === 'dashboard' && <Dashboard user={user} />}
        {currentPage === 'priority' && <PriorityList user={user} onSelectCustomer={() => setCurrentPage('message')} />}
        {currentPage === 'message' && <MessageGenerator user={user} />}
        {currentPage === 'payments' && <PaymentTracking user={user} />}
        {currentPage === 'calls' && <CallHistory user={user} />}
        {currentPage === 'analytics' && <Analytics user={user} />}
        {currentPage === 'metrics' && <Metrics user={user} />}
      </main>
    </div>
  );
}

export default App;
