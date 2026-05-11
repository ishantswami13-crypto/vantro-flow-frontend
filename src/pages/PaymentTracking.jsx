import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

function PaymentTracking({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState(null);
  const [payForm, setPayForm] = useState({});
  const [openPayForm, setOpenPayForm] = useState(null);

  useEffect(() => { fetchInvoices(); }, [user.id]);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/invoices/${user.id}`);
      setInvoices(res.data.invoices);
    } catch {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const openMarkPaid = (inv) => {
    setOpenPayForm(inv.id);
    setPayForm({
      payment_date: new Date().toISOString().split('T')[0],
      payment_amount: inv.invoice_amount,
      payment_method: 'UPI',
      payment_notes: ''
    });
  };

  const handleMarkPaid = async (invoiceId) => {
    setMarkingId(invoiceId);
    try {
      await axios.post(`${API_BASE}/api/mark-paid`, {
        invoice_id: invoiceId,
        ...payForm
      });
      setOpenPayForm(null);
      fetchInvoices();
    } catch {
      setError('Failed to mark invoice as paid');
    } finally {
      setMarkingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filtered = filter === 'all' ? invoices
    : invoices.filter(inv => inv.payment_status.toLowerCase() === filter);

  const totalPaid = invoices
    .filter(i => i.payment_status === 'Paid')
    .reduce((s, i) => s + Number(i.payment_amount || i.invoice_amount), 0);

  const totalPending = invoices
    .filter(i => i.payment_status === 'Pending')
    .reduce((s, i) => s + Number(i.invoice_amount), 0);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="payment-container">
      <h2>💰 Payment Tracking</h2>
      {error && <p className="error">{error}</p>}

      <div className="payment-summary">
        <div className="pay-card green">
          <p className="label">Total Recovered</p>
          <p className="value">₹{totalPaid.toLocaleString()}</p>
          <p className="sub">{invoices.filter(i => i.payment_status === 'Paid').length} invoices</p>
        </div>
        <div className="pay-card red">
          <p className="label">Still Outstanding</p>
          <p className="value">₹{totalPending.toLocaleString()}</p>
          <p className="sub">{invoices.filter(i => i.payment_status === 'Pending').length} invoices</p>
        </div>
        <div className="pay-card blue">
          <p className="label">Recovery Rate</p>
          <p className="value">
            {invoices.length > 0
              ? ((invoices.filter(i => i.payment_status === 'Paid').length / invoices.length) * 100).toFixed(0)
              : 0}%
          </p>
          <p className="sub">{invoices.length} total</p>
        </div>
      </div>

      <div className="filter-tabs">
        {['all', 'pending', 'paid'].map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="tab-count">
              {f === 'all' ? invoices.length
                : invoices.filter(i => i.payment_status.toLowerCase() === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No invoices to show.</p>
      ) : (
        <div className="payment-list">
          {filtered.map(inv => (
            <div key={inv.id} className={`payment-item ${inv.payment_status === 'Paid' ? 'paid' : 'pending'}`}>
              <div className="payment-info">
                <div className="payment-top">
                  <strong>{inv.customer_name}</strong>
                  <span className={`status-badge ${inv.payment_status === 'Paid' ? 'paid' : 'pending'}`}>
                    {inv.payment_status === 'Paid' ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
                <div className="payment-details">
                  <span>₹{Number(inv.invoice_amount).toLocaleString()}</span>
                  {inv.days_overdue > 0 && inv.payment_status === 'Pending' && (
                    <span className="overdue-tag">{inv.days_overdue} days overdue</span>
                  )}
                  {inv.payment_status === 'Paid' && (
                    <>
                      {inv.payment_date && <span>Paid on {formatDate(inv.payment_date)}</span>}
                      {inv.payment_method && <span className="method-tag">{inv.payment_method}</span>}
                      {inv.payment_notes && <span className="notes-tag">📝 {inv.payment_notes}</span>}
                    </>
                  )}
                </div>
              </div>

              {inv.payment_status === 'Pending' && (
                <div className="mark-paid-section">
                  {openPayForm === inv.id ? (
                    <div className="pay-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Payment Date</label>
                          <input type="date" value={payForm.payment_date}
                            onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Amount (₹)</label>
                          <input type="number" value={payForm.payment_amount}
                            onChange={e => setPayForm(f => ({ ...f, payment_amount: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Method</label>
                          <select value={payForm.payment_method}
                            onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Notes</label>
                          <input value={payForm.payment_notes}
                            onChange={e => setPayForm(f => ({ ...f, payment_notes: e.target.value }))}
                            placeholder="Optional" />
                        </div>
                      </div>
                      <div className="pay-form-actions">
                        <button className="confirm-paid-btn"
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={markingId === inv.id}>
                          {markingId === inv.id ? '⏳ Saving...' : '✅ Confirm Paid'}
                        </button>
                        <button className="cancel-btn" onClick={() => setOpenPayForm(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="mark-paid-btn" onClick={() => openMarkPaid(inv)}>
                      ✅ Mark Paid
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PaymentTracking;
