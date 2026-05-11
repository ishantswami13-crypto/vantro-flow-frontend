import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Analytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchAnalytics(); }, [user.id]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/${user.id}`);
      setData(res.data.analytics);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(y, m - 1).toLocaleString('en-IN', { month: 'short' });
  };

  if (loading) return <p className="loading">Loading analytics...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data) return null;

  const maxMonthly = Math.max(...data.monthly_trend.map(m => m.recovered), 1);
  const maxCustomer = Math.max(...data.top_customers.map(c => c.amount), 1);

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 Analytics Dashboard</h2>
        <button onClick={fetchAnalytics} className="refresh-btn">🔄 Refresh</button>
      </div>

      <div className="analytics-summary">
        <div className="ana-card green">
          <p className="ana-label">Total Recovered</p>
          <p className="ana-value">{formatINR(data.total_recovered)}</p>
        </div>
        <div className="ana-card red">
          <p className="ana-label">Outstanding</p>
          <p className="ana-value">{formatINR(data.total_outstanding)}</p>
        </div>
        <div className="ana-card blue">
          <p className="ana-label">Recovery Rate</p>
          <p className="ana-value">{data.recovery_rate}%</p>
        </div>
        <div className="ana-card purple">
          <p className="ana-label">Calls Made</p>
          <p className="ana-value">{data.calls_made}</p>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="chart-card">
          <h3>📈 Monthly Recovery (Last 6 Months)</h3>
          {data.monthly_trend.every(m => m.recovered === 0) ? (
            <p className="empty">No payments recorded yet.</p>
          ) : (
            <div className="bar-chart">
              {data.monthly_trend.map(m => (
                <div key={m.month} className="bar-col">
                  <div className="bar-wrap">
                    <div
                      className="bar"
                      style={{ height: `${(m.recovered / maxMonthly) * 140}px` }}
                      title={formatINR(m.recovered)}
                    />
                  </div>
                  <div className="bar-label">{monthLabel(m.month)}</div>
                  {m.recovered > 0 && (
                    <div className="bar-value">
                      ₹{(m.recovered / 1000).toFixed(0)}k
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chart-card">
          <h3>🏆 Top Outstanding Customers</h3>
          {data.top_customers.length === 0 ? (
            <p className="empty">No pending invoices.</p>
          ) : (
            <div className="hbar-chart">
              {data.top_customers.map((c, i) => (
                <div key={c.name} className="hbar-row">
                  <div className="hbar-name">
                    <span className="rank">#{i + 1}</span> {c.name}
                  </div>
                  <div className="hbar-track">
                    <div
                      className="hbar-fill"
                      style={{ width: `${(c.amount / maxCustomer) * 100}%` }}
                    />
                  </div>
                  <div className="hbar-val">{formatINR(c.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="analytics-stats">
        <div className="stat-row">
          <span>Total Invoices</span>
          <strong>{data.total_invoices}</strong>
        </div>
        <div className="stat-row">
          <span>Paid Invoices</span>
          <strong>{data.paid_invoices}</strong>
        </div>
        <div className="stat-row">
          <span>Pending Invoices</span>
          <strong>{data.pending_invoices}</strong>
        </div>
        <div className="stat-row">
          <span>Collections Efficiency</span>
          <strong>{data.calls_made > 0
            ? `${(data.paid_invoices / data.calls_made).toFixed(1)} paid/call`
            : '—'}</strong>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
