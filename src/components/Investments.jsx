import { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Edit2, Trash2, ChevronDown, ChevronUp,
  Shield, Briefcase, Calendar, AlertTriangle, Check,
  Phone, User, FileText, IndianRupee, TrendingUp,
  Clock, CheckCircle, XCircle, Search, Sparkles
} from 'lucide-react';
import {
  genId, formatDate, formatCurrency, daysUntil,
  currentMonthKey, monthLabel, getLast12Months,
} from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const INSURERS = [
  'LIC', 'Aditya Birla Capital', 'Max Life', 'HDFC Life', 'SBI Life',
  'ICICI Prudential', 'Bajaj Allianz', 'Tata AIA', 'Kotak Life', 'PNB MetLife', 'Other'
];
const POLICY_TYPES = ['Term', 'Endowment', 'Money Back', 'ULIP', 'Whole Life', 'Health', 'Annuity', 'Child Plan'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'];
const PORTFOLIO_TYPES = ['SIP', 'FD', 'RD', 'Mutual Fund', 'PPF', 'NPS', 'Stocks', 'Gold', 'SWP', 'Bonds', 'ETF', 'Other'];
const PLATFORMS = ['Zerodha', 'Groww', 'Upstox', 'HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Post Office', 'Paytm Money', 'Other'];
const STATUSES = ['Active', 'Lapsed', 'Paid Up', 'Matured', 'Surrendered'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFrequencyMonths = (freq) => ({
  Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12, 'One-Time': 0
}[freq] || 12);

const getNextDueDate = (startDate, frequency) => {
  if (!startDate || !frequency || frequency === 'One-Time') return '';
  const intervalMonths = getFrequencyMonths(frequency);
  if (!intervalMonths) return '';
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(start);
  while (next <= today) {
    next.setMonth(next.getMonth() + intervalMonths);
  }
  return next.toISOString().split('T')[0];
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'badge-green';
    case 'Lapsed': return 'badge-red';
    case 'Matured': return 'badge-blue';
    case 'Paid Up': return 'badge-purple';
    default: return 'badge-amber';
  }
};

// ─── Blank defaults ───────────────────────────────────────────────────────────
const blankPolicy = () => ({
  id: genId(), policyNumber: '', policyName: '', insurer: 'LIC',
  type: 'Endowment', holderName: '', nominee: '',
  sumAssured: '', maturityAmount: '', maturityDate: '',
  startDate: '', paymentEndDate: '', premiumAmount: '',
  premiumFrequency: 'Yearly', nextDueDate: '',
  otpPhone: '', agentName: '', agentPhone: '',
  status: 'Active', paymentHistory: {}, notes: '',
});

const blankPortfolio = () => ({
  id: genId(), type: 'SIP', name: '', platform: '',
  accountNumber: '', amount: '', frequency: 'Monthly',
  startDate: '', maturityDate: '', expectedReturn: '',
  currentValue: '', status: 'Active',
  paymentHistory: {}, notes: '',
});

// ─── Policy Modal ─────────────────────────────────────────────────────────────
function PolicyModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || blankPolicy());

  useEffect(() => {
    setForm(initial || blankPolicy());
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.policyName?.trim() && !form.policyNumber?.trim()) return;
    const ndd = form.nextDueDate || getNextDueDate(form.startDate, form.premiumFrequency) || '';
    onSave({ ...form, nextDueDate: ndd });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="var(--accent-indigo)" />
            {initial?.id ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Plan Name & Insurer */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Policy / Plan Name *</label>
              <input
                className="form-input"
                value={form.policyName}
                onChange={e => set('policyName', e.target.value)}
                placeholder="e.g. Jeevan Anand, Term 360"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Insurance Company</label>
              <select className="form-input" value={form.insurer} onChange={e => set('insurer', e.target.value)}>
                {INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Type, Number, Status */}
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Policy Type</label>
              <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
                {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Policy Number</label>
              <input
                className="form-input"
                value={form.policyNumber}
                onChange={e => set('policyNumber', e.target.value)}
                placeholder="e.g. 518291039"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Holder & Nominee */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Policy Holder Name</label>
              <input
                className="form-input"
                value={form.holderName}
                onChange={e => set('holderName', e.target.value)}
                placeholder="e.g. Mom, Self, Sister"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nominee Name</label>
              <input
                className="form-input"
                value={form.nominee}
                onChange={e => set('nominee', e.target.value)}
                placeholder="Nominee details"
              />
            </div>
          </div>

          {/* Premium & Frequency */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Premium Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.premiumAmount}
                onChange={e => set('premiumAmount', e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Frequency</label>
              <select className="form-input" value={form.premiumFrequency} onChange={e => set('premiumFrequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Sum Assured & Maturity Amount */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Sum Assured (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.sumAssured}
                onChange={e => set('sumAssured', e.target.value)}
                placeholder="e.g. 1000000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Maturity Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.maturityAmount}
                onChange={e => set('maturityAmount', e.target.value)}
                placeholder="e.g. 1850000"
              />
            </div>
          </div>

          {/* Important Dates */}
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Policy Start Date</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Premium Pay Till Date</label>
              <input
                className="form-input"
                type="date"
                value={form.paymentEndDate}
                onChange={e => set('paymentEndDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Next Due Date</label>
              <input
                className="form-input"
                type="date"
                value={form.nextDueDate}
                onChange={e => set('nextDueDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Maturity Date</label>
              <input
                className="form-input"
                type="date"
                value={form.maturityDate}
                onChange={e => set('maturityDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Linked OTP Phone Number</label>
              <input
                className="form-input"
                value={form.otpPhone}
                onChange={e => set('otpPhone', e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Agent Contact</label>
              <input
                className="form-input"
                value={form.agentName}
                onChange={e => set('agentName', e.target.value)}
                placeholder="Agent name & number"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes & Remarks</label>
            <textarea
              className="form-input"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional info, branch, or locker location..."
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.policyName?.trim() && !form.policyNumber?.trim()}>
            <Check size={14} /> Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Modal ──────────────────────────────────────────────────────────
function PortfolioModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || blankPortfolio());

  useEffect(() => {
    setForm(initial || blankPortfolio());
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim() && !form.type) return;
    onSave({ ...form });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Briefcase size={18} color="var(--accent-blue)" />
            {initial?.id ? 'Edit Portfolio Item' : 'Add Investment / Asset'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Investment Type</label>
              <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
                {PORTFOLIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Name / Scheme *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Parag Parikh Flexi Cap, SBI 5-Yr FD"
              />
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Platform / Bank</label>
              <select className="form-input" value={form.platform} onChange={e => set('platform', e.target.value)}>
                <option value="">— Select Platform / Bank —</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Folio / Account Number</label>
              <input
                className="form-input"
                value={form.accountNumber}
                onChange={e => set('accountNumber', e.target.value)}
                placeholder="A/C or Folio number"
              />
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Investment Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select className="form-input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Maturity / End Date</label>
              <input
                className="form-input"
                type="date"
                value={form.maturityDate}
                onChange={e => set('maturityDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Active</option><option>Matured</option><option>Withdrawn</option><option>Paused</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Expected Return (% / yr)</label>
              <input
                className="form-input"
                type="number"
                value={form.expectedReturn}
                onChange={e => set('expectedReturn', e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current / Valuation Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.currentValue}
                onChange={e => set('currentValue', e.target.value)}
                placeholder="Leave blank if same as investment"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Additional details..."
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name?.trim() && !form.type}>
            <Check size={14} /> Save Investment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Policy Card ──────────────────────────────────────────────────────────────
function PolicyCard({ policy, onEdit, onDelete, onTogglePayment }) {
  const [expanded, setExpanded] = useState(false);
  const months12 = getLast12Months();
  const days = policy.nextDueDate ? daysUntil(policy.nextDueDate) : null;
  const statusBadge = getStatusBadgeClass(policy.status);

  return (
    <div className="vehicle-card" style={{ marginBottom: 12 }}>
      {/* Header */}
      <div className="vehicle-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="vehicle-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <Shield size={22} color="var(--accent-indigo)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{policy.policyName || 'Unnamed Policy'}</span>
            <span className={`badge ${statusBadge}`}>{policy.status}</span>
            {policy.type && <span className="badge badge-muted">{policy.type}</span>}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>🏢 <strong>{policy.insurer}</strong></span>
            {policy.holderName && <span>👤 Holder: <strong>{policy.holderName}</strong></span>}
            {policy.premiumAmount && (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                {formatCurrency(policy.premiumAmount)} / {policy.premiumFrequency}
              </span>
            )}
            {policy.sumAssured && (
              <span>SA: {formatCurrency(policy.sumAssured)}</span>
            )}
            {days !== null && days <= 30 && (
              <span style={{ color: days <= 7 ? 'var(--accent-red)' : 'var(--accent-amber)', fontWeight: 600 }}>
                ⏳ Due in {days} day{days !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => onEdit(policy)}
            title="Edit Policy"
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-danger btn-icon btn-sm"
            onClick={() => onDelete(policy.id)}
            title="Delete Policy"
          >
            <Trash2 size={13} />
          </button>
          <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="vehicle-card-body">
          <div className="grid-cols-3 gap-12 mb-16" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div>
              <div className="text-sm text-muted">Policy Number</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{policy.policyNumber || '—'}</div>
              <div className="text-sm text-secondary">Nominee: {policy.nominee || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Maturity Expectation</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-cyan)' }}>
                {policy.maturityAmount ? formatCurrency(policy.maturityAmount) : '—'}
              </div>
              <div className="text-sm text-secondary">Maturity: {policy.maturityDate ? formatDate(policy.maturityDate) : '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Pay-Till & Next Due</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-amber)' }}>
                Next: {policy.nextDueDate ? formatDate(policy.nextDueDate) : '—'}
              </div>
              <div className="text-sm text-secondary">Pay till: {policy.paymentEndDate ? formatDate(policy.paymentEndDate) : '—'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            {policy.otpPhone && (
              <div>📱 <strong>OTP Phone:</strong> <span style={{ color: 'var(--text-primary)' }}>{policy.otpPhone}</span></div>
            )}
            {policy.agentName && (
              <div>🤝 <strong>Agent:</strong> <span style={{ color: 'var(--text-primary)' }}>{policy.agentName}</span></div>
            )}
            {policy.notes && (
              <div style={{ width: '100%', color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {policy.notes}</div>
            )}
          </div>

          {/* 12-Month Payment History */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm text-secondary">Premium Payment Tracker (Click to mark Paid / Unpaid)</span>
              <span className="text-sm text-muted">Current: {monthLabel(currentMonthKey())}</span>
            </div>

            <div className="month-grid">
              {months12.map(month => {
                const ph = policy.paymentHistory?.[month];
                const isPaid = ph?.status === 'Paid';
                const isMissed = ph?.status === 'Missed';
                const cls = isPaid ? 'month-cell-paid' : isMissed ? 'month-cell-unpaid' : 'month-cell-none';

                return (
                  <div
                    key={month}
                    className={`month-cell ${cls}`}
                    onClick={() => onTogglePayment(policy.id, month)}
                    title={monthLabel(month)}
                  >
                    <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                    {isPaid && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                    {isMissed && <span style={{ fontSize: 10, marginTop: 2, display: 'inline', color: 'var(--accent-red)' }}>✕</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Portfolio Card ───────────────────────────────────────────────────────────
function PortfolioCard({ item, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const days = item.maturityDate ? daysUntil(item.maturityDate) : null;

  return (
    <div className="vehicle-card" style={{ marginBottom: 10 }}>
      <div className="vehicle-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="vehicle-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
          <Briefcase size={22} color="var(--accent-cyan)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{item.name || item.type}</span>
            <span className="badge badge-purple">{item.type}</span>
            <span className="badge badge-green">{item.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
            {item.platform && <span>📱 <strong>{item.platform}</strong></span>}
            {item.amount && (
              <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                {formatCurrency(item.amount)}{item.frequency && item.frequency !== 'One-Time' ? ` / ${item.frequency}` : ''}
              </span>
            )}
            {item.currentValue && (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                Valuation: {formatCurrency(item.currentValue)}
              </span>
            )}
            {days !== null && days <= 90 && (
              <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                ⏳ Matures in {days}d
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => onEdit(item)}
            title="Edit Item"
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-danger btn-icon btn-sm"
            onClick={() => onDelete(item.id)}
            title="Delete Item"
          >
            <Trash2 size={13} />
          </button>
          <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="vehicle-card-body">
          <div className="grid-cols-3 gap-12" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div>
              <div className="text-sm text-muted">Account / Folio</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.accountNumber || '—'}</div>
              <div className="text-sm text-secondary">Started: {item.startDate ? formatDate(item.startDate) : '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Maturity Date</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.maturityDate ? formatDate(item.maturityDate) : '—'}</div>
              <div className="text-sm text-secondary">
                {days !== null ? (days >= 0 ? `${days} days left` : 'Matured') : 'No maturity date'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Expected Annual Return</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-green)' }}>
                {item.expectedReturn ? `${item.expectedReturn}% / yr` : '—'}
              </div>
            </div>
          </div>
          {item.notes && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              📝 {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SWP Panel ────────────────────────────────────────────────────────────────
function SwpPanel({ investments, updateInvestments }) {
  const swp = investments?.swp || {};
  const months12 = getLast12Months();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    corpus: swp.corpus || '',
    monthlyWithdrawal: swp.monthlyWithdrawal || '',
    startDate: swp.startDate || ''
  });

  const saveSwp = () => {
    updateInvestments({
      ...investments,
      swp: {
        ...swp,
        corpus: Number(form.corpus),
        monthlyWithdrawal: Number(form.monthlyWithdrawal),
        startDate: form.startDate
      }
    });
    setEditing(false);
  };

  const togglePayout = (month) => {
    const current = swp.payouts?.[month];
    const next = current?.status === 'Received'
      ? { status: 'Pending', amount: '', date: '' }
      : { status: 'Received', amount: swp.monthlyWithdrawal, date: new Date().toISOString().split('T')[0] };
    updateInvestments({
      ...investments,
      swp: { ...swp, payouts: { ...(swp.payouts || {}), [month]: next } }
    });
  };

  const totalReceived = months12.reduce((s, m) => {
    const p = swp.payouts?.[m];
    return s + (p?.status === 'Received' ? Number(p.amount || swp.monthlyWithdrawal || 0) : 0);
  }, 0);

  return (
    <div className="card mb-20" style={{ border: '1px solid rgba(6,182,212,0.25)', background: 'linear-gradient(180deg, rgba(6,182,212,0.04) 0%, var(--bg-card) 100%)' }}>
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--accent-cyan)" /> Systematic Withdrawal Plan (SWP)
          </div>
          <div className="section-subtitle">
            {swp.corpus > 0
              ? `Corpus: ${formatCurrency(swp.corpus)} · Monthly: ${formatCurrency(swp.monthlyWithdrawal)} · Received (12m): ${formatCurrency(totalReceived)}`
              : 'Configure your mutual fund SWP corpus and monthly withdrawal'}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(e => !e)}>
          <Edit2 size={13} /> {editing ? 'Cancel' : 'Edit SWP Setup'}
        </button>
      </div>

      {editing && (
        <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--border-subtle)' }}>
          <div className="form-row form-row-3 mb-12">
            <div className="form-group">
              <label className="form-label">Total SWP Corpus (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.corpus}
                onChange={e => setForm(f => ({ ...f, corpus: e.target.value }))}
                placeholder="e.g. 5000000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Withdrawal (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.monthlyWithdrawal}
                onChange={e => setForm(f => ({ ...f, monthlyWithdrawal: e.target.value }))}
                placeholder="e.g. 35000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" onClick={saveSwp}>
              <Check size={14} /> Save SWP Configuration
            </button>
          </div>
        </div>
      )}

      {swp.monthlyWithdrawal > 0 && (
        <div>
          <div className="flex justify-between items-center mb-8">
            <span className="text-sm text-secondary">Monthly Withdrawal Tracker (Click to mark Received)</span>
            <span className="text-sm text-muted">Current: {monthLabel(currentMonthKey())}</span>
          </div>

          <div className="month-grid">
            {months12.map(month => {
              const p = swp.payouts?.[month];
              const got = p?.status === 'Received';
              return (
                <div
                  key={month}
                  className={`month-cell ${got ? 'month-cell-paid' : 'month-cell-none'}`}
                  onClick={() => togglePayout(month)}
                  title={monthLabel(month)}
                >
                  <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                  {got && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Calendar View ────────────────────────────────────────────────────
function PaymentCalendar({ investments }) {
  const policies = investments?.policies || [];
  const portfolio = investments?.portfolio || [];
  const [horizon, setHorizon] = useState(90);

  const events = useMemo(() => {
    const list = [];

    // Policy premiums
    policies.forEach(p => {
      if (p.status !== 'Active' || !p.nextDueDate) return;
      const d = daysUntil(p.nextDueDate);
      if (d !== null && d <= horizon && d >= -30) {
        list.push({
          type: 'policy',
          label: p.policyName || p.insurer,
          sublabel: `${p.holderName ? `${p.holderName} · ` : ''}${p.insurer} (${p.premiumFrequency})`,
          amount: p.premiumAmount,
          dueDate: p.nextDueDate,
          days: d,
          color: 'var(--accent-indigo)'
        });
      }
    });

    // Portfolio items (recurring)
    portfolio.forEach(item => {
      if (item.status !== 'Active' || item.frequency === 'One-Time') return;
      const due = getNextDueDate(item.startDate, item.frequency);
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= horizon && d >= -30) {
        list.push({
          type: 'portfolio',
          label: item.name || item.type,
          sublabel: `${item.platform ? `${item.platform} · ` : ''}${item.type} (${item.frequency})`,
          amount: item.amount,
          dueDate: due,
          days: d,
          color: 'var(--accent-blue)'
        });
      }
    });

    return list.sort((a, b) => a.days - b.days);
  }, [policies, portfolio, horizon]);

  const totalUpcoming = events.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const overdueCount = events.filter(e => e.days < 0).length;
  const dueSoonCount = events.filter(e => e.days >= 0 && e.days <= 7).length;

  return (
    <div>
      {/* Overview Cards */}
      <div className="grid-cols-3 gap-12 mb-20">
        <div className="stat-card" style={{ background: overdueCount > 0 ? 'rgba(239,68,68,0.08)' : undefined }}>
          <div className="stat-label">Overdue Premiums</div>
          <div className="stat-value" style={{ color: overdueCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {overdueCount}
          </div>
          <div className="stat-sub">Past due date</div>
        </div>

        <div className="stat-card" style={{ background: dueSoonCount > 0 ? 'rgba(245,158,11,0.08)' : undefined }}>
          <div className="stat-label">Due This Week</div>
          <div className="stat-value" style={{ color: dueSoonCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
            {dueSoonCount}
          </div>
          <div className="stat-sub">Next 7 days</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Upcoming Commitments ({horizon}d)</div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {formatCurrency(totalUpcoming)}
          </div>
          <div className="stat-sub">Across {events.length} upcoming debits</div>
        </div>
      </div>

      {/* Horizon selector */}
      <div className="flex items-center gap-8 mb-16">
        <span className="text-sm text-secondary">Timeline:</span>
        {[30, 60, 90, 180].map(h => (
          <button
            key={h}
            className={`btn btn-sm ${horizon === h ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setHorizon(h)}
          >
            {h} Days
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <div className="empty-state-title">No payments due</div>
          <div className="empty-state-desc">No insurance premiums or SIP debits found in the next {horizon} days.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((ev, i) => (
            <div
              key={i}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                borderLeft: `4px solid ${ev.days < 0 ? 'var(--accent-red)' : ev.days <= 7 ? 'var(--accent-amber)' : 'var(--accent-blue)'}`
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.label}</div>
                <div className="text-sm text-muted">{ev.sublabel}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                  {formatCurrency(ev.amount)}
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: ev.days < 0 ? 'var(--accent-red)' : ev.days <= 7 ? 'var(--accent-amber)' : 'var(--accent-green)'
                }}>
                  {formatDate(ev.dueDate)} ({ev.days < 0 ? `${Math.abs(ev.days)}d overdue` : ev.days === 0 ? 'Due Today' : `${ev.days}d left`})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Investments Component ───────────────────────────────────────────────
export default function Investments({ investments, updateInvestments }) {
  const [tab, setTab] = useState('policies');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [search, setSearch] = useState('');
  const [filterInsurer, setFilterInsurer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const policies = investments?.policies || [];
  const portfolio = investments?.portfolio || [];

  // Policy CRUD
  const savePolicy = (pol) => {
    const existing = policies.findIndex(p => p.id === pol.id);
    const updated = existing >= 0
      ? policies.map(p => p.id === pol.id ? pol : p)
      : [pol, ...policies];
    updateInvestments({ ...investments, policies: updated });
    setShowPolicyModal(false);
    setEditingPolicy(null);
  };

  const deletePolicy = (id) => {
    if (!window.confirm('Delete this insurance policy?')) return;
    updateInvestments({ ...investments, policies: policies.filter(p => p.id !== id) });
  };

  const togglePolicyPayment = (policyId, month) => {
    const pol = policies.find(p => p.id === policyId);
    if (!pol) return;
    const current = pol.paymentHistory?.[month]?.status;
    const nextStatus = current === 'Paid' ? 'Missed' : current === 'Missed' ? null : 'Paid';
    const newHistory = { ...pol.paymentHistory };
    if (nextStatus === null) delete newHistory[month];
    else newHistory[month] = { status: nextStatus, date: new Date().toISOString().split('T')[0], amount: pol.premiumAmount };
    const updated = policies.map(p => p.id === policyId ? { ...p, paymentHistory: newHistory } : p);
    updateInvestments({ ...investments, policies: updated });
  };

  // Portfolio CRUD
  const savePortfolioItem = (item) => {
    const existing = portfolio.findIndex(p => p.id === item.id);
    const updated = existing >= 0
      ? portfolio.map(p => p.id === item.id ? item : p)
      : [item, ...portfolio];
    updateInvestments({ ...investments, portfolio: updated });
    setShowPortfolioModal(false);
    setEditingPortfolio(null);
  };

  const deletePortfolioItem = (id) => {
    if (!window.confirm('Delete this portfolio item?')) return;
    updateInvestments({ ...investments, portfolio: portfolio.filter(p => p.id !== id) });
  };

  // Filtered lists
  const filteredPolicies = policies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.policyName?.toLowerCase().includes(q)
      || p.policyNumber?.includes(q)
      || p.holderName?.toLowerCase().includes(q)
      || p.insurer?.toLowerCase().includes(q);
    const matchInsurer = !filterInsurer || p.insurer === filterInsurer;
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchInsurer && matchStatus;
  });

  const filteredPortfolio = portfolio.filter(p => {
    const q = search.toLowerCase();
    return !q
      || p.name?.toLowerCase().includes(q)
      || p.type?.toLowerCase().includes(q)
      || p.platform?.toLowerCase().includes(q);
  });

  // Summary Metrics
  const activePolicies = policies.filter(p => p.status === 'Active');
  const totalAnnualPremium = activePolicies.reduce((sum, p) => {
    const freq = getFrequencyMonths(p.premiumFrequency);
    if (!freq) return sum;
    return sum + (Number(p.premiumAmount || 0) * (12 / freq));
  }, 0);
  const totalSumAssured = policies.reduce((sum, p) => sum + Number(p.sumAssured || 0), 0);
  const totalPortfolioVal = portfolio.reduce((sum, p) => sum + Number(p.currentValue || p.amount || 0), 0);
  const upcomingAlerts = policies.filter(p => {
    const d = p.nextDueDate ? daysUntil(p.nextDueDate) : null;
    return d !== null && d <= 30;
  }).length;

  return (
    <div className="animate-in">
      {/* Top Stats */}
      <div className="grid-cols-4 mb-20">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Shield size={20} color="var(--accent-indigo)" />
          </div>
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{activePolicies.length}</div>
          <div className="stat-sub">{policies.length} total policies registered</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <IndianRupee size={20} color="var(--accent-red)" />
          </div>
          <div className="stat-label">Annual Insurance Outflow</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(Math.round(totalAnnualPremium))}</div>
          <div className="stat-sub">Combined yearly premium</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Sparkles size={20} color="var(--accent-green)" />
          </div>
          <div className="stat-label">Total Life Cover (SA)</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalSumAssured)}</div>
          <div className="stat-sub">Combined sum assured</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Briefcase size={20} color="var(--accent-cyan)" />
          </div>
          <div className="stat-label">Portfolio Assets</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalPortfolioVal)}</div>
          <div className="stat-sub">{portfolio.length} investments tracked</div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="tabs mb-20">
        <button
          className={`tab ${tab === 'policies' ? 'active' : ''}`}
          onClick={() => setTab('policies')}
        >
          <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
          Insurance Policies ({policies.length})
        </button>
        <button
          className={`tab ${tab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setTab('portfolio')}
        >
          <Briefcase size={14} style={{ display: 'inline', marginRight: 6 }} />
          Portfolio &amp; SWP ({portfolio.length})
        </button>
        <button
          className={`tab ${tab === 'calendar' ? 'active' : ''}`}
          onClick={() => setTab('calendar')}
        >
          <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
          Payment Calendar
          {upcomingAlerts > 0 && (
            <span className="badge badge-amber" style={{ marginLeft: 6, padding: '1px 6px', fontSize: 10 }}>
              {upcomingAlerts} due
            </span>
          )}
        </button>
      </div>

      {/* ── Tab 1: Policies ─────────────────────────────────────────── */}
      {tab === 'policies' && (
        <div>
          {/* Search & Actions Bar */}
          <div className="flex gap-10 mb-16 flex-wrap items-center">
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search policy name, holder, number, or insurer..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 140 }}
              value={filterInsurer}
              onChange={e => setFilterInsurer(e.target.value)}
            >
              <option value="">All Insurers</option>
              {INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 120 }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingPolicy(null); setShowPolicyModal(true); }}
            >
              <Plus size={15} /> Add Policy
            </button>
          </div>

          {filteredPolicies.length === 0 && (
            <div className="empty-state">
              <Shield size={48} />
              <div className="empty-state-title">
                {policies.length === 0 ? 'No insurance policies added yet' : 'No policies match your search'}
              </div>
              <div className="empty-state-desc">
                {policies.length === 0
                  ? 'Click "Add Policy" to start tracking LIC, Aditya Birla, HDFC Life, and more.'
                  : 'Try clearing your search query or filter dropdowns.'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredPolicies.map(policy => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onEdit={(p) => { setEditingPolicy(p); setShowPolicyModal(true); }}
                onDelete={deletePolicy}
                onTogglePayment={togglePolicyPayment}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 2: Portfolio & SWP ───────────────────────────────────── */}
      {tab === 'portfolio' && (
        <div>
          <SwpPanel investments={investments} updateInvestments={updateInvestments} />

          <div className="flex gap-10 mb-16 flex-wrap items-center">
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search SIPs, Mutual Funds, FDs, Stocks..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingPortfolio(null); setShowPortfolioModal(true); }}
            >
              <Plus size={15} /> Add Investment
            </button>
          </div>

          {/* Breakdown summary */}
          {portfolio.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
              {PORTFOLIO_TYPES.filter(t => portfolio.some(p => p.type === t)).map(type => {
                const items = portfolio.filter(p => p.type === type);
                const total = items.reduce((s, p) => s + Number(p.currentValue || p.amount || 0), 0);
                return (
                  <div key={type} className="stat-card" style={{ padding: '12px 14px' }}>
                    <div className="stat-label">{type}</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(total)}</div>
                    <div className="stat-sub">{items.length} holding{items.length !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPortfolio.length === 0 && (
            <div className="empty-state">
              <Briefcase size={48} />
              <div className="empty-state-title">
                {portfolio.length === 0 ? 'No portfolio holdings added yet' : 'No items match your search'}
              </div>
              <div className="empty-state-desc">
                Track your SIPs, Bank FDs, Mutual Funds, PPF, NPS, Stocks and Gold in one place.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredPortfolio.map(item => (
              <PortfolioCard
                key={item.id}
                item={item}
                onEdit={(i) => { setEditingPortfolio(i); setShowPortfolioModal(true); }}
                onDelete={deletePortfolioItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 3: Calendar ──────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <PaymentCalendar investments={investments} />
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showPolicyModal && (
        <PolicyModal
          initial={editingPolicy}
          onSave={savePolicy}
          onClose={() => { setShowPolicyModal(false); setEditingPolicy(null); }}
        />
      )}

      {showPortfolioModal && (
        <PortfolioModal
          initial={editingPortfolio}
          onSave={savePortfolioItem}
          onClose={() => { setShowPortfolioModal(false); setEditingPortfolio(null); }}
        />
      )}
    </div>
  );
}
