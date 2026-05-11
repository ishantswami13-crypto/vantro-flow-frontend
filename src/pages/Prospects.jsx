import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const STAGES = [
  { key: 'cold',      label: '🧊 Cold',          color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'contacted', label: '📱 Contacted',      color: '#3b82f6', bg: '#eff6ff' },
  { key: 'trial',     label: '🚀 Trial Started',  color: '#7c3aed', bg: '#faf5ff' },
  { key: 'engaged',   label: '🔥 Engaged',        color: '#ea580c', bg: '#fff7ed' },
  { key: 'paid',      label: '✅ Paid',            color: '#16a34a', bg: '#f0fdf4' },
  { key: 'churned',   label: '❌ Churned',         color: '#dc2626', bg: '#fff1f2' },
];

const BIZ_TYPES = ['Distributor', 'Trader', 'Dealer', 'Manufacturer', 'Retailer', 'Other'];
const NEXT_STAGE = { cold: 'contacted', contacted: 'trial', trial: 'engaged', engaged: 'paid', paid: 'paid', churned: 'cold' };
const WA_TEMPLATES = [
  'Bhai, aapka business ka ek demo dekhna chahoge? 15 min mein collections improve ho jaata hai.',
  'Sharma ji, aapke receivables ke baare mein baat karni thi. Kya kal 10 min milenge?',
  'Vantro se 30% faster collections — aapke jaise distributors use kar rahe hain. Try karein?',
];

