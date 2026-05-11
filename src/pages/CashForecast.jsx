import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const SCENARIO_META = {
  pessimistic: { label: '🐢 Pessimistic (50%)', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5' },
  expected:    { label: '📊 Expected (80%)',    color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  optimistic:  { label: '🚀 Optimistic (95%)',  color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
};

export default function CashForecast({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeScenario, setActiveScenario] = useState('expected');
  const [days, setDays] = useState(30);

  useEffect(() => { load(); }, [user.id, days]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/cash-forecast/${user.id}?days=${days}`);
      setData(res.data);
    } catch {
      setError('Could not load forecast data');
    }
    setLoading(false);
  };

  const scenario = data?.scenarios?.[activeScenario];
  const meta = SCENARIO_META[activeScenario];

  // Chart: normalize curve to SVG viewBox
  const makePath = (curve) => {
    if (!curve?.length) return '';
    const maxCash = Math.max(...curve.map(p => p.cash), 1);
    const W = 800, H = 200;
    const pts = curve.map((p, i) => {
      const x = (i / (curve.length - 1)) * W;
      const y = H - (p.cash / maxCash) * (H - 20) - 10;
      return `${x},${y}`;
    });
    return `M ${pts.join(' L ')}`;
  };

  const makeArea = (curve) => {
    if (!curve?.length) return '';
    const maxCash = Math.max(...curve.map(p => p.cash), 1);
    const W = 800, H = 200;
    const pts = curve.map((p, i) => {
      const x = (i / (curve.length - 1)) * W;
      const y = H - (p.cash / maxCash) * (H - 20) - 10;
      return `${x},${y}`;
    });
    return `M 0,${H} L ${pts.join(' L ')} L ${W},${H} Z`;
  };

  return (
    <div className="cashforecast-page">
      {/* Header */}
      <div className="cf-header">
        <div>
          <h1>💰 Cash Flow Forecast</h1>
          <p>3-scenario projection based on your collections history</p>
        </div>
        <div className="cf-controls">
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="cf-days-select">
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <button className="cf-refresh-btn" onClick={load} disabled={loading}>{loading ? '⏳' : '🔄 Refresh'}</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && !data && (
        <div className="cf-loading">
          <div className="ai-spinner" />
          <p>Calculating your forecast...</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="cf-summary-cards">
            {Object.entries(SCENARIO_META).map(([key, m]) => {
              const s = data.scenarios?.[key];
              if (!s) return null;
              const endCash = s.curve?.[s.curve.length - 1]?.cash ?? 0;
              return (
                <button
                  key={key}
                  className={`cf-scenario-card ${activeScenario === key ? 'active' : ''}`}
                  style={activeScenario === key ? { background: m.bg, borderColor: m.color } : {}}
                  onClick={() => setActiveScenario(key)}
                >
                  <span className="cf-scenario-label" style={activeScenario === key ? { color: m.color } : {}}>{m.label}</span>
                  <span className="cf-scenario-val" style={activeScenario === key ? { color: m.color } : {}}>{fmt(endCash)}</span>
                  <span className="cf-scenario-sub">end of {days}d</span>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          {scenario?.curve && (
            <div className="cf-chart-wrap">
              <div className="cf-chart-title">{meta.label} — {days}-day Projection</div>
              <svg viewBox="0 0 800 220" className="cf-chart-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={meta.color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={meta.color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                  <line key={pct} x1="0" y1={10 + (1 - pct) * 180} x2="800" y2={10 + (1 - pct) * 180}
                    stroke="#e2e8f0" strokeWidth="1" />
                ))}
                {/* Area fill */}
                <path d={makeArea(scenario.curve)} fill="url(#cfGrad)" />
                {/* Line */}
                <path d={makePath(scenario.curve)} fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Break-even line */}
                {data.burnRate > 0 && (
                  <line x1="0" y1="105" x2="800" y2="105" stroke="#94a3b8" strokeWidth="1" strokeDasharray="6,4" />
                )}
              </svg>
              <div className="cf-chart-labels">
                <span>Day 0</span>
                <span>Day {Math.round(days / 2)}</span>
                <span>Day {days}</span>
              </div>
            </div>
          )}

          {/* Key stats */}
          <div className="cf-stats-grid">
            <div className="cf-stat-card">
              <span className="cf-stat-icon">🏦</span>
              <span className="cf-stat-val">{fmt(data.cashStart)}</span>
              <span className="cf-stat-lbl">Starting Cash</span>
            </div>
            <div className="cf-stat-card">
              <span className="cf-stat-icon">📥</span>
              <span className="cf-stat-val">{fmt(data.avgDailyCollections)}</span>
              <span className="cf-stat-lbl">Avg Daily Inflow</span>
            </div>
            <div className="cf-stat-card">
              <span className="cf-stat-icon">📤</span>
              <span className="cf-stat-val">{fmt(data.burnRate)}</span>
              <span className="cf-stat-lbl">Est. Daily Burn</span>
            </div>
            <div className="cf-stat-card">
              <span className="cf-stat-icon">📋</span>
              <span className="cf-stat-val">{fmt(data.totalOutstanding)}</span>
              <span className="cf-stat-lbl">Total Outstanding</span>
            </div>
            {data.totalOverdue30 > 0 && (
              <div className="cf-stat-card cf-stat-danger">
                <span className="cf-stat-icon">⚠️</span>
                <span className="cf-stat-val" style={{color:'#dc2626'}}>{fmt(data.totalOverdue30)}</span>
                <span className="cf-stat-lbl">30d+ Overdue</span>
              </div>
            )}
          </div>

          {/* Scenario breakdown table */}
          <div className="cf-table-wrap">
            <h3>📊 All Scenarios at a Glance</h3>
            <table className="cf-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Daily Inflow</th>
                  <th>Day 7</th>
                  <th>Day 14</th>
                  <th>Day {days}</th>
                  <th>Net Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(SCENARIO_META).map(([key, m]) => {
                  const s = data.scenarios?.[key];
                  if (!s) return null;
                  const end = s.curve?.[s.curve.length - 1]?.cash ?? 0;
                  const d7  = s.curve?.find(p => p.day === 7)?.cash ?? 0;
                  const d14 = s.curve?.find(p => p.day === 14)?.cash ?? 0;
                  const net = end - (data.cashStart || 0);
                  return (
                    <tr key={key} className={activeScenario === key ? 'cf-row-active' : ''} onClick={() => setActiveScenario(key)} style={{cursor:'pointer'}}>
                      <td><span style={{color: m.color, fontWeight: 700}}>{m.label}</span></td>
                      <td>{fmt(s.dailyInflow)}</td>
                      <td>{fmt(d7)}</td>
                      <td>{fmt(d14)}</td>
                      <td><strong>{fmt(end)}</strong></td>
                      <td style={{color: net >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700}}>{net >= 0 ? '+' : ''}{fmt(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tips */}
          <div className="cf-tips">
            <h3>💡 What you can do</h3>
            <div className="cf-tips-grid">
              <div className="cf-tip">
                <span className="cf-tip-icon">📞</span>
                <div>
                  <strong>Chase 30d+ overdue today</strong>
                  <p>Collecting even 20% of overdue instantly improves all scenarios</p>
                </div>
              </div>
              <div className="cf-tip">
                <span className="cf-tip-icon">🎯</span>
                <div>
                  <strong>Set payment reminders</strong>
                  <p>Automated reminders reduce payment delays by up to 30%</p>
                </div>
              </div>
              <div className="cf-tip">
                <span className="cf-tip-icon">📊</span>
                <div>
                  <strong>Review weekly</strong>
                  <p>Refresh this forecast every week to stay ahead of cash gaps</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
