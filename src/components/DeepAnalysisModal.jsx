import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const URGENCY_STYLE = {
  'TODAY':      { bg: '#fee2e2', color: '#dc2626' },
  'THIS WEEK':  { bg: '#ffedd5', color: '#ea580c' },
  'THIS MONTH': { bg: '#fef9c3', color: '#ca8a04' },
};

const STATUS_STYLE = {
  'CHASE NOW':  { bg: '#fee2e2', color: '#dc2626', icon: '🔴' },
  'FOLLOW UP':  { bg: '#ffedd5', color: '#ea580c', icon: '🟠' },
  'RELIABLE':   { bg: '#dcfce7', color: '#16a34a', icon: '🟢' },
  'RISKY':      { bg: '#faf5ff', color: '#7c3aed', icon: '🟣' },
};

function ScoreRing({ score, color, label }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <div className="score-ring-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="55" y="52" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{score}</text>
        <text x="55" y="68" textAnchor="middle" fontSize="10" fill="#94a3b8">/100</text>
      </svg>
      <span className="score-label" style={{ color }}>{label}</span>
    </div>
  );
}

function DeepAnalysisModal({ user, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    load();
  }, [user.id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/ai-deep-analysis/${user.id}`);
      setData(res.data.analysis);
      setActiveSection(res.data.analysis?.sections?.[0]?.id || null);
    } catch (e) {
      setError('Analysis failed. Make sure ANTHROPIC_API_KEY is set on Railway.');
    } finally {
      setLoading(false);
    }
  };

  const a = data;

  return (
    <div className="deep-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="deep-modal">
        {/* Header */}
        <div className="deep-header">
          <div>
            <h2>🧠 Deep Business Analysis</h2>
            <p>Powered by Claude Opus 4.7 · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button className="deep-refresh" onClick={load} disabled={loading}>🔄</button>
            <button className="deep-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="deep-loading">
            <div className="deep-brain-anim">🧠</div>
            <h3>Claude is analysing your entire business...</h3>
            <p>This takes 10–20 seconds. Claude reads all your invoices, calls, inventory and thinks deeply.</p>
            <div className="deep-dots"><span /><span /><span /></div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="deep-error">
            <p>{error}</p>
            <button onClick={load} className="deep-retry-btn">Try Again</button>
          </div>
        )}

        {/* Content */}
        {!loading && a && (
          <div className="deep-body">
            {/* Score + Summary */}
            <div className="deep-summary-row">
              <ScoreRing score={a.health_score} color={a.health_color} label={a.health_label} />
              <div className="deep-exec-summary">
                <h3>Executive Summary</h3>
                <p>{a.executive_summary}</p>
              </div>
            </div>

            {/* Top Actions */}
            {a.top_actions?.length > 0 && (
              <div className="deep-actions">
                <h3>⚡ Priority Actions</h3>
                <div className="deep-action-list">
                  {a.top_actions.map((act, i) => {
                    const style = URGENCY_STYLE[act.urgency] || URGENCY_STYLE['THIS WEEK'];
                    return (
                      <div key={i} className="deep-action-item">
                        <div className="deep-action-num">{act.priority}</div>
                        <div className="deep-action-body">
                          <div className="deep-action-text">{act.action}</div>
                          <div className="deep-action-impact">→ {act.impact}</div>
                        </div>
                        <span className="deep-urgency-tag" style={style}>{act.urgency}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section tabs */}
            {a.sections?.length > 0 && (
              <div className="deep-sections">
                <div className="deep-section-tabs">
                  {a.sections.map(s => (
                    <button
                      key={s.id}
                      className={`deep-sec-tab ${activeSection === s.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(s.id)}
                    >{s.title}</button>
                  ))}
                </div>

                {a.sections.filter(s => s.id === activeSection).map(sec => (
                  <div key={sec.id} className="deep-section-body">
                    {/* Insights */}
                    {sec.insights?.map((ins, i) => (
                      <div key={i} className="deep-insight-line">
                        <span className="deep-insight-bullet">•</span>
                        <span>{ins}</span>
                      </div>
                    ))}

                    {/* Customer table */}
                    {sec.customers?.length > 0 && (
                      <div className="deep-cust-table">
                        {sec.customers.map((c, i) => {
                          const st = STATUS_STYLE[c.status] || STATUS_STYLE['FOLLOW UP'];
                          return (
                            <div key={i} className="deep-cust-row">
                              <span className="deep-cust-icon">{st.icon}</span>
                              <span className="deep-cust-name">{c.name}</span>
                              <span className="deep-cust-status" style={{ background: st.bg, color: st.color }}>{c.status}</span>
                              <span className="deep-cust-reason">{c.reason}</span>
                              <span className="deep-cust-action">→ {c.suggested_action}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Metrics */}
                    {sec.metrics?.length > 0 && (
                      <div className="deep-metrics-row">
                        {sec.metrics.map((m, i) => (
                          <div key={i} className="deep-metric-card">
                            <span className="deep-metric-val">{m.value}</span>
                            <span className="deep-metric-label">{m.label}</span>
                            <span className={`deep-metric-trend trend-${m.trend}`}>
                              {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alerts */}
                    {sec.alerts?.length > 0 && (
                      <div className="deep-alerts">
                        {sec.alerts.map((al, i) => (
                          <div key={i} className="deep-alert-row">
                            <strong>{al.product}</strong>
                            <span className="deep-alert-issue">{al.issue}</span>
                            <span className="deep-alert-action">→ {al.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeepAnalysisModal;
