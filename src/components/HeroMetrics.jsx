import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const INDUSTRY_RATE = 40;

// Animated counter hook — counts from 0 to target over ~900ms
function useCountUp(target, duration = 900, started = true) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!started || target === 0) { setDisplay(target); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, started]);

  return display;
}

function AnimatedAmount({ value, format }) {
  const [active, setActive] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const count = useCountUp(value, 900, active);
  return <span ref={ref}>{format(count)}</span>;
}

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
  const timeSaved = Math.round(callsMade * 2);
  const isAheadOfIndustry = recoveryRate > INDUSTRY_RATE;

  const fmt = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <div className="hero-metrics reveal">
      <div className="hero-main">
        <div className="hero-recovered">
          <span className="hero-label">💚 RECOVERED THIS MONTH</span>
          <span className="hero-amount">
            <AnimatedAmount value={monthlyRecovered} format={fmt} />
          </span>
          {totalRecovered > 0 && (
            <span className="hero-sub">
              <AnimatedAmount value={totalRecovered} format={(n) => `₹${n.toLocaleString('en-IN')}`} /> total all time
            </span>
          )}
        </div>
        <div className="hero-divider" />
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-val">
              <AnimatedAmount value={recoveryRate} format={(n) => `${n}%`} />
            </span>
            <span className="hero-stat-label">Your recovery rate</span>
            <span className={`hero-bench ${isAheadOfIndustry ? 'ahead' : 'behind'}`}>
              {isAheadOfIndustry
                ? `⭐ ${(recoveryRate - INDUSTRY_RATE).toFixed(0)}% above`
                : `${(INDUSTRY_RATE - recoveryRate).toFixed(0)}% below`} industry avg ({INDUSTRY_RATE}%)
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-val">
              <AnimatedAmount value={callsMade} format={(n) => `${n}`} />
            </span>
            <span className="hero-stat-label">Calls tracked</span>
            {timeSaved > 0 && <span className="hero-bench ahead">⏱ ~{timeSaved} min saved</span>}
          </div>
          <div className="hero-stat">
            <span className="hero-stat-val">
              <AnimatedAmount value={metrics.total_customers || 0} format={(n) => `${n}`} />
            </span>
            <span className="hero-stat-label">Customers</span>
            <span className="hero-bench neutral">{metrics.pending_invoices || 0} pending today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroMetrics;
