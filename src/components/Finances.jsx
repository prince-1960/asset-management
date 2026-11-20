import { useState, useMemo } from 'react';
import {
  CreditCard, IndianRupee, TrendingUp, Calendar, AlertTriangle,
  Plus, Edit2, Trash2, Check, X, UploadCloud, FileText,
  PieChart, ArrowUpRight, ArrowDownRight, Sparkles, Shield,
  Clock, DollarSign, Wallet, ShoppingBag, Utensils, Film, Car, Zap, HeartPulse
} from 'lucide-react';
import * as XLSX from 'xlsx';
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

// ─── Category Dictionary & Rules ──────────────────────────────────────────────
const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: Utensils, color: '#f59e0b' },
  { id: 'Shopping', label: 'Shopping & E-Commerce', icon: ShoppingBag, color: '#8b5cf6' },
  { id: 'Entertainment', label: 'Entertainment & Subs', icon: Film, color: '#ec4899' },
  { id: 'Travel', label: 'Travel & Commute', icon: Car, color: '#3b82f6' },
  { id: 'Utilities', label: 'Bills & Utilities', icon: Zap, color: '#06b6d4' },
  { id: 'Health', label: 'Health & Medical', icon: HeartPulse, color: '#10b981' },
  { id: 'Investment', label: 'Investments & Savings', icon: TrendingUp, color: '#6366f1' },
  { id: 'General', label: 'Transfers & Others', icon: Wallet, color: '#64748b' },
];

function categorizeDescription(desc = '') {
  const d = desc.toLowerCase();

  // Food
  if (/zomato|swiggy|blinkit|zepto|mcdonald|starbucks|domino|pizza|burger|restaur|cafe|food|dining|instamart|dunzo|biryani|subway|haldiram/.test(d)) {
    const isWaste = /zomato|swiggy|starbucks|burger|pizza|mcdonald/.test(d);
    return { category: 'Food', isWaste };
  }
  // Shopping
  if (/amazon|flipkart|myntra|ajio|nykaa|zara|h&m|retail|cloth|store|mall|meesho|decathlon|tata cliq|relianceretail/.test(d)) {
    return { category: 'Shopping', isWaste: /myntra|zara|h&m|meesho|ajio/.test(d) };
  }
  // Entertainment
  if (/netflix|spotify|prime|hotstar|youtube|bookmyshow|pvr|inox|apple|google play|sonyliv|zee5|gaming|steam|disney/.test(d)) {
    return { category: 'Entertainment', isWaste: true };
  }
  // Travel
  if (/uber|ola|rapido|makemytrip|cleartrip|yatra|indigo|air india|irctc|fastag|petrol|fuel|hpcl|bpcl|indianoil|shell|toll/.test(d)) {
    return { category: 'Travel', isWaste: false };
  }
  // Utilities
  if (/electric|bescom|tata power|airtel|jio|vi |vodafone|act |broadband|water|gas|igl|adani gas|recharge|dth|billpay/.test(d)) {
    return { category: 'Utilities', isWaste: false };
  }
  // Health
  if (/apollo|pharmeasy|1mg|netmeds|hospital|clinic|pharmacy|medplus|pathology|diagnostic/.test(d)) {
    return { category: 'Health', isWaste: false };
  }
  // Investments
  if (/zerodha|groww|upstox|cred|emi|loan|mutual fund|sip|insurance|lic|ppf|nps/.test(d)) {
    return { category: 'Investment', isWaste: false };
  }

  return { category: 'General', isWaste: false };
}

