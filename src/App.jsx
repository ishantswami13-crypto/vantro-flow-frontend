import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import LoginSignup from './pages/LoginSignup';
import Dashboard from './pages/Dashboard';
import PriorityList from './pages/PriorityList';
import MessageGenerator from './pages/MessageGenerator';
import Metrics from './pages/Metrics';
import CallHistory from './pages/CallHistory';
import PaymentTracking from './pages/PaymentTracking';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Prospects from './pages/Prospects';
import CashForecast from './pages/CashForecast';
import Pricing from './pages/Pricing';
import AIChat from './components/AIChat';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageKey, setPageKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('vantro_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll reveal: observe all .reveal elements, add .visible when in view
  const initScrollReveal = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observerRef.current.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    // Observe after a brief delay so the new page DOM is painted
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => {
        observerRef.current.observe(el);
      });
    }, 80);
  }, []);

  useEffect(() => {
    if (user) initScrollReveal();
    return () => observerRef.current?.disconnect();
  }, [currentPage, pageKey, user, initScrollReveal]);

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

  const navigate = (page) => {
    setCurrentPage(page);
    setPageKey(k => k + 1);
    setMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <LoginSignup onLogin={handleLogin} />;

  const morePages = ['inventory', 'metrics', 'prospects', 'forecast', 'pricing'];
  const isMoreActive = morePages.includes(currentPage);

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="logo">🚀 Vantro Flow</h1>
          <nav className="nav-links">
            <button
              className={currentPage === 'dashboard' ? 'active' : ''}
              onClick={() => navigate('dashboard')}
            >📊 Dashboard</button>

            <div className="nav-group nav-group-green">
              <button
                className={currentPage === 'payments' ? 'active' : ''}
                onClick={() => navigate('payments')}
              >💰 Payments</button>
              <button
                className={currentPage === 'calls' ? 'active' : ''}
                onClick={() => navigate('calls')}
              >📞 Calls</button>
            </div>

            <div className="nav-group nav-group-blue">
              <button
                className={currentPage === 'priority' ? 'active' : ''}
                onClick={() => navigate('priority')}
              >🎯 Priority</button>
              <button
                className={currentPage === 'message' ? 'active' : ''}
                onClick={() => navigate('message')}
              >💬 Messages</button>
              <button
                className={currentPage === 'analytics' ? 'active' : ''}
                onClick={() => navigate('analytics')}
              >📈 Analytics</button>
            </div>

            <div className="nav-more" ref={moreRef}>
              <button
                className={`more-btn ${isMoreActive ? 'active' : ''}`}
                onClick={() => setMoreOpen(o => !o)}
              >⋯ More</button>
              {moreOpen && (
                <div className="more-dropdown">
                  <button onClick={() => navigate('prospects')}>🎯 CRM Prospects</button>
                  <button onClick={() => navigate('forecast')}>💰 Cash Forecast</button>
                  <button onClick={() => navigate('pricing')}>💳 Pricing</button>
                  <div className="more-dropdown-divider" />
                  <button onClick={() => navigate('inventory')}>📦 Inventory</button>
                  <button onClick={() => navigate('metrics')}>📊 Metrics</button>
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </nav>
        </div>
      </header>
      <AIChat user={user} onNavigate={navigate} />
      <main className="main-content">
        <div className="user-greeting reveal">
          <p>Welcome, <strong>{user.business_name}</strong> 👋</p>
        </div>
        <div key={pageKey} className="page-enter">
          {currentPage === 'dashboard' && <Dashboard user={user} onNavigate={navigate} />}
          {currentPage === 'priority' && <PriorityList user={user} onSelectCustomer={() => navigate('message')} />}
          {currentPage === 'message' && <MessageGenerator user={user} />}
          {currentPage === 'payments' && <PaymentTracking user={user} />}
          {currentPage === 'calls' && <CallHistory user={user} />}
          {currentPage === 'inventory' && <Inventory user={user} />}
          {currentPage === 'analytics' && <Analytics user={user} />}
          {currentPage === 'metrics' && <Metrics user={user} />}
          {currentPage === 'prospects' && <Prospects user={user} />}
          {currentPage === 'forecast' && <CashForecast user={user} />}
          {currentPage === 'pricing' && <Pricing />}
        </div>
      </main>
    </div>
  );
}

export default App;