function fmtAmt(n) {
  if (!n) return '';
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n/1000).toFixed(0)}K`;
  return `₹${n}`;
}

function daysSince(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

const EMPTY_FORM = { name: '', phone: '', email: '', business_type: 'Distributor', location: '', amount_stuck: '' };

export default function Prospects({ user }) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [waMenu, setWaMenu] = useState(false);

  useEffect(() => { load(); }, [user.id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/prospects/${user.id}`);
      setProspects(res.data.prospects || []);
    } catch {}
    setLoading(false);
  };

  const addProspect = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/prospects`, { user_id: user.id, ...form, amount_stuck: form.amount_stuck || null });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch {}
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.post(`${API_BASE}/api/prospects/${id}`, { status });
      setProspects(p => p.map(x => x.id === id ? { ...x, status } : x));
      if (selected?.id === id) setSelected(s => ({ ...s, status }));
    } catch {}
  };

  const deleteProspect = async (id) => {
    if (!window.confirm('Delete this prospect?')) return;
    try {
      await axios.post(`${API_BASE}/api/prospects/${id}/delete`);
      setProspects(p => p.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
  };

  const addNote = async () => {
    if (!newNote.trim() || !selected) return;
    try {
      const res = await axios.post(`${API_BASE}/api/prospects/${selected.id}/notes`, { text: newNote });
      const note = res.data.note;
      setSelected(s => ({ ...s, prospect_notes: [note, ...(s.prospect_notes || [])] }));
      setProspects(p => p.map(x => x.id === selected.id
        ? { ...x, prospect_notes: [note, ...(x.prospect_notes || [])] }
        : x));
      setNewNote('');
    } catch {}
  };

  // Drag and drop
  const onDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e, status) => {
    e.preventDefault();
    if (dragId) updateStatus(dragId, status);
    setDragId(null);
  };

  const openWA = (phone, msg) => {
    const num = phone?.replace(/\D/g, '');
    window.open(`https://wa.me/91${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Stats
  const total = prospects.length;
  const paid = prospects.filter(p => p.status === 'paid').length;
  const trial = prospects.filter(p => p.status === 'trial' || p.status === 'engaged').length;
  const contacted = prospects.filter(p => p.status !== 'cold').length;
  const convRate = total > 0 ? Math.round(paid / total * 100) : 0;

  const selProspect = selected ? prospects.find(p => p.id === selected.id) || selected : null;

  return (
    <div className="prospects-page">
      {/* Header */}
      <div className="prospects-header">
        <div>
          <h1>🎯 Prospects CRM</h1>
          <p>Track your sales pipeline — Cold to Paid</p>
        </div>
        <button className="add-prospect-btn" onClick={() => setShowForm(true)}>+ Add Prospect</button>
      </div>

      {/* Stats bar */}
      <div className="prospects-stats">
        <div className="pstat"><span className="pstat-val">{total}</span><span className="pstat-lbl">Total</span></div>
        <div className="pstat"><span className="pstat-val" style={{color:'#3b82f6'}}>{contacted}</span><span className="pstat-lbl">Contacted</span></div>
        <div className="pstat"><span className="pstat-val" style={{color:'#7c3aed'}}>{trial}</span><span className="pstat-lbl">In Trial</span></div>
        <div className="pstat"><span className="pstat-val" style={{color:'#16a34a'}}>{paid}</span><span className="pstat-lbl">Paid</span></div>
        <div className="pstat"><span className="pstat-val" style={{color:'#ea580c'}}>{convRate}%</span><span className="pstat-lbl">Conversion</span></div>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Prospect</h3>
              <button onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={addProspect} className="prospect-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Sharma bhai" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="98765 43210" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Business Type</label>
                  <select value={form.business_type} onChange={e => setForm(f => ({...f, business_type: e.target.value}))}>
                    {BIZ_TYPES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Delhi" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount Stuck (₹)</label>
                  <input type="number" value={form.amount_stuck} onChange={e => setForm(f => ({...f, amount_stuck: e.target.value}))} placeholder="500000" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="sharma@example.com" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={saving}>{saving ? 'Saving...' : 'Add Prospect'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban + Detail panel */}
      <div className={`kanban-layout ${selProspect ? 'with-panel' : ''}`}>
        {/* Kanban board */}
        <div className="kanban-board">
          {STAGES.map(stage => {
            const cols = prospects.filter(p => p.status === stage.key);
            return (
              <div
                key={stage.key}
                className="kanban-col"
                onDragOver={onDragOver}
                onDrop={e => onDrop(e, stage.key)}
              >
                <div className="kanban-col-header" style={{ borderTopColor: stage.color }}>
                  <span>{stage.label}</span>
                  <span className="col-count">{cols.length}</span>
                </div>
                <div className="kanban-cards">
                  {cols.map(p => (
                    <div
                      key={p.id}
                      className={`kanban-card ${selProspect?.id === p.id ? 'selected' : ''}`}
                      draggable
                      onDragStart={e => onDragStart(e, p.id)}
                      onClick={() => setSelected(p)}
                      style={{ borderLeftColor: stage.color }}
                    >
                      <div className="card-name">{p.name}</div>
                      <div className="card-meta">
                        {p.business_type && <span className="card-tag">{p.business_type}</span>}
                        {p.amount_stuck && <span className="card-amt">{fmtAmt(p.amount_stuck)}</span>}
                      </div>
                      {p.location && <div className="card-loc">📍 {p.location}</div>}
                      <div className="card-date">{daysSince(p.created_at)}</div>
                    </div>
                  ))}
                  {cols.length === 0 && (
                    <div className="kanban-empty">Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        {selProspect && (
          <div className="prospect-panel">
            <div className="panel-header">
              <div>
                <h3>{selProspect.name}</h3>
                <span className="panel-stage" style={{ background: STAGES.find(s => s.key === selProspect.status)?.bg, color: STAGES.find(s => s.key === selProspect.status)?.color }}>
                  {STAGES.find(s => s.key === selProspect.status)?.label}
                </span>
              </div>
              <button className="panel-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="panel-info">
              {selProspect.phone && <div className="panel-row"><span>📞</span><a href={`tel:${selProspect.phone}`}>{selProspect.phone}</a></div>}
              {selProspect.email && <div className="panel-row"><span>📧</span><span>{selProspect.email}</span></div>}
              {selProspect.business_type && <div className="panel-row"><span>🏢</span><span>{selProspect.business_type}</span></div>}
              {selProspect.location && <div className="panel-row"><span>📍</span><span>{selProspect.location}</span></div>}
              {selProspect.amount_stuck && <div className="panel-row"><span>💰</span><strong>{fmtAmt(selProspect.amount_stuck)} stuck</strong></div>}
              {selProspect.trial_end_date && (
                <div className="panel-row">
                  <span>⏳</span>
                  <span>Trial ends {selProspect.trial_end_date}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="panel-actions">
              {selProspect.status !== 'paid' && selProspect.status !== 'churned' && (
                <button className="panel-btn-primary" onClick={() => updateStatus(selProspect.id, NEXT_STAGE[selProspect.status])}>
                  → Move to {STAGES.find(s => s.key === NEXT_STAGE[selProspect.status])?.label}
                </button>
              )}
              {selProspect.phone && (
                <div className="wa-wrapper" style={{ position: 'relative' }}>
                  <button className="panel-btn-wa" onClick={() => setWaMenu(w => !w)}>💬 WhatsApp</button>
                  {waMenu && (
                    <div className="wa-dropdown">
                      {WA_TEMPLATES.map((t, i) => (
                        <button key={i} onClick={() => { openWA(selProspect.phone, t); setWaMenu(false); }}>
                          {t.substring(0, 60)}...
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button className="panel-btn-danger" onClick={() => deleteProspect(selProspect.id)}>🗑️ Delete</button>
            </div>

            {/* Status quick-change */}
            <div className="panel-status-row">
              {STAGES.map(s => (
                <button key={s.key}
                  className={`status-chip ${selProspect.status === s.key ? 'active' : ''}`}
                  style={selProspect.status === s.key ? { background: s.bg, color: s.color, borderColor: s.color } : {}}
                  onClick={() => updateStatus(selProspect.id, s.key)}
                >{s.label.split(' ')[0]}</button>
              ))}
            </div>

            {/* Notes */}
            <div className="panel-notes">
              <h4>📝 Notes</h4>
              <div className="note-input-row">
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                />
                <button onClick={addNote}>Add</button>
              </div>
              <div className="notes-list">
                {(selProspect.prospect_notes || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(n => (
                  <div key={n.id} className="note-item">
                    <span className="note-text">{n.text}</span>
                    <span className="note-date">{daysSince(n.created_at)}</span>
                  </div>
                ))}
                {(selProspect.prospect_notes || []).length === 0 && (
                  <p className="empty">No notes yet. Add your first note.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
