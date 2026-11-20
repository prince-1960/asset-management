import { useState } from 'react';
import { Plus, X, Edit2, Trash2, ChevronDown, ChevronUp, Zap, Camera, Check, Home, MessageCircle, Receipt } from 'lucide-react';
import { genId, formatDate, formatCurrency, currentMonthKey, monthLabel, getLast12Months } from '../utils/storage';

const STATUS_OPTS = ['Paid', 'Unpaid', 'Partial'];
const STATUS_CLASS = { Paid: 'month-cell-paid', Unpaid: 'month-cell-unpaid', Partial: 'month-cell-partial' };
const BADGE_CLASS  = { Paid: 'badge-green', Unpaid: 'badge-red', Partial: 'badge-amber' };

// ── Room Modal ───────────────────────────────────────────────────────────
function RoomModal({ room, onSave, onClose }) {
  const thisMonth = currentMonthKey();
  const [form, setForm] = useState(room || {
    id: genId(), name: '', tenant: '', currentRent: '', tenantPhone: '', securityDeposit: '', property: '', rentHistory: [], payments: {}, electricity: []
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{room ? 'Edit Room' : 'Add Room'}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Room / Unit Name</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Room 101 / Ground Floor" />
            </div>
            <div className="form-group">
              <label className="form-label">Property / Building Name</label>
              <input className="form-input" value={form.property || ''} onChange={e => set('property', e.target.value)} placeholder="e.g. Main House, Market Shops" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Tenant Name</label>
              <input className="form-input" value={form.tenant || ''} onChange={e => set('tenant', e.target.value)} placeholder="Tenant's name" />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rent (₹)</label>
              <input className="form-input" type="number" value={form.currentRent || ''} onChange={e => set('currentRent', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Tenant Phone</label>
              <input className="form-input" type="tel" value={form.tenantPhone || ''} onChange={e => set('tenantPhone', e.target.value)} placeholder="10-digit mobile number" />
            </div>
            <div className="form-group">
              <label className="form-label">Security Deposit (₹)</label>
              <input className="form-input" type="number" value={form.securityDeposit || ''} onChange={e => set('securityDeposit', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            const toSave = { ...form };
            // If editing and rent changed, record history
            if (room && room.currentRent && Number(room.currentRent) !== Number(form.currentRent)) {
              toSave.rentHistory = [...(room.rentHistory || []), { from: thisMonth, amount: Number(form.currentRent), prevAmount: Number(room.currentRent) }];
            }
            toSave.currentRent = Number(form.currentRent);
            toSave.securityDeposit = form.securityDeposit ? Number(form.securityDeposit) : '';
            toSave.property = (form.property || '').trim();
            onSave(toSave);
          }} disabled={!form.name}>Save Room</button>
        </div>
      </div>
    </div>
  );
}

// ── Payment Modal (Rent) ─────────────────────────────────────────────────
function PaymentModal({ room, month, onSave, onClose }) {
  const existing = room.payments?.[month] || {};
  const [form, setForm] = useState({ status: existing.status || 'Paid', amount: existing.amount || room.currentRent || '', notes: existing.notes || '', date: existing.date || new Date().toISOString().split('T')[0] });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Rent Payment — {room.name}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="text-sm text-secondary mb-8">Month: <strong style={{ color: 'var(--text-primary)' }}>{monthLabel(month)}</strong></div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="flex gap-8">
              {STATUS_OPTS.map(s => (
                <button key={s} className={`btn btn-sm ${form.status === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setForm(p => ({ ...p, status: s }))}>{s}</button>
              ))}
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Amount Received (₹)</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder={room.currentRent || '0'} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Save Payment</button>
        </div>
      </div>
    </div>
  );
}

// ── Electricity Modal ─────────────────────────────────────────────────────
function ElecModal({ room, entry, onSave, onClose }) {
  const [form, setForm] = useState(entry || {
    id: genId(), date: new Date().toISOString().split('T')[0],
    prevReading: '', currReading: '', amount: '', status: 'Unpaid', notes: '', screenshot: null
  });

  const units = form.currReading && form.prevReading ? Math.max(0, Number(form.currReading) - Number(form.prevReading)) : 0;

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(p => ({ ...p, screenshot: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">⚡ Electricity — {room.name}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option>Unpaid</option><option>Paid</option><option>Partial</option>
              </select>
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Previous Reading</label>
              <input className="form-input" type="number" value={form.prevReading} onChange={e => setForm(p => ({ ...p, prevReading: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Current Reading</label>
              <input className="form-input" type="number" value={form.currReading} onChange={e => setForm(p => ({ ...p, currReading: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Units Used</label>
              <input className="form-input" value={units} readOnly style={{ color: 'var(--accent-cyan)', fontWeight: 600 }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bill Amount (₹)</label>
            <input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Total bill amount" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. 2 months pending" />
          </div>

          {/* Screenshot upload */}
          <div className="form-group">
            <label className="form-label">Bill Screenshot (optional)</label>
            {form.screenshot ? (
              <div className="upload-preview">
                <img src={form.screenshot} alt="Bill" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)' }} />
                <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={() => setForm(p => ({ ...p, screenshot: null }))}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            ) : (
              <label className="upload-area" style={{ cursor: 'pointer', display: 'block' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScreenshot} />
                <Camera size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                <div>Tap to upload bill photo</div>
                <div className="text-sm" style={{ opacity: 0.6 }}>PNG, JPG, JPEG</div>
              </label>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.date}>Save Entry</button>
        </div>
      </div>
    </div>
  );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────
function ReceiptModal({ room, month, payment, onClose }) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head><title>Rent Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 500px; margin: 0 auto; }
          h2 { text-align: center; margin-bottom: 4px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 10px 8px; border-bottom: 1px solid #eee; }
          td:first-child { color: #666; width: 40%; }
          td:last-child { font-weight: 600; }
          .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #999; }
        </style>
        </head>
        <body>
          <h2>🏠 Rent Receipt</h2>
          <div class="subtitle">AssetFlow Property Manager</div>
          <table>
            <tr><td>Room</td><td>${room.name}</td></tr>
            <tr><td>Tenant</td><td>${room.tenant || '—'}</td></tr>
            <tr><td>Month</td><td>${monthLabel(month)}</td></tr>
            <tr><td>Amount</td><td>₹${payment.amount}</td></tr>
            <tr><td>Date Paid</td><td>${payment.date ? formatDate(payment.date) : '—'}</td></tr>
            <tr><td>Status</td><td>${payment.status}</td></tr>
            ${payment.notes ? `<tr><td>Notes</td><td>${payment.notes}</td></tr>` : ''}
          </table>
          <div class="footer">Generated by AssetFlow · ${new Date().toLocaleDateString('en-IN')}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">🧾 Rent Receipt</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Room', room.name],
              ['Tenant', room.tenant || '—'],
              ['Month', monthLabel(month)],
              ['Amount', `₹${payment.amount}`],
              ['Date Paid', payment.date ? formatDate(payment.date) : '—'],
              ['Status', payment.status],
              ...(payment.notes ? [['Notes', payment.notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-secondary text-sm">{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted" style={{ marginTop: 10, textAlign: 'center' }}>
            Generated by AssetFlow · {new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Rooms Component ──────────────────────────────────────────────────
export default function Rooms({ rooms, updateRooms }) {
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [viewImg, setViewImg] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('ALL');
  const thisMonth = currentMonthKey();
  const months12 = getLast12Months();

  // Unique properties
  const properties = Array.from(new Set(rooms.map(r => r.property).filter(Boolean)));
  const filteredRooms = selectedProperty === 'ALL'
    ? rooms
    : rooms.filter(r => r.property === selectedProperty);

  // Overdue check: past the 7th of current month
  const today = new Date();
  const isOverduePeriod = today.getDate() > 7;

  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const getTab = id => activeTab[id] || 'rent';
  const setTab = (id, t) => setActiveTab(p => ({ ...p, [id]: t }));

  const saveRoom = (room) => {
    const exists = rooms.find(r => r.id === room.id);
    updateRooms(exists ? rooms.map(r => r.id === room.id ? { ...r, ...room } : r) : [...rooms, room]);
    setModal(null);
  };

  const deleteRoom = (id) => {
    if (confirm('Delete this room and all data?')) updateRooms(rooms.filter(r => r.id !== id));
  };

  const savePayment = (roomId, month, payment) => {
    updateRooms(rooms.map(r => r.id === roomId ? { ...r, payments: { ...(r.payments || {}), [month]: payment } } : r));
    setModal(null);
  };

  const saveElec = (roomId, entry) => {
    updateRooms(rooms.map(r => {
      if (r.id !== roomId) return r;
      const elec = r.electricity || [];
      const idx = elec.findIndex(e => e.id === entry.id);
      const newElec = idx >= 0 ? elec.map((e, i) => i === idx ? entry : e) : [entry, ...elec];
      return { ...r, electricity: newElec };
    }));
    setModal(null);
  };

  const deleteElec = (roomId, entryId) => {
    updateRooms(rooms.map(r => r.id === roomId ? { ...r, electricity: (r.electricity || []).filter(e => e.id !== entryId) } : r));
  };

  const buildWhatsAppUrl = (room) => {
    const phone = room.tenantPhone?.replace(/\D/g, '');
    if (!phone) return null;
    const msg = `Hi ${room.tenant || 'Tenant'}, your rent of ₹${room.currentRent} for ${monthLabel(thisMonth)} is due. Please pay at the earliest. - AssetFlow`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="animate-in">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Rooms &amp; Rent</div>
          <div className="section-subtitle">Track rent collection and electricity per room</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'room' })} id="btn-add-room">
          <Plus size={15} /> Add Room
        </button>
      </div>

      {properties.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedProperty === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedProperty('ALL')}
          >
            All Units ({rooms.length})
          </button>
          {properties.map(p => (
            <button
              key={p}
              className={`btn btn-sm ${selectedProperty === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedProperty(p)}
            >
              🏢 {p} ({rooms.filter(r => r.property === p).length})
            </button>
          ))}
        </div>
      )}

      {rooms.length === 0 && (
        <div className="empty-state">
          <Home size={48} />
          <div className="empty-state-title">No rooms added yet</div>
          <div className="empty-state-desc">Click "Add Room" to start tracking rent</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredRooms.map(room => {
          const isOpen = !!expanded[room.id];
          const tab = getTab(room.id);
          const thisPayment = room.payments?.[thisMonth];
          const statusClass = thisPayment ? BADGE_CLASS[thisPayment.status] : 'badge-muted';
          const statusLabel = thisPayment?.status || 'Not set';
          const unpaidElec = (room.electricity || []).filter(e => e.status === 'Unpaid').length;
          const isOverdue = isOverduePeriod && (!thisPayment || thisPayment.status === 'Unpaid' || thisPayment.status === 'Partial');
          const waUrl = buildWhatsAppUrl(room);

          return (
            <div key={room.id} className="room-card">
              {/* Header */}
              <div className="room-card-header" style={{ cursor: 'pointer' }} onClick={() => toggle(room.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    🏠 {room.name}
                    {room.property && (
                      <span className="badge badge-purple" style={{ fontSize: 11, padding: '2px 8px' }}>
                        🏢 {room.property}
                      </span>
                    )}
                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                    {unpaidElec > 0 && <span className="badge badge-amber">⚡ {unpaidElec} unpaid</span>}
                    {isOverdue && (
                      <span className="badge badge-red" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        🔴 Overdue
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                    {room.tenant || 'No tenant'} · {formatCurrency(room.currentRent)}/month
                  </div>
                  {room.securityDeposit ? (
                    <div className="text-sm" style={{ marginTop: 2, color: 'var(--accent-cyan)', opacity: 0.85 }}>
                      Deposit: {formatCurrency(room.securityDeposit)}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-8" onClick={e => e.stopPropagation()}>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Send WhatsApp reminder"
                      style={{ color: '#25D366' }}
                    >
                      <MessageCircle size={13} />
                    </a>
                  )}
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setModal({ type: 'room', room })} id={`btn-edit-room-${room.id}`}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteRoom(room.id)} id={`btn-delete-room-${room.id}`}>
                    <Trash2 size={13} />
                  </button>
                  <div onClick={() => toggle(room.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '16px 20px' }}>
                  <div className="tabs">
                    <button className={`tab ${tab === 'rent' ? 'active' : ''}`} onClick={() => setTab(room.id, 'rent')}>🏠 Rent</button>
                    <button className={`tab ${tab === 'elec' ? 'active' : ''}`} onClick={() => setTab(room.id, 'elec')}>⚡ Electricity</button>
                    {room.rentHistory?.length > 0 && (
                      <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab(room.id, 'history')}>📈 Rent History</button>
                    )}
                  </div>

                  {/* Rent Tab */}
                  {tab === 'rent' && (
                    <div>
                      <div className="text-sm text-secondary mb-8">Click a month to mark payment status</div>
                      <div className="month-grid">
                        {months12.map(month => {
                          const p = room.payments?.[month];
                          const status = p?.status || 'none';
                          const cls = STATUS_CLASS[status] || 'month-cell-none';
                          return (
                            <div
                              key={month}
                              className={`month-cell ${cls}`}
                              style={{ position: 'relative' }}
                              onClick={() => setModal({ type: 'payment', room, month })}
                              id={`rent-${room.id}-${month}`}
                            >
                              <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                              <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                              {status === 'Paid' && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                              {status === 'Partial' && <div style={{ fontSize: 9, marginTop: 2 }}>Part</div>}
                              {/* Receipt button for paid/partial months */}
                              {(status === 'Paid' || status === 'Partial') && p && (
                                <button
                                  className="btn btn-secondary btn-icon"
                                  title="View Receipt"
                                  onClick={e => { e.stopPropagation(); setModal({ type: 'receipt', room, month, payment: p }); }}
                                  style={{
                                    position: 'absolute', top: 2, right: 2,
                                    padding: '1px 3px', minWidth: 'unset', height: 'unset',
                                    background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 3
                                  }}
                                >
                                  <Receipt size={8} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Electricity Tab */}
                  {tab === 'elec' && (
                    <div>
                      <div className="flex justify-between items-center mb-12">
                        <span className="text-sm text-secondary">Meter readings &amp; bills</span>
                        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'elec', room })} id={`btn-add-elec-${room.id}`}>
                          <Plus size={13} /> Add Reading
                        </button>
                      </div>
                      {(!room.electricity || room.electricity.length === 0) ? (
                        <div className="empty-state" style={{ padding: 24 }}>
                          <Zap size={32} />
                          <div className="empty-state-title">No electricity readings</div>
                          <div className="empty-state-desc">Optional — add meter readings to track electricity</div>
                        </div>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr><th>Date</th><th>Prev</th><th>Curr</th><th>Units</th><th>Amount</th><th>Status</th><th>Bill</th><th></th></tr>
                            </thead>
                            <tbody>
                              {room.electricity.map(e => (
                                <tr key={e.id}>
                                  <td>{formatDate(e.date)}</td>
                                  <td>{e.prevReading}</td>
                                  <td>{e.currReading}</td>
                                  <td style={{ color: 'var(--accent-cyan)' }}>{e.currReading && e.prevReading ? e.currReading - e.prevReading : '—'}</td>
                                  <td>{formatCurrency(e.amount)}</td>
                                  <td><span className={`badge ${BADGE_CLASS[e.status] || 'badge-muted'}`}>{e.status}</span></td>
                                  <td>
                                    {e.screenshot && (
                                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setViewImg(e.screenshot)}>
                                        <Camera size={12} />
                                      </button>
                                    )}
                                  </td>
                                  <td>
                                    <div className="flex gap-4">
                                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setModal({ type: 'elec', room, entry: e })}>
                                        <Edit2 size={12} />
                                      </button>
                                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteElec(room.id, e.id)}>
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rent History Tab */}
                  {tab === 'history' && (
                    <div>
                      <div className="text-sm text-secondary mb-12">Rent changes over time</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(room.rentHistory || []).map((h, i) => (
                          <div key={i} className="flex items-center justify-between" style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
                            <span className="text-secondary">From {monthLabel(h.from)}</span>
                            <div className="flex items-center gap-12">
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatCurrency(h.prevAmount)}</span>
                              <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>→ {formatCurrency(h.amount)}</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between" style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>Current Rent</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 16 }}>{formatCurrency(room.currentRent)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {modal?.type === 'room' && <RoomModal room={modal.room} onSave={saveRoom} onClose={() => setModal(null)} />}
      {modal?.type === 'payment' && <PaymentModal room={modal.room} month={modal.month} onSave={(p) => savePayment(modal.room.id, modal.month, p)} onClose={() => setModal(null)} />}
      {modal?.type === 'elec' && <ElecModal room={modal.room} entry={modal.entry} onSave={(e) => saveElec(modal.room.id, e)} onClose={() => setModal(null)} />}
      {modal?.type === 'receipt' && <ReceiptModal room={modal.room} month={modal.month} payment={modal.payment} onClose={() => setModal(null)} />}

      {/* Image viewer */}
      {viewImg && (
        <div className="modal-overlay" onClick={() => setViewImg(null)}>
          <div style={{ maxWidth: 600, width: '90%' }}>
            <img src={viewImg} alt="Bill screenshot" style={{ width: '100%', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }} />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setViewImg(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
