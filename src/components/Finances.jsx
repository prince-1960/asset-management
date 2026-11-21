import { useState, useMemo, useEffect } from 'react';
import {
  CreditCard, IndianRupee, TrendingUp, Calendar, AlertTriangle,
  Plus, Edit2, Trash2, Check, X,
  Clock, Wallet, Home, Receipt, Search,
  ChevronDown, ChevronUp, HeartHandshake, Users, ArrowDownLeft, Tag, Filter,
  Landmark, RotateCcw
} from 'lucide-react';
import {
  genId, formatDate, formatCurrency, currentMonthKey, monthLabel,
  getLast12Months, daysUntil, isPolicyDueInMonth
} from '../utils/storage';

const getOrdinal = (n) => {
  if (!n) return '';
  const num = Number(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ─── Default Credit Card ──────────────────────────────────────────────────────
const blankCard = () => ({
  id: genId(),
  bank: 'HDFC Bank',
  name: 'Regalia Gold',
  last4: '',
  totalLimit: '',
  totalOutstanding: '',
  monthlyBill: '',
  dueDay: 15,
  emis: [], // [ { id, name, emiAmount, remainingMonths } ]
  notes: ''
});

const BANKS = [
  'HDFC Bank', 'ICICI Bank', 'SBI Card', 'Axis Bank', 'Kotak Mahindra',
  'American Express', 'Standard Chartered', 'RBL Bank', 'IDFC First Bank', 'OneCard', 'Other'
];

// ─── Modal: Add/Edit Credit Card ──────────────────────────────────────────────
function CardModal({ card, onSave, onClose }) {
  const [form, setForm] = useState(card || blankCard());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const finalBank = form.bank === 'Other' && form.customBank ? form.customBank.trim() : form.bank;
    onSave({ ...form, bank: finalBank || 'Other' });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color="var(--accent-indigo)" />
            {card?.id ? 'Edit Credit Card' : 'Add Credit Card'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Bank / Issuer</label>
              <select
                className="form-input"
                value={BANKS.slice(0, -1).includes(form.bank) ? form.bank : 'Other'}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    set('bank', 'Other');
                    if (!form.customBank) set('customBank', form.bank && !BANKS.includes(form.bank) ? form.bank : '');
                  } else {
                    set('bank', val);
                  }
                }}
              >
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {(form.bank === 'Other' || (!BANKS.slice(0, -1).includes(form.bank) && form.bank)) && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={form.customBank !== undefined ? form.customBank : (BANKS.includes(form.bank) ? '' : form.bank)}
                  onChange={e => {
                    set('customBank', e.target.value);
                    set('bank', e.target.value || 'Other');
                  }}
                  placeholder="Type bank or card issuer..."
                  autoFocus
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Card Name / Variant</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Regalia Gold, Cashback, Amazon Pay"
              />
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Last 4 Digits</label>
              <input
                className="form-input"
                maxLength={4}
                value={form.last4}
                onChange={e => set('last4', e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 8421"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Credit Limit (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.totalLimit}
                onChange={e => set('totalLimit', e.target.value)}
                placeholder="e.g. 300000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Outstanding Due (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.totalOutstanding}
                onChange={e => set('totalOutstanding', e.target.value)}
                placeholder="e.g. 45000"
              />
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Current Monthly Bill (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.monthlyBill}
                onChange={e => set('monthlyBill', e.target.value)}
                placeholder="e.g. 24500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bill Due Day of Month</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={e => set('dueDay', e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes & Reward Perks</label>
            <input
              className="form-input"
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. 5% cashback on Amazon, Airport Lounge access..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name || !form.totalLimit}>
            <Check size={14} /> Save Card
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Add EMI to Card ───────────────────────────────────────────────────
function CardEmiModal({ onSave, onClose }) {
  const [form, setForm] = useState({ id: genId(), name: '', emiAmount: '', remainingMonths: 6 });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Add Active EMI on Card</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Purchase / Item Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. iPhone 16 Pro, Laptop"
            />
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Monthly EMI (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.emiAmount}
                onChange={e => set('emiAmount', e.target.value)}
                placeholder="e.g. 6500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Remaining Months</label>
              <input
                className="form-input"
                type="number"
                value={form.remainingMonths}
                onChange={e => set('remainingMonths', e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.emiAmount}>
            <Check size={14} /> Add EMI
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recurring Expense Presets & Helpers ─────────────────────────────────────
const blankExpense = () => ({
  id: genId(),
  title: '',
  amount: '',
  category: 'Rent & Housing',
  dueDay: 5,
  payee: '',
  status: 'Active',
  notes: '',
  history: {}
});

const DEFAULT_EXPENSE_SUGGESTIONS = [
  { title: 'Flat Rent', category: 'Rent & Housing', dueDay: 5, icon: '🏠' },
  { title: 'Society Maintenance', category: 'Rent & Housing', dueDay: 1, icon: '🏢' },
  { title: 'Electricity Bill', category: 'Utilities', dueDay: 10, icon: '⚡' },
  { title: 'Maid / Cook Salary', category: 'Household', dueDay: 1, icon: '🧹' },
  { title: 'Wi-Fi & Broadband', category: 'Utilities', dueDay: 15, icon: '📶' },
  { title: 'Gym & Fitness', category: 'Lifestyle', dueDay: 1, icon: '🏋️' },
  { title: 'Water / Piped Gas', category: 'Utilities', dueDay: 12, icon: '💧' },
  { title: 'OTT Subscriptions', category: 'Subscriptions', dueDay: 20, icon: '📺' },
];

const EXPENSE_CATEGORIES = [
  'Rent & Housing',
  'Utilities',
  'Household',
  'Lifestyle',
  'Subscriptions',
  'Education',
  'Other'
];

function ExpenseModal({ expense, onSave, onClose }) {
  const [form, setForm] = useState(expense || blankExpense());
  const [customCat, setCustomCat] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isStandardCat = EXPENSE_CATEGORIES.includes(form.category);
  const selectedCat = isStandardCat ? form.category : 'Other';

  const handleSave = () => {
    if (!form.title?.trim() || !form.amount) return;
    const finalCat = selectedCat === 'Other' ? (customCat.trim() || 'Other') : form.category;
    onSave({ ...form, title: form.title.trim(), category: finalCat });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Home size={18} color="var(--accent-indigo)" />
            {expense?.id ? 'Edit Recurring Expense' : 'Add Recurring Expense / Rent'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Quick Suggestions / Presets */}
          <div style={{ marginBottom: 14 }}>
            <div className="text-sm text-muted" style={{ marginBottom: 6 }}>
              Quick Presets (click to autofill, or type custom name below):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEFAULT_EXPENSE_SUGGESTIONS.map(s => (
                <button
                  key={s.title}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 9px', fontSize: 11, borderRadius: 'var(--radius-full)' }}
                  onClick={() => {
                    set('title', s.title);
                    set('category', s.category);
                    set('dueDay', s.dueDay);
                  }}
                >
                  {s.icon} {s.title}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Expense Name / Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Flat Rent, Society Maintenance, Maid Salary..."
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Amount (₹) *</label>
              <input
                className="form-input"
                type="number"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="e.g. 25000"
              />
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={selectedCat}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    set('category', 'Other');
                  } else {
                    set('category', val);
                  }
                }}
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {selectedCat === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customCat}
                  onChange={e => {
                    setCustomCat(e.target.value);
                    set('category', e.target.value || 'Other');
                  }}
                  placeholder="Type category..."
                  autoFocus
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Due Day of Month</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={e => set('dueDay', e.target.value)}
                placeholder="e.g. 5"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                <option value="Active">Active (Monthly)</option>
                <option value="Paused">Paused / Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Landlord / Payee Name or UPI ID</label>
            <input
              className="form-input"
              value={form.payee}
              onChange={e => set('payee', e.target.value)}
              placeholder="e.g. Landlord Sharma Ji / landlord@okhdfcbank"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes &amp; Details</label>
            <textarea
              className="form-input"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Agreement till Dec 2027, includes maintenance, security deposit ₹50k..."
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!form.title?.trim() || !form.amount}
          >
            <Check size={14} /> Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseCard({ expense, onEdit, onDelete, onTogglePaid }) {
  const [expanded, setExpanded] = useState(false);
  const months12 = getLast12Months();
  const curMonth = currentMonthKey();
  const currentRecord = expense.history?.[curMonth];
  const isCurrentPaid = currentRecord?.status === 'Paid';

  const totalPaidLifetime = Object.values(expense.history || {}).reduce((s, h) => {
    return h?.status === 'Paid' ? s + Number(h.amount || expense.amount || 0) : s;
  }, 0);
  const totalMonthsPaid = Object.values(expense.history || {}).filter(h => h?.status === 'Paid').length;

  return (
    <div className="vehicle-card" style={{ marginBottom: 12 }}>
      <div className="vehicle-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="vehicle-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <Home size={22} color="var(--accent-indigo)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{expense.title}</span>
            <span className={`badge ${expense.status === 'Active' ? 'badge-green' : 'badge-muted'}`}>
              {expense.status || 'Active'}
            </span>
            {expense.category && (
              <span className="badge badge-muted">{expense.category}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
              {formatCurrency(expense.amount)} / month
            </span>
            {expense.dueDay && <span>📅 Due on {getOrdinal(expense.dueDay)}</span>}
            {expense.payee && <span>👤 Payee: <strong>{expense.payee}</strong></span>}
          </div>
        </div>

        {/* Current Month Quick Toggle Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
          <button
            className={`btn btn-sm ${isCurrentPaid ? 'btn-success' : 'btn-secondary'}`}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              borderColor: isCurrentPaid ? 'var(--accent-green)' : 'var(--border-subtle)',
              background: isCurrentPaid ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface)'
            }}
            onClick={() => onTogglePaid(expense.id, curMonth)}
            title={`Toggle payment for ${monthLabel(curMonth)}`}
          >
            {isCurrentPaid ? (
              <>
                <Check size={13} color="var(--accent-green)" />
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{monthLabel(curMonth).split(' ')[0]}: Paid</span>
              </>
            ) : (
              <>
                <Clock size={13} color="var(--accent-amber)" />
                <span style={{ color: 'var(--text-secondary)' }}>{monthLabel(curMonth).split(' ')[0]}: Mark Paid</span>
              </>
            )}
          </button>

          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => onEdit(expense)}
            title="Edit Expense"
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-danger btn-icon btn-sm"
            onClick={() => onDelete(expense.id)}
            title="Delete Expense"
          >
            <Trash2 size={13} />
          </button>
          <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="vehicle-card-body">
          <div className="grid-cols-3 gap-12 mb-16" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div>
              <div className="text-sm text-muted">Total Paid Tracked</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-red)' }}>
                {formatCurrency(totalPaidLifetime)}
              </div>
              <div className="text-sm text-secondary">
                {totalMonthsPaid} month{totalMonthsPaid !== 1 ? 's' : ''} recorded paid
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Payee / Account Details</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                {expense.payee || '—'}
              </div>
              <div className="text-sm text-secondary">Due {getOrdinal(expense.dueDay)} of every month</div>
            </div>
            <div>
              <div className="text-sm text-muted">Expense Category</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-indigo)' }}>
                {expense.category || 'General'}
              </div>
              <div className="text-sm text-secondary">Status: {expense.status || 'Active'}</div>
            </div>
          </div>

          {expense.notes && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>📝 Notes &amp; Terms:</strong> {expense.notes}
            </div>
          )}

          {/* 12-Month Payment History Grid */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm text-secondary">
                Payment History Tracker (Click to mark Paid / Pending)
              </span>
              <span className="text-sm text-muted">Current: {monthLabel(curMonth)}</span>
            </div>

            <div className="month-grid">
              {months12.map(month => {
                const rec = expense.history?.[month];
                const isPaid = rec?.status === 'Paid';
                const isPending = rec?.status === 'Pending';
                const cls = isPaid ? 'month-cell-paid' : isPending ? 'month-cell-unpaid' : 'month-cell-none';

                return (
                  <div
                    key={month}
                    className={`month-cell ${cls}`}
                    onClick={() => onTogglePaid(expense.id, month)}
                    title={`${monthLabel(month)}: ${isPaid ? 'Paid' : isPending ? 'Pending' : 'Click to toggle'}`}
                  >
                    <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                    {isPaid && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                    {isPending && <Clock size={10} style={{ marginTop: 2, display: 'inline', color: 'var(--accent-amber)' }} />}
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

// ─── External Contributions Constants & Modal ─────────────────────────────────
const blankContribution = () => ({
  id: genId(),
  contributor: '',
  relation: 'Sister',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  contributionType: 'family_loan', // 'family_loan' | 'reimbursement' | 'gift'
  purpose: 'Insurance Premium Help',
  receivedVia: 'UPI (GPay / PhonePe / Paytm)',
  referenceNo: '',
  notes: '',
  repaidAmount: 0,
  repayments: [],
  createdAt: new Date().toISOString()
});

const RELATIONS = [
  'Sister',
  'Brother-in-Law (BIL)',
  'Brother',
  'Parents',
  'Father',
  'Mother',
  'In-Laws',
  'Spouse',
  'Relative / Cousin',
  'Friend',
  'Other'
];

const CONTRIBUTION_PURPOSES = [
  'Insurance Premium Help',
  'Vehicle Loan / EMI Help',
  'House Rent / Maintenance',
  'Credit Card Bill / EMI',
  'Medical / Hospital Expenses',
  'Household / Grocery Support',
  'Emergency Fund / General Support',
  'Gift / Festival',
  'Other'
];

const PAYMENT_MODES = [
  'UPI (GPay / PhonePe / Paytm)',
  'Bank Transfer (IMPS / NEFT)',
  'Cash',
  'Cheque',
  'Other'
];

const getRelationBadge = (relation = '') => {
  const rel = (relation || '').toLowerCase();
  if (rel.includes('sister')) return { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' };
  if (rel.includes('bil') || rel.includes('brother-in-law')) return { bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' };
  if (rel.includes('brother')) return { bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' };
  if (rel.includes('parent') || rel.includes('father') || rel.includes('mother')) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
  if (rel.includes('friend')) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
  return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
};

function ContributionModal({ contribution, onSave, onClose }) {
  const [form, setForm] = useState(contribution || blankContribution());
  const [selectedRel, setSelectedRel] = useState(
    RELATIONS.slice(0, -1).includes(form.relation) ? form.relation : 'Other'
  );
  const [customRel, setCustomRel] = useState(
    !RELATIONS.slice(0, -1).includes(form.relation) && form.relation ? form.relation : ''
  );

  const [selectedPurp, setSelectedPurp] = useState(
    CONTRIBUTION_PURPOSES.slice(0, -1).includes(form.purpose) ? form.purpose : 'Other'
  );
  const [customPurp, setCustomPurp] = useState(
    !CONTRIBUTION_PURPOSES.slice(0, -1).includes(form.purpose) && form.purpose ? form.purpose : ''
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const finalRel = selectedRel === 'Other' ? (customRel.trim() || 'Other') : selectedRel;
    const finalPurp = selectedPurp === 'Other' ? (customPurp.trim() || 'Other') : selectedPurp;
    onSave({
      ...form,
      contributionType: form.contributionType || 'family_loan',
      relation: finalRel,
      purpose: finalPurp,
      amount: Number(form.amount) || 0,
      repaidAmount: Number(form.repaidAmount) || 0
    });
  };

  const pending = Math.max(0, (Number(form.amount) || 0) - (Number(form.repaidAmount) || 0));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeartHandshake size={18} color="var(--accent-indigo)" />
            {contribution?.id ? 'Edit External Contribution' : 'Add External Contribution / Support'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Contribution Type Selection */}
          <div className="form-group mb-16">
            <label className="form-label" style={{ fontWeight: 600 }}>Why was this money sent?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div
                onClick={() => set('contributionType', 'family_loan')}
                style={{
                  cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: (form.contributionType || 'family_loan') === 'family_loan' ? '2px solid var(--accent-red)' : '1px solid var(--border-subtle)',
                  background: (form.contributionType || 'family_loan') === 'family_loan' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-base)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-red)' }}>
                  🤝 Help with my stuff
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Family Loan (I owe this to family)
                </div>
              </div>

              <div
                onClick={() => set('contributionType', 'reimbursement')}
                style={{
                  cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: form.contributionType === 'reimbursement' ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                  background: form.contributionType === 'reimbursement' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-base)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-blue)' }}>
                  💳 Their own payment
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Used my CC / Reimbursed their bill
                </div>
              </div>

              <div
                onClick={() => set('contributionType', 'gift')}
                style={{
                  cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: form.contributionType === 'gift' ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
                  background: form.contributionType === 'gift' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-base)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-green)' }}>
                  🎁 Gift / Support
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Pure help (No repayment needed)
                </div>
              </div>
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Contributor / Person Name</label>
              <input
                className="form-input"
                value={form.contributor}
                onChange={e => set('contributor', e.target.value)}
                placeholder="e.g. Pooja (Sister), Rajesh (BIL), Brother"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Relationship</label>
              <select
                className="form-input"
                value={selectedRel}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedRel(val);
                  if (val !== 'Other') set('relation', val);
                }}
              >
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {selectedRel === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customRel}
                  onChange={e => {
                    setCustomRel(e.target.value);
                    set('relation', e.target.value || 'Other');
                  }}
                  placeholder="Specify relationship..."
                />
              )}
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Amount Received (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="e.g. 25000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date Received</label>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>

          {/* Repaid Amount if Family Loan */}
          {(form.contributionType || 'family_loan') === 'family_loan' && (
            <div className="form-group mb-14" style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <label className="form-label" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                Already Repaid Back to Family (₹)
              </label>
              <input
                className="form-input"
                type="number"
                value={form.repaidAmount || ''}
                onChange={e => set('repaidAmount', e.target.value)}
                placeholder="0 if nothing returned yet"
              />
              <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                Remaining family debt balance: <strong style={{ color: pending > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{formatCurrency(pending)}</strong>
              </div>
            </div>
          )}

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Purpose / Helped With</label>
              <select
                className="form-input"
                value={selectedPurp}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedPurp(val);
                  if (val !== 'Other') set('purpose', val);
                }}
              >
                {CONTRIBUTION_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {selectedPurp === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customPurp}
                  onChange={e => {
                    setCustomPurp(e.target.value);
                    set('purpose', e.target.value || 'Other');
                  }}
                  placeholder="Specify expense or purpose..."
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select
                className="form-input"
                value={form.receivedVia}
                onChange={e => set('receivedVia', e.target.value)}
              >
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reference / UTR / Transaction ID (Optional)</label>
            <input
              className="form-input"
              value={form.referenceNo}
              onChange={e => set('referenceNo', e.target.value)}
              placeholder="e.g. UPI Ref / IMPS / Cheque number"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes &amp; Details (Optional)</label>
            <textarea
              className="form-input"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Sent specifically to help cover Tata AIG Car Insurance premium..."
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!form.contributor?.trim() || !form.amount}
          >
            <Check size={14} /> Save Contribution
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Record Repayment to Family ────────────────────────────────────────
function RepaymentModal({ contribution, onSave, onClose }) {
  const pending = Math.max(0, Number(contribution.amount || 0) - Number(contribution.repaidAmount || 0));
  const [amount, setAmount] = useState(pending || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('UPI (GPay / PhonePe / Paytm)');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const repayNum = Number(amount) || 0;
    if (repayNum <= 0) return;
    const newRepaid = Number(contribution.repaidAmount || 0) + repayNum;
    const newHistory = [
      ...(contribution.repayments || []),
      {
        id: genId(),
        amount: repayNum,
        date,
        mode,
        notes: notes.trim()
      }
    ];
    onSave({
      ...contribution,
      repaidAmount: newRepaid,
      repayments: newHistory
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={18} color="var(--accent-green)" />
            Record Repayment to {contribution.contributor}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span className="text-muted">Total Borrowed:</span>
              <strong>{formatCurrency(contribution.amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span className="text-muted">Already Repaid:</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatCurrency(contribution.repaidAmount || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
              <span>Remaining Balance:</span>
              <strong style={{ color: 'var(--accent-red)' }}>{formatCurrency(pending)}</strong>
            </div>
          </div>

          <div className="form-group mb-12">
            <label className="form-label">Repayment Amount (₹)</label>
            <input
              className="form-input"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 10000"
              autoFocus
            />
          </div>

          <div className="form-group mb-12">
            <label className="form-label">Payment Date</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="form-group mb-12">
            <label className="form-label">Payment Mode</label>
            <select className="form-input" value={mode} onChange={e => setMode(e.target.value)}>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Returned via GPay from salary"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleSave} disabled={!amount || Number(amount) <= 0}>
            <Check size={14} /> Record Repayment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component: Finances ─────────────────────────────────────────────────
export default function Finances({ finances = {}, updateFinances, vehicles = [], investments = {} }) {
  const [tab, setTab] = useState('projection'); // 'projection' | 'recurring' | 'cards' | 'contributions' | 'salary'
  const [modal, setModal] = useState(null); // { type: 'card', card } | { type: 'emi', cardId } | { type: 'expense', expense } | { type: 'contribution', contribution }

  const creditCards = finances.creditCards || [];
  const recurringExpenses = finances.recurringExpenses || [];
  const externalContributions = finances.externalContributions || [];
  const salary = finances.salary || { amount: 0, company: '', payDay: 1, history: {} };
  const thisMonth = currentMonthKey();
  const months12 = getLast12Months();

  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');

  // ── External Contributions Filter & Sort State ────────────────────────
  const [contribSearch, setContribSearch] = useState('');
  const [contribRelationFilter, setContribRelationFilter] = useState('');
  const [contribTypeFilter, setContribTypeFilter] = useState('');
  const [contribFilterPerson, setContribFilterPerson] = useState('');
  const [contribSort, setContribSort] = useState('date-desc');

  // Purge any corrupted/legacy parsed expenses so strange numbers are cleared
  useEffect(() => {
    if (finances.expenses && finances.expenses.length > 0) {
      updateFinances({ ...finances, expenses: [] });
    }
  }, [finances.expenses]);

  // ── External Contributions Calculations & CRUD ────────────────────────
  const saveContribution = (contrib) => {
    const exists = externalContributions.find(c => c.id === contrib.id);
    const updated = exists
      ? externalContributions.map(c => c.id === contrib.id ? contrib : c)
      : [contrib, ...externalContributions];
    updateFinances({ ...finances, externalContributions: updated });
    setModal(null);
  };

  const deleteContribution = (id) => {
    if (!confirm('Delete this external contribution record?')) return;
    updateFinances({
      ...finances,
      externalContributions: externalContributions.filter(c => c.id !== id)
    });
  };

  const totalContributionsAmount = externalContributions.reduce((s, c) => s + Number(c.amount || 0), 0);
  const curMonthContributions = externalContributions.filter(c => c.date && c.date.startsWith(thisMonth));
  const curMonthContributionsTotal = curMonthContributions.reduce((s, c) => s + Number(c.amount || 0), 0);

  // ── Family Loan vs Reimbursement Totals ───────────────────────────────
  let totalFamilyLoanBorrowed = 0;
  let totalFamilyLoanRepaid = 0;
  let totalReimbursements = 0;
  let totalGifts = 0;
  const personFamilyLoanMap = {};

  externalContributions.forEach(c => {
    const amt = Number(c.amount || 0);
    const rep = Number(c.repaidAmount || 0);
    const type = c.contributionType || 'family_loan';

    if (type === 'reimbursement') {
      totalReimbursements += amt;
    } else if (type === 'gift') {
      totalGifts += amt;
    } else {
      // family_loan (Help with my stuff)
      totalFamilyLoanBorrowed += amt;
      totalFamilyLoanRepaid += rep;
      const pending = Math.max(0, amt - rep);
      const name = (c.contributor || 'Family').trim();
      if (!personFamilyLoanMap[name]) {
        personFamilyLoanMap[name] = { name, relation: c.relation || 'Family', borrowed: 0, repaid: 0, pending: 0 };
      }
      personFamilyLoanMap[name].borrowed += amt;
      personFamilyLoanMap[name].repaid += rep;
      personFamilyLoanMap[name].pending += pending;
    }
  });

  const totalFamilyLoanPending = Math.max(0, totalFamilyLoanBorrowed - totalFamilyLoanRepaid);
  const familyLoanBreakdown = Object.values(personFamilyLoanMap).sort((a, b) => b.pending - a.pending);

  // Group by contributor & relation
  const contributorSummaries = useMemo(() => {
    const map = {};
    externalContributions.forEach(c => {
      const name = (c.contributor || 'Other').trim();
      if (!map[name]) {
        map[name] = { name, relation: c.relation || 'Family', total: 0, count: 0 };
      }
      map[name].total += Number(c.amount || 0);
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [externalContributions]);

  const topContributor = contributorSummaries[0] || null;

  const sortedByDateDesc = useMemo(() => {
    return [...externalContributions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [externalContributions]);

  const latestContribution = sortedByDateDesc[0] || null;

  const filteredContributions = useMemo(() => {
    return externalContributions.filter(c => {
      const q = contribSearch.toLowerCase();
      const matchSearch = !q
        || c.contributor?.toLowerCase().includes(q)
        || c.relation?.toLowerCase().includes(q)
        || c.purpose?.toLowerCase().includes(q)
        || c.receivedVia?.toLowerCase().includes(q)
        || c.referenceNo?.toLowerCase().includes(q)
        || c.notes?.toLowerCase().includes(q);
      const matchRel = !contribRelationFilter || c.relation === contribRelationFilter;
      const matchType = !contribTypeFilter || (c.contributionType || 'family_loan') === contribTypeFilter;
      const matchPerson = !contribFilterPerson || (c.contributor || '').trim() === contribFilterPerson;
      return matchSearch && matchRel && matchType && matchPerson;
    }).sort((a, b) => {
      if (contribSort === 'date-desc') return (b.date || '').localeCompare(a.date || '');
      if (contribSort === 'date-asc') return (a.date || '').localeCompare(b.date || '');
      if (contribSort === 'amt-desc') return Number(b.amount || 0) - Number(a.amount || 0);
      if (contribSort === 'amt-asc') return Number(a.amount || 0) - Number(b.amount || 0);
      return 0;
    });
  }, [externalContributions, contribSearch, contribRelationFilter, contribTypeFilter, contribFilterPerson, contribSort]);

  // ── Recurring Expenses Calculations & CRUD ────────────────────────────
  const saveExpense = (exp) => {
    const exists = recurringExpenses.find(e => e.id === exp.id);
    const updated = exists
      ? recurringExpenses.map(e => e.id === exp.id ? exp : e)
      : [exp, ...recurringExpenses];
    updateFinances({ ...finances, recurringExpenses: updated });
    setModal(null);
  };

  const deleteExpense = (id) => {
    if (!confirm('Delete this recurring expense?')) return;
    updateFinances({ ...finances, recurringExpenses: recurringExpenses.filter(e => e.id !== id) });
  };

  const toggleExpensePaid = (expenseId, month) => {
    const exp = recurringExpenses.find(e => e.id === expenseId);
    if (!exp) return;
    const cur = exp.history?.[month]?.status;
    const nextStatus = cur === 'Paid' ? 'Pending' : cur === 'Pending' ? null : 'Paid';
    const nextHistory = { ...(exp.history || {}) };
    if (nextStatus === null) {
      delete nextHistory[month];
    } else {
      nextHistory[month] = {
        status: nextStatus,
        amount: Number(exp.amount || 0),
        date: new Date().toISOString().split('T')[0]
      };
    }
    const updated = recurringExpenses.map(e => e.id === expenseId ? { ...e, history: nextHistory } : e);
    updateFinances({ ...finances, recurringExpenses: updated });
  };

  const activeRecurring = recurringExpenses.filter(e => e.status !== 'Paused');
  const totalMonthlyRecurring = activeRecurring.reduce((s, e) => s + Number(e.amount || 0), 0);
  const curMonthPaidCount = activeRecurring.filter(e => e.history?.[thisMonth]?.status === 'Paid').length;
  const curMonthPaidAmount = activeRecurring
    .filter(e => e.history?.[thisMonth]?.status === 'Paid')
    .reduce((s, e) => s + Number(e.history?.[thisMonth]?.amount || e.amount || 0), 0);
  const largestExpense = activeRecurring.length > 0
    ? [...activeRecurring].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0]
    : null;

  const filteredExpenses = recurringExpenses.filter(e => {
    const q = expenseSearch.toLowerCase();
    const matchSearch = !q
      || e.title?.toLowerCase().includes(q)
      || e.payee?.toLowerCase().includes(q)
      || e.notes?.toLowerCase().includes(q)
      || e.category?.toLowerCase().includes(q);
    const matchCat = !expenseCategoryFilter || e.category === expenseCategoryFilter;
    return matchSearch && matchCat;
  });

  // ── Credit Cards Calculations ─────────────────────────────────────────
  const totalLimit = creditCards.reduce((s, c) => s + Number(c.totalLimit || 0), 0);
  const totalOutstanding = creditCards.reduce((s, c) => s + Number(c.totalOutstanding || 0), 0);
  const totalAvailable = Math.max(0, totalLimit - totalOutstanding);
  const overallUtilization = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0;
  const totalMonthlyBills = creditCards.reduce((s, c) => s + Number(c.monthlyBill || 0), 0);
  const totalCardEmis = creditCards.reduce((s, c) => {
    return s + (c.emis || []).reduce((sub, e) => sub + Number(e.emiAmount || 0), 0);
  }, 0);

  // ── Card CRUD ─────────────────────────────────────────────────────────
  const saveCard = (cardData) => {
    const exists = creditCards.find(c => c.id === cardData.id);
    const updated = exists
      ? creditCards.map(c => c.id === cardData.id ? { ...c, ...cardData } : c)
      : [cardData, ...creditCards];
    updateFinances({ ...finances, creditCards: updated });
    setModal(null);
  };

  const deleteCard = (id) => {
    if (!confirm('Remove this credit card?')) return;
    updateFinances({ ...finances, creditCards: creditCards.filter(c => c.id !== id) });
  };

  const addEmiToCard = (cardId, emiData) => {
    const updated = creditCards.map(c => {
      if (c.id !== cardId) return c;
      return { ...c, emis: [...(c.emis || []), emiData] };
    });
    updateFinances({ ...finances, creditCards: updated });
    setModal(null);
  };

  const deleteEmi = (cardId, emiId) => {
    const updated = creditCards.map(c => {
      if (c.id !== cardId) return c;
      return { ...c, emis: (c.emis || []).filter(e => e.id !== emiId) };
    });
    updateFinances({ ...finances, creditCards: updated });
  };

  // ── Salary Setup & History ────────────────────────────────────────────
  const [salaryForm, setSalaryForm] = useState({
    amount: salary.amount || '',
    company: salary.company || '',
    payDay: salary.payDay || 1
  });

  const saveSalarySetup = () => {
    updateFinances({
      ...finances,
      salary: {
        ...salary,
        amount: Number(salaryForm.amount) || 0,
        company: salaryForm.company?.trim() || '',
        payDay: Number(salaryForm.payDay) || 1
      }
    });
    alert('Salary settings updated!');
  };

  const toggleSalaryReceived = (month) => {
    const cur = salary.history?.[month];
    const nextStatus = cur?.status === 'Received' ? 'Pending' : 'Received';
    const nextEntry = nextStatus === 'Received'
      ? { status: 'Received', amount: salary.amount, date: new Date().toISOString().split('T')[0] }
      : { status: 'Pending', amount: '', date: '' };
    updateFinances({
      ...finances,
      salary: {
        ...salary,
        history: { ...(salary.history || {}), [month]: nextEntry }
      }
    });
  };

  // ── 6-MONTH FORWARD PROJECTION ENGINE ─────────────────────────────────
  const futureMonths = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push(key);
    }
    return list;
  }, []);

  const forwardProjections = useMemo(() => {
    return futureMonths.map((monthKey, monthIdx) => {
      // 1. Vehicle EMIs
      let vehicleEmiTotal = 0;
      vehicles.forEach(v => {
        if (v.emi?.amount > 0) {
          if (!v.emi.endDate || v.emi.endDate >= monthKey) {
            vehicleEmiTotal += Number(v.emi.amount);
          }
        }
      });

      // 2. Policy Premiums falling in this specific month (Excludes One-Time policies already paid, finished PPT, and already paid in this month)
      let policyPremiumsTotal = 0;
      const policiesDueThisMonth = [];
      (investments?.policies || []).forEach(p => {
        if (isPolicyDueInMonth(p, monthKey)) {
          const amt = Number(p.premiumAmount || 0);
          policyPremiumsTotal += amt;
          policiesDueThisMonth.push({
            name: p.policyName || p.insurer,
            policyNumber: p.policyNumber,
            amount: amt,
            holder: p.holderName
          });
        }
      });

      // 2b. Health Insurance Premiums falling in this specific month
      (investments?.healthInsurance || []).forEach(h => {
        const healthWithDue = {
          ...h,
          nextDueDate: h.nextDueDate || h.expiryDate
        };
        if (isPolicyDueInMonth(healthWithDue, monthKey)) {
          const amt = Number(h.premiumAmount || 0);
          policyPremiumsTotal += amt;
          policiesDueThisMonth.push({
            name: `${h.policyName || h.insurer} (Health)`,
            policyNumber: h.policyNumber,
            amount: amt,
            holder: h.holderName || h.coveredMembers || 'Self'
          });
        }
      });

      // 3. SIPs
      let sipsTotal = 0;
      (investments?.portfolio || []).forEach(p => {
        if (p.status === 'Active' && p.frequency === 'Monthly') {
          sipsTotal += Number(p.amount || 0);
        }
      });

      // 4. CC Obligations
      // Month 0 (Current Month): includes current statement bill + card EMIs.
      // Month 1-5 (Upcoming Months): bills are variable, so do NOT repeat current statement bill!
      // Only include active card EMIs whose remaining tenure covers this future month (remainingMonths > monthIdx).
      let activeCardEmis = [];
      creditCards.forEach(c => {
        (c.emis || []).forEach(e => {
          const rem = Number(e.remainingMonths || 0);
          if (rem > monthIdx) {
            activeCardEmis.push({ ...e, cardName: c.name || c.bank });
          }
        });
      });
      const ccEmiTotal = activeCardEmis.reduce((s, e) => s + Number(e.emiAmount || 0), 0);
      const isCurrentMonth = monthIdx === 0;
      const ccBills = isCurrentMonth ? totalMonthlyBills : 0;
      const ccObligations = ccBills + ccEmiTotal;

      // Inflow (Salary + SWP + Lending Payouts + External Contributions)
      let expectedInflow = Number(salary.amount || 0);
      if (investments?.swp?.monthlyWithdrawal) {
        expectedInflow += Number(investments.swp.monthlyWithdrawal);
      }
      (investments?.loansGiven || []).forEach(l => {
        if (l.status === 'Active' && l.monthlyPayout) {
          if (!l.endDate || l.endDate >= monthKey) {
            expectedInflow += Number(l.monthlyPayout);
          }
        }
      });
      // External family contributions received in this month
      let contributionsThisMonth = 0;
      externalContributions.forEach(c => {
        if (c.date && c.date.startsWith(monthKey)) {
          contributionsThisMonth += Number(c.amount || 0);
        }
      });
      expectedInflow += contributionsThisMonth;

      // 5. Monthly Recurring Expenses (Rent, Maintenance, Maid, Electricity, etc.)
      let recurringExpensesTotal = 0;
      const recurringDueThisMonth = [];
      recurringExpenses.forEach(e => {
        if (e.status !== 'Paused') {
          const amt = Number(e.amount || 0);
          recurringExpensesTotal += amt;
          recurringDueThisMonth.push({ title: e.title, amount: amt, dueDay: e.dueDay, category: e.category });
        }
      });

      const totalOutflow = vehicleEmiTotal + policyPremiumsTotal + sipsTotal + ccObligations + recurringExpensesTotal;
      const net = expectedInflow - totalOutflow;
      const hasHeavyPolicy = policyPremiumsTotal > 15000;

      return {
        monthKey,
        label: monthLabel(monthKey),
        vehicleEmiTotal,
        policyPremiumsTotal,
        policiesDueThisMonth,
        sipsTotal,
        ccObligations,
        ccBills,
        ccEmiTotal,
        activeCardEmis,
        recurringExpensesTotal,
        recurringDueThisMonth,
        contributionsThisMonth,
        isCurrentMonth,
        totalOutflow,
        expectedInflow,
        net,
        hasHeavyPolicy
      };
    });
  }, [futureMonths, vehicles, investments, salary, creditCards, totalMonthlyBills, recurringExpenses, externalContributions]);

  return (
    <div className="animate-in">
      {/* Module Tabs */}
      <div className="tabs mb-20">
        <button
          className={`tab ${tab === 'projection' ? 'active' : ''}`}
          onClick={() => setTab('projection')}
        >
          <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
          Upcoming Expenses (Next 6m)
        </button>
        <button
          className={`tab ${tab === 'recurring' ? 'active' : ''}`}
          onClick={() => setTab('recurring')}
        >
          <Home size={14} style={{ display: 'inline', marginRight: 6 }} />
          Rent &amp; Recurring Expenses ({recurringExpenses.length})
        </button>
        <button
          className={`tab ${tab === 'cards' ? 'active' : ''}`}
          onClick={() => setTab('cards')}
        >
          <CreditCard size={14} style={{ display: 'inline', marginRight: 6 }} />
          Credit Cards &amp; EMIs ({creditCards.length})
        </button>
        <button
          className={`tab ${tab === 'contributions' ? 'active' : ''}`}
          onClick={() => setTab('contributions')}
        >
          <HeartHandshake size={14} style={{ display: 'inline', marginRight: 6 }} />
          External Contributions ({externalContributions.length})
        </button>
        <button
          className={`tab ${tab === 'salary' ? 'active' : ''}`}
          onClick={() => setTab('salary')}
        >
          <IndianRupee size={14} style={{ display: 'inline', marginRight: 6 }} />
          Salary &amp; Income Tracker
        </button>
      </div>

      {/* ── TAB 1: UPCOMING 6-MONTH EXPENSES PROJECTION ───────────────── */}
      {tab === 'projection' && (
        <div>
          <div className="section-header mb-16">
            <div>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} color="var(--accent-indigo)" />
                Forward Expense Projections (Next 6 Months)
              </div>
              <div className="section-subtitle">
                Accurately forecast monthly cash required when heavy annual/quarterly policies and EMIs fall due
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {forwardProjections.map((p, idx) => {
              const isCurrent = p.monthKey === thisMonth;

              return (
                <div
                  key={p.monthKey}
                  className="card"
                  style={{
                    border: p.hasHeavyPolicy ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                    background: p.hasHeavyPolicy
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, var(--bg-card) 100%)'
                      : undefined
                  }}
                >
                  <div className="flex justify-between items-start flex-wrap gap-12 mb-12">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{p.label}</span>
                        {isCurrent && <span className="badge badge-blue">Current Month</span>}
                        {p.hasHeavyPolicy && (
                          <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={12} /> Heavy Policy Due!
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
                        Projected Inflow: {formatCurrency(p.expectedInflow)} · Total Required Outflow: {formatCurrency(p.totalOutflow)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 22, fontWeight: 800,
                        color: p.net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                      }}>
                        {p.net >= 0 ? '+' : ''}{formatCurrency(p.net)}
                      </div>
                      <div className="text-sm text-muted">
                        {p.net >= 0 ? 'Projected Surplus' : 'Projected Deficit (Prepare Funds!)'}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown Pills */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 10,
                    background: 'var(--bg-base)',
                    padding: 12,
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <div className="text-sm text-muted">🚛 Vehicle EMIs</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.vehicleEmiTotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">🛡️ Policy Premiums</div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: p.policyPremiumsTotal > 0 ? 'var(--accent-red)' : 'var(--text-primary)'
                      }}>
                        {formatCurrency(p.policyPremiumsTotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">🏠 Rent &amp; Fixed Bills</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.recurringExpensesTotal)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.recurringDueThisMonth.length > 0 ? `${p.recurringDueThisMonth.length} recurring item${p.recurringDueThisMonth.length !== 1 ? 's' : ''}` : 'No active expenses'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">📈 Recurring SIPs</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.sipsTotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">💳 {p.isCurrentMonth ? 'CC Bill & EMIs' : 'Fixed CC EMIs'}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.ccObligations)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.isCurrentMonth
                          ? `Bill: ${formatCurrency(p.ccBills)} · EMIs: ${formatCurrency(p.ccEmiTotal)}`
                          : p.activeCardEmis.length > 0
                            ? `${p.activeCardEmis.length} active EMI${p.activeCardEmis.length > 1 ? 's' : ''}`
                            : 'No ongoing card EMIs'
                        }
                      </div>
                    </div>
                    {p.contributionsThisMonth > 0 && (
                      <div>
                        <div className="text-sm text-muted">🤝 Family Help Inflow</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-green)' }}>
                          +{formatCurrency(p.contributionsThisMonth)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          External contributions
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details of policies falling in this month */}
                  {p.policiesDueThisMonth.length > 0 && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-red)', marginBottom: 4 }}>
                        🚨 Policies Falling Due in {p.label.split(' ')[0]}:
                      </div>
                      <div className="flex gap-12 flex-wrap">
                        {p.policiesDueThisMonth.map((pol, pi) => (
                          <span key={`${pol.name}-${pi}`} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            • <strong>{pol.name}</strong>{pol.policyNumber ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-blue)', marginLeft: 4 }}>#{pol.policyNumber}</span> : ''} ({pol.holder || 'Self'}): <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatCurrency(pol.amount)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: RENT & RECURRING EXPENSES ───────────────────────────── */}
      {tab === 'recurring' && (
        <div>
          {/* Summary Stat Cards */}
          <div className="grid-cols-3 mb-20">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Home size={20} color="var(--accent-indigo)" />
              </div>
              <div className="stat-label">Total Monthly Fixed Bills</div>
              <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{formatCurrency(totalMonthlyRecurring)}</div>
              <div className="stat-sub">{activeRecurring.length} active recurring expense{activeRecurring.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Check size={20} color="var(--accent-green)" />
              </div>
              <div className="stat-label">{monthLabel(thisMonth).split(' ')[0]} Payment Status</div>
              <div className="stat-value" style={{ color: curMonthPaidCount === activeRecurring.length && activeRecurring.length > 0 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {curMonthPaidCount} of {activeRecurring.length} Paid
              </div>
              <div className="stat-sub">{formatCurrency(curMonthPaidAmount)} paid this month</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <Receipt size={20} color="var(--accent-cyan)" />
              </div>
              <div className="stat-label">Largest Monthly Outflow</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {largestExpense ? largestExpense.title : '—'}
              </div>
              <div className="stat-sub">
                {largestExpense ? `${formatCurrency(largestExpense.amount)} / month` : 'Add an expense'}
              </div>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex gap-10 mb-16 flex-wrap items-center">
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                placeholder="Search flat rent, maintenance, electricity, maid..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 140 }}
              value={expenseCategoryFilter}
              onChange={e => setExpenseCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'expense' })}>
              <Plus size={15} /> Add Recurring Expense
            </button>
          </div>

          {filteredExpenses.length === 0 && (
            <div className="empty-state">
              <Home size={48} />
              <div className="empty-state-title">
                {recurringExpenses.length === 0 ? 'No recurring expenses added yet' : 'No expenses match your search'}
              </div>
              <div className="empty-state-desc">
                {recurringExpenses.length === 0
                  ? 'Track flat rent, society maintenance, maid/cook salaries, electricity, and utilities with monthly payment history.'
                  : 'Try clearing your search query or category filter.'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredExpenses.map(exp => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                onEdit={(e) => setModal({ type: 'expense', expense: e })}
                onDelete={deleteExpense}
                onTogglePaid={toggleExpensePaid}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: CREDIT CARDS & EMIS ───────────────────────────────── */}
      {tab === 'cards' && (
        <div>
          {/* Summary Stat Cards */}
          <div className="grid-cols-4 mb-20">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <CreditCard size={20} color="var(--accent-indigo)" />
              </div>
              <div className="stat-label">Total Credit Limit</div>
              <div className="stat-value">{formatCurrency(totalLimit)}</div>
              <div className="stat-sub">{creditCards.length} cards registered</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <IndianRupee size={20} color="var(--accent-red)" />
              </div>
              <div className="stat-label">Total Outstanding</div>
              <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{formatCurrency(totalOutstanding)}</div>
              <div className="stat-sub">{overallUtilization}% credit utilized</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Wallet size={20} color="var(--accent-green)" />
              </div>
              <div className="stat-label">Available Credit</div>
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{formatCurrency(totalAvailable)}</div>
              <div className="stat-sub">Free limit remaining</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Clock size={20} color="var(--accent-amber)" />
              </div>
              <div className="stat-label">Monthly CC Bills &amp; EMIs</div>
              <div className="stat-value">{formatCurrency(totalMonthlyBills + totalCardEmis)}</div>
              <div className="stat-sub">Bills: {formatCurrency(totalMonthlyBills)} · EMIs: {formatCurrency(totalCardEmis)}</div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="section-title">Your Credit Cards</div>
              <div className="section-subtitle">Track limits, statement balances, bill dates &amp; active EMIs</div>
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'card' })}>
              <Plus size={15} /> Add Credit Card
            </button>
          </div>

          {creditCards.length === 0 && (
            <div className="empty-state">
              <CreditCard size={48} />
              <div className="empty-state-title">No credit cards added yet</div>
              <div className="empty-state-desc">Click "Add Credit Card" to track limits, outstanding dues, and active EMIs.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {creditCards.map(c => {
              const limit = Number(c.totalLimit) || 0;
              const out = Number(c.totalOutstanding) || 0;
              const utilPct = limit > 0 ? Math.round((out / limit) * 100) : 0;
              const utilColor = utilPct > 50 ? 'var(--accent-red)' : utilPct > 30 ? 'var(--accent-amber)' : 'var(--accent-green)';
              const emiTotal = (c.emis || []).reduce((s, e) => s + Number(e.emiAmount || 0), 0);

              return (
                <div key={c.id} className="vehicle-card">
                  <div className="vehicle-card-header">
                    <div className="vehicle-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <CreditCard size={22} color="var(--accent-indigo)" />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{c.bank} {c.name}</span>
                        {c.last4 && <span className="badge badge-muted">•••• {c.last4}</span>}
                        <span className="badge" style={{ color: utilColor, borderColor: `${utilColor}44`, background: `${utilColor}15` }}>
                          {utilPct}% Utilized
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span>Limit: <strong>{formatCurrency(c.totalLimit)}</strong></span>
                        <span>Outstanding: <strong style={{ color: 'var(--accent-red)' }}>{formatCurrency(c.totalOutstanding)}</strong></span>
                        <span>Available: <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(Math.max(0, limit - out))}</strong></span>
                        {c.dueDay && <span>📅 Due on {getOrdinal(c.dueDay)} of month</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-8" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setModal({ type: 'card', card: c })}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteCard(c.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="vehicle-card-body">
                    {/* Utilization Progress Bar */}
                    <div className="mb-14">
                      <div className="flex justify-between text-sm text-secondary mb-4">
                        <span>Limit Utilization</span>
                        <span>{formatCurrency(c.totalOutstanding)} of {formatCurrency(c.totalLimit)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, utilPct)}%`, background: utilColor }} />
                      </div>
                    </div>

                    {/* Active EMIs Section */}
                    <div style={{ background: 'var(--bg-base)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                      <div className="flex justify-between items-center mb-10">
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>Active EMIs on Card</span>
                          {emiTotal > 0 && (
                            <span className="badge badge-purple" style={{ marginLeft: 8 }}>
                              Total EMI: {formatCurrency(emiTotal)}/mo
                            </span>
                          )}
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal({ type: 'emi', cardId: c.id })}>
                          <Plus size={12} /> Add EMI Item
                        </button>
                      </div>

                      {(!c.emis || c.emis.length === 0) ? (
                        <div className="text-sm text-muted">No EMIs running on this card.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {c.emis.map(e => (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{e.name}</span>
                                <span className="text-sm text-muted" style={{ marginLeft: 8 }}>({e.remainingMonths} months remaining)</span>
                              </div>
                              <div className="flex items-center gap-10">
                                <span style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{formatCurrency(e.emiAmount)}/mo</span>
                                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteEmi(c.id, e.id)}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: EXTERNAL CONTRIBUTIONS / FAMILY SUPPORT ─────────── */}
      {tab === 'contributions' && (
        <div>
          {/* Header with Title and Add Button */}
          <div className="flex justify-between items-center mb-16 flex-wrap gap-12">
            <div>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartHandshake size={20} color="var(--accent-indigo)" />
                External Contributions &amp; Family Support
              </div>
              <div className="section-subtitle">
                Keep a clear, dated record of money sent by sisters, BIL, or family to help with expenses
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setModal({ type: 'contribution' })}
            >
              <Plus size={15} /> Add External Contribution
            </button>
          </div>

          {/* ── HIGHLIGHT: FAMILY LOAN BOX (OWED TO FAMILY) ── */}
          <div className="card mb-20" style={{
            background: totalFamilyLoanPending > 0
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-card) 100%)'
              : 'var(--bg-card)',
            border: totalFamilyLoanPending > 0
              ? '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid var(--border-subtle)'
          }}>
            <div className="flex justify-between items-start flex-wrap gap-12 mb-12">
              <div>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                  <Landmark size={18} color={totalFamilyLoanPending > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
                  Family Loan Box (Owed to Family)
                </div>
                <div className="section-subtitle">
                  Tracks money family sent to help with your expenses (Family Loan) vs their own CC reimbursements
                </div>
              </div>

              {totalFamilyLoanPending > 0 ? (
                <span className="badge badge-red" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12} /> {formatCurrency(totalFamilyLoanPending)} Pending Owed
                </span>
              ) : (
                <span className="badge badge-green" style={{ fontSize: 12, padding: '4px 10px' }}>
                  ✓ All Family Loans Cleared
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              background: 'var(--bg-base)',
              padding: 14,
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-red)', textTransform: 'uppercase', fontSize: 11 }}>
                  🏦 Outstanding Family Loan (I Owe)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-red)', marginTop: 2 }}>
                  {formatCurrency(totalFamilyLoanPending)}
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                  Borrowed: {formatCurrency(totalFamilyLoanBorrowed)} · Repaid: {formatCurrency(totalFamilyLoanRepaid)}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-blue)', textTransform: 'uppercase', fontSize: 11 }}>
                  💳 Card &amp; Bill Reimbursements
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                  {formatCurrency(totalReimbursements)}
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                  Sent for their own CC payments / bills (Not owed)
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-green)', textTransform: 'uppercase', fontSize: 11 }}>
                  🎁 Pure Gifts &amp; Support
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)', marginTop: 2 }}>
                  {formatCurrency(totalGifts)}
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                  Non-refundable family support
                </div>
              </div>
            </div>

            {/* Breakdown of who you owe */}
            {familyLoanBreakdown.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                <div className="text-sm text-secondary" style={{ marginBottom: 6, fontWeight: 600 }}>
                  Who you currently owe:
                </div>
                <div className="flex gap-10 flex-wrap">
                  {familyLoanBreakdown.map(b => (
                    <div
                      key={b.name}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: b.pending > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: b.pending > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name} ({b.relation}):</span>
                      <span style={{ fontWeight: 800, color: b.pending > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        {b.pending > 0 ? `Owe ${formatCurrency(b.pending)}` : 'Cleared ✓'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div className="grid-cols-4 mb-20">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <div className="stat-label">Total Help Received</div>
                <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
                  {formatCurrency(totalContributionsAmount)}
                </div>
                <div className="stat-sub">
                  Across {externalContributions.length} contribution{externalContributions.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-indigo)' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div className="stat-label">Received This Month</div>
                <div className="stat-value" style={{ color: curMonthContributionsTotal > 0 ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                  {formatCurrency(curMonthContributionsTotal)}
                </div>
                <div className="stat-sub">
                  {monthLabel(thisMonth)} inflow
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
                <Users size={20} />
              </div>
              <div>
                <div className="stat-label">Top Contributor</div>
                <div className="stat-value" style={{ fontSize: 18, color: topContributor ? '#ec4899' : 'var(--text-primary)' }}>
                  {topContributor ? topContributor.name : '—'}
                </div>
                <div className="stat-sub">
                  {topContributor ? `${formatCurrency(topContributor.total)} (${topContributor.relation})` : 'No contributions yet'}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' }}>
                <HeartHandshake size={20} />
              </div>
              <div>
                <div className="stat-label">Latest Contribution</div>
                <div className="stat-value" style={{ fontSize: 18, color: latestContribution ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                  {latestContribution ? formatCurrency(latestContribution.amount) : '—'}
                </div>
                <div className="stat-sub">
                  {latestContribution ? `${latestContribution.contributor} · ${formatDate(latestContribution.date)}` : 'None recorded'}
                </div>
              </div>
            </div>
          </div>

          {/* Contributor Breakdown Cards (Quick filter) */}
          {contributorSummaries.length > 0 && (
            <div className="card mb-20" style={{ padding: '14px 16px' }}>
              <div className="flex justify-between items-center mb-10">
                <span className="text-sm font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="var(--accent-indigo)" /> Summary by Contributor (Click to filter list)
                </span>
                {contribFilterPerson && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => setContribFilterPerson('')}
                  >
                    Clear Filter ({contribFilterPerson})
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {contributorSummaries.map(c => {
                  const isSelected = contribFilterPerson === c.name;
                  const bStyle = getRelationBadge(c.relation);
                  return (
                    <div
                      key={c.name}
                      onClick={() => setContribFilterPerson(isSelected ? '' : c.name)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-base)',
                        border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.name}
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: bStyle.bg, color: bStyle.color }}>
                            {c.relation}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {c.count} contribution{c.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-green)', marginLeft: 4 }}>
                        {formatCurrency(c.total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search, Relation Filter, Type Filter, and Sort Controls */}
          <div className="flex gap-10 mb-16 flex-wrap">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 30 }}
                placeholder="Search contributor, purpose, relation, notes, ref..."
                value={contribSearch}
                onChange={e => setContribSearch(e.target.value)}
              />
            </div>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 150 }}
              value={contribRelationFilter}
              onChange={e => setContribRelationFilter(e.target.value)}
            >
              <option value="">All Relationships</option>
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 160 }}
              value={contribTypeFilter}
              onChange={e => setContribTypeFilter(e.target.value)}
            >
              <option value="">All Payment Types</option>
              <option value="family_loan">🤝 Family Loans (I Owe)</option>
              <option value="reimbursement">💳 CC / Bill Reimbursements</option>
              <option value="gift">🎁 Gifts &amp; Support</option>
            </select>

            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 160 }}
              value={contribSort}
              onChange={e => setContribSort(e.target.value)}
            >
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="amt-desc">Amount (Highest first)</option>
              <option value="amt-asc">Amount (Lowest first)</option>
            </select>
          </div>

          {/* List of Contributions */}
          {filteredContributions.length === 0 ? (
            <div className="card text-center" style={{ padding: 40 }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <HeartHandshake size={28} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                {externalContributions.length === 0 ? 'No external contributions added yet' : 'No contributions match your filters'}
              </div>
              <div className="text-sm text-muted" style={{ maxWidth: 440, margin: '0 auto 16px' }}>
                {externalContributions.length === 0
                  ? 'Record money sent by your sisters, brother-in-law, or family members to help with insurance premiums, EMIs, or household expenses.'
                  : 'Try clearing the search query or changing relationship/type filters.'}
              </div>
              {externalContributions.length === 0 && (
                <button
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'contribution' })}
                >
                  <Plus size={14} /> Add First Contribution
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredContributions.map(c => {
                const bStyle = getRelationBadge(c.relation);
                const type = c.contributionType || 'family_loan';
                const isFamilyLoan = type === 'family_loan';
                const isReimbursement = type === 'reimbursement';
                const pendingOwed = Math.max(0, (Number(c.amount) || 0) - (Number(c.repaidAmount) || 0));

                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                      border: isFamilyLoan && pendingOwed > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: 1 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: bStyle.bg, color: bStyle.color, border: `1px solid ${bStyle.border}`,
                        flexShrink: 0
                      }}>
                        <HeartHandshake size={20} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{c.contributor}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                            background: bStyle.bg, color: bStyle.color, border: `1px solid ${bStyle.border}`
                          }}>
                            {c.relation || 'Family'}
                          </span>

                          {/* Type Badge */}
                          {isFamilyLoan && (
                            <span
                              className={`badge ${pendingOwed > 0 ? 'badge-red' : 'badge-green'}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Landmark size={11} />
                              {pendingOwed > 0 ? `Family Loan · Owe ${formatCurrency(pendingOwed)}` : 'Family Loan · Cleared ✓'}
                            </span>
                          )}
                          {isReimbursement && (
                            <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CreditCard size={11} />
                              CC Reimbursement (Their Bill)
                            </span>
                          )}
                          {type === 'gift' && (
                            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              🎁 Gift / Support
                            </span>
                          )}

                          {c.date && (
                            <span className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> {formatDate(c.date)}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {c.purpose && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Tag size={12} color="var(--accent-indigo)" />
                              <strong>{c.purpose}</strong>
                            </span>
                          )}
                          {c.receivedVia && (
                            <span className="text-muted">· {c.receivedVia}</span>
                          )}
                          {c.referenceNo && (
                            <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                              Ref: {c.referenceNo}
                            </span>
                          )}
                          {isFamilyLoan && c.repaidAmount > 0 && (
                            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                              ✓ Repaid {formatCurrency(c.repaidAmount)}
                            </span>
                          )}
                        </div>

                        {c.notes && (
                          <div className="text-sm text-muted" style={{ marginTop: 4, fontStyle: 'italic' }}>
                            "{c.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-green)' }}>
                          +{formatCurrency(c.amount)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Received Inflow
                        </div>
                      </div>

                      {/* Repay Button if Family Loan */}
                      {isFamilyLoan && pendingOwed > 0 && (
                        <button
                          className="btn btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(16,185,129,0.12)',
                            color: 'var(--accent-green)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            fontWeight: 600,
                            fontSize: 12,
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-full)'
                          }}
                          onClick={() => setModal({ type: 'repayment', contribution: c })}
                          title="Record a repayment back to family"
                        >
                          <RotateCcw size={12} /> Return Money
                        </button>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => setModal({ type: 'contribution', contribution: c })}
                          title="Edit Contribution"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => deleteContribution(c.id)}
                          title="Delete Contribution"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: SALARY & INCOME TRACKER ──────────────────────────── */}
      {tab === 'salary' && (
        <div>
          <div className="card mb-20">
            <div className="section-header mb-14">
              <div>
                <div className="section-title">💼 Monthly Salary Configuration</div>
                <div className="section-subtitle">Set your fixed in-hand salary for accurate monthly cash flow forecasting</div>
              </div>
            </div>

            <div className="form-row form-row-3 mb-16">
              <div className="form-group">
                <label className="form-label">In-Hand Monthly Salary (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  value={salaryForm.amount}
                  onChange={e => setSalaryForm(s => ({ ...s, amount: e.target.value }))}
                  placeholder="e.g. 150000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Employer / Company Name</label>
                <input
                  className="form-input"
                  value={salaryForm.company}
                  onChange={e => setSalaryForm(s => ({ ...s, company: e.target.value }))}
                  placeholder="e.g. Tech Corp / Business"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Salary Credit Day</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={31}
                  value={salaryForm.payDay}
                  onChange={e => setSalaryForm(s => ({ ...s, payDay: e.target.value }))}
                  placeholder="e.g. 1st or 30th"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={saveSalarySetup}>
                <Check size={14} /> Save Salary Settings
              </button>
            </div>
          </div>

          {salary.amount > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <div className="section-title">12-Month Salary Receipts</div>
                  <div className="section-subtitle">Click to mark Salary Received or Pending for each month</div>
                </div>
                <span className="badge badge-green" style={{ fontSize: 13, padding: '4px 10px' }}>
                  {formatCurrency(salary.amount)}/month
                </span>
              </div>

              <div className="month-grid">
                {months12.map(month => {
                  const rec = salary.history?.[month]?.status === 'Received';
                  return (
                    <div
                      key={month}
                      className={`month-cell ${rec ? 'month-cell-paid' : 'month-cell-none'}`}
                      onClick={() => toggleSalaryReceived(month)}
                      title={monthLabel(month)}
                    >
                      <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                      {rec && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────── */}
      {modal?.type === 'card' && (
        <CardModal card={modal.card} onSave={saveCard} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'emi' && (
        <CardEmiModal onSave={emiData => addEmiToCard(modal.cardId, emiData)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'expense' && (
        <ExpenseModal
          expense={modal.expense}
          onSave={saveExpense}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'contribution' && (
        <ContributionModal
          contribution={modal.contribution}
          onSave={saveContribution}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'repayment' && (
        <RepaymentModal
          contribution={modal.contribution}
          onSave={saveContribution}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
