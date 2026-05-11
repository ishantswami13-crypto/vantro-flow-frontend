import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function MessageGenerator({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchInvoices(); }, [user.id]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/invoices/${user.id}`);
      const pending = response.data.invoices.filter(inv => inv.payment_status === 'Pending');
      setInvoices(pending);
      if (pending.length > 0) setSelectedInvoice(pending[0]);
    } catch (err) {
      setError('Failed to fetch invoices');
    }
  };

  const generateMessage = async () => {
    if (!selectedInvoice) return;
    setGenerating(true);
    try {
      const response = await axios.post(`${API_BASE}/api/generate-message`, {
        customer_name: selectedInvoice.customer_name,
        amount: selectedInvoice.invoice_amount,
        days_overdue: selectedInvoice.days_overdue
      });
      setMessage(response.data.message);
    } catch (err) {
      setError('Failed to generate message');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    alert('✅ Message copied to clipboard!');
  };

  return (
    <div className="message-container">
      <h2>💬 Generate WhatsApp Message</h2>
      {error && <p className="error">{error}</p>}
      <div className="message-form">
        <div className="form-group">
          <label>Select Customer:</label>
          <select value={selectedInvoice?.id || ''}
            onChange={(e) => {
              const inv = invoices.find(i => i.id === parseInt(e.target.value));
              setSelectedInvoice(inv);
              setMessage('');
            }}>
            <option value="">Choose customer...</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.customer_name} - ₹{inv.invoice_amount.toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        {selectedInvoice && (
          <>
            <div className="invoice-details">
              <p><strong>Customer:</strong> {selectedInvoice.customer_name}</p>
              <p><strong>Amount:</strong> ₹{selectedInvoice.invoice_amount.toLocaleString()}</p>
              <p><strong>Days Overdue:</strong> {selectedInvoice.days_overdue}</p>
            </div>
            <button onClick={generateMessage} disabled={generating} className="generate-btn">
              {generating ? '⏳ Generating...' : '✨ Generate Message'}
            </button>
            {message && (
              <div className="message-output">
                <h3>Your Message:</h3>
                <div className="message-box"><p>{message}</p></div>
                <div className="message-actions">
                  <button onClick={copyToClipboard} className="copy-btn">📋 Copy to WhatsApp</button>
                  <button onClick={generateMessage} className="regenerate-btn">🔄 Regenerate</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MessageGenerator;
