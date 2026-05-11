import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CallHistory({ user }) {
  const [calls, setCalls] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoice_id: '',
    customer_name: '',
    customer_phone: '',
    amount: '',
    call_duration_minutes: '',
    did_pick_up: true,
    notes: '',
    promised_payment_date: '',
    promised_amount: ''
  });

  useEffect(() => {
    fetchCalls();
    fetchInvoices();
  }, [user.id]);

  const fetchCalls = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/calls/${user.id}`);
      setCalls(res.data.calls);
    } catch {
      setError('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/invoices/${user.id}`);
      setInvoices(res.data.invoices.filter(inv => inv.payment_status === 'Pending'));
    } catch {}
  };

  const handleInvoiceSelect = (e) => {
    const inv = invoices.find(i => i.id === e.target.value);
    if (inv) {
      setForm(f => ({
        ...f,
        invoice_id: inv.id,
        customer_name: inv.customer_name,
        amount: inv.invoice_amount,
        customer_phone: inv.customer_phone || ''
      }));
    } else {
      setForm(f => ({ ...f, invoice_id: '', customer_name: '', amount: '', customer_phone: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name) return;
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/log-call`, { user_id: user.id, ...form });
      setShowForm(false);
      setForm({
        invoice_id: '', customer_name: '', customer_phone: '', amount: '',
        call_duration_minutes: '', did_pick_up: true, notes: '',
        promised_payment_date: '', promised_amount: ''
      });
      fetchCalls();
    } catch {
      setError('Failed to save call log');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="callhistory-container">
      <div className="callhistory-header">
        <h2>📞 Call History</h2>
        <button className="log-call-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Log a Call'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <form className="call-form" onSubmit={handleSubmit}>
          <h3>Log New Call</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Invoice (optional)</label>
              <select onChange={handleInvoiceSelect}>
                <option value="">— Select invoice —</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.customer_name} · ₹{Number(inv.invoice_amount).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Sharma Industries"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                value={form.customer_phone}
                onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                placeholder="91XXXXXXXXXX"
              />
            </div>
            <div className="form-group">
              <label>Call Duration (mins)</label>
              <input
                type="number"
                value={form.call_duration_minutes}
                onChange={e => setForm(f => ({ ...f, call_duration_minutes: e.target.value }))}
                placeholder="5"
                min="0"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Did they pick up?</label>
              <div className="toggle-row">
                <button type="button"
                  className={`toggle-btn ${form.did_pick_up ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, did_pick_up: true }))}>
                  ✅ Yes
                </button>
                <button type="button"
                  className={`toggle-btn ${!form.did_pick_up ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, did_pick_up: false }))}>
                  ❌ No
                </button>
              </div>
            </div>
            {form.did_pick_up && (
              <div className="form-group">
                <label>Promised Payment Date</label>
                <input
                  type="date"
                  value={form.promised_payment_date}
                  onChange={e => setForm(f => ({ ...f, promised_payment_date: e.target.value }))}
                />
              </div>
            )}
          </div>
          {form.did_pick_up && (
            <div className="form-group">
              <label>Promised Amount (₹)</label>
              <input
                type="number"
                value={form.promised_amount}
                onChange={e => setForm(f => ({ ...f, promised_amount: e.target.value }))}
                placeholder="Leave blank if full amount"
              />
            </div>
          )}
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="What did they say? Any excuses?"
              rows={2}
            />
          </div>
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save Call Log'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading calls...</p>
      ) : calls.length === 0 ? (
        <p className="empty">No calls logged yet. Click "Log a Call" to start!</p>
      ) : (
        <div className="calls-list">
          {calls.map(call => (
            <div key={call.id} className={`call-item ${call.did_pick_up === false ? 'no-pickup' : ''}`}>
              <div className="call-icon">
                {call.did_pick_up === false ? '📵' : '📞'}
              </div>
              <div className="call-body">
                <div className="call-top">
                  <strong>{call.customer_name}</strong>
                  {call.amount && <span className="call-amount">₹{Number(call.amount).toLocaleString()}</span>}
                  <span className="call-date">{formatDate(call.called_at)}</span>
                </div>
                <div className="call-meta">
                  {call.did_pick_up === false && <span className="badge no-pickup">No Pickup</span>}
                  {call.did_pick_up === true && <span className="badge picked-up">Picked Up</span>}
                  {call.call_duration_minutes && <span className="badge">{call.call_duration_minutes} min</span>}
                  {call.customer_phone && (
                    <a
                      href={`https://wa.me/${call.customer_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="badge whatsapp-badge"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </div>
                {call.notes && <p className="call-notes">{call.notes}</p>}
                {call.promised_payment_date && (
                  <p className="promise">
                    🤝 Promised ₹{call.promised_amount ? Number(call.promised_amount).toLocaleString() : 'full amount'} by {formatDate(call.promised_payment_date)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CallHistory;
