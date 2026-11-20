import { useState, useMemo } from 'react';
import {
  Plus, X, Edit2, Trash2, ChevronDown, ChevronUp,
  Shield, Briefcase, Calendar, AlertCircle, Check,
  Phone, User, FileText, IndianRupee, TrendingUp,
  Clock, CheckCircle, XCircle, Info, Search, Filter,
} from 'lucide-react';
import {
  genId, formatDate, formatCurrency, daysUntil,
  currentMonthKey, monthLabel, getLast12Months,
} from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const INSURERS = ['LIC', 'Aditya Birla Life', 'Max Life', 'HDFC Life', 'SBI Life', 'ICICI Prudential', 'Bajaj Allianz', 'Tata AIA', 'Kotak Life', 'PNB MetLife', 'Other'];
const POLICY_TYPES = ['Term', 'Endowment', 'Money Back', 'ULIP', 'Whole Life', 'Health', 'Annuity', 'Child Plan'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'];
const PORTFOLIO_TYPES = ['SIP', 'FD', 'RD', 'Mutual Fund', 'PPF', 'NPS', 'Stocks', 'Gold', 'SWP', 'Bonds', 'ETF', 'Other'];
const PLATFORMS = ['Zerodha', 'Groww', 'Upstox', 'HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Post Office', 'Paytm Money', 'Other'];
const STATUSES = ['Active', 'Lapsed', 'Paid Up', 'Matured', 'Surrendered'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFrequencyMonths = (freq) => ({ Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12, 'One-Time': 0 }[freq] || 12);

const getNextDueDate = (startDate, frequency) => {
  if (!startDate || !frequency || frequency === 'One-Time') return null;
  const intervalMonths = getFrequencyMonths(frequency);
  if (!intervalMonths) return null;
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(start);
  while (next <= today) {
    next.setMonth(next.getMonth() + intervalMonths);
  }
  return next.toISOString().split('T')[0];
};

const daysLabel = (days) => {
  if (days === null || days === undefined) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due Today!';
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${days}d left`;
  return `${days}d`;
};

const daysColor = (days) => {
  if (days === null) return '';
  if (days < 0) return 'text-red-400';
  if (days <= 7) return 'text-red-400';
  if (days <= 30) return 'text-yellow-400';
  return 'text-green-400';
};

const badgeColor = (status) => {
  const map = {
    Active: '#10b981', Lapsed: '#ef4444', 'Paid Up': '#6b7280',
    Matured: '#3b82f6', Surrendered: '#f59e0b',
  };
  return map[status] || '#6b7280';
};

// ─── Blank forms ──────────────────────────────────────────────────────────────
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
  const [form, setForm] = useState(initial || blankPolicy());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.policyName.trim() && !form.policyNumber.trim()) return;
    // Auto-calculate next due date if not set manually
    const ndd = form.nextDueDate || getNextDueDate(form.startDate, form.premiumFrequency) || '';
    onSave({ ...form, nextDueDate: ndd });
  };

  const inp = 'modal-input';
  const label = 'modal-label';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"><Shield size={16} /> {form.id && initial?.id ? 'Edit' : 'Add'} Insurance Policy</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* Row 1 */}
          <div style={{ gridColumn: '1/-1' }}>
            <label className={label}>Policy / Plan Name *</label>
            <input className={inp} value={form.policyName} onChange={e => set('policyName', e.target.value)} placeholder="e.g. Jeevan Anand, Term Plan 40" />
          </div>

          <div>
            <label className={label}>Insurer</label>
            <select className={inp} value={form.insurer} onChange={e => set('insurer', e.target.value)}>
              {INSURERS.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Policy Type</label>
            <select className={inp} value={form.type} onChange={e => set('type', e.target.value)}>
              {POLICY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={label}>Policy Number</label>
            <input className={inp} value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} placeholder="123456789" />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Holder Info */}
          <div>
            <label className={label}>Policy Holder Name</label>
            <input className={inp} value={form.holderName} onChange={e => set('holderName', e.target.value)} placeholder="e.g. Mom, Dad, Self" />
          </div>
          <div>
            <label className={label}>Nominee</label>
            <input className={inp} value={form.nominee} onChange={e => set('nominee', e.target.value)} placeholder="Nominee name" />
          </div>

          {/* Financial */}
          <div>
            <label className={label}>Sum Assured (₹)</label>
            <input className={inp} type="number" value={form.sumAssured} onChange={e => set('sumAssured', e.target.value)} placeholder="500000" />
          </div>
          <div>
            <label className={label}>Maturity Amount (₹)</label>
            <input className={inp} type="number" value={form.maturityAmount} onChange={e => set('maturityAmount', e.target.value)} placeholder="800000" />
          </div>

          <div>
            <label className={label}>Premium Amount (₹)</label>
            <input className={inp} type="number" value={form.premiumAmount} onChange={e => set('premiumAmount', e.target.value)} placeholder="12000" />
          </div>
          <div>
            <label className={label}>Premium Frequency</label>
            <select className={inp} value={form.premiumFrequency} onChange={e => set('premiumFrequency', e.target.value)}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className={label}>Start Date</label>
            <input className={inp} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className={label}>Maturity Date</label>
            <input className={inp} type="date" value={form.maturityDate} onChange={e => set('maturityDate', e.target.value)} />
          </div>

          <div>
            <label className={label}>Premium Payment End Date</label>
            <input className={inp} type="date" value={form.paymentEndDate} onChange={e => set('paymentEndDate', e.target.value)} />
          </div>
          <div>
            <label className={label}>Next Due Date (auto-calculated)</label>
            <input className={inp} type="date" value={form.nextDueDate} onChange={e => set('nextDueDate', e.target.value)} />
          </div>

          {/* Contact */}
          <div>
            <label className={label}>OTP Phone Number</label>
            <input className={inp} value={form.otpPhone} onChange={e => set('otpPhone', e.target.value)} placeholder="+91 9876543210" />
          </div>
          <div>
            <label className={label}>Agent Name</label>
            <input className={inp} value={form.agentName} onChange={e => set('agentName', e.target.value)} placeholder="Agent name" />
          </div>
          <div>
            <label className={label}>Agent Phone</label>
            <input className={inp} value={form.agentPhone} onChange={e => set('agentPhone', e.target.value)} placeholder="+91 9876543210" />
          </div>

          {/* Notes */}
          <div style={{ gridColumn: '1/-1' }}>
            <label className={label}>Notes</label>
            <textarea className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any additional info..." style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            <Check size={15} /> Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Modal ──────────────────────────────────────────────────────────
function PortfolioModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || blankPortfolio());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() && !form.type) return;
    onSave({ ...form });
  };

  const inp = 'modal-input';
  const label = 'modal-label';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"><Briefcase size={16} /> {initial?.id ? 'Edit' : 'Add'} Portfolio Item</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          <div>
            <label className={label}>Investment Type</label>
            <select className={inp} value={form.type} onChange={e => set('type', e.target.value)}>
              {PORTFOLIO_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Name / Description *</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. HDFC Flexi Cap SIP" />
          </div>

          <div>
            <label className={label}>Platform / Bank</label>
            <select className={inp} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">— Select —</option>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Account / Folio Number</label>
            <input className={inp} value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="Folio / A/C number" />
          </div>

          <div>
            <label className={label}>Amount (₹)</label>
            <input className={inp} type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="5000" />
          </div>
          <div>
            <label className={label}>Frequency</label>
            <select className={inp} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className={label}>Start Date</label>
            <input className={inp} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className={label}>Maturity / End Date</label>
            <input className={inp} type="date" value={form.maturityDate} onChange={e => set('maturityDate', e.target.value)} />
          </div>

          <div>
            <label className={label}>Expected Return (% / yr)</label>
            <input className={inp} type="number" value={form.expectedReturn} onChange={e => set('expectedReturn', e.target.value)} placeholder="12" />
          </div>
          <div>
            <label className={label}>Current Value (₹)</label>
            <input className={inp} type="number" value={form.currentValue} onChange={e => set('currentValue', e.target.value)} placeholder="Leave blank if unknown" />
          </div>

          <div>
            <label className={label}>Status</label>
            <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Active</option><option>Matured</option><option>Withdrawn</option><option>Paused</option>
            </select>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label className={label}>Notes</label>
            <textarea className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any details..." style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}><Check size={15} /> Save</button>
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
  const color = badgeColor(policy.status);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{policy.policyName || 'Unnamed Policy'}</span>
            <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 20, padding: '1px 10px', fontSize: 11, fontWeight: 600 }}>
              {policy.status}
            </span>
            {policy.type && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{policy.type}</span>}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              <User size={12} style={{ verticalAlign: 'middle' }} /> {policy.holderName || '—'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              🏢 {policy.insurer}
            </span>
            {policy.premiumAmount && (
              <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                {formatCurrency(policy.premiumAmount)} / {policy.premiumFrequency}
              </span>
            )}
            {days !== null && (
              <span style={{ fontSize: 12, fontWeight: 700 }} className={daysColor(days)}>
                <Clock size={11} style={{ verticalAlign: 'middle' }} /> {daysLabel(days)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onEdit(policy); }} title="Edit"><Edit2 size={14} /></button>
          <button className="icon-btn danger" onClick={e => { e.stopPropagation(); onDelete(policy.id); }} title="Delete"><Trash2 size={14} /></button>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            {policy.policyNumber && <InfoRow icon={<FileText size={12} />} label="Policy #" value={policy.policyNumber} />}
            {policy.nominee && <InfoRow icon={<User size={12} />} label="Nominee" value={policy.nominee} />}
            {policy.sumAssured && <InfoRow icon={<Shield size={12} />} label="Sum Assured" value={formatCurrency(policy.sumAssured)} />}
            {policy.maturityAmount && <InfoRow icon={<TrendingUp size={12} />} label="Maturity Amt" value={formatCurrency(policy.maturityAmount)} />}
            {policy.startDate && <InfoRow label="Start" value={formatDate(policy.startDate)} />}
            {policy.maturityDate && <InfoRow label="Maturity" value={formatDate(policy.maturityDate)} />}
            {policy.paymentEndDate && <InfoRow label="Pay Till" value={formatDate(policy.paymentEndDate)} />}
            {policy.nextDueDate && <InfoRow label="Next Due" value={formatDate(policy.nextDueDate)} highlight />}
            {policy.otpPhone && <InfoRow icon={<Phone size={12} />} label="OTP Phone" value={policy.otpPhone} />}
            {policy.agentName && <InfoRow icon={<User size={12} />} label="Agent" value={`${policy.agentName}${policy.agentPhone ? ` (${policy.agentPhone})` : ''}`} />}
          </div>

          {policy.notes && (
            <div style={{ background: 'var(--bg-dark)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              📝 {policy.notes}
            </div>
          )}

          {/* Payment history grid (last 12 months) */}
          {policy.premiumFrequency && policy.premiumFrequency !== 'One-Time' && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>PREMIUM PAYMENT HISTORY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {months12.map(month => {
                  const ph = policy.paymentHistory?.[month];
                  const isPaid = ph?.status === 'Paid';
                  const isMissed = ph?.status === 'Missed';
                  return (
                    <button
                      key={month}
                      title={monthLabel(month)}
                      onClick={() => onTogglePayment(policy.id, month)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600,
                        background: isPaid ? '#10b98122' : isMissed ? '#ef444422' : 'var(--bg-dark)',
                        color: isPaid ? '#10b981' : isMissed ? '#ef4444' : 'var(--text-muted)',
                        outline: isPaid ? '1px solid #10b98144' : isMissed ? '1px solid #ef444444' : '1px solid var(--border)',
                      }}
                    >
                      {month.slice(5)} {isPaid ? '✓' : isMissed ? '✗' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Portfolio Card ───────────────────────────────────────────────────────────
function PortfolioCard({ item, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const days = item.maturityDate ? daysUntil(item.maturityDate) : null;

  const typeColors = {
    SIP: '#6366f1', FD: '#f59e0b', RD: '#14b8a6', 'Mutual Fund': '#8b5cf6',
    PPF: '#10b981', NPS: '#3b82f6', Stocks: '#ef4444', Gold: '#f59e0b',
    SWP: '#06b6d4', Bonds: '#84cc16', ETF: '#a78bfa', Other: '#6b7280',
  };
  const color = typeColors[item.type] || '#6b7280';

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: `${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color, flexShrink: 0,
        }}>
          {item.type?.slice(0, 3).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name || item.type}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {item.platform && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>📱 {item.platform}</span>}
            {item.amount && (
              <span style={{ color, fontSize: 13, fontWeight: 600 }}>
                {formatCurrency(item.amount)}{item.frequency && item.frequency !== 'One-Time' ? ` / ${item.frequency}` : ''}
              </span>
            )}
            {item.currentValue && (
              <span style={{ color: '#10b981', fontSize: 12 }}>
                Current: {formatCurrency(item.currentValue)}
              </span>
            )}
            {days !== null && days <= 90 && (
              <span style={{ fontSize: 12, fontWeight: 700 }} className={daysColor(days)}>
                <Clock size={11} style={{ verticalAlign: 'middle' }} /> Matures {daysLabel(days)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ background: `${color}22`, color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
            {item.status}
          </span>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onEdit(item); }} title="Edit"><Edit2 size={14} /></button>
          <button className="icon-btn danger" onClick={e => { e.stopPropagation(); onDelete(item.id); }} title="Delete"><Trash2 size={14} /></button>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {item.accountNumber && <InfoRow label="Account/Folio" value={item.accountNumber} />}
            {item.startDate && <InfoRow label="Start" value={formatDate(item.startDate)} />}
            {item.maturityDate && <InfoRow label="Maturity" value={formatDate(item.maturityDate)} highlight />}
            {item.expectedReturn && <InfoRow label="Expected Return" value={`${item.expectedReturn}% / yr`} />}
            {item.notes && <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: 13 }}>📝 {item.notes}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Info Row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
        {icon && <span style={{ verticalAlign: 'middle', marginRight: 3 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

// ─── Payment Calendar ─────────────────────────────────────────────────────────
function PaymentCalendar({ investments }) {
  const policies = investments?.policies || [];
  const portfolio = investments?.portfolio || [];
  const [horizon, setHorizon] = useState(90);

  const events = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];

    // Policy premiums
    policies.forEach(p => {
      if (p.status !== 'Active') return;
      const due = p.nextDueDate;
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= horizon && d >= -30) {
        list.push({
          type: 'policy', label: p.policyName || p.insurer, sublabel: `${p.holderName || ''} · ${p.premiumFrequency}`,
          amount: p.premiumAmount, dueDate: due, days: d, insurer: p.insurer, color: '#6366f1',
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
          type: 'portfolio', label: item.name || item.type, sublabel: `${item.platform || ''} · ${item.frequency}`,
          amount: item.amount, dueDate: due, days: d, color: '#10b981',
        });
      }
    });

    // SWP payout
    const swp = investments?.swp;
    if (swp?.monthlyWithdrawal) {
      const thisMonth = currentMonthKey();
      const payout = swp.payouts?.[thisMonth];
      if (!payout || payout.status !== 'Received') {
        list.push({
          type: 'swp', label: 'SWP Payout Expected', sublabel: 'Monthly withdrawal',
          amount: swp.monthlyWithdrawal, dueDate: null, days: 0, color: '#06b6d4', incoming: true,
        });
      }
    }

    return list.sort((a, b) => {
      if (a.days === null) return 1;
      if (b.days === null) return -1;
      return a.days - b.days;
    });
  }, [policies, portfolio, investments, horizon]);

  const totalOutgoing = events.filter(e => !e.incoming).reduce((s, e) => s + Number(e.amount || 0), 0);
  const overdueItems = events.filter(e => e.days < 0);
  const dueItems = events.filter(e => e.days >= 0 && e.days <= 7);

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="stat-card" style={{ background: overdueItems.length ? '#ef444411' : undefined }}>
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: overdueItems.length ? '#ef4444' : 'var(--text-muted)' }}>{overdueItems.length}</div>
        </div>
        <div className="stat-card" style={{ background: dueItems.length ? '#f59e0b11' : undefined }}>
          <div className="stat-label">Due This Week</div>
          <div className="stat-value" style={{ color: dueItems.length ? '#f59e0b' : 'var(--text-muted)' }}>{dueItems.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Total</div>
          <div className="stat-value">{formatCurrency(totalOutgoing)}</div>
        </div>
      </div>

      {/* Horizon filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Show:</span>
        {[30, 60, 90, 180].map(h => (
          <button key={h} onClick={() => setHorizon(h)}
            style={{
              padding: '4px 14px', borderRadius: 20, border: '1px solid var(--border)',
              background: horizon === h ? 'var(--accent)' : 'transparent',
              color: horizon === h ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
            }}>
            {h}d
          </button>
        ))}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 }}>
          <Calendar size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
          No upcoming payments in the next {horizon} days
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map((ev, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: ev.days < 0 ? '#ef444409' : ev.days <= 7 ? '#f59e0b09' : 'var(--bg-card)',
            border: `1px solid ${ev.days < 0 ? '#ef444433' : ev.days <= 7 ? '#f59e0b33' : 'var(--border)'}`,
            borderRadius: 10, padding: '12px 16px',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: ev.days < 0 ? '#ef4444' : ev.days <= 7 ? '#f59e0b' : ev.color,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.sublabel}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {ev.amount && (
                <div style={{ fontWeight: 700, color: ev.incoming ? '#10b981' : 'var(--text-primary)' }}>
                  {ev.incoming ? '+' : ''}{formatCurrency(ev.amount)}
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 600 }} className={daysColor(ev.days)}>
                {ev.dueDate ? formatDate(ev.dueDate) : 'This month'}
                {ev.days !== null && <span style={{ marginLeft: 6 }}>({daysLabel(ev.days)})</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SWP Tab (embedded inside Portfolio) ─────────────────────────────────────
function SwpPanel({ investments, updateInvestments }) {
  const swp = investments?.swp || {};
  const months12 = getLast12Months();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ corpus: swp.corpus || '', monthlyWithdrawal: swp.monthlyWithdrawal || '', startDate: swp.startDate || '' });

  const saveSwp = () => {
    updateInvestments({ ...investments, swp: { ...swp, corpus: Number(form.corpus), monthlyWithdrawal: Number(form.monthlyWithdrawal), startDate: form.startDate } });
    setEditing(false);
  };

  const togglePayout = (month) => {
    const current = swp.payouts?.[month];
    const next = current?.status === 'Received'
      ? { status: 'Pending', amount: '', date: '' }
      : { status: 'Received', amount: swp.monthlyWithdrawal, date: new Date().toISOString().split('T')[0] };
    updateInvestments({ ...investments, swp: { ...swp, payouts: { ...(swp.payouts || {}), [month]: next } } });
  };

  const totalReceived = months12.reduce((s, m) => {
    const p = swp.payouts?.[m];
    return s + (p?.status === 'Received' ? Number(p.amount || swp.monthlyWithdrawal || 0) : 0);
  }, 0);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>SWP — Systematic Withdrawal Plan</div>
          {swp.corpus > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Corpus: {formatCurrency(swp.corpus)} · Monthly: {formatCurrency(swp.monthlyWithdrawal)} · Received: {formatCurrency(totalReceived)}
            </div>
          )}
        </div>
        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditing(e => !e)}>
          <Edit2 size={13} /> {editing ? 'Cancel' : 'Edit Setup'}
        </button>
      </div>

      {editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, padding: 14, background: 'var(--bg-dark)', borderRadius: 10 }}>
          <div>
            <label className="modal-label">Corpus (₹)</label>
            <input className="modal-input" type="number" value={form.corpus} onChange={e => setForm(f => ({ ...f, corpus: e.target.value }))} />
          </div>
          <div>
            <label className="modal-label">Monthly Withdrawal (₹)</label>
            <input className="modal-input" type="number" value={form.monthlyWithdrawal} onChange={e => setForm(f => ({ ...f, monthlyWithdrawal: e.target.value }))} />
          </div>
          <div>
            <label className="modal-label">Start Date</label>
            <input className="modal-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={saveSwp}><Check size={14} /> Save SWP</button>
          </div>
        </div>
      )}

      {swp.monthlyWithdrawal > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>PAYOUT HISTORY (last 12 months)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {months12.map(month => {
              const p = swp.payouts?.[month];
              const got = p?.status === 'Received';
              return (
                <button key={month} onClick={() => togglePayout(month)} title={monthLabel(month)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: got ? '#10b98122' : 'var(--bg-dark)',
                    color: got ? '#10b981' : 'var(--text-muted)',
                    outline: got ? '1px solid #10b98144' : '1px solid var(--border)',
                    fontSize: 11, fontWeight: 600,
                  }}>
                  {month.slice(5)} {got ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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

  // ── Policy actions ──
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
    if (!window.confirm('Delete this policy?')) return;
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

  // ── Portfolio actions ──
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

  // ── Filtered lists ──
  const filteredPolicies = policies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.policyName?.toLowerCase().includes(q) || p.policyNumber?.includes(q) || p.holderName?.toLowerCase().includes(q) || p.insurer?.toLowerCase().includes(q);
    const matchInsurer = !filterInsurer || p.insurer === filterInsurer;
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchInsurer && matchStatus;
  });

  const filteredPortfolio = portfolio.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q) || p.platform?.toLowerCase().includes(q);
  });

  // ── Stats ──
  const totalPremiumYearly = policies.filter(p => p.status === 'Active').reduce((s, p) => {
    const freq = getFrequencyMonths(p.premiumFrequency);
    if (!freq) return s;
    return s + (Number(p.premiumAmount || 0) * (12 / freq));
  }, 0);
  const totalSumAssured = policies.reduce((s, p) => s + Number(p.sumAssured || 0), 0);
  const totalPortfolioValue = portfolio.reduce((s, p) => s + Number(p.currentValue || p.amount || 0), 0);
  const activePolicies = policies.filter(p => p.status === 'Active').length;
  const upcomingAlerts = policies.filter(p => {
    const d = p.nextDueDate ? daysUntil(p.nextDueDate) : null;
    return d !== null && d <= 30;
  }).length;

  const TABS = [
    { id: 'policies', label: 'Policies', icon: <Shield size={14} />, count: policies.length },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={14} />, count: portfolio.length },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={14} />, count: upcomingAlerts || null },
  ];

  return (
    <div className="animate-in">
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{activePolicies}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Yearly Premium</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(Math.round(totalPremiumYearly))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sum Assured</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(totalSumAssured)}</div>
        </div>
        <div className="stat-card" style={{ background: upcomingAlerts ? '#f59e0b11' : undefined }}>
          <div className="stat-label">Due in 30 Days</div>
          <div className="stat-value" style={{ color: upcomingAlerts ? '#f59e0b' : undefined }}>{upcomingAlerts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Portfolio Items</div>
          <div className="stat-value">{portfolio.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: 'none', borderRadius: '8px 8px 0 0',
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: tab === t.id ? 700 : 500, fontSize: 14,
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.icon} {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{ background: tab === t.id ? 'rgba(255,255,255,0.3)' : 'var(--bg-dark)', borderRadius: 20, padding: '0 7px', fontSize: 11, fontWeight: 700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Policies Tab ─────────────────────────────────── */}
      {tab === 'policies' && (
        <div>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="modal-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search policies..." style={{ paddingLeft: 32 }}
              />
            </div>
            <select className="modal-input" style={{ width: 'auto' }} value={filterInsurer} onChange={e => setFilterInsurer(e.target.value)}>
              <option value="">All Insurers</option>
              {INSURERS.map(i => <option key={i}>{i}</option>)}
            </select>
            <select className="modal-input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn-primary" onClick={() => { setEditingPolicy(null); setShowPolicyModal(true); }}>
              <Plus size={15} /> Add Policy
            </button>
          </div>

          {filteredPolicies.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
              <Shield size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
              {policies.length === 0 ? 'No policies yet. Add your first insurance policy!' : 'No policies match your filter.'}
            </div>
          )}

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
      )}

      {/* ─── Portfolio Tab ────────────────────────────────── */}
      {tab === 'portfolio' && (
        <div>
          <SwpPanel investments={investments} updateInvestments={updateInvestments} />

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="modal-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search portfolio..." style={{ paddingLeft: 32 }}
              />
            </div>
            <button className="btn-primary" onClick={() => { setEditingPortfolio(null); setShowPortfolioModal(true); }}>
              <Plus size={15} /> Add Investment
            </button>
          </div>

          {/* Portfolio stats */}
          {portfolio.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
              {PORTFOLIO_TYPES.filter(t => portfolio.some(p => p.type === t)).map(type => {
                const items = portfolio.filter(p => p.type === type);
                const total = items.reduce((s, p) => s + Number(p.currentValue || p.amount || 0), 0);
                return (
                  <div key={type} className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label">{type}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(total)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPortfolio.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
              <Briefcase size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
              {portfolio.length === 0 ? 'No portfolio items yet. Track your SIP, FD, MF, Stocks and more!' : 'No items match your search.'}
            </div>
          )}

          {filteredPortfolio.map(item => (
            <PortfolioCard
              key={item.id}
              item={item}
              onEdit={(i) => { setEditingPortfolio(i); setShowPortfolioModal(true); }}
              onDelete={deletePortfolioItem}
            />
          ))}
        </div>
      )}

      {/* ─── Calendar Tab ─────────────────────────────────── */}
      {tab === 'calendar' && (
        <PaymentCalendar investments={investments} />
      )}

      {/* ─── Modals ───────────────────────────────────────── */}
      {showPolicyModal && (
        <PolicyModal
          initial={editingPolicy || undefined}
          onSave={savePolicy}
          onClose={() => { setShowPolicyModal(false); setEditingPolicy(null); }}
        />
      )}
      {showPortfolioModal && (
        <PortfolioModal
          initial={editingPortfolio || undefined}
          onSave={savePortfolioItem}
          onClose={() => { setShowPortfolioModal(false); setEditingPortfolio(null); }}
        />
      )}
    </div>
  );
}
