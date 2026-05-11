import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Dashboard({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchInvoices(); }, [user.id]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/invoices/${user.id}`);
      setInvoices(response.data.invoices);
      setSummary(response.data.summary);
    } catch (err) {
      setError('Failed to fetch invoices');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', user.id);
    try {
      const response = await axios.post(`${API_BASE}/api/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        alert(`✅ Uploaded ${response.data.count} invoices!`);
        fetchInvoices();
      }
    } catch (err) {
      setError('Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await axios.post(`${API_BASE}/api/mark-paid`, { invoice_id: invoiceId });
      alert('✅ Invoice marked as paid!');
      fetchInvoices();
    } catch (err) {
      setError('Failed to update invoice');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="upload-section">
        <h2>📤 Upload Invoice Data</h2>
        <p>Upload CSV file with: Customer Name, Invoice Amount, Invoice Date, Payment Status</p>
        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <p>Uploading...</p>}
      </div>
      <div className="summary-cards">
        <div className="card">
          <p className="label">Total Outstanding</p>
          <p className="value">₹{summary.total_outstanding?.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="label">Total Customers</p>
          <p className="value">{summary.total_customers}</p>
        </div>
        <div className="card">
          <p className="label">Most Overdue (Days)</p>
          <p className="value">{summary.most_overdue_days} days</p>
        </div>
      </div>
      <div className="invoices-section">
        <h2>📋 Your Invoices</h2>
        {error && <p className="error">{error}</p>}
        {invoices.length === 0 ? (
          <p className="empty">No invoices yet. Upload a CSV to get started!</p>
        ) : (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Customer Name</th><th>Amount Owed</th>
                <th>Days Overdue</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className={`status-${inv.payment_status.toLowerCase()}`}>
                  <td>{inv.customer_name}</td>
                  <td>₹{inv.invoice_amount.toLocaleString()}</td>
                  <td className={inv.days_overdue > 30 ? 'critical' : 'warning'}>{inv.days_overdue} days</td>
                  <td>{inv.payment_status}</td>
                  <td>
                    {inv.payment_status === 'Pending' && (
                      <button className="mark-paid-btn" onClick={() => handleMarkPaid(inv.id)}>✅ Paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
