import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CameraScanner from '../components/CameraScanner';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const UNITS = ['unit', 'kg', 'litre', 'box', 'piece', 'packet', 'dozen', 'metre', 'set'];
const CATEGORIES = ['Raw Material', 'Finished Goods', 'Packaging', 'Consumable', 'Spare Parts', 'Other'];

function Inventory({ user }) {
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', sku: '', description: '', unit_price: '', unit: 'unit', current_stock: '', low_stock_alert: '10', category: '' });

  // Stock movement form
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [moveForm, setMoveForm] = useState({ product_id: '', movement_type: 'in', quantity: '', unit_cost: '', reference: '', notes: '' });
  const [movingSaving, setMovingSaving] = useState(false);

  // Supplier form
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', address: '', payment_terms: '30' });
  const [showSupplierScanner, setShowSupplierScanner] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [user.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, supRes] = await Promise.all([
        axios.get(`${API_BASE}/api/inventory/${user.id}`),
        axios.get(`${API_BASE}/api/suppliers/${user.id}`)
      ]);
      setProducts(invRes.data.products);
      setMovements(invRes.data.movements);
      setSummary(invRes.data.summary);
      setSuppliers(supRes.data.suppliers);
    } catch {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // ─── Product CRUD ───────────────────────────────────────────
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', sku: '', description: '', unit_price: '', unit: 'unit', current_stock: '', low_stock_alert: '10', category: '' });
    setShowProductForm(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, sku: p.sku || '', description: p.description || '', unit_price: p.unit_price, unit: p.unit, current_stock: p.current_stock, low_stock_alert: p.low_stock_alert, category: p.category || '' });
    setShowProductForm(true);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProduct) {
        await axios.post(`${API_BASE}/api/products/${editingProduct.id}`, productForm);
      } else {
        await axios.post(`${API_BASE}/api/products`, { user_id: user.id, ...productForm });
      }
      setShowProductForm(false);
      fetchAll();
    } catch {
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.post(`${API_BASE}/api/products/${id}/delete`);
      fetchAll();
    } catch {
      setError('Failed to delete product');
    }
  };

  // ─── Stock Movement ──────────────────────────────────────────
  const saveMovement = async (e) => {
    e.preventDefault();
    setMovingSaving(true);
    try {
      await axios.post(`${API_BASE}/api/stock/move`, { user_id: user.id, ...moveForm });
      setShowMoveForm(false);
      setMoveForm({ product_id: '', movement_type: 'in', quantity: '', unit_cost: '', reference: '', notes: '' });
      fetchAll();
    } catch {
      setError('Failed to log movement');
    } finally {
      setMovingSaving(false);
    }
  };

  // ─── Supplier CRUD ───────────────────────────────────────────
  const handleScannedSupplier = (extracted) => {
    setEditingSupplier(null);
    setSupplierForm({
      name: extracted.name || '',
      phone: extracted.phone || '',
      email: extracted.email || '',
      address: extracted.address || '',
      payment_terms: extracted.payment_terms || '30',
    });
    setShowSupplierForm(true);
  };

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', phone: '', email: '', address: '', payment_terms: '30' });
    setShowSupplierForm(true);
  };

  const openEditSupplier = (s) => {
    setEditingSupplier(s);
    setSupplierForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', payment_terms: s.payment_terms });
    setShowSupplierForm(true);
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSupplier) {
        await axios.post(`${API_BASE}/api/suppliers/${editingSupplier.id}`, supplierForm);
      } else {
        await axios.post(`${API_BASE}/api/suppliers`, { user_id: user.id, ...supplierForm });
      }
      setShowSupplierForm(false);
      fetchAll();
    } catch {
      setError('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.post(`${API_BASE}/api/suppliers/${id}/delete`);
      fetchAll();
    } catch {
      setError('Failed to delete supplier');
    }
  };

  // ─── Stock status helper ─────────────────────────────────────
  const stockStatus = (p) => {
    if (p.current_stock === 0) return { label: 'Out of Stock', cls: 'stock-out' };
    if (p.current_stock <= p.low_stock_alert) return { label: 'Low Stock', cls: 'stock-low' };
    return { label: 'In Stock', cls: 'stock-ok' };
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <p className="loading">Loading inventory...</p>;

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h2>📦 Inventory Management</h2>
        <button onClick={fetchAll} className="refresh-btn">🔄 Refresh</button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* Tabs */}
      <div className="inv-tabs">
        {[['overview', '📊 Overview'], ['products', '📋 Products'], ['stock', '↕️ Stock Log'], ['suppliers', '🏭 Suppliers']].map(([key, label]) => (
          <button key={key} className={`inv-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div className="inv-summary">
            <div className="inv-card blue">
              <p className="inv-label">Total Products</p>
              <p className="inv-value">{summary.total_products || 0}</p>
            </div>
            <div className="inv-card green">
              <p className="inv-label">Stock Value</p>
              <p className="inv-value">₹{Number(summary.total_value || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="inv-card orange">
              <p className="inv-label">Low Stock</p>
              <p className="inv-value">{summary.low_stock_count || 0} items</p>
            </div>
            <div className="inv-card red">
              <p className="inv-label">Out of Stock</p>
              <p className="inv-value">{summary.out_of_stock_count || 0} items</p>
            </div>
          </div>

          {/* Alerts */}
          {(summary.out_of_stock_items?.length > 0 || summary.low_stock_items?.length > 0) && (
            <div className="inv-alerts">
              <h3>⚠️ Alerts</h3>
              {summary.out_of_stock_items?.map(p => (
                <div key={p.id} className="alert-row alert-out">
                  <span>🚨 <strong>{p.name}</strong> — Out of Stock</span>
                  <button className="restock-btn" onClick={() => { setTab('stock'); setMoveForm(f => ({ ...f, product_id: p.id, movement_type: 'in' })); setShowMoveForm(true); }}>Restock</button>
                </div>
              ))}
              {summary.low_stock_items?.map(p => (
                <div key={p.id} className="alert-row alert-low">
                  <span>⚠️ <strong>{p.name}</strong> — Only {p.current_stock} {p.unit} left (alert at {p.low_stock_alert})</span>
                  <button className="restock-btn" onClick={() => { setTab('stock'); setMoveForm(f => ({ ...f, product_id: p.id, movement_type: 'in' })); setShowMoveForm(true); }}>Restock</button>
                </div>
              ))}
            </div>
          )}

          {/* Recent Movements */}
          <div className="inv-section">
            <h3>🕐 Recent Stock Movements</h3>
            {movements.length === 0 ? <p className="empty">No movements yet.</p> : (
              <table className="inv-table">
                <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Reference</th><th>Date</th></tr></thead>
                <tbody>
                  {movements.slice(0, 10).map(m => (
                    <tr key={m.id}>
                      <td>{m.products?.name || '—'}</td>
                      <td><span className={`move-badge ${m.movement_type}`}>{m.movement_type === 'in' ? '▲ In' : m.movement_type === 'out' ? '▼ Out' : '~ Adj'}</span></td>
                      <td>{m.quantity} {m.products?.unit || ''}</td>
                      <td>{m.reference || '—'}</td>
                      <td>{formatDate(m.moved_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {tab === 'products' && (
        <div>
          <div className="section-header">
            <h3>Product Catalog</h3>
            <button className="add-btn" onClick={openNewProduct}>+ Add Product</button>
          </div>

          {showProductForm && (
            <form className="inv-form" onSubmit={saveProduct}>
              <h4>{editingProduct ? 'Edit Product' : 'New Product'}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input required value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spray Can 500ml" />
                </div>
                <div className="form-group">
                  <label>SKU / Code</label>
                  <input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. SP-500" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input type="number" value={productForm.unit_price} onChange={e => setProductForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0" min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Opening Stock</label>
                  <input type="number" value={productForm.current_stock} onChange={e => setProductForm(f => ({ ...f, current_stock: e.target.value }))} placeholder="0" min="0" />
                </div>
                <div className="form-group">
                  <label>Low Stock Alert</label>
                  <input type="number" value={productForm.low_stock_alert} onChange={e => setProductForm(f => ({ ...f, low_stock_alert: e.target.value }))} placeholder="10" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional notes" />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Product'}</button>
                <button type="button" className="cancel-btn" onClick={() => setShowProductForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {products.length === 0 ? (
            <p className="empty">No products yet. Click "+ Add Product" to start.</p>
          ) : (
            <table className="inv-table">
              <thead>
                <tr><th>Name</th><th>SKU</th><th>Category</th><th>Stock</th><th>Unit Price</th><th>Value</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const st = stockStatus(p);
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong>{p.description && <small className="desc-small"> — {p.description}</small>}</td>
                      <td>{p.sku || '—'}</td>
                      <td>{p.category || '—'}</td>
                      <td>{p.current_stock} {p.unit}</td>
                      <td>₹{Number(p.unit_price).toLocaleString('en-IN')}</td>
                      <td>₹{(Number(p.current_stock) * Number(p.unit_price)).toLocaleString('en-IN')}</td>
                      <td><span className={`stock-badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div className="action-btns">
                          <button className="edit-btn" onClick={() => openEditProduct(p)}>✏️</button>
                          <button className="move-in-btn" onClick={() => { setMoveForm(f => ({ ...f, product_id: p.id, movement_type: 'in' })); setShowMoveForm(true); setTab('stock'); }}>▲ In</button>
                          <button className="move-out-btn" onClick={() => { setMoveForm(f => ({ ...f, product_id: p.id, movement_type: 'out' })); setShowMoveForm(true); setTab('stock'); }}>▼ Out</button>
                          <button className="del-btn" onClick={() => deleteProduct(p.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── STOCK LOG ── */}
      {tab === 'stock' && (
        <div>
          <div className="section-header">
            <h3>Stock Movements</h3>
            <button className="add-btn" onClick={() => { setMoveForm({ product_id: '', movement_type: 'in', quantity: '', unit_cost: '', reference: '', notes: '' }); setShowMoveForm(true); }}>+ Log Movement</button>
          </div>

          {showMoveForm && (
            <form className="inv-form" onSubmit={saveMovement}>
              <h4>Log Stock Movement</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Product *</label>
                  <select required value={moveForm.product_id} onChange={e => setMoveForm(f => ({ ...f, product_id: e.target.value }))}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock} {p.unit})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Movement Type *</label>
                  <div className="toggle-row">
                    <button type="button" className={`toggle-btn ${moveForm.movement_type === 'in' ? 'active green' : ''}`} onClick={() => setMoveForm(f => ({ ...f, movement_type: 'in' }))}>▲ Stock In</button>
                    <button type="button" className={`toggle-btn ${moveForm.movement_type === 'out' ? 'active red' : ''}`} onClick={() => setMoveForm(f => ({ ...f, movement_type: 'out' }))}>▼ Stock Out</button>
                    <button type="button" className={`toggle-btn ${moveForm.movement_type === 'adjustment' ? 'active' : ''}`} onClick={() => setMoveForm(f => ({ ...f, movement_type: 'adjustment' }))}>~ Adjust</button>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input type="number" required min="1" value={moveForm.quantity} onChange={e => setMoveForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Unit Cost (₹) {moveForm.movement_type === 'in' ? '— purchase price' : ''}</label>
                  <input type="number" value={moveForm.unit_cost} onChange={e => setMoveForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="Optional" step="0.01" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Reference / Invoice No.</label>
                  <input value={moveForm.reference} onChange={e => setMoveForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. PO-2024-001" />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input value={moveForm.notes} onChange={e => setMoveForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={movingSaving}>{movingSaving ? '⏳ Saving...' : '💾 Log Movement'}</button>
                <button type="button" className="cancel-btn" onClick={() => setShowMoveForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {movements.length === 0 ? (
            <p className="empty">No stock movements yet.</p>
          ) : (
            <table className="inv-table">
              <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Unit Cost</th><th>Total Value</th><th>Reference</th><th>Notes</th><th>Date</th></tr></thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.products?.name || '—'}</strong></td>
                    <td><span className={`move-badge ${m.movement_type}`}>{m.movement_type === 'in' ? '▲ In' : m.movement_type === 'out' ? '▼ Out' : '~ Adj'}</span></td>
                    <td>{m.quantity} {m.products?.unit || ''}</td>
                    <td>{m.unit_cost ? `₹${Number(m.unit_cost).toLocaleString('en-IN')}` : '—'}</td>
                    <td>{m.unit_cost ? `₹${(m.quantity * m.unit_cost).toLocaleString('en-IN')}` : '—'}</td>
                    <td>{m.reference || '—'}</td>
                    <td>{m.notes || '—'}</td>
                    <td>{formatDate(m.moved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── SUPPLIERS ── */}
      {tab === 'suppliers' && (
        <div>
          <div className="section-header">
            <h3>Supplier Directory</h3>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button className="scan-invoice-btn" onClick={() => setShowSupplierScanner(true)}>📷 Scan Card</button>
              <button className="add-btn" onClick={openNewSupplier}>+ Add Supplier</button>
            </div>
          </div>

          {showSupplierScanner && (
            <CameraScanner
              scanType="supplier"
              onExtracted={handleScannedSupplier}
              onClose={() => setShowSupplierScanner(false)}
            />
          )}

          {showSupplierForm && (
            <form className="inv-form" onSubmit={saveSupplier}>
              <h4>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input required value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sharma Chemicals" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} placeholder="98XXXXXXXX" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} placeholder="supplier@email.com" />
                </div>
                <div className="form-group">
                  <label>Payment Terms (days)</label>
                  <input type="number" value={supplierForm.payment_terms} onChange={e => setSupplierForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder="30" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Full address" />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Supplier'}</button>
                <button type="button" className="cancel-btn" onClick={() => setShowSupplierForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {suppliers.length === 0 ? (
            <p className="empty">No suppliers yet. Click "+ Add Supplier" to start.</p>
          ) : (
            <div className="supplier-grid">
              {suppliers.map(s => (
                <div key={s.id} className="supplier-card">
                  <div className="supplier-top">
                    <strong>{s.name}</strong>
                    <div className="action-btns">
                      <button className="edit-btn" onClick={() => openEditSupplier(s)}>✏️</button>
                      <button className="del-btn" onClick={() => deleteSupplier(s.id)}>🗑️</button>
                    </div>
                  </div>
                  {s.phone && <p>📞 <a href={`tel:${s.phone}`}>{s.phone}</a> &nbsp; <a href={`https://wa.me/91${s.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="wa-link">💬 WhatsApp</a></p>}
                  {s.email && <p>✉️ {s.email}</p>}
                  {s.address && <p>📍 {s.address}</p>}
                  <p className="payment-terms">Net {s.payment_terms} days</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Inventory;
