import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function MessageGenerator({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchInvoices(); }, [user.id]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/invoices/${user.id}`);
      const pending = response.data.invoices.filter(inv => inv.payment_status === 'Pending');
      setInvoices(pending);
      if (pending.length > 0) {
        setSelectedInvoice(pending[0]);
        setPhone(pending[0].customer_phone || '');
      }
    } catch {
      setError('Failed to fetch invoices');
    }
  };

  const handleInvoiceChange = (e) => {
    const inv = invoices.find(i => i.id === e.target.value);
    setSelectedInvoice(inv || null);
    setPhone(inv?.customer_phone || '');
    setMessage('');
  };

  const generateMessage = async () => {
    if (!selectedInvoice) return;
    setGenerating(true);
    setError('');
    try {
      const response = await axios.post(`${API_BASE}/api/generate-message`, {
        customer_name: selectedInvoice.customer_name,
        amount: selectedInvoice.invoice_amount,
        days_overdue: selectedInvoice.days_overdue
      });
      setMessage(response.data.message);
    } catch {
      setError('Failed to generate message');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendViaWhatsApp = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) {
      alert('Please enter a phone number first.');
      return;
    }
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="message-container">
      <h2>💬 Generate WhatsApp Message</h2>
      {error && <p className="error">{error}</p>}
      <div className="message-form">
        <div className="form-group">
          <label>Select Customer:</label>
          <select
            value={selectedInvoice?.id || ''}
            onChange={handleInvoiceChange}
          >
            <option value="">Choose customer...</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.customer_name} — ₹{Number(inv.invoice_amount).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {selectedInvoice && (
          <>
            <div className="invoice-details">
              <p><strong>Customer:</strong> {selectedInvoice.customer_name}</p>
              <p><strong>Amount:</strong> ₹{Number(selectedInvoice.invoice_amount).toLocaleString()}</p>
              <p><strong>Days Overdue:</strong> {selectedInvoice.days_overdue}</p>
            </div>

            <div className="form-group">
              <label>Customer WhatsApp Number:</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="919876543210 (include country code)"
                className="phone-input"
              />
              <small>Format: 91XXXXXXXXXX (India) or country code + number</small>
            </div>

            <button onClick={generateMessage} disabled={generating} className="generate-btn">
              {generating ? '⏳ Generating...' : '✨ Generate Message'}
            </button>

            {message && (
              <div className="message-output">
                <h3>Your Message:</h3>
                <div className="message-box">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="message-actions">
                  <button onClick={copyToClipboard} className="copy-btn">
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                  <button onClick={sendViaWhatsApp} className="whatsapp-btn">
                    💬 Send via WhatsApp
                  </button>
                  <button onClick={generateMessage} className="regenerate-btn">
                    🔄 Regenerate
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {invoices.length === 0 && (
          <p className="empty">No pending invoices. Upload a CSV from the Dashboard first.</p>
        )}
      </div>
    </div>
  );
}

export default MessageGenerator;
