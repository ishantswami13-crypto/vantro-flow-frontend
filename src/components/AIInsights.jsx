import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeepAnalysisModal from './DeepAnalysisModal';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TYPE_STYLE = {
  success: { bg: '#f0fdf4', border: '#86efac', dot: '#16a34a', label: '#15803d' },
  warning: { bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', label: '#92400e' },
  danger:  { bg: '#fff1f2', border: '#fca5a5', dot: '#dc2626', label: '#991b1b' },
  info:    { bg: '#eff6ff', border: '#93c5fd', dot: '#3b82f6', label: '#1d4ed8' },
};

function fmt(n) {
  if (!n) return '₹0';
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n/1000).toFixed(0)}K`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function AIInsights({ user, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeep, setShowDeep] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/ai-insights/${user.id}`);
      setData(res.data);
    } catch (e) {
      setError('Could not load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  return (
    <>
      <div className="ai-insights">
        <div className="ai-insights-header">
          <div>
            <h2>🤖 AI Insights</h2>
            {!compact && <p>Smart analysis of your business data</p>}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button className="ai-deep-btn" onClick={() => setShowDeep(true)}>
              🧠 Full Analysis
            </button>
            <button className="ai-refresh-btn" onClick={load} disabled={loading}>
              {loading ? '⏳' : '🔄'}
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {loading && !data && (
          <div className="ai-loading">
            <div className="ai-spinner" />
            <p>Analysing your data...</p>
          </div>
        )}

        {data && (
          <>
            {/* Quick insight cards */}
            {data.insights?.length > 0 && (
              <div className="insights-grid">
                {data.insights.slice(0, compact ? 3 : data.insights.length).map((ins, i) => {
                  const style = TYPE_STYLE[ins.type] || TYPE_STYLE.info;
                  return (
                    <div key={i} className="insight-card" style={{ background: style.bg, borderColor: style.border }}>
                      <div className="insight-dot" style={{ background: style.dot }} />
                      <div className="insight-body">
                        <div className="insight-title" style={{ color: style.label }}>{ins.title}</div>
                        <div className="insight-text">{ins.insight}</div>
                        {ins.action && <div className="insight-action">→ {ins.action}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!compact && (
              <div className="insights-section-grid">
                {/* Top customers */}
                <div className="insights-panel">
                  <h3>🏆 Top Customers</h3>
                  {data.stats.customers.length === 0 && <p className="empty">No data yet</p>}
                  {data.stats.customers.map((c, i) => (
                    <div key={i} className="cust-row">
                      <span className="cust-rank">#{i+1}</span>
                      <span className="cust-name">{c.name}</span>
                      <div className="cust-amounts">
                        <span className="cust-total">{fmt(c.total)}</span>
                        {c.pending > 0 && <span className="cust-pending">{fmt(c.pending)} pending</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Product movement */}
                <div className="insights-panel">
                  <h3>📦 Product Movement</h3>
                  {data.stats.productSales.length === 0 && <p className="empty">No stock movements yet</p>}
                  {data.stats.productSales.map((p, i) => (
                    <div key={i} className="prod-row">
                      <span className="prod-rank">#{i+1}</span>
                      <span className="prod-name">{p.name}</span>
                      <span className="prod-units">{p.units_sold} units out</span>
                    </div>
                  ))}
                  {data.stats.productSales.length > 1 && (
                    <div className="prod-slow">🐢 Slowest: <strong>{data.stats.productSales[data.stats.productSales.length - 1].name}</strong></div>
                  )}
                </div>

                {/* Call performance */}
                <div className="insights-panel">
                  <h3>📞 Call Performance</h3>
                  <div className="call-stat-row">
                    <span>Total calls</span>
                    <strong>{data.stats.totalCalls}</strong>
                  </div>
                  <div className="call-stat-row">
                    <span>Pick-up rate</span>
                    <strong style={{color: data.stats.totalCalls && data.stats.pickedUp/data.stats.totalCalls > 0.5 ? '#16a34a' : '#dc2626'}}>
                      {data.stats.totalCalls ? Math.round(data.stats.pickedUp / data.stats.totalCalls * 100) : 0}%
                    </strong>
                  </div>
                  <div className="call-stat-row">
                    <span>Promises secured</span>
                    <strong style={{color:'#3b82f6'}}>{data.stats.promised}</strong>
                  </div>
                  {data.stats.bottomCustomers.length > 0 && (
                    <>
                      <div className="insight-divider" />
                      <p className="panel-sub">⚠️ Lowest buying customers</p>
                      {data.stats.bottomCustomers.map((c, i) => (
                        <div key={i} className="call-stat-row">
                          <span>{c.name}</span>
                          <strong>{fmt(c.total)}</strong>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Compact: show bottom customers + call stats inline */}
            {compact && (
              <div className="ai-compact-footer">
                <span>📞 {data.stats.totalCalls} calls · {data.stats.totalCalls ? Math.round(data.stats.pickedUp/data.stats.totalCalls*100) : 0}% pickup</span>
                <span>🏆 Top: {data.stats.customers[0]?.name || '—'} ({fmt(data.stats.customers[0]?.total)})</span>
              </div>
            )}
          </>
        )}
      </div>

      {showDeep && <DeepAnalysisModal user={user} onClose={() => setShowDeep(false)} />}
    </>
  );
}

export default AIInsights;
