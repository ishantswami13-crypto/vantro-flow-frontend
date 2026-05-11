import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function PriorityList({ user, onSelectCustomer }) {
  const [priorityList, setPriorityList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchPriorityList(); }, [user.id]);

  const fetchPriorityList = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/calculate-priority/${user.id}`, {});
      setPriorityList(response.data.priority_list);
    } catch (err) {
      setError('Failed to calculate priority list');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return '#ff4444';
      case 'URGENT': return '#ff9900';
      case 'OVERDUE': return '#ffcc00';
      default: return '#00cc00';
    }
  };

  return (
    <div className="priority-container">
      <div className="priority-header">
        <h2>📞 Call This Person Today</h2>
        <button onClick={fetchPriorityList} disabled={loading}>🔄 Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Calculating priorities...</p>
      ) : priorityList.length === 0 ? (
        <p className="empty">No pending invoices</p>
      ) : (
        <div className="priority-list">
          {priorityList.map((item, index) => (
            <div key={item.id} className="priority-item"
              style={{ borderLeftColor: getUrgencyColor(item.urgency) }}>
              <div className="priority-rank">#{index + 1}</div>
              <div className="priority-content">
                <h3>{item.customer_name}</h3>
                <p className="amount">₹{item.invoice_amount.toLocaleString()}</p>
                <p className="overdue">{item.days_overdue} days overdue</p>
                <span className={`urgency urgency-${item.urgency}`}>{item.urgency}</span>
              </div>
              <button className="call-btn" onClick={onSelectCustomer}>📞 Generate Message</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PriorityList;
