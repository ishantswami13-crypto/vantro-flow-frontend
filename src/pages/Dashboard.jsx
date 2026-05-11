import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HeroMetrics from '../components/HeroMetrics';
import OnboardingProgress from '../components/OnboardingProgress';
import ReferralSection from '../components/ReferralSection';
import CameraScanner from '../components/CameraScanner';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function rowUrgencyClass(daysOverdue) {
  if (daysOverdue >= 45) return 'row-critical';
  if (daysOverdue >= 30) return 'row-urgent';
  if (daysOverdue >= 14) return 'row-warn';
  return '';
}

function Dashboard({ user, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { fetchInvoices(); }, [user.id]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/invoices/${user.id}`);
      setInvoices(response.data.invoices || []);
      setSummary(response.data.summary || {});
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

  const handleScannedInvoice = async (extracted) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await axios.post(`${API_BASE}/api/invoices`, {
        user_id: user.id,
        customer_name: extracted.customer_name || 'Unknown Customer',
        customer_phone: extracted.customer_phone || '',
        invoice_amount: parseFloat(extracted.invoice_amount) || 0,
        invoice_date: extracted.invoice_date || today,
        payment_status: 'Pending',
        days_overdue: 0,
      });
      fetchInvoices();
    } catch (err) {
      setError('Failed to save scanned invoice');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await axios.post(`${API_BASE}/api/mark-paid`, { invoice_id: invoiceId });
      fetchInvoices();
    } catch (err) {
      setError('Failed to update invoice');
    }
  };

  const pending = invoices.filter(i => i.payment_status !== 'Paid');
  const criticalNow = pending.filter(i => i.days_overdue >= 45).slice(0, 3);

  return (
    <div className="dashboard-container">
      <HeroMetrics user={user} />

      <OnboardingProgress user={user} onNavigate={onNavigate} />

      {criticalNow.length > 0 && (
        <div className="urgency-banner">
          <div className="urgency-banner-title">🔴 Needs attention today</div>
          <div className="urgency-list">
            {criticalNow.map(inv => (
              <div key={inv.id} className="urgency-item">
                <span className="urgency-name">{inv.customer_name}</span>
                <span className="urgency-days">{inv.days_overdue}d overdue</span>
                <span className="urgency-amt">₹{Number(inv.invoice_amount).toLocaleString('en-IN')}</span>
                <button
                  className="urgency-call-btn"
                  onClick={() => onNavigate && onNavigate('calls')}
                >📞 Call</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="summary-cards">
        <div className="card card-red">
          <p className="label">Total Outstanding</p>
          <p className="value">₹{summary.total_outstanding?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="card card-neutral">
          <p className="label">Total Customers</p>
          <p className="value">{summary.total_customers || 0}</p>
        </div>
        <div className="card card-orange">
          <p className="label">Most Overdue</p>
          <p className="value">{summary.most_overdue_days || 0} days</p>
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-header">
          <div>
            <h2>📤 Add Invoices</h2>
            <p>Upload CSV or scan a physical invoice with your camera</p>
          </div>
          <button className="scan-invoice-btn" onClick={() => setShowScanner(true)}>
            📷 Scan Invoice
          </button>
        </div>
        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <p>Uploading...</p>}
      </div>

      {showScanner && (
        <CameraScanner
          scanType="invoice"
          onExtracted={handleScannedInvoice}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="invoices-section">
        <div className="section-header">
          <h2>📋 Your Invoices</h2>
          {pending.length > 0 && (
            <span className="pending-badge">{pending.length} pending</span>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        {invoices.length === 0 ? (
          <p className="empty">No invoices yet. Upload a CSV to get started!</p>
        ) : (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Amount Owed</th>
                <th>Days Overdue</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className={rowUrgencyClass(inv.days_overdue)}>
                  <td>{inv.customer_name}</td>
                  <td>₹{Number(inv.invoice_amount).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`days-badge ${inv.days_overdue >= 45 ? 'days-critical' : inv.days_overdue >= 30 ? 'days-urgent' : inv.days_overdue >= 14 ? 'days-warn' : 'days-ok'}`}>
                      {inv.days_overdue}d
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${inv.payment_status === 'Paid' ? 'pill-paid' : 'pill-pending'}`}>
                      {inv.payment_status}
                    </span>
                  </td>
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

      <ReferralSection user={user} />
    </div>
  );
}

export default Dashboard;
