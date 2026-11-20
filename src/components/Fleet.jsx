import { useState } from 'react';
import { Plus, X, Edit2, RefreshCw, ChevronDown, ChevronUp, Trash2, Check, ExternalLink, Sparkles, Calendar, Landmark, Wrench } from 'lucide-react';
import { genId, formatDate, daysUntil, formatCurrency, currentMonthKey, monthLabel, getLast12Months, calculatePendingLoan, getRemainingMonthsCount } from '../utils/storage';

const VEHICLE_EMOJI = { Truck: '🚛', Car: '🚗', Traveller: '🚐' };
const VEHICLE_COLORS = {
  Truck: 'rgba(59,130,246,0.15)',
  Car: 'rgba(16,185,129,0.15)',
  Traveller: 'rgba(245,158,11,0.15)',
};
const DOC_KEYS = ['insurance', 'puc', 'fitness', 'permit'];
const DOC_LABELS = { insurance: 'Insurance', puc: 'PUC', fitness: 'Fitness Certificate', permit: 'Permit' };

function expiryBadge(expiry) {
  if (!expiry) return <span className="badge badge-muted">Not set</span>;
  const days = daysUntil(expiry);
  if (days <= 0)  return <span className="badge badge-red">Expired</span>;
  if (days <= 30) return <span className="badge badge-red">{days}d left</span>;
  if (days <= 60) return <span className="badge badge-amber">{days}d left</span>;
  return <span className="badge badge-green">Valid</span>;
}

// ── Vahan API fetch ──────────────────────────────────────────────────────
async function fetchVahanData(regNumber) {
  // Parivahan's public vehicle info endpoint
  const url = `https://vahan.parivahan.gov.in/vahan4dashboard/vahan/findVehicleByRegNo.do?regNumber=${encodeURIComponent(regNumber.toUpperCase().replace(/\s/g, ''))}`;
  try {
    const res = await fetch(url, { mode: 'cors', headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// ── Add/Edit Vehicle Modal ───────────────────────────────────────────────
function VehicleModal({ vehicle, onSave, onClose }) {
  const [form, setForm] = useState(vehicle || {
    id: genId(), name: '', type: 'Car', regNumber: '', color: '',
    income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} },
    documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } }
  });

  const set = (path, val) => {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      path.reduce((o, k, i) => i === path.length - 1 ? (o[k] = val, o) : o[k], next);
      return next;
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Vehicle Name</label>
              <input className="form-input" value={form.name} onChange={e => set(['name'], e.target.value)} placeholder="e.g. White Scorpio" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => set(['type'], e.target.value)}>
                <option>Car</option><option>Truck</option><option>Traveller</option>
              </select>
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Registration Number</label>
              <input className="form-input" value={form.regNumber} onChange={e => set(['regNumber'], e.target.value)} placeholder="e.g. MH12AB1234" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input className="form-input" value={form.color} onChange={e => set(['color'], e.target.value)} placeholder="e.g. White" />
            </div>
          </div>

          <div className="divider" />
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 10 }}>🏦 Loan & EMI Details</div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Monthly EMI (₹)</label>
              <input className="form-input" type="number" value={form.emi.amount || ''} onChange={e => set(['emi', 'amount'], e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date (day of month)</label>
              <input className="form-input" type="number" min="1" max="31" value={form.emi.dueDate || ''} onChange={e => set(['emi', 'dueDate'], e.target.value)} placeholder="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Lender / Bank</label>
              <input className="form-input" value={form.emi.lender || ''} onChange={e => set(['emi', 'lender'], e.target.value)} placeholder="e.g. HDFC, Mahindra Finance" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Last EMI Date (Loan End Month)</label>
              <input
                className="form-input"
                type="month"
                value={form.emi.endDate || ''}
                onChange={e => set(['emi', 'endDate'], e.target.value)}
              />
              <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                Month of final EMI (calculates remaining loan automatically)
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Total Loan Amount (Optional ₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.emi.totalLoan || ''}
                onChange={e => set(['emi', 'totalLoan'], e.target.value)}
                placeholder="e.g. 1500000"
              />
              <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                Original sanctioned loan principal
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name}>Save Vehicle</button>
        </div>
      </div>
    </div>
  );
}

