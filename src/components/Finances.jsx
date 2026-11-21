import { useState, useMemo } from 'react';
import {
  CreditCard, IndianRupee, TrendingUp, Calendar, AlertTriangle,
  Plus, Edit2, Trash2, Check, X,
  PieChart, ArrowUpRight, ArrowDownRight, Sparkles, Shield,
  Clock, DollarSign, Wallet
} from 'lucide-react';
import {
  genId, formatDate, formatCurrency, currentMonthKey, monthLabel,
  getLast12Months, daysUntil
} from '../utils/storage';

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

// ─── Main Component: Finances ─────────────────────────────────────────────────
export default function Finances({ finances = {}, updateFinances, vehicles = [], investments = {} }) {
  const [tab, setTab] = useState('projection'); // 'projection' | 'cards' | 'salary'
  const [modal, setModal] = useState(null); // { type: 'card', card } | { type: 'emi', cardId }

  const creditCards = finances.creditCards || [];
  const salary = finances.salary || { amount: 0, company: '', payDay: 1, history: {} };
  const thisMonth = currentMonthKey();
  const months12 = getLast12Months();

  // Purge any corrupted/legacy parsed expenses so strange numbers are cleared
  useMemo(() => {
    if (finances.expenses && finances.expenses.length > 0) {
      setTimeout(() => updateFinances({ ...finances, expenses: [] }), 0);
    }
  }, []);

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
        amount: Number(salaryForm.amount),
        company: salaryForm.company,
        payDay: Number(salaryForm.payDay)
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

      // 2. Policy Premiums falling in this specific month
      let policyPremiumsTotal = 0;
      const policiesDueThisMonth = [];
      (investments?.policies || []).forEach(p => {
        if (p.status !== 'Active' || !p.premiumAmount) return;
        const freq = p.premiumFrequency || 'Yearly';
        const start = p.startDate ? new Date(p.startDate) : null;
        const [targetY, targetM] = monthKey.split('-').map(Number);

        let fallsDue = false;
        if (p.nextDueDate && p.nextDueDate.startsWith(monthKey)) {
          fallsDue = true;
        } else if (p.nextDueDate) {
          const [ndY, ndM] = p.nextDueDate.split('-').map(Number);
          const diffMonths = (targetY - ndY) * 12 + (targetM - ndM);
          const interval = { Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12 }[freq] || 12;
          if (diffMonths >= 0 && diffMonths % interval === 0) fallsDue = true;
        } else if (start) {
          const diffMonths = (targetY - start.getFullYear()) * 12 + (targetM - (start.getMonth() + 1));
          if (diffMonths >= 0) {
            const interval = { Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12 }[freq] || 12;
            if (diffMonths % interval === 0) fallsDue = true;
          }
        }

        if (fallsDue) {
          const amt = Number(p.premiumAmount);
          policyPremiumsTotal += amt;
          policiesDueThisMonth.push({ name: p.policyName || p.insurer, amount: amt, holder: p.holderName });
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

      // Inflow (Salary + SWP + Lending Payouts)
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

      const totalOutflow = vehicleEmiTotal + policyPremiumsTotal + sipsTotal + ccObligations;
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
        isCurrentMonth,
        totalOutflow,
        expectedInflow,
        net,
        hasHeavyPolicy
      };
    });
  }, [futureMonths, vehicles, investments, salary, creditCards, totalMonthlyBills]);

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
          className={`tab ${tab === 'cards' ? 'active' : ''}`}
          onClick={() => setTab('cards')}
        >
          <CreditCard size={14} style={{ display: 'inline', marginRight: 6 }} />
          Credit Cards &amp; EMIs ({creditCards.length})
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
                  </div>

                  {/* Details of policies falling in this month */}
                  {p.policiesDueThisMonth.length > 0 && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-red)', marginBottom: 4 }}>
                        🚨 Policies Falling Due in {p.label.split(' ')[0]}:
                      </div>
                      <div className="flex gap-12 flex-wrap">
                        {p.policiesDueThisMonth.map((pol, pi) => (
                          <span key={pi} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            • <strong>{pol.name}</strong> ({pol.holder || 'Self'}): <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatCurrency(pol.amount)}</span>
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

      {/* ── TAB 2: CREDIT CARDS & EMIS ───────────────────────────────── */}
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
                        {c.dueDay && <span>📅 Due on {c.dueDay}th of month</span>}
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

      {/* ── TAB 3: SALARY & INCOME TRACKER ──────────────────────────── */}
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
    </div>
  );
}
