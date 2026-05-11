import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Metrics({ user }) {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchMetrics(); }, [user.id]);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/metrics/${user.id}`);
      setMetrics(response.data.metrics);
    } catch (err) {
      setError('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading metrics...</p>;

  return (
    <div className="metrics-container">
      <h2>📈 Your Performance Metrics</h2>
      {error && <p className="error">{error}</p>}
      <div className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Total Outstanding</p>
          <p className="metric-value">₹{metrics.total_outstanding?.toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Total Paid</p>
          <p className="metric-value">₹{metrics.total_paid?.toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Pending Invoices</p>
          <p className="metric-value">{metrics.pending_invoices}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Total Customers</p>
          <p className="metric-value">{metrics.total_customers}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Calls Made</p>
          <p className="metric-value">{metrics.calls_made}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Recovery Rate</p>
          <p className="metric-value">{metrics.avg_recovery_rate}%</p>
        </div>
      </div>
      <button onClick={fetchMetrics} className="refresh-btn">🔄 Refresh Metrics</button>
    </div>
  );
}

export default Metrics;