// ─── Modal: Add/Edit Credit Card ──────────────────────────────────────────────
function CardModal({ card, onSave, onClose }) {
  const [form, setForm] = useState(card || blankCard());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
              <select className="form-input" value={form.bank} onChange={e => set('bank', e.target.value)}>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
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
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.totalLimit}>
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
  const [tab, setTab] = useState('projection'); // 'projection' | 'cards' | 'salary' | 'statements'
  const [modal, setModal] = useState(null); // { type: 'card', card } | { type: 'emi', cardId }
  const [rawText, setRawText] = useState('');
  const [statementFilter, setStatementFilter] = useState('ALL');

  const creditCards = finances.creditCards || [];
  const salary = finances.salary || { amount: 0, company: '', payDay: 1, history: {} };
  const expenses = finances.expenses || [];
  const thisMonth = currentMonthKey();
  const months12 = getLast12Months();

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

  // ── Statement Parser Engine (CSV, Excel, Text) ─────────────────────────
  const processParsedTransactions = (items) => {
    if (!items.length) {
      alert('No valid debit transactions could be parsed from the file.');
      return;
    }
    const newExpenses = [...items, ...expenses];
    updateFinances({ ...finances, expenses: newExpenses });
    alert(`Successfully parsed & categorized ${items.length} transactions!`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        const parsed = [];
        json.forEach(row => {
          if (!row || row.length < 2) return;
          // Look for amount and description columns
          let date = new Date().toISOString().split('T')[0];
          let desc = '';
          let amount = 0;

          row.forEach(cell => {
            if (typeof cell === 'string') {
              if (/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(cell)) {
                date = cell;
              } else if (cell.length > 3 && isNaN(Number(cell))) {
                desc = cell;
              }
            } else if (typeof cell === 'number' && cell > 0 && !amount) {
              amount = cell;
            }
          });

          if (desc && amount > 0) {
            const { category, isWaste } = categorizeDescription(desc);
            parsed.push({
              id: genId(),
              date,
              description: desc,
              amount,
              category,
              isWaste
            });
          }
        });

        processParsedTransactions(parsed);
      } catch (err) {
        alert('Could not parse statement file. Try uploading standard CSV or paste text below.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    const lines = rawText.split('\n');
    const parsed = [];

    lines.forEach(line => {
      if (!line.trim()) return;
      // Search for currency/number like ₹500, Rs. 1200, 450.00
      const amountMatch = line.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
      if (amountMatch) {
        const amt = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (amt > 0) {
          const cleanDesc = line.replace(amountMatch[0], '').trim() || 'Parsed Transaction';
          const { category, isWaste } = categorizeDescription(cleanDesc);
          parsed.push({
            id: genId(),
            date: new Date().toISOString().split('T')[0],
            description: cleanDesc,
            amount: amt,
            category,
            isWaste
          });
        }
      }
    });

    if (parsed.length) {
      processParsedTransactions(parsed);
      setRawText('');
    } else {
      alert('Could not detect transactions. Ensure each line has a description and amount.');
    }
  };

  const toggleWaste = (id) => {
    const updated = expenses.map(e => e.id === id ? { ...e, isWaste: !e.isWaste } : e);
    updateFinances({ ...finances, expenses: updated });
  };

  const deleteExpense = (id) => {
    updateFinances({ ...finances, expenses: expenses.filter(e => e.id !== id) });
  };

  const clearAllExpenses = () => {
    if (confirm('Clear all parsed statement expenses?')) {
      updateFinances({ ...finances, expenses: [] });
    }
  };

  // ── Expense & Waste Analytics ─────────────────────────────────────────
  const totalParsedSpend = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const wastedExpenses = expenses.filter(e => e.isWaste);
  const totalWastedSpend = wastedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const wastedPct = totalParsedSpend > 0 ? Math.round((totalWastedSpend / totalParsedSpend) * 100) : 0;

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
    return futureMonths.map(monthKey => {
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

      // 4. CC EMIs & Estimated Bill
      let ccObligations = totalCardEmis + (totalMonthlyBills > 0 ? totalMonthlyBills : 0);

      // Inflow (Salary + SWP)
      let expectedInflow = Number(salary.amount || 0);
      if (investments?.swp?.monthlyWithdrawal) {
        expectedInflow += Number(investments.swp.monthlyWithdrawal);
      }

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
        totalOutflow,
        expectedInflow,
        net,
        hasHeavyPolicy
      };
    });
  }, [futureMonths, vehicles, investments, salary, totalCardEmis, totalMonthlyBills]);

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
        <button
          className={`tab ${tab === 'statements' ? 'active' : ''}`}
          onClick={() => setTab('statements')}
        >
          <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
          Statement Parser &amp; Waste Audit
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
                      <div className="text-sm text-muted">💳 CC Bills &amp; EMIs</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.ccObligations)}</div>
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

      {/* ── TAB 4: STATEMENT PARSER & WASTE AUDIT ────────────────────── */}
      {tab === 'statements' && (
        <div>
          {/* Waste Alert Banner */}
          <div className="grid-cols-3 gap-12 mb-20">
            <div className="stat-card">
              <div className="stat-label">Total Analyzed Spend</div>
              <div className="stat-value">{formatCurrency(totalParsedSpend)}</div>
              <div className="stat-sub">{expenses.length} parsed transactions</div>
            </div>

            <div className="stat-card" style={{ background: totalWastedSpend > 0 ? 'rgba(239, 68, 68, 0.08)' : undefined }}>
              <div className="stat-label">Money Leakage / Wasted Spend</div>
              <div className="stat-value" style={{ color: totalWastedSpend > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {formatCurrency(totalWastedSpend)}
              </div>
              <div className="stat-sub">{wastedPct}% of analyzed expenses</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Wasted Expense Count</div>
              <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
                {wastedExpenses.length} items
              </div>
              <div className="stat-sub">Flagged food deliveries, impulsive shopping, subs</div>
            </div>
          </div>

          {/* Upload & Parse Box */}
          <div className="card mb-20">
            <div className="section-header mb-12">
              <div>
                <div className="section-title">📤 Upload Bank / Credit Card Statement</div>
                <div className="section-subtitle">Auto-categorizes transactions and flags money leaks (Zomato, subscriptions, shopping)</div>
              </div>
              {expenses.length > 0 && (
                <button className="btn btn-danger btn-sm" onClick={clearAllExpenses}>
                  Clear History
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* File Upload */}
              <label className="upload-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'pointer', borderRadius: 'var(--radius-md)' }}>
                <UploadCloud size={32} color="var(--accent-indigo)" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 600 }}>Click to Upload Statement</div>
                <div className="text-sm text-muted">Supports .CSV, .XLSX, or .XLS from any Indian bank</div>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              {/* Raw Text Box */}
              <div>
                <div className="text-sm text-secondary mb-4">Or paste transaction SMS / statement text:</div>
                <textarea
                  className="form-input"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste lines like:&#10;Zomato Order ₹620&#10;Amazon Shopping 2499.00&#10;Uber Ride 380"
                  style={{ minHeight: 70 }}
                />
                <button className="btn btn-secondary btn-sm mt-8 w-full" onClick={handleParseRawText} disabled={!rawText.trim()}>
                  Parse &amp; Categorize Text
                </button>
              </div>
            </div>
          </div>

          {/* Transactions List with Waste Filter */}
          {expenses.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-14 flex-wrap gap-10">
                <div className="flex gap-8 items-center">
                  <span className="text-sm text-secondary">Filter:</span>
                  <button
                    className={`btn btn-sm ${statementFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatementFilter('ALL')}
                  >
                    All ({expenses.length})
                  </button>
                  <button
                    className={`btn btn-sm ${statementFilter === 'WASTE' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setStatementFilter('WASTE')}
                  >
                    ⚠️ Wasted Spend Only ({wastedExpenses.length})
                  </button>
                </div>

                <span className="text-sm text-muted">
                  Tip: Click the ⚠️ icon on any transaction to tag or untag money wasters.
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Waste Audit</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statementFilter === 'WASTE' ? wastedExpenses : expenses).map(e => (
                      <tr key={e.id}>
                        <td>{formatDate(e.date)}</td>
                        <td>
                          <span className="badge badge-purple">{e.category}</span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{e.description}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency(e.amount)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${e.isWaste ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => toggleWaste(e.id)}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            title="Toggle Wasted/Impulsive Spend"
                          >
                            {e.isWaste ? '⚠️ Wasted' : '✓ Normal'}
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => deleteExpense(e.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