// ── Income Modal ─────────────────────────────────────────────────────────
function IncomeModal({ vehicle, entry, onSave, onClose }) {
  const [form, setForm] = useState(entry || { date: new Date().toISOString().split('T')[0], amount: '', paidBy: '', notes: '' });
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{entry ? 'Edit Income' : 'Log Income'} — {vehicle.name}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Paid By</label>
            <input className="form-input" value={form.paidBy} onChange={e => setForm(p => ({ ...p, paidBy: e.target.value }))} placeholder="Client / Company / Driver name" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional trip / route notes..." style={{ minHeight: 60 }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ ...form, id: entry?.id || genId() })} disabled={!form.amount || !form.date}>
            {entry ? 'Update Income' : 'Add Income'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Maintenance & Fuel Modal ─────────────────────────────────────────────
const MAINT_CATEGORIES = ['Fuel', 'Servicing', 'Repair', 'Tyres', 'Insurance/Tax', 'Other'];

function MaintenanceModal({ vehicle, entry, onSave, onClose }) {
  const [form, setForm] = useState(entry || {
    date: new Date().toISOString().split('T')[0],
    category: 'Fuel',
    amount: '',
    odometer: '',
    serviceCenter: '',
    notes: ''
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{entry ? 'Edit Expense' : 'Log Maintenance / Fuel'} — {vehicle.name}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {MAINT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Odometer / KM Reading</label>
              <input className="form-input" type="number" value={form.odometer || ''} onChange={e => setForm(p => ({ ...p, odometer: e.target.value }))} placeholder="e.g. 45200" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Station / Workshop / Vendor</label>
            <input className="form-input" value={form.serviceCenter || ''} onChange={e => setForm(p => ({ ...p, serviceCenter: e.target.value }))} placeholder="e.g. HP Petrol Pump / Authorized Center" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Details (e.g. 40L Diesel, Full Engine Oil change...)" style={{ minHeight: 60 }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ ...form, id: entry?.id || genId() })} disabled={!form.amount || !form.date}>
            {entry ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document Edit Modal ───────────────────────────────────────────────────
function DocModal({ vehicle, onSave, onClose }) {
  const [docs, setDocs] = useState(JSON.parse(JSON.stringify(vehicle.documents || {})));
  const [fetching, setFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('');

  const setDoc = (key, field, val) => {
    setDocs(prev => ({ ...prev, [key]: { ...prev[key], [field]: val, source: 'manual' } }));
  };

  const handleVahanFetch = async () => {
    if (!vehicle.regNumber) { setFetchStatus('error:Please add a registration number first (e.g. DL1AA1234)'); return; }
    setFetching(true);
    setFetchStatus('loading:Attempting direct connection to Vahan...');
    const data = await fetchVahanData(vehicle.regNumber);
    setFetching(false);
    if (!data) {
      setFetchStatus('error:Parivahan blocks direct browser requests (CORS & CAPTCHA). Use "Verify Online" or manual entry below.');
      return;
    }
    // Map Vahan response fields
    const updated = { ...docs };
    if (data.vehicleInsuranceDetails?.insuranceUpto) {
      updated.insurance = { ...updated.insurance, expiry: data.vehicleInsuranceDetails.insuranceUpto, source: 'vahan' };
    }
    if (data.puccDetails?.puccUpto) {
      updated.puc = { ...updated.puc, expiry: data.puccDetails.puccUpto, source: 'vahan' };
    }
    if (data.vehicleDetails?.fitnessUpto) {
      updated.fitness = { ...updated.fitness, expiry: data.vehicleDetails.fitnessUpto, source: 'vahan' };
    }
    if (data.vehicleDetails?.permitValidUpto) {
      updated.permit = { ...updated.permit, expiry: data.vehicleDetails.permitValidUpto, source: 'vahan' };
    }
    setDocs(updated);
    setFetchStatus('success:Data fetched from Vahan! Review and save.');
  };

  const handleSampleAutofill = () => {
    const today = new Date();
    const addMonths = (m) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + m);
      return d.toISOString().split('T')[0];
    };

    setDocs({
      insurance: { expiry: addMonths(8), source: 'vahan', insurer: 'Tata AIG General' },
      puc: { expiry: addMonths(2), source: 'vahan' },
      fitness: { expiry: addMonths(14), source: 'vahan' },
      permit: { expiry: addMonths(10), source: 'vahan', type: 'All India Tourist Permit' }
    });
    setFetchStatus('success:Simulated Vahan data populated! Check dates and click Save.');
  };

  const openExternalCheck = () => {
    if (!vehicle.regNumber) {
      alert('Please enter a Registration Number first.');
      return;
    }
    const cleanReg = vehicle.regNumber.toUpperCase().replace(/\s/g, '');
    window.open(`https://parivahan.gov.in/rcdlstatus/`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Documents — {vehicle.name}</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {/* Vahan fetch */}
          <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div className="flex items-center justify-between flex-wrap gap-8">
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🤖 Vahan RC Sync</span>
                  {vehicle.regNumber ? <span className="badge badge-purple">{vehicle.regNumber.toUpperCase()}</span> : null}
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                  {vehicle.regNumber ? 'Direct Vahan lookup or quick official portal verification' : 'Add Registration Number in vehicle settings first'}
                </div>
              </div>
              <div className="flex items-center gap-8 flex-wrap">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={openExternalCheck}
                  title="Open Parivahan portal in a new tab"
                >
                  <ExternalLink size={13} /> Verify Online
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSampleAutofill}
                  title="Populate test Vahan dates"
                >
                  <Sparkles size={13} /> Test Autofill
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleVahanFetch}
                  disabled={fetching || !vehicle.regNumber}
                  id={`btn-vahan-fetch-${vehicle.id}`}
                >
                  {fetching ? <span className="spinner" /> : <RefreshCw size={13} />}
                  {fetching ? 'Fetching...' : 'Fetch from Vahan'}
                </button>
              </div>
            </div>
            {fetchStatus && (
              <div className={`mt-8 text-sm ${
                fetchStatus.startsWith('success') ? 'text-green' :
                fetchStatus.startsWith('loading') ? 'text-blue' : 'text-amber'
              }`} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                {fetchStatus.includes(':') ? fetchStatus.split(':')[1] : fetchStatus}
              </div>
            )}
          </div>

          {/* Document fields */}
          {DOC_KEYS.map(key => (
            <div key={key} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div className="flex items-center justify-between mb-8">
                <div style={{ fontWeight: 600, fontSize: 13 }}>{DOC_LABELS[key]}</div>
                <span className={`source-badge ${docs[key]?.source === 'vahan' ? 'source-vahan' : 'source-manual'}`}>
                  {docs[key]?.source === 'vahan' ? 'Vahan' : 'Manual'}
                </span>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input className="form-input" type="date" value={docs[key]?.expiry || ''} onChange={e => setDoc(key, 'expiry', e.target.value)} />
                </div>
                {key === 'insurance' && (
                  <div className="form-group">
                    <label className="form-label">Insurer / Company</label>
                    <input className="form-input" value={docs[key]?.insurer || ''} onChange={e => setDoc(key, 'insurer', e.target.value)} placeholder="e.g. HDFC ERGO" />
                  </div>
                )}
                {key === 'permit' && (
                  <div className="form-group">
                    <label className="form-label">Permit Type</label>
                    <input className="form-input" value={docs[key]?.type || ''} onChange={e => setDoc(key, 'type', e.target.value)} placeholder="e.g. National, State" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(docs)}>Save Documents</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Fleet Component ──────────────────────────────────────────────────
export default function Fleet({ vehicles, updateVehicles }) {
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null); // null | {type, vehicle?}
  const [activeTab, setActiveTab] = useState({}); // per vehicle: 'income'|'emi'|'docs'
  const thisMonth = currentMonthKey();

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const getTab = (id) => activeTab[id] || 'docs';
  const setTab = (id, t) => setActiveTab(p => ({ ...p, [id]: t }));

  const saveVehicle = (v) => {
    const exists = vehicles.find(x => x.id === v.id);
    updateVehicles(exists ? vehicles.map(x => x.id === v.id ? { ...x, ...v } : x) : [...vehicles, v]);
    setModal(null);
  };

  const deleteVehicle = (id) => {
    if (confirm('Delete this vehicle and all its data?')) {
      updateVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const saveIncome = (vehicleId, entry) => {
    updateVehicles(vehicles.map(v => {
      if (v.id !== vehicleId) return v;
      const list = v.income || [];
      const idx = list.findIndex(e => e.id === entry.id);
      const updated = idx >= 0 ? list.map((e, i) => i === idx ? entry : e) : [entry, ...list];
      return { ...v, income: updated };
    }));
    setModal(null);
  };

  const deleteIncome = (vehicleId, entryId) => {
    updateVehicles(vehicles.map(v => v.id === vehicleId ? { ...v, income: (v.income || []).filter(e => e.id !== entryId) } : v));
  };

  const saveMaintenance = (vehicleId, entry) => {
    updateVehicles(vehicles.map(v => {
      if (v.id !== vehicleId) return v;
      const list = v.maintenance || [];
      const idx = list.findIndex(e => e.id === entry.id);
      const updated = idx >= 0 ? list.map((e, i) => i === idx ? entry : e) : [entry, ...list];
      return { ...v, maintenance: updated };
    }));
    setModal(null);
  };

  const deleteMaintenance = (vehicleId, entryId) => {
    if (!confirm('Delete this maintenance record?')) return;
    updateVehicles(vehicles.map(v => v.id === vehicleId ? { ...v, maintenance: (v.maintenance || []).filter(e => e.id !== entryId) } : v));
  };

  const saveDocs = (vehicleId, docs) => {
    updateVehicles(vehicles.map(v => v.id === vehicleId ? { ...v, documents: docs } : v));
    setModal(null);
  };

  const toggleEmiPaid = (vehicleId, month) => {
    updateVehicles(vehicles.map(v => {
      if (v.id !== vehicleId) return v;
      const current = v.emi?.paid?.[month];
      const next = current === 'Paid' ? 'Unpaid' : 'Paid';
      return { ...v, emi: { ...v.emi, paid: { ...(v.emi?.paid || {}), [month]: next } } };
    }));
  };

  const months12 = getLast12Months();

  return (
    <div className="animate-in">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Your Fleet</div>
          <div className="section-subtitle">Track income, EMI & documents for all vehicles</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'vehicle' })} id="btn-add-vehicle">
          <Plus size={15} /> Add Vehicle
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vehicles.map(v => {
          const isOpen = !!expanded[v.id];
          const tab = getTab(v.id);
          const expiringDocs = DOC_KEYS.filter(k => { const d = daysUntil(v.documents?.[k]?.expiry); return d !== null && d <= 30; });

          return (
            <div key={v.id} className="vehicle-card">
              {/* Header */}
              <div className="vehicle-card-header" onClick={() => toggle(v.id)}>
                <div className="vehicle-icon" style={{ background: VEHICLE_COLORS[v.type] || 'rgba(59,130,246,0.15)' }}>
                  <span style={{ fontSize: 22 }}>{VEHICLE_EMOJI[v.type] || '🚗'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</div>
                  <div className="text-sm text-muted">{v.type} {v.regNumber ? `· ${v.regNumber.toUpperCase()}` : ''} {v.color ? `· ${v.color}` : ''}</div>
                </div>
                <div className="flex items-center gap-8">
                  {expiringDocs.length > 0 && (
                    <span className="badge badge-red">⚠️ {expiringDocs.length} expiring</span>
                  )}
                  {v.emi?.amount > 0 && (
                    <span className={`badge ${v.emi.paid?.[thisMonth] === 'Paid' ? 'badge-green' : 'badge-amber'}`}>
                      EMI {v.emi.paid?.[thisMonth] === 'Paid' ? '✓' : 'due'}
                    </span>
                  )}
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={e => { e.stopPropagation(); setModal({ type: 'vehicle', vehicle: v }); }} id={`btn-edit-vehicle-${v.id}`}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={e => { e.stopPropagation(); deleteVehicle(v.id); }} id={`btn-delete-vehicle-${v.id}`}>
                    <Trash2 size={13} />
                  </button>
                  {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </div>

              {isOpen && (
                <div className="vehicle-card-body">
                  {/* Tabs */}
                  <div className="tabs">
                    <button className={`tab ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab(v.id, 'docs')}>📋 Documents</button>
                    <button className={`tab ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab(v.id, 'income')}>💰 Income</button>
                    <button className={`tab ${tab === 'emi' ? 'active' : ''}`} onClick={() => setTab(v.id, 'emi')}>🏦 EMI</button>
                    <button className={`tab ${tab === 'maint' ? 'active' : ''}`} onClick={() => setTab(v.id, 'maint')}>🔧 Service & Fuel</button>
                  </div>

                  {/* Documents Tab */}
                  {tab === 'docs' && (
                    <div>
                      <div className="flex justify-between items-center mb-12">
                        <span className="text-sm text-secondary">Document expiry dates</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal({ type: 'docs', vehicle: v })} id={`btn-edit-docs-${v.id}`}>
                          <Edit2 size={13} /> Edit Documents
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {DOC_KEYS.map(key => {
                          const doc = v.documents?.[key] || {};
                          return (
                            <div key={key} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div>
                                <span style={{ fontWeight: 500 }}>{DOC_LABELS[key]}</span>
                                {doc.insurer && <span className="text-sm text-muted" style={{ marginLeft: 8 }}>({doc.insurer})</span>}
                                {doc.type && <span className="text-sm text-muted" style={{ marginLeft: 8 }}>({doc.type})</span>}
                              </div>
                              <div className="flex items-center gap-8">
                                <span className={`source-badge ${doc.source === 'vahan' ? 'source-vahan' : 'source-manual'}`}>
                                  {doc.source === 'vahan' ? 'Vahan' : 'Manual'}
                                </span>
                                <span className="text-sm text-secondary">{formatDate(doc.expiry)}</span>
                                {expiryBadge(doc.expiry)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Income Tab */}
                  {tab === 'income' && (
                    <div>
                      <div className="flex justify-between items-center mb-12">
                        <span className="text-sm text-secondary">Payment receipts</span>
                        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'income', vehicle: v })} id={`btn-add-income-${v.id}`}>
                          <Plus size={13} /> Add Income
                        </button>
                      </div>
                      {(!v.income || v.income.length === 0) ? (
                        <div className="empty-state" style={{ padding: '24px' }}>
                          <div className="empty-state-title">No income logged yet</div>
                        </div>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr><th>Date</th><th>Paid By</th><th>Amount</th><th>Notes</th><th></th></tr>
                            </thead>
                            <tbody>
                              {v.income.map(e => (
                                <tr key={e.id}>
                                  <td>{formatDate(e.date)}</td>
                                  <td>{e.paidBy || '—'}</td>
                                  <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                                  <td>{e.notes || '—'}</td>
                                  <td>
                                    <div className="flex gap-4">
                                      <button
                                        className="btn btn-secondary btn-icon btn-sm"
                                        onClick={() => setModal({ type: 'income', vehicle: v, entry: e })}
                                        title="Edit Income"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        className="btn btn-danger btn-icon btn-sm"
                                        onClick={() => deleteIncome(v.id, e.id)}
                                        title="Delete Income"
                                      >
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

                  {/* EMI Tab */}
                  {tab === 'emi' && (
                    <div>
                      {!v.emi?.amount ? (
                        <div className="text-muted text-sm">
                          No EMI configured. Edit vehicle to add monthly EMI, lender, and loan end date.
                        </div>
                      ) : (
                        <>
                          <div className="grid-cols-3 gap-12 mb-16" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                            <div>
                              <div className="text-sm text-muted">Monthly EMI</div>
                              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{formatCurrency(v.emi.amount)}</div>
                              <div className="text-sm text-secondary">Due: {v.emi.dueDate ? `${v.emi.dueDate}th` : '1st'} of month</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted">Lender & Tenure</div>
                              <div style={{ fontWeight: 600 }}>{v.emi.lender || '—'}</div>
                              <div className="text-sm text-secondary">
                                {v.emi.endDate ? `Ends: ${monthLabel(v.emi.endDate)}` : 'No end date set'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted">Estimated Loan Left</div>
                              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent-red)' }}>
                                {v.emi.endDate ? formatCurrency(calculatePendingLoan(v.emi)) : (v.emi.totalLoan ? formatCurrency(calculatePendingLoan(v.emi)) : '—')}
                              </div>
                              <div className="text-sm text-secondary">
                                {v.emi.endDate ? `${getRemainingMonthsCount(v.emi.endDate)} EMIs remaining` : 'Set end date in Edit Vehicle'}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mb-8">
                            <span className="text-sm text-secondary">Monthly Payment Tracker (Click to mark Paid / Unpaid)</span>
                            <span className="text-sm text-muted">Current: {monthLabel(thisMonth)}</span>
                          </div>

                          <div className="month-grid">
                            {months12.map(month => {
                              const status = v.emi.paid?.[month] || 'Unpaid';
                              return (
                                <div
                                  key={month}
                                  className={`month-cell ${status === 'Paid' ? 'month-cell-paid' : month === thisMonth ? 'month-cell-unpaid' : 'month-cell-none'}`}
                                  onClick={() => toggleEmiPaid(v.id, month)}
                                  id={`emi-${v.id}-${month}`}
                                >
                                  <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                                  <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                                  {status === 'Paid' && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Maintenance & Fuel Tab */}
                  {tab === 'maint' && (
                    <div>
                      <div className="flex justify-between items-center mb-12">
                        <div>
                          <span className="text-sm text-secondary">Maintenance, repairs & fuel logs</span>
                          {(v.maintenance || []).length > 0 && (
                            <span className="badge badge-purple" style={{ marginLeft: 8 }}>
                              Total: {formatCurrency((v.maintenance || []).reduce((s, m) => s + Number(m.amount || 0), 0))}
                            </span>
                          )}
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'maint', vehicle: v })}>
                          <Plus size={13} /> Log Expense
                        </button>
                      </div>

                      {(!v.maintenance || v.maintenance.length === 0) ? (
                        <div className="empty-state" style={{ padding: '24px' }}>
                          <div className="empty-state-title">No maintenance or fuel logged yet</div>
                          <div className="empty-state-desc">Log oil changes, servicing, tyres, fuel refills, and repairs</div>
                        </div>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Odometer</th>
                                <th>Vendor / Workshop</th>
                                <th>Notes</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {v.maintenance.map(m => (
                                <tr key={m.id}>
                                  <td>{formatDate(m.date)}</td>
                                  <td>
                                    <span className="badge badge-blue">{m.category || 'Maintenance'}</span>
                                  </td>
                                  <td style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                                    {formatCurrency(m.amount)}
                                  </td>
                                  <td>{m.odometer ? `${Number(m.odometer).toLocaleString('en-IN')} KM` : '—'}</td>
                                  <td>{m.serviceCenter || '—'}</td>
                                  <td>{m.notes || '—'}</td>
                                  <td>
                                    <div className="flex gap-4">
                                      <button
                                        className="btn btn-secondary btn-icon btn-sm"
                                        onClick={() => setModal({ type: 'maint', vehicle: v, entry: m })}
                                        title="Edit Expense"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        className="btn btn-danger btn-icon btn-sm"
                                        onClick={() => deleteMaintenance(v.id, m.id)}
                                        title="Delete Expense"
                                      >
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
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {modal?.type === 'vehicle' && (
        <VehicleModal vehicle={modal.vehicle} onSave={saveVehicle} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'income' && (
        <IncomeModal
          vehicle={modal.vehicle}
          entry={modal.entry}
          onSave={e => saveIncome(modal.vehicle.id, e)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'maint' && (
        <MaintenanceModal
          vehicle={modal.vehicle}
          entry={modal.entry}
          onSave={e => saveMaintenance(modal.vehicle.id, e)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'docs' && (
        <DocModal vehicle={modal.vehicle} onSave={docs => saveDocs(modal.vehicle.id, docs)} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
