import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const INDUSTRY_RATE = 40;

function HeroMetrics({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/api/metrics/${user.id}`),
      axios.get(`${API_BASE}/api/analytics/${user.id}`)
    ]).then(([m, a]) => {
      setMetrics(m.data.metrics);
      setAnalytics(a.data.analytics);
    }).catch(() => {});
  }, [user.id]);

  if (!metrics) return null;

  const thisMonth = analytics?.monthly_trend?.find(m => {
    const now = new Date();
    return m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthlyRecovered = thisMonth?.recovered || 0;
  const totalRecovered = analytics?.total_recovered || 0;
  const recoveryRate = parseFloat(analytics?.recovery_rate || 0);
  const callsMade = metrics.calls_made || 0;
  const timeSaved = Math.round(callsMade * 2); // avg 2 min saved per call
  const isAheadOfIndustry = recoveryRate > INDUSTRY_RATE;

  const fmt = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <div className="hero-metrics">
      <div className="hero-main">
        <div className="hero-recovered">
          <span className="hero-label">💚 RECOVERED THIS MONTH</span>
          <span className="hero-amount">{fmt(monthlyRecovered)}</span>
          {totalRecovered > 0 && (
            <span className="hero-sub">₹{totalRecovered.toLocaleString('en-IN')} total all time</span>
          )}
        </div>
        <div className="hero-divider" />
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-val">{recoveryRate}%</span>
            <span className="hero-stat-label">Your recovery rate</span>
            <span className={`hero-bench ${isAheadOfIndustry ? 'ahead' : 'behind'}`}>
              {isAheadOfIndustry ? `⭐ ${(recoveryRate - INDUSTRY_RATE).toFixed(0)}% above` : `${(INDUSTRY_RATE - recoveryRate).toFixed(0)}% below`} industry avg ({INDUSTRY_RATE}%)
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-val">{callsMade}</span>
            <span className="hero-stat-label">Calls tracked</span>
            {timeSaved > 0 && <span className="hero-bench ahead">⏱ ~{timeSaved} min saved</span>}
          </div>
          <div className="hero-stat">
            <span className="hero-stat-val">{metrics.total_customers || 0}</span>
            <span className="hero-stat-label">Customers</span>
            <span className="hero-bench neutral">{metrics.pending_invoices || 0} pending today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroMetrics;
