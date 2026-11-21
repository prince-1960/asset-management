import { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Edit2, Trash2, ChevronDown, ChevronUp,
  Shield, Briefcase, Calendar, AlertTriangle, Check,
  Phone, User, FileText, IndianRupee, TrendingUp,
  Clock, CheckCircle, XCircle, Search, Sparkles, Landmark,
  HeartPulse, CheckSquare, Square, ListTodo, Flag
} from 'lucide-react';
import {
  genId, formatDate, formatCurrency, daysUntil,
  currentMonthKey, monthLabel, getLast12Months,
  calculateCumulativeInvestment,
  calculatePolicyTimeline, addYearsToDate, getYearsDifference,
  calculateLastPaymentDate, getPayingTermFromDates,
  isNomineeNeedUpdate, isPhoneNeedUpdate, isPolicyDueInMonth,
  getPolicyEffectiveDueDate
} from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const INSURERS = [
  'LIC', 'Aditya Birla Capital', 'Max Life', 'HDFC Life', 'SBI Life',
  'ICICI Prudential', 'Bajaj Allianz', 'Tata AIA', 'Kotak Life', 'PNB MetLife', 'Other'
];
const POLICY_TYPES = ['Endowment', 'Term', 'Money Back', 'ULIP', 'Whole Life', 'Annuity', 'Child Plan', 'Pension', 'Other'];
const HEALTH_INSURERS = [
  'Star Health', 'Care Health', 'HDFC ERGO', 'Niva Bupa (Max Bupa)',
  'ICICI Lombard', 'Aditya Birla Health', 'Tata AIG', 'Bajaj Allianz General',
  'New India Assurance', 'Oriental Insurance', 'United India Insurance', 'Other'
];
const HEALTH_PLAN_TYPES = ['Family Floater', 'Individual Mediclaim', 'Senior Citizen', 'Critical Illness', 'Super Top-Up', 'Group Health', 'Other'];
const HEALTH_STATUSES = ['Active', 'Grace Period', 'Expired', 'Renewed'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time', 'Other'];
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
  payingTerm: '', policyTerm: '',
  alreadyPaid: '',
  otpPhone: '', agentName: '', agentPhone: '',
  status: 'Active', paymentHistory: {}, notes: '',
});

const blankHealthPolicy = () => ({
  id: genId(),
  policyName: '',
  policyNumber: '',
  insurer: 'Star Health',
  planType: 'Family Floater',
  holderName: '',
  coveredMembers: '',
  sumInsured: '',
  bonusCover: '',
  premiumAmount: '',
  premiumFrequency: 'Yearly',
  startDate: '',
  expiryDate: '',
  nextDueDate: '',
  tpaName: '',
  cashlessContact: '',
  roomRentLimit: '',
  copay: '',
  status: 'Active',
  paymentHistory: {},
  notes: '',
});

const blankPortfolio = () => ({
  id: genId(), type: 'SIP', name: '', platform: '',
  accountNumber: '', amount: '', frequency: 'Monthly',
  startDate: '', maturityDate: '', expectedReturn: '',
  currentValue: '', status: 'Active',
  paymentHistory: {}, notes: '',
});

const blankLoanGiven = () => ({
  id: genId(),
  borrowerName: '',
  contactPerson: '',
  phone: '',
  principalAmount: '',
  monthlyPayout: '',
  payoutDay: 15,
  interestRateText: '',
  startDate: '',
  endDate: '',
  status: 'Active',
  notes: '',
  payouts: {},
});

const blankPolicyTodo = () => ({
  id: genId(),
  policyId: '',
  policyKind: 'Life / Savings Policy',
  policyName: '',
  policyNumber: '',
  insurer: '',
  holderName: '',
  title: '',
  description: '',
  category: 'general',
  priority: 'High',
  dueDate: '',
  isCompleted: false,
  createdAt: new Date().toISOString()
});

const TODO_SUGGESTIONS = [
  'Update nominee details & relationship',
  'Update registered mobile number for OTP',
  'Submit KYC / PAN / Aadhaar at branch',
  'Link bank account for NACH / auto-debit',
  'Collect physical policy bond',
  'Request duplicate policy document',
  'Change address in policy records',
  'Submit survival benefit / maturity claim'
];

// ─── Policy Modal ─────────────────────────────────────────────────────────────
function PolicyModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || blankPolicy());

  const isStandardInsurer = (val) => INSURERS.slice(0, -1).includes(val);
  const isStandardType = (val) => POLICY_TYPES.slice(0, -1).includes(val);
  const isStandardFreq = (val) => FREQUENCIES.slice(0, -1).includes(val);

  const [selectedInsurer, setSelectedInsurer] = useState(() => {
    const v = initial?.insurer || 'LIC';
    return isStandardInsurer(v) ? v : 'Other';
  });
  const [customInsurer, setCustomInsurer] = useState(() => {
    const v = initial?.insurer || '';
    return isStandardInsurer(v) ? '' : (v === 'Other' ? '' : v);
  });

  const [selectedType, setSelectedType] = useState(() => {
    const v = initial?.type || 'Endowment';
    return isStandardType(v) ? v : 'Other';
  });
  const [customType, setCustomType] = useState(() => {
    const v = initial?.type || '';
    return isStandardType(v) ? '' : (v === 'Other' ? '' : v);
  });

  const [selectedFreq, setSelectedFreq] = useState(() => {
    const v = initial?.premiumFrequency || 'Yearly';
    return isStandardFreq(v) ? v : 'Other';
  });
  const [customFreq, setCustomFreq] = useState(() => {
    const v = initial?.premiumFrequency || '';
    return isStandardFreq(v) ? '' : (v === 'Other' ? '' : v);
  });

  useEffect(() => {
    const f = initial || blankPolicy();
    setForm(f);

    const vIns = f.insurer || 'LIC';
    setSelectedInsurer(isStandardInsurer(vIns) ? vIns : 'Other');
    setCustomInsurer(isStandardInsurer(vIns) ? '' : (vIns === 'Other' ? '' : vIns));

    const vType = f.type || 'Endowment';
    setSelectedType(isStandardType(vType) ? vType : 'Other');
    setCustomType(isStandardType(vType) ? '' : (vType === 'Other' ? '' : vType));

    const vFreq = f.premiumFrequency || 'Yearly';
    setSelectedFreq(isStandardFreq(vFreq) ? vFreq : 'Other');
    setCustomFreq(isStandardFreq(vFreq) ? '' : (vFreq === 'Other' ? '' : vFreq));
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.policyName?.trim() && !form.policyNumber?.trim()) return;

    const finalInsurer = selectedInsurer === 'Other' ? (customInsurer.trim() || 'Other') : selectedInsurer;
    const finalType = selectedType === 'Other' ? (customType.trim() || 'Other') : selectedType;
    const finalFreq = selectedFreq === 'Other' ? (customFreq.trim() || 'Other') : selectedFreq;

    const ndd = form.nextDueDate || getNextDueDate(form.startDate, finalFreq) || '';
    const derivedPayTerm = form.payingTerm || (form.startDate && form.paymentEndDate ? getPayingTermFromDates(form.startDate, form.paymentEndDate, finalFreq) : '');
    const derivedPolicyTerm = form.policyTerm || (form.startDate && form.maturityDate ? getYearsDifference(form.startDate, form.maturityDate) : '');

    onSave({
      ...form,
      insurer: finalInsurer,
      type: finalType,
      premiumFrequency: finalFreq,
      nextDueDate: ndd,
      payingTerm: derivedPayTerm,
      policyTerm: derivedPolicyTerm,
      alreadyPaid: form.alreadyPaid !== '' && !isNaN(Number(form.alreadyPaid)) ? Number(form.alreadyPaid) : '',
    });
  };

  const currentFreq = selectedFreq === 'Other' ? (customFreq.trim() || 'Yearly') : selectedFreq;

  const handleStartDateChange = (val) => {
    setForm(f => {
      const next = { ...f, startDate: val };
      if (val && f.payingTerm) {
        next.paymentEndDate = calculateLastPaymentDate(val, f.payingTerm, currentFreq);
      }
      if (val && f.policyTerm) {
        next.maturityDate = addYearsToDate(val, f.policyTerm);
      }
      return next;
    });
  };

  const handlePayingTermChange = (years) => {
    setForm(f => {
      const next = { ...f, payingTerm: years };
      if (f.startDate && years && !isNaN(years)) {
        next.paymentEndDate = calculateLastPaymentDate(f.startDate, years, currentFreq);
      }
      return next;
    });
  };

  const handlePaymentEndDateChange = (date) => {
    setForm(f => {
      const next = { ...f, paymentEndDate: date };
      if (f.startDate && date) {
        const derived = getPayingTermFromDates(f.startDate, date, currentFreq);
        if (derived) next.payingTerm = derived;
      }
      return next;
    });
  };

  const handlePolicyTermChange = (years) => {
    setForm(f => {
      const next = { ...f, policyTerm: years };
      if (f.startDate && years && !isNaN(years)) {
        next.maturityDate = addYearsToDate(f.startDate, years);
      }
      return next;
    });
  };

  const handleMaturityDateChange = (date) => {
    setForm(f => {
      const next = { ...f, maturityDate: date };
      if (f.startDate && date) {
        const diff = getYearsDifference(f.startDate, date);
        if (diff) next.policyTerm = diff;
      }
      return next;
    });
  };

  const autoCalculated = calculateCumulativeInvestment({
    startDate: form.startDate,
    amount: form.premiumAmount,
    frequency: selectedFreq === 'Other' ? customFreq : selectedFreq,
    paymentEndDate: form.paymentEndDate,
  });

  const timeline = calculatePolicyTimeline({
    startDate: form.startDate,
    payingTerm: form.payingTerm,
    policyTerm: form.policyTerm,
    paymentEndDate: form.paymentEndDate,
    maturityDate: form.maturityDate,
    amount: form.premiumAmount,
    frequency: selectedFreq === 'Other' ? customFreq : selectedFreq,
    alreadyPaid: form.alreadyPaid || autoCalculated.totalPaid
  });

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
              <select
                className="form-input"
                value={selectedInsurer}
                onChange={e => setSelectedInsurer(e.target.value)}
              >
                {INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              {selectedInsurer === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customInsurer}
                  onChange={e => setCustomInsurer(e.target.value)}
                  placeholder="Type company / insurer name..."
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Type, Number, Status */}
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Policy Type</label>
              <select
                className="form-input"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {selectedType === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="Type custom policy type..."
                  autoFocus
                />
              )}
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
              <select
                className="form-input"
                value={selectedFreq}
                onChange={e => setSelectedFreq(e.target.value)}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {selectedFreq === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customFreq}
                  onChange={e => setCustomFreq(e.target.value)}
                  placeholder="Type custom frequency (e.g. Bi-monthly, Weekly)..."
                  autoFocus
                />
              )}
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

          {/* Policy Terms & Key Milestones */}
          <div style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="var(--accent-blue)" /> Policy Terms &amp; Timeline (Paying Term vs Policy Term)
            </div>

            <div className="form-row form-row-3" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Policy Start Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Paying Term (PPT in Yrs)
                </label>
                <input
                  className="form-input"
                  type="number"
                  value={form.payingTerm || ''}
                  onChange={e => handlePayingTermChange(e.target.value)}
                  placeholder="e.g. 10 (years to pay)"
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Pay till: <strong>{form.paymentEndDate ? formatDate(form.paymentEndDate) : '—'}</strong>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Policy Term (PT in Yrs)
                </label>
                <input
                  className="form-input"
                  type="number"
                  value={form.policyTerm || ''}
                  onChange={e => handlePolicyTermChange(e.target.value)}
                  placeholder="e.g. 20 (years till maturity)"
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Maturity: <strong>{form.maturityDate ? formatDate(form.maturityDate) : '—'}</strong>
                </div>
              </div>
            </div>

            <div className="form-row form-row-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Premium Pay Till Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.paymentEndDate}
                  onChange={e => handlePaymentEndDateChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Maturity Date (Expect Money)</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.maturityDate}
                  onChange={e => handleMaturityDateChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Next Due Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.nextDueDate}
                  onChange={e => set('nextDueDate', e.target.value)}
                />
              </div>
            </div>

            {/* Live Timeline Calculation Callout */}
            {(timeline.totalCommitment || timeline.yearsUntilMaturity !== null) && (
              <div style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 5
              }}>
                {timeline.payingTerm && (
                  <div>
                    ⏳ <strong>Paying Term:</strong> Pay for <strong>{timeline.payingTerm} years</strong>
                    {timeline.totalInstallments ? ` (${timeline.totalInstallments} installments · Total ${formatCurrency(timeline.totalCommitment)})` : ''}
                    {timeline.isPremiumCompleted ? (
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600, marginLeft: 6 }}>
                        ✓ Premiums Completed!
                      </span>
                    ) : (
                      <span style={{ color: 'var(--accent-amber)', marginLeft: 6 }}>
                        (Pay till {formatDate(timeline.calculatedPayEndDate)})
                      </span>
                    )}
                  </div>
                )}
                {timeline.policyTerm && (
                  <div>
                    🎯 <strong>Policy Term &amp; Maturity:</strong> Expect money on <strong>{formatDate(timeline.calculatedMaturityDate)}</strong>
                    {timeline.yearsUntilMaturity !== null && (
                      <span style={{ color: 'var(--accent-cyan)', marginLeft: 6 }}>
                        ({timeline.yearsUntilMaturity > 0 ? `${timeline.yearsUntilMaturity} years from now` : 'Matured'})
                      </span>
                    )}
                    {form.maturityAmount && (
                      <span style={{ fontWeight: 700, color: 'var(--accent-green)', marginLeft: 6 }}>
                        · Expected Payout: {formatCurrency(form.maturityAmount)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-row form-row-2">
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

          {/* Cumulative Total Paid Tracking */}
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.22)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IndianRupee size={15} /> Total Premiums Paid Till Date
              </div>
              {autoCalculated.totalPaid > 0 && (
                <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', fontWeight: 600, fontSize: 11 }}>
                  ⚡ Auto-Calculated: {formatCurrency(autoCalculated.totalPaid)} ({autoCalculated.label})
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Already Paid (₹)</span>
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                  {form.alreadyPaid ? 'Custom total entered' : `Defaulting to auto-calculated: ${formatCurrency(autoCalculated.totalPaid || 0)}`}
                </span>
              </label>
              <input
                className="form-input"
                type="number"
                value={form.alreadyPaid || ''}
                onChange={e => set('alreadyPaid', e.target.value)}
                placeholder={autoCalculated.totalPaid > 0 ? `Auto: ${autoCalculated.totalPaid} (leave blank to use auto, or type override)` : 'e.g. 400000'}
              />
              <div className="text-sm text-muted" style={{ marginTop: 4, fontSize: 11 }}>
                Automatically calculated based on Start Date &amp; Frequency (e.g. ₹50k/year since 2019 = {autoCalculated.totalPaid ? formatCurrency(autoCalculated.totalPaid) : '₹0'}). Enter a specific amount only if you want to override the calculation.
              </div>
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

// ─── Health Insurance Modal ──────────────────────────────────────────────────
function HealthModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || blankHealthPolicy());

  const isStandardInsurer = (val) => HEALTH_INSURERS.slice(0, -1).includes(val);
  const isStandardPlanType = (val) => HEALTH_PLAN_TYPES.slice(0, -1).includes(val);
  const isStandardFreq = (val) => FREQUENCIES.slice(0, -1).includes(val);

  const [selectedInsurer, setSelectedInsurer] = useState(() => {
    const v = initial?.insurer || 'Star Health';
    return isStandardInsurer(v) ? v : 'Other';
  });
  const [customInsurer, setCustomInsurer] = useState(() => {
    const v = initial?.insurer || '';
    return isStandardInsurer(v) ? '' : (v === 'Other' ? '' : v);
  });

  const [selectedPlanType, setSelectedPlanType] = useState(() => {
    const v = initial?.planType || 'Family Floater';
    return isStandardPlanType(v) ? v : 'Other';
  });
  const [customPlanType, setCustomPlanType] = useState(() => {
    const v = initial?.planType || '';
    return isStandardPlanType(v) ? '' : (v === 'Other' ? '' : v);
  });

  const [selectedFreq, setSelectedFreq] = useState(() => {
    const v = initial?.premiumFrequency || 'Yearly';
    return isStandardFreq(v) ? v : 'Other';
  });
  const [customFreq, setCustomFreq] = useState(() => {
    const v = initial?.premiumFrequency || '';
    return isStandardFreq(v) ? '' : (v === 'Other' ? '' : v);
  });

  useEffect(() => {
    const f = initial || blankHealthPolicy();
    setForm(f);
    const vIns = f.insurer || 'Star Health';
    setSelectedInsurer(isStandardInsurer(vIns) ? vIns : 'Other');
    setCustomInsurer(isStandardInsurer(vIns) ? '' : (vIns === 'Other' ? '' : vIns));

    const vPlan = f.planType || 'Family Floater';
    setSelectedPlanType(isStandardPlanType(vPlan) ? vPlan : 'Other');
    setCustomPlanType(isStandardPlanType(vPlan) ? '' : (vPlan === 'Other' ? '' : vPlan));

    const vFreq = f.premiumFrequency || 'Yearly';
    setSelectedFreq(isStandardFreq(vFreq) ? vFreq : 'Other');
    setCustomFreq(isStandardFreq(vFreq) ? '' : (vFreq === 'Other' ? '' : vFreq));
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.policyName?.trim() && !form.policyNumber?.trim()) return;
    const finalInsurer = selectedInsurer === 'Other' ? (customInsurer.trim() || 'Other') : selectedInsurer;
    const finalPlanType = selectedPlanType === 'Other' ? (customPlanType.trim() || 'Other') : selectedPlanType;
    const finalFreq = selectedFreq === 'Other' ? (customFreq.trim() || 'Other') : selectedFreq;
    const ndd = form.nextDueDate || form.expiryDate || '';

    onSave({
      ...form,
      insurer: finalInsurer,
      planType: finalPlanType,
      premiumFrequency: finalFreq,
      nextDueDate: ndd,
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeartPulse size={18} color="var(--accent-green)" />
            {initial?.id ? 'Edit Health Insurance Policy' : 'Add Health Insurance (Mediclaim)'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Policy Name & Insurer */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Plan / Policy Name *</label>
              <input
                className="form-input"
                value={form.policyName}
                onChange={e => set('policyName', e.target.value)}
                placeholder="e.g. Care Supreme, Star Family Optima, Optima Secure"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Health Insurer Company</label>
              <select
                className="form-input"
                value={selectedInsurer}
                onChange={e => setSelectedInsurer(e.target.value)}
              >
                {HEALTH_INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              {selectedInsurer === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customInsurer}
                  onChange={e => setCustomInsurer(e.target.value)}
                  placeholder="Type health insurer name..."
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Policy Number & Plan Type */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Policy Number</label>
              <input
                className="form-input"
                value={form.policyNumber}
                onChange={e => set('policyNumber', e.target.value)}
                placeholder="e.g. 123456789012"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Plan Type</label>
              <select
                className="form-input"
                value={selectedPlanType}
                onChange={e => setSelectedPlanType(e.target.value)}
              >
                {HEALTH_PLAN_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {selectedPlanType === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customPlanType}
                  onChange={e => setCustomPlanType(e.target.value)}
                  placeholder="Type custom plan type..."
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Covered Members & Proposer */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Covered Members (Family Floater / Insured)</label>
              <input
                className="form-input"
                value={form.coveredMembers}
                onChange={e => set('coveredMembers', e.target.value)}
                placeholder="e.g. Self, Spouse, 2 Children"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Proposer / Policy Holder</label>
              <input
                className="form-input"
                value={form.holderName}
                onChange={e => set('holderName', e.target.value)}
                placeholder="e.g. Self, Father, Spouse"
              />
            </div>
          </div>

          {/* Sum Insured & Bonus Cover */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Hospitalization Sum Insured (₹) *</label>
              <input
                className="form-input"
                type="number"
                value={form.sumInsured}
                onChange={e => set('sumInsured', e.target.value)}
                placeholder="e.g. 1000000 (10 Lakhs)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cumulative Bonus / Super NCB (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.bonusCover}
                onChange={e => set('bonusCover', e.target.value)}
                placeholder="e.g. 500000 (additional bonus)"
              />
            </div>
          </div>

          {/* Premium & Frequency */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Annual / Renewal Premium (₹) *</label>
              <input
                className="form-input"
                type="number"
                value={form.premiumAmount}
                onChange={e => set('premiumAmount', e.target.value)}
                placeholder="e.g. 18500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Premium Payment Frequency</label>
              <select
                className="form-input"
                value={selectedFreq}
                onChange={e => setSelectedFreq(e.target.value)}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {selectedFreq === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customFreq}
                  onChange={e => setCustomFreq(e.target.value)}
                  placeholder="Type frequency..."
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Dates & Status */}
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Inception / Start Date</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Policy Expiry / Renewal Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.expiryDate}
                onChange={e => {
                  set('expiryDate', e.target.value);
                  if (!form.nextDueDate) set('nextDueDate', e.target.value);
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Policy Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Hospitalization Limits & Emergency Contacts */}
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Room Rent Limit</label>
              <input
                className="form-input"
                value={form.roomRentLimit}
                onChange={e => set('roomRentLimit', e.target.value)}
                placeholder="e.g. Single Private / No Limit"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Copay % / Deductible</label>
              <input
                className="form-input"
                value={form.copay}
                onChange={e => set('copay', e.target.value)}
                placeholder="e.g. 0% (No copay) / ₹25k deductible"
              />
            </div>
            <div className="form-group">
              <label className="form-label">TPA / Cashless Helpline</label>
              <input
                className="form-input"
                value={form.cashlessContact}
                onChange={e => set('cashlessContact', e.target.value)}
                placeholder="e.g. 1800-102-4488 / Medi Assist"
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
              placeholder="e.g. Pre-existing disease waiting period, cashless card number, portal login info..."
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!form.policyName?.trim() && !form.policyNumber?.trim()}
          >
            <Check size={14} /> Save Health Policy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Modal ──────────────────────────────────────────────────────────
function PortfolioModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || blankPortfolio());

  const isStandardType = (val) => PORTFOLIO_TYPES.slice(0, -1).includes(val);
  const isStandardPlatform = (val) => PLATFORMS.slice(0, -1).includes(val);
  const isStandardFreq = (val) => FREQUENCIES.slice(0, -1).includes(val);

  const [selectedType, setSelectedType] = useState(() => {
    const v = initial?.type || 'SIP';
    return isStandardType(v) ? v : 'Other';
  });
  const [customType, setCustomType] = useState(() => {
    const v = initial?.type || '';
    return isStandardType(v) ? '' : (v === 'Other' ? '' : v);
  });

  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    const v = initial?.platform || '';
    if (!v) return '';
    return isStandardPlatform(v) ? v : 'Other';
  });
  const [customPlatform, setCustomPlatform] = useState(() => {
    const v = initial?.platform || '';
    return isStandardPlatform(v) ? '' : (v === 'Other' ? '' : v);
  });

  const [selectedFreq, setSelectedFreq] = useState(() => {
    const v = initial?.frequency || 'Monthly';
    return isStandardFreq(v) ? v : 'Other';
  });
  const [customFreq, setCustomFreq] = useState(() => {
    const v = initial?.frequency || '';
    return isStandardFreq(v) ? '' : (v === 'Other' ? '' : v);
  });

  useEffect(() => {
    const f = initial || blankPortfolio();
    setForm(f);

    const vType = f.type || 'SIP';
    setSelectedType(isStandardType(vType) ? vType : 'Other');
    setCustomType(isStandardType(vType) ? '' : (vType === 'Other' ? '' : vType));

    const vPlat = f.platform || '';
    setSelectedPlatform(!vPlat ? '' : (isStandardPlatform(vPlat) ? vPlat : 'Other'));
    setCustomPlatform(isStandardPlatform(vPlat) ? '' : (vPlat === 'Other' ? '' : vPlat));

    const vFreq = f.frequency || 'Monthly';
    setSelectedFreq(isStandardFreq(vFreq) ? vFreq : 'Other');
    setCustomFreq(isStandardFreq(vFreq) ? '' : (vFreq === 'Other' ? '' : vFreq));
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim() && !selectedType) return;
    const finalType = selectedType === 'Other' ? (customType.trim() || 'Other') : selectedType;
    const finalPlatform = selectedPlatform === 'Other' ? (customPlatform.trim() || 'Other') : selectedPlatform;
    const finalFreq = selectedFreq === 'Other' ? (customFreq.trim() || 'Other') : selectedFreq;

    onSave({
      ...form,
      type: finalType,
      platform: finalPlatform,
      frequency: finalFreq
    });
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
              <select
                className="form-input"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                {PORTFOLIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {selectedType === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="Type investment type (e.g. Crypto, Real Estate, P2P)..."
                  autoFocus
                />
              )}
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
              <select
                className="form-input"
                value={selectedPlatform}
                onChange={e => setSelectedPlatform(e.target.value)}
              >
                <option value="">— Select Platform / Bank —</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {selectedPlatform === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customPlatform}
                  onChange={e => setCustomPlatform(e.target.value)}
                  placeholder="Type bank or platform name..."
                  autoFocus
                />
              )}
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
              <select
                className="form-input"
                value={selectedFreq}
                onChange={e => setSelectedFreq(e.target.value)}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {selectedFreq === 'Other' && (
                <input
                  className="form-input"
                  style={{ marginTop: 6 }}
                  value={customFreq}
                  onChange={e => setCustomFreq(e.target.value)}
                  placeholder="Type frequency (e.g. Quarterly, One-Time)..."
                  autoFocus
                />
              )}
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
                <option value="Active">Active</option>
                <option value="Matured">Matured</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Paused">Paused</option>
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
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name?.trim()}>
            <Check size={14} /> Save Investment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loan Given (Lending) Modal ───────────────────────────────────────────────
function LoanGivenModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || blankLoanGiven());

  useEffect(() => {
    setForm(initial || blankLoanGiven());
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.borrowerName?.trim() || !form.principalAmount) return;
    onSave({ ...form });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={18} color="var(--accent-cyan)" />
            {initial?.id ? 'Edit Loan Given' : 'Add Loan Given / Lending'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Borrower / Organization Name *</label>
              <input
                className="form-input"
                value={form.borrowerName}
                onChange={e => set('borrowerName', e.target.value)}
                placeholder="e.g. ABC Organization, Tech Solutions, Friend"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Principal Amount Lent (₹) *</label>
              <input
                className="form-input"
                type="number"
                value={form.principalAmount}
                onChange={e => set('principalAmount', e.target.value)}
                placeholder="e.g. 500000"
              />
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Monthly Payout / Return (₹) *</label>
              <input
                className="form-input"
                type="number"
                value={form.monthlyPayout}
                onChange={e => set('monthlyPayout', e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payout Day of Month</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={31}
                value={form.payoutDay}
                onChange={e => set('payoutDay', e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Interest Rate / Terms</label>
              <input
                className="form-input"
                value={form.interestRateText}
                onChange={e => set('interestRateText', e.target.value)}
                placeholder="e.g. 3% / month, 36% p.a."
              />
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Date Lent (Start Date)</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tenure / Repayment Due Date</label>
              <input
                className="form-input"
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                placeholder="Leave blank if ongoing"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Active">Active (Ongoing Payouts)</option>
                <option value="Closed">Closed (Principal Repaid)</option>
                <option value="Defaulted">Defaulted / Delayed</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input
                className="form-input"
                value={form.contactPerson}
                onChange={e => set('contactPerson', e.target.value)}
                placeholder="e.g. Director / Manager Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Agreement, Cheques &amp; Security Notes</label>
            <textarea
              className="form-input"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Post-dated cheques received for security, promissory note signed..."
              style={{ minHeight: 65 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!form.borrowerName?.trim() || !form.principalAmount}
          >
            <Check size={14} /> Save Loan Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Policy Action Item / To-Do Modal ─────────────────────────────────────────
function TodoModal({ initial, prefilledPolicy, policies = [], healthInsurance = [], onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (initial) return { ...initial };
    const base = blankPolicyTodo();
    if (prefilledPolicy) {
      const isHealth = prefilledPolicy.planType !== undefined || prefilledPolicy.sumInsured !== undefined;
      return {
        ...base,
        policyId: prefilledPolicy.id || '',
        policyKind: isHealth ? 'Health Insurance' : 'Life / Savings Policy',
        policyName: prefilledPolicy.policyName || '',
        policyNumber: prefilledPolicy.policyNumber || '',
        insurer: prefilledPolicy.insurer || '',
        holderName: prefilledPolicy.holderName || prefilledPolicy.coveredMembers || '',
      };
    }
    return base;
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePolicySelect = (selectedId) => {
    if (!selectedId) {
      setForm(f => ({
        ...f,
        policyId: '',
        policyKind: 'General',
        policyName: '',
        policyNumber: '',
        insurer: '',
        holderName: ''
      }));
      return;
    }
    const life = policies.find(p => p.id === selectedId);
    if (life) {
      setForm(f => ({
        ...f,
        policyId: life.id,
        policyKind: 'Life / Savings Policy',
        policyName: life.policyName || 'Unnamed Policy',
        policyNumber: life.policyNumber || '',
        insurer: life.insurer || '',
        holderName: life.holderName || ''
      }));
      return;
    }
    const hl = healthInsurance.find(h => h.id === selectedId);
    if (hl) {
      setForm(f => ({
        ...f,
        policyId: hl.id,
        policyKind: 'Health Insurance',
        policyName: hl.policyName || 'Health Policy',
        policyNumber: hl.policyNumber || '',
        insurer: hl.insurer || '',
        holderName: hl.holderName || hl.coveredMembers || ''
      }));
    }
  };

  const handleSave = () => {
    if (!form.title?.trim()) return;
    onSave({ ...form });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="var(--accent-amber)" />
            {initial?.id ? 'Edit Action Item / To-Do' : 'Add Policy Action Item / To-Do'}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Linked Policy Selector */}
          <div className="form-group">
            <label className="form-label">Link to Insurance Policy (Optional)</label>
            <select
              className="form-input"
              value={form.policyId}
              onChange={e => handlePolicySelect(e.target.value)}
            >
              <option value="">-- General / No Specific Policy --</option>
              {policies.length > 0 && (
                <optgroup label="Life &amp; Savings Policies">
                  {policies.map(p => (
                    <option key={p.id} value={p.id}>
                      [Life] {p.policyName || 'Policy'} {p.policyNumber ? `(#${p.policyNumber})` : ''} - {p.insurer}
                    </option>
                  ))}
                </optgroup>
              )}
              {healthInsurance.length > 0 && (
                <optgroup label="Health Insurance Policies">
                  {healthInsurance.map(h => (
                    <option key={h.id} value={h.id}>
                      [Health] {h.policyName || 'Health'} {h.policyNumber ? `(#${h.policyNumber})` : ''} - {h.insurer}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {form.policyName && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent-blue)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>✓ Linked: <strong>{form.policyName}</strong></span>
                {form.policyNumber && <span style={{ fontFamily: 'monospace' }}>#{form.policyNumber}</span>}
                {form.insurer && <span>· {form.insurer}</span>}
              </div>
            )}
          </div>

          {/* Action Title with Suggestions */}
          <div className="form-group">
            <label className="form-label">What needs to be done? (Action Title) *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Update nominee name to John Doe, Change registered mobile..."
              autoFocus
            />
            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {TODO_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => set('title', sug)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    padding: '3px 9px',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="nominee">Nominee Update</option>
                <option value="phone">Mobile / Contact Update</option>
                <option value="kyc">KYC &amp; Address Proof</option>
                <option value="bank">Bank / ECS Mandate</option>
                <option value="service">Claim &amp; Servicing</option>
                <option value="general">General Task</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="High">🔴 High Priority</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🟢 Low Priority</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target / Due Date (Optional)</label>
            <input
              className="form-input"
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">What needs to be done / Details &amp; Notes</label>
            <textarea
              className="form-input"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Visit nearest branch with original policy bond, cancelled cheque, and Aadhaar card copy to submit change form..."
              style={{ minHeight: 70 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.title?.trim()}>
            <Check size={14} /> Save Action Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Policy Card ──────────────────────────────────────────────────────────────
function PolicyCard({ policy, onEdit, onDelete, onTogglePayment, onAddTodo, policyTodos = [] }) {
  const [expanded, setExpanded] = useState(false);
  const months12 = getLast12Months();
  const days = policy.nextDueDate ? daysUntil(policy.nextDueDate) : null;
  const statusBadge = getStatusBadgeClass(policy.status);

  const cumulative = calculateCumulativeInvestment({
    startDate: policy.startDate,
    amount: policy.premiumAmount,
    frequency: policy.premiumFrequency,
    paymentEndDate: policy.paymentEndDate,
    paymentHistory: policy.paymentHistory,
    alreadyPaid: policy.alreadyPaid
  });

  const timeline = calculatePolicyTimeline({
    startDate: policy.startDate,
    payingTerm: policy.payingTerm,
    policyTerm: policy.policyTerm,
    paymentEndDate: policy.paymentEndDate,
    maturityDate: policy.maturityDate,
    amount: policy.premiumAmount,
    frequency: policy.premiumFrequency,
    alreadyPaid: cumulative.totalPaid,
  });

  const nomineeBad = isNomineeNeedUpdate(policy.nominee);
  const phoneBad = isPhoneNeedUpdate(policy.otpPhone);
  const policyPendingTodos = policyTodos.filter(t => t.policyId === policy.id && !t.isCompleted);

  return (
    <div className="vehicle-card" style={{ marginBottom: 12, border: (nomineeBad || phoneBad) ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}>
      {/* Header */}
      <div className="vehicle-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="vehicle-icon" style={{ background: (nomineeBad || phoneBad) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99,102,241,0.15)' }}>
          {nomineeBad || phoneBad ? <AlertTriangle size={22} color="var(--accent-red)" /> : <Shield size={22} color="var(--accent-indigo)" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{policy.policyName || 'Unnamed Policy'}</span>
            {policy.policyNumber && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-blue)',
                  letterSpacing: '0.02em'
                }}
                title={`Policy #: ${policy.policyNumber}`}
              >
                #{policy.policyNumber}
              </span>
            )}
            <span className={`badge ${statusBadge}`}>{policy.status}</span>
            {policy.type && <span className="badge badge-muted">{policy.type}</span>}

            {nomineeBad && (
              <span className="badge badge-red" style={{ fontWeight: 700, padding: '3px 8px', fontSize: 11 }} title="Nominee needs to be updated">
                ⚠️ Nominee: Need Update
              </span>
            )}
            {phoneBad && (
              <span className="badge badge-red" style={{ fontWeight: 700, padding: '3px 8px', fontSize: 11 }} title="Mobile number 8960009911 needs to be updated">
                ⚠️ Update Mobile (8960009911)
              </span>
            )}
            {policyPendingTodos.length > 0 && (
              <span
                className="badge badge-amber"
                style={{ fontWeight: 600, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                title={`${policyPendingTodos.length} action item(s) pending for this policy`}
                onClick={(e) => { e.stopPropagation(); onAddTodo?.(policy); }}
              >
                📋 {policyPendingTodos.length} Action Item{policyPendingTodos.length > 1 ? 's' : ''}
              </span>
            )}

            <span
              className="badge"
              style={{
                background: 'rgba(99,102,241,0.18)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.35)',
                fontWeight: 700,
                fontSize: 12,
                padding: '3px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title={`Total premiums paid till date: ${formatCurrency(cumulative.totalPaid)} (${cumulative.label})`}
            >
              💰 Total Paid: <strong>{formatCurrency(cumulative.totalPaid)}</strong>
              <span style={{ fontWeight: 500, opacity: 0.85, fontSize: 11 }}>
                ({cumulative.count} {policy.premiumFrequency === 'Yearly' ? (cumulative.count === 1 ? 'yr' : 'yrs') : 'inst.'})
              </span>
            </span>

            {timeline.isPremiumCompleted ? (
              <span className="badge badge-green" style={{ fontSize: 11, padding: '3px 8px' }}>
                ✓ Premium Completed
              </span>
            ) : timeline.payingTerm ? (
              <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)', fontSize: 11, padding: '3px 8px', fontWeight: 600 }}>
                ⏳ PPT: {timeline.payingTerm} yrs (Pay till {timeline.calculatedPayEndDate ? formatDate(timeline.calculatedPayEndDate) : '—'})
              </span>
            ) : null}

            {timeline.policyTerm ? (
              <span className="badge" style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', fontSize: 11, padding: '3px 8px', fontWeight: 600 }}>
                🎯 Term: {timeline.policyTerm} yrs {timeline.calculatedMaturityDate ? `(Payout ${formatDate(timeline.calculatedMaturityDate)})` : ''}
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>🏢 <strong>{policy.insurer}</strong></span>
            {policy.holderName && <span>👤 Holder: <strong>{policy.holderName}</strong></span>}
            {policy.premiumAmount && (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                💵 Premium: {formatCurrency(policy.premiumAmount)} / {policy.premiumFrequency}
              </span>
            )}
            {policy.startDate && (
              <span>📅 Since: <strong>{formatDate(policy.startDate)}</strong></span>
            )}
            {timeline.calculatedMaturityDate && (
              <span style={{ color: 'var(--accent-cyan)' }}>
                🎯 Expect Money: <strong>{formatDate(timeline.calculatedMaturityDate)}</strong> {timeline.yearsUntilMaturity !== null ? `(${timeline.yearsUntilMaturity > 0 ? `${timeline.yearsUntilMaturity} yrs` : 'Matured'})` : ''}
              </span>
            )}
            {policy.sumAssured && (
              <span>🛡️ SA: {formatCurrency(policy.sumAssured)}</span>
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
            className="btn btn-secondary btn-sm"
            onClick={() => onAddTodo?.(policy)}
            title="Add Action Item / To-Do for this policy"
            style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={12} /> To-Do
          </button>
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
          <div className="grid-cols-4 gap-12 mb-16" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div>
              <div className="text-sm text-muted">Policy Number</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{policy.policyNumber || '—'}</div>
              <div className="text-sm text-secondary">
                Nominee: {nomineeBad ? <strong style={{ color: 'var(--accent-red)' }}>⚠️ {policy.nominee} (Needs update!)</strong> : (policy.nominee || '—')}
              </div>
            </div>
            <div style={{ borderLeft: '2px solid rgba(99,102,241,0.4)', paddingLeft: 10 }}>
              <div className="text-sm text-muted">Total Paid Till Date</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-indigo)' }}>
                {formatCurrency(cumulative.totalPaid)}
              </div>
              <div className="text-sm text-secondary">
                {cumulative.label} {cumulative.isManual ? '(custom record)' : (policy.startDate ? `(from ${formatDate(policy.startDate)})` : '')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">When to Expect Money (Maturity)</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-cyan)' }}>
                {policy.maturityAmount ? formatCurrency(policy.maturityAmount) : '—'}
              </div>
              <div className="text-sm text-secondary">
                {timeline.calculatedMaturityDate ? formatDate(timeline.calculatedMaturityDate) : '—'}
                {timeline.yearsUntilMaturity !== null ? ` (${timeline.yearsUntilMaturity > 0 ? `${timeline.yearsUntilMaturity} yrs away` : 'Matured'})` : ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Premium Paying Schedule</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: timeline.isPremiumCompleted ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {timeline.isPremiumCompleted ? '✓ All Premiums Completed' : `Pay till: ${timeline.calculatedPayEndDate ? formatDate(timeline.calculatedPayEndDate) : '—'}`}
              </div>
              <div className="text-sm text-secondary">
                {timeline.payingTerm ? `PPT: ${timeline.payingTerm} yrs` : ''}
                {timeline.remainingCommitment !== null && !timeline.isPremiumCompleted ? ` · ${formatCurrency(timeline.remainingCommitment)} left` : ''}
              </div>
            </div>
          </div>

          {/* Policy Lifecycle & Cashflow Timeline */}
          <div style={{
            background: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '14px 16px',
            marginBottom: 14
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Policy Terms &amp; Cashflow Timeline (Paying Term vs Policy Term)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Stage 1: Premium Paying Term */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-indigo)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>1. PREMIUM PAYING TERM (PPT)</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginTop: 2 }}>
                  {timeline.payingTerm ? `${timeline.payingTerm} Years` : 'Ongoing'}
                  {timeline.isPremiumCompleted ? <span style={{ color: 'var(--accent-green)', marginLeft: 6, fontSize: 12 }}>✓ Completed</span> : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {timeline.isPremiumCompleted
                    ? `Completed on ${formatDate(timeline.calculatedPayEndDate)} (${cumulative.count} installments paid)`
                    : `Pay till ${timeline.calculatedPayEndDate ? formatDate(timeline.calculatedPayEndDate) : '—'}${timeline.remainingCommitment !== null ? ` · ${formatCurrency(timeline.remainingCommitment)} remaining` : ''}`}
                </div>
              </div>

              {/* Stage 2: Accumulation & Compounding */}
              {timeline.policyTerm && timeline.payingTerm && Number(timeline.policyTerm) > Number(timeline.payingTerm) && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-amber)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>2. ACCUMULATION PERIOD</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-amber)', marginTop: 2 }}>
                    {Number(timeline.policyTerm) - Number(timeline.payingTerm)} Years Growth
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    Zero premiums payable from {timeline.calculatedPayEndDate ? formatDate(timeline.calculatedPayEndDate) : 'end of PPT'} until maturity
                  </div>
                </div>
              )}

              {/* Stage 3: Policy Maturity & Payout */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-cyan)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>3. EXPECT MONEY (MATURITY)</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-cyan)', marginTop: 2 }}>
                  {policy.maturityAmount ? formatCurrency(policy.maturityAmount) : 'Maturity Payout'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {timeline.calculatedMaturityDate ? `Expect payout on ${formatDate(timeline.calculatedMaturityDate)}` : 'Maturity date not set'}
                  {timeline.yearsUntilMaturity !== null ? ` (${timeline.yearsUntilMaturity > 0 ? `${timeline.yearsUntilMaturity} yrs from now` : 'Matured'})` : ''}
                </div>
              </div>
            </div>
          </div>

          {cumulative.totalPaid > 0 && Number(policy.maturityAmount) > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: 13
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Capital Deposited: </span>
                <strong style={{ color: 'var(--accent-indigo)' }}>{formatCurrency(cumulative.totalPaid)}</strong>
                <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>Expected Return at Maturity: </span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{formatCurrency(policy.maturityAmount)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Net Gain: </span>
                <strong style={{ color: Number(policy.maturityAmount) >= cumulative.totalPaid ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {Number(policy.maturityAmount) >= cumulative.totalPaid ? '+' : ''}
                  {formatCurrency(Number(policy.maturityAmount) - cumulative.totalPaid)}
                </strong>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            {policy.otpPhone && (
              <div>
                📱 <strong>OTP Phone:</strong>{' '}
                {phoneBad ? (
                  <strong style={{ color: 'var(--accent-red)' }}>⚠️ {policy.otpPhone} (Needs update!)</strong>
                ) : (
                  <span style={{ color: 'var(--text-primary)' }}>{policy.otpPhone}</span>
                )}
              </div>
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

// ─── Health Insurance Card ───────────────────────────────────────────────────
function HealthCard({ policy, onEdit, onDelete, onTogglePayment, onAddTodo, policyTodos = [] }) {
  const [expanded, setExpanded] = useState(false);
  const months12 = getLast12Months();
  const renewalDate = policy.expiryDate || policy.nextDueDate;
  const days = renewalDate ? daysUntil(renewalDate) : null;
  const statusBadge = policy.status === 'Active' ? 'badge-green' : policy.status === 'Grace Period' ? 'badge-amber' : 'badge-red';

  const sumInsured = Number(policy.sumInsured || policy.sumAssured || 0);
  const bonusCover = Number(policy.bonusCover || 0);
  const totalCoverage = sumInsured + bonusCover;
  const nomineeBad = isNomineeNeedUpdate(policy.nominee);
  const phoneBad = isPhoneNeedUpdate(policy.cashlessContact || policy.notes || policy.otpPhone);
  const policyPendingTodos = policyTodos.filter(t => t.policyId === policy.id && !t.isCompleted);

  return (
    <div className="vehicle-card" style={{ marginBottom: 12, border: (phoneBad || nomineeBad) ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}>
      {/* Header */}
      <div className="vehicle-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="vehicle-icon" style={{ background: (phoneBad || nomineeBad) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16,185,129,0.15)' }}>
          {phoneBad || nomineeBad ? <AlertTriangle size={22} color="var(--accent-red)" /> : <HeartPulse size={22} color="var(--accent-green)" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{policy.policyName || 'Health Insurance'}</span>
            {policy.policyNumber && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-blue)',
                  letterSpacing: '0.02em'
                }}
                title={`Policy #: ${policy.policyNumber}`}
              >
                #{policy.policyNumber}
              </span>
            )}
            <span className={`badge ${statusBadge}`}>{policy.status}</span>
            {policy.planType && <span className="badge badge-muted">{policy.planType}</span>}

            {nomineeBad && (
              <span className="badge badge-red" style={{ fontWeight: 700, padding: '3px 8px', fontSize: 11 }} title="Nominee needs to be updated">
                ⚠️ Nominee: Need Update
              </span>
            )}
            {phoneBad && (
              <span className="badge badge-red" style={{ fontWeight: 700, padding: '3px 8px', fontSize: 11 }} title="Contact number 8960009911 needs to be updated">
                ⚠️ Update Mobile (8960009911)
              </span>
            )}
            {policyPendingTodos.length > 0 && (
              <span
                className="badge badge-amber"
                style={{ fontWeight: 600, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                title={`${policyPendingTodos.length} action item(s) pending for this policy`}
                onClick={(e) => { e.stopPropagation(); onAddTodo?.(policy); }}
              >
                📋 {policyPendingTodos.length} Action Item{policyPendingTodos.length > 1 ? 's' : ''}
              </span>
            )}
            <span
              className="badge"
              style={{
                background: 'rgba(16,185,129,0.18)',
                color: 'var(--accent-green)',
                border: '1px solid rgba(16,185,129,0.35)',
                fontWeight: 700,
                fontSize: 12,
                padding: '3px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Hospitalization Coverage (Sum Insured)"
            >
              🏥 Sum Insured: <strong>{formatCurrency(sumInsured)}</strong>
              {bonusCover > 0 && <span style={{ fontSize: 11, fontWeight: 500 }}>(+{formatCurrency(bonusCover)} bonus)</span>}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>🏢 <strong>{policy.insurer}</strong></span>
            {policy.coveredMembers && <span>👥 Covered: <strong>{policy.coveredMembers}</strong></span>}
            {policy.premiumAmount && (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                💵 Premium: {formatCurrency(policy.premiumAmount)} / {policy.premiumFrequency || 'Yearly'}
              </span>
            )}
            {renewalDate && (
              <span>📅 Renewal: <strong>{formatDate(renewalDate)}</strong></span>
            )}
            {days !== null && (
              <span style={{ color: days <= 15 ? 'var(--accent-red)' : days <= 45 ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: days <= 45 ? 600 : 400 }}>
                ⏳ {days <= 0 ? 'Renewal due today / passed' : `Renewal in ${days} days`}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onAddTodo?.(policy)}
            title="Add Action Item / To-Do for this health policy"
            style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={12} /> To-Do
          </button>
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => onEdit(policy)}
            title="Edit Health Policy"
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
          <div className="grid-cols-4 gap-12 mb-16" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div>
              <div className="text-sm text-muted">Total Hospitalization Cover</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-green)' }}>
                {formatCurrency(totalCoverage)}
              </div>
              <div className="text-sm text-secondary">
                Base: {formatCurrency(sumInsured)} {bonusCover > 0 ? `+ Bonus: ${formatCurrency(bonusCover)}` : ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Renewal / Expiry Date</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: days !== null && days <= 30 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                {renewalDate ? formatDate(renewalDate) : '—'}
              </div>
              <div className="text-sm text-secondary">
                {days !== null ? (days <= 0 ? 'Due for renewal' : `Due in ${days} days`) : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Annual Premium</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-red)' }}>
                {formatCurrency(policy.premiumAmount)}
              </div>
              <div className="text-sm text-secondary">Frequency: {policy.premiumFrequency || 'Yearly'}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Limits &amp; Copay</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                Room: {policy.roomRentLimit || 'No Limit'}
              </div>
              <div className="text-sm text-secondary">Copay: {policy.copay || '0%'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            {policy.holderName && (
              <div>👤 <strong>Proposer:</strong> <span style={{ color: 'var(--text-primary)' }}>{policy.holderName}</span></div>
            )}
            {policy.coveredMembers && (
              <div>👥 <strong>Covered:</strong> <span style={{ color: 'var(--text-primary)' }}>{policy.coveredMembers}</span></div>
            )}
            {policy.cashlessContact && (
              <div>📞 <strong>TPA / Helpline:</strong> <span style={{ color: 'var(--text-primary)' }}>{policy.cashlessContact}</span></div>
            )}
            {policy.notes && (
              <div style={{ width: '100%', color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {policy.notes}</div>
            )}
          </div>

          {/* 12-Month Renewal History */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm text-secondary">Annual Renewal / Payment Tracker (Click to mark Paid / Unpaid)</span>
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

  const cumulative = calculateCumulativeInvestment({
    startDate: item.startDate,
    amount: item.amount,
    frequency: item.frequency,
    endDate: item.maturityDate
  });

  const curVal = Number(item.currentValue || (item.frequency === 'One-Time' ? item.amount : cumulative.totalPaid) || 0);
  const pnl = curVal - cumulative.totalPaid;
  const pnlPct = cumulative.totalPaid > 0 ? ((pnl / cumulative.totalPaid) * 100).toFixed(1) : 0;

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
            {cumulative.totalPaid > 0 && item.frequency !== 'One-Time' && (
              <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }} title={`Calculated across ${cumulative.count} installments since ${formatDate(item.startDate)}`}>
                💰 Invested: <strong>{formatCurrency(cumulative.totalPaid)}</strong> ({cumulative.count} {item.frequency === 'Yearly' ? 'yr' : 'mo'})
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
          <div className="grid-cols-4 gap-12" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div>
              <div className="text-sm text-muted">Account / Folio</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.accountNumber || '—'}</div>
              <div className="text-sm text-secondary">Started: {item.startDate ? formatDate(item.startDate) : '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Capital Invested Till Date</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-indigo)' }}>
                {formatCurrency(cumulative.totalPaid)}
              </div>
              <div className="text-sm text-secondary">{cumulative.label}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Current Valuation &amp; P&amp;L</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-green)' }}>
                {item.currentValue ? formatCurrency(item.currentValue) : formatCurrency(cumulative.totalPaid)}
              </div>
              {item.currentValue && (
                <div className="text-sm" style={{ color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnl >= 0 ? '+' : ''}{pnlPct}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted">Maturity / Returns</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.maturityDate ? formatDate(item.maturityDate) : 'Ongoing'}</div>
              <div className="text-sm text-secondary">
                {item.expectedReturn ? `${item.expectedReturn}% / yr expected` : (days !== null ? `${days} days left` : '—')}
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

// ─── Loan Given (Lending) Card ────────────────────────────────────────────────
function LoanGivenCard({ loan, onEdit, onDelete, onTogglePayout }) {
  const [expanded, setExpanded] = useState(false);
  const months12 = getLast12Months();
  const curMonth = currentMonthKey();
  const currentPayout = loan.payouts?.[curMonth];
  const isCurrentPaid = currentPayout?.status === 'Received';

  const statusCls = loan.status === 'Active' ? 'badge-green' : loan.status === 'Closed' ? 'badge-blue' : 'badge-red';

  const totalInterestRecd = Object.values(loan.payouts || {}).reduce((sum, p) => {
    return p?.status === 'Received' ? sum + Number(p.amount || loan.monthlyPayout || 0) : sum;
  }, 0);

  return (
    <div className="vehicle-card" style={{ marginBottom: 12 }}>
      <div className="vehicle-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="vehicle-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
          <Landmark size={22} color="var(--accent-cyan)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{loan.borrowerName || 'Unnamed Borrower'}</span>
            <span className={`badge ${statusCls}`}>{loan.status || 'Active'}</span>
            {loan.interestRateText && (
              <span className="badge badge-muted">{loan.interestRateText}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>💰 Principal Lent: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(loan.principalAmount)}</strong></span>
            {loan.monthlyPayout && (
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                💵 Return: {formatCurrency(loan.monthlyPayout)} / mo
                {loan.payoutDay && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(on {loan.payoutDay}th)</span>}
              </span>
            )}
            {loan.contactPerson && (
              <span>👤 {loan.contactPerson}</span>
            )}
          </div>
        </div>

        {/* Current Month Quick Status Pill */}
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
            onClick={() => onTogglePayout(loan.id, curMonth)}
            title={`Toggle payout for ${monthLabel(curMonth)}`}
          >
            {isCurrentPaid ? (
              <>
                <Check size={13} color="var(--accent-green)" />
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{monthLabel(curMonth).split(' ')[0]}: Received</span>
              </>
            ) : (
              <>
                <Clock size={13} color="var(--accent-amber)" />
                <span style={{ color: 'var(--text-secondary)' }}>{monthLabel(curMonth).split(' ')[0]}: Mark Recd</span>
              </>
            )}
          </button>

          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => onEdit(loan)}
            title="Edit Loan Record"
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-danger btn-icon btn-sm"
            onClick={() => onDelete(loan.id)}
            title="Delete Loan Record"
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
              <div className="text-sm text-muted">Total Interest Earned</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-green)' }}>
                {formatCurrency(totalInterestRecd)}
              </div>
              <div className="text-sm text-secondary">
                {Object.values(loan.payouts || {}).filter(p => p?.status === 'Received').length} months collected
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Lending Timeline</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                Started: {loan.startDate ? formatDate(loan.startDate) : '—'}
              </div>
              <div className="text-sm text-secondary">
                Repayment Due: {loan.endDate ? formatDate(loan.endDate) : 'Ongoing'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Borrower Contact</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                {loan.contactPerson || '—'}
              </div>
              <div className="text-sm text-secondary">
                {loan.phone ? <a href={`tel:${loan.phone}`} style={{ color: 'var(--accent-cyan)' }}>📞 {loan.phone}</a> : 'No phone listed'}
              </div>
            </div>
          </div>

          {loan.notes && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>📝 Agreement / Security Notes:</strong> {loan.notes}
            </div>
          )}

          {/* 12-Month Payment Receipt Grid */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm text-secondary">
                Monthly Payout Tracker (Click month to mark Received / Pending)
              </span>
              <span className="text-sm text-muted">Current: {monthLabel(curMonth)}</span>
            </div>

            <div className="month-grid">
              {months12.map(month => {
                const po = loan.payouts?.[month];
                const isPaid = po?.status === 'Received';
                const isPending = po?.status === 'Pending';
                const cls = isPaid ? 'month-cell-paid' : isPending ? 'month-cell-unpaid' : 'month-cell-none';

                return (
                  <div
                    key={month}
                    className={`month-cell ${cls}`}
                    onClick={() => onTogglePayout(loan.id, month)}
                    title={`${monthLabel(month)}: ${isPaid ? 'Received' : isPending ? 'Pending' : 'Click to toggle'}`}
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
function PaymentCalendar({
  investments,
  onEditPolicy,
  onEditHealth,
  onTogglePolicyPayment,
  onToggleHealthPayment
}) {
  const policies = investments?.policies || [];
  const healthInsurance = investments?.healthInsurance || [];
  const portfolio = investments?.portfolio || [];
  const [horizon, setHorizon] = useState(90);

  const events = useMemo(() => {
    const list = [];

    // 1. Life & Savings Policy premiums (uses effective due date: accounts for one-time, PPT, past cycles, and payment history)
    policies.forEach(p => {
      const due = getPolicyEffectiveDueDate(p);
      if (!due) return;
      const d = daysUntil(due);
      // Include all active overdue premiums plus upcoming payments within the chosen horizon
      if (d !== null && d <= horizon) {
        list.push({
          id: p.id,
          type: 'policy',
          policy: p,
          label: p.policyName || p.insurer,
          policyNumber: p.policyNumber,
          sublabel: `${p.holderName ? `${p.holderName} · ` : ''}${p.insurer} (${p.premiumFrequency || 'Yearly'})`,
          amount: p.premiumAmount,
          dueDate: due,
          days: d,
          color: 'var(--accent-indigo)'
        });
      }
    });

    // 2. Health Insurance premiums
    healthInsurance.forEach(h => {
      const due = getPolicyEffectiveDueDate({
        ...h,
        nextDueDate: h.nextDueDate || h.expiryDate
      });
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= horizon) {
        list.push({
          id: h.id,
          type: 'health',
          policy: h,
          label: `${h.policyName || h.insurer} (Health)`,
          policyNumber: h.policyNumber,
          sublabel: `${h.holderName || h.coveredMembers || ''} · ${h.insurer} (${h.planType || 'Mediclaim'})`,
          amount: h.premiumAmount,
          dueDate: due,
          days: d,
          color: 'var(--accent-green)'
        });
      }
    });

    // 3. Portfolio items (recurring SIPs, FDs, etc.)
    portfolio.forEach(item => {
      if (item.status !== 'Active' || item.frequency === 'One-Time') return;
      const due = getNextDueDate(item.startDate, item.frequency);
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= horizon) {
        list.push({
          id: item.id,
          type: 'portfolio',
          item,
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
  }, [policies, healthInsurance, portfolio, horizon]);

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
          <div className="stat-sub">{overdueCount > 0 ? 'Action required: payment missed or due' : 'All up to date'}</div>
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
          <div className="stat-sub">Across {events.length} scheduled payment{events.length !== 1 ? 's' : ''}</div>
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
          {events.map((ev) => (
            <div
              key={`${ev.type}-${ev.id || ev.label}-${ev.dueDate}`}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                flexWrap: 'wrap',
                gap: 12,
                borderLeft: `4px solid ${ev.days < 0 ? 'var(--accent-red)' : ev.days <= 7 ? 'var(--accent-amber)' : 'var(--accent-blue)'}`
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{ev.label}</span>
                  {ev.policyNumber && (
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'var(--accent-blue)' }}>
                      #{ev.policyNumber}
                    </span>
                  )}
                  {ev.days < 0 && (
                    <span className="badge badge-red" style={{ fontSize: 10, fontWeight: 700 }}>
                      🚨 {Math.abs(ev.days)}d Overdue
                    </span>
                  )}
                  {ev.days === 0 && (
                    <span className="badge badge-amber" style={{ fontSize: 10, fontWeight: 700 }}>
                      ⏳ Due Today
                    </span>
                  )}
                  {ev.days > 0 && ev.days <= 7 && (
                    <span className="badge badge-amber" style={{ fontSize: 10 }}>
                      Due in {ev.days}d
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>{ev.sublabel}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    {formatCurrency(ev.amount)}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: ev.days < 0 ? 'var(--accent-red)' : ev.days <= 7 ? 'var(--accent-amber)' : 'var(--accent-green)'
                  }}>
                    {formatDate(ev.dueDate)}
                  </div>
                </div>

                {/* Actions: Mark Paid / Edit */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ev.type === 'policy' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onTogglePolicyPayment?.(ev.policy.id, ev.dueDate.slice(0, 7))}
                        title="Mark as Paid for this due cycle"
                        style={{ fontSize: 12, padding: '4px 8px', color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Check size={13} /> Paid
                      </button>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => onEditPolicy?.(ev.policy)}
                        title="Edit Policy"
                      >
                        <Edit2 size={13} />
                      </button>
                    </>
                  )}
                  {ev.type === 'health' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onToggleHealthPayment?.(ev.policy.id, ev.dueDate.slice(0, 7))}
                        title="Mark as Paid for this renewal cycle"
                        style={{ fontSize: 12, padding: '4px 8px', color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Check size={13} /> Paid
                      </button>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => onEditHealth?.(ev.policy)}
                        title="Edit Health Policy"
                      >
                        <Edit2 size={13} />
                      </button>
                    </>
                  )}
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
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [editingHealthPolicy, setEditingHealthPolicy] = useState(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [prefilledPolicyForTodo, setPrefilledPolicyForTodo] = useState(null);
  const [search, setSearch] = useState('');
  const [filterInsurer, setFilterInsurer] = useState('');
  const [filterPolicyStatus, setFilterPolicyStatus] = useState('');
  const [filterHealthInsurer, setFilterHealthInsurer] = useState('');
  const [filterHealthStatus, setFilterHealthStatus] = useState('');
  const [filterLoanStatus, setFilterLoanStatus] = useState('');
  const [todoCategoryFilter, setTodoCategoryFilter] = useState('all');
  const [todoSearch, setTodoSearch] = useState('');

  const policies = investments?.policies || [];
  const healthInsurance = investments?.healthInsurance || [];
  const portfolio = investments?.portfolio || [];
  const loansGiven = investments?.loansGiven || [];
  const policyTodos = investments?.policyTodos || [];

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

  // Health Insurance CRUD
  const saveHealthPolicy = (pol) => {
    const existing = healthInsurance.findIndex(p => p.id === pol.id);
    const updated = existing >= 0
      ? healthInsurance.map(p => p.id === pol.id ? pol : p)
      : [pol, ...healthInsurance];
    updateInvestments({ ...investments, healthInsurance: updated });
    setShowHealthModal(false);
    setEditingHealthPolicy(null);
  };

  const deleteHealthPolicy = (id) => {
    if (!window.confirm('Delete this health insurance policy?')) return;
    updateInvestments({ ...investments, healthInsurance: healthInsurance.filter(p => p.id !== id) });
  };

  const toggleHealthPayment = (policyId, month) => {
    const pol = healthInsurance.find(p => p.id === policyId);
    if (!pol) return;
    const current = pol.paymentHistory?.[month]?.status;
    const nextStatus = current === 'Paid' ? 'Missed' : current === 'Missed' ? null : 'Paid';
    const newHistory = { ...pol.paymentHistory };
    if (nextStatus === null) delete newHistory[month];
    else newHistory[month] = { status: nextStatus, date: new Date().toISOString().split('T')[0], amount: pol.premiumAmount };
    const updated = healthInsurance.map(p => p.id === policyId ? { ...p, paymentHistory: newHistory } : p);
    updateInvestments({ ...investments, healthInsurance: updated });
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

  // Lending CRUD
  const saveLoanGiven = (loan) => {
    const existing = loansGiven.findIndex(l => l.id === loan.id);
    const updated = existing >= 0
      ? loansGiven.map(l => l.id === loan.id ? loan : l)
      : [loan, ...loansGiven];
    updateInvestments({ ...investments, loansGiven: updated });
    setShowLoanModal(false);
    setEditingLoan(null);
  };

  const deleteLoanGiven = (id) => {
    if (!window.confirm('Delete this loan record?')) return;
    updateInvestments({ ...investments, loansGiven: loansGiven.filter(l => l.id !== id) });
  };

  const toggleLoanPayout = (loanId, monthKey) => {
    const loan = loansGiven.find(l => l.id === loanId);
    if (!loan) return;
    const current = loan.payouts?.[monthKey]?.status;
    const nextStatus = current === 'Received' ? 'Pending' : current === 'Pending' ? null : 'Received';
    const newPayouts = { ...(loan.payouts || {}) };
    if (nextStatus === null) {
      delete newPayouts[monthKey];
    } else {
      newPayouts[monthKey] = {
        status: nextStatus,
        date: new Date().toISOString().split('T')[0],
        amount: Number(loan.monthlyPayout || 0)
      };
    }
    const updated = loansGiven.map(l => l.id === loanId ? { ...l, payouts: newPayouts } : l);
    updateInvestments({ ...investments, loansGiven: updated });
  };

  // Policy Action Items / To-Do CRUD
  const savePolicyTodo = (todo) => {
    const existing = policyTodos.findIndex(t => t.id === todo.id);
    const updated = existing >= 0
      ? policyTodos.map(t => t.id === todo.id ? todo : t)
      : [todo, ...policyTodos];
    updateInvestments({ ...investments, policyTodos: updated });
    setShowTodoModal(false);
    setEditingTodo(null);
    setPrefilledPolicyForTodo(null);
  };

  const deletePolicyTodo = (id) => {
    if (!window.confirm('Delete this action item?')) return;
    updateInvestments({ ...investments, policyTodos: policyTodos.filter(t => t.id !== id) });
  };

  const togglePolicyTodo = (id) => {
    const updated = policyTodos.map(t => {
      if (t.id === id) {
        const next = !t.isCompleted;
        return {
          ...t,
          isCompleted: next,
          completedAt: next ? new Date().toISOString() : null
        };
      }
      return t;
    });
    updateInvestments({ ...investments, policyTodos: updated });
  };

  const openAddTodoModal = (policy = null) => {
    setPrefilledPolicyForTodo(policy);
    setEditingTodo(null);
    setShowTodoModal(true);
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
    const matchStatus = !filterPolicyStatus || p.status === filterPolicyStatus;
    return matchSearch && matchInsurer && matchStatus;
  });

  const filteredHealth = healthInsurance.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || h.policyName?.toLowerCase().includes(q)
      || h.policyNumber?.includes(q)
      || h.holderName?.toLowerCase().includes(q)
      || h.coveredMembers?.toLowerCase().includes(q)
      || h.insurer?.toLowerCase().includes(q);
    const matchInsurer = !filterHealthInsurer || h.insurer === filterHealthInsurer;
    const matchStatus = !filterHealthStatus || h.status === filterHealthStatus;
    return matchSearch && matchInsurer && matchStatus;
  });

  const filteredPortfolio = portfolio.filter(p => {
    const q = search.toLowerCase();
    return !q
      || p.name?.toLowerCase().includes(q)
      || p.type?.toLowerCase().includes(q)
      || p.platform?.toLowerCase().includes(q);
  });

  const filteredLoans = loansGiven.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.borrowerName?.toLowerCase().includes(q)
      || l.contactPerson?.toLowerCase().includes(q)
      || l.notes?.toLowerCase().includes(q)
      || l.interestRateText?.toLowerCase().includes(q);
    const matchStatus = !filterLoanStatus || l.status === filterLoanStatus;
    return matchSearch && matchStatus;
  });

  // Summary Metrics
  const activePolicies = policies.filter(p => p.status === 'Active');
  const totalAnnualPremium = activePolicies.reduce((sum, p) => {
    const freq = getFrequencyMonths(p.premiumFrequency);
    if (!freq) return sum;
    return sum + (Number(p.premiumAmount || 0) * (12 / freq));
  }, 0);

  // Health Insurance Metrics
  const activeHealth = healthInsurance.filter(h => h.status === 'Active');
  const totalHealthAnnualPremium = activeHealth.reduce((sum, h) => {
    const freq = getFrequencyMonths(h.premiumFrequency);
    if (!freq) return sum;
    return sum + (Number(h.premiumAmount || 0) * (12 / freq));
  }, 0);
  const totalHealthSumInsured = healthInsurance.reduce((sum, h) => sum + Number(h.sumInsured || h.sumAssured || 0), 0);

  // Pure Life / Term Protection Cover (not counting health)
  const totalLifeSumAssured = policies.reduce((sum, p) => sum + Number(p.sumAssured || 0), 0);
  const totalSumAssured = totalLifeSumAssured;
  const totalPortfolioVal = portfolio.reduce((sum, p) => sum + Number(p.currentValue || p.amount || 0), 0);

  const totalPortfolioInvested = portfolio.reduce((sum, item) => {
    const c = calculateCumulativeInvestment({
      startDate: item.startDate,
      amount: item.amount,
      frequency: item.frequency,
      endDate: item.maturityDate
    });
    return sum + c.totalPaid;
  }, 0);

  const totalPoliciesPaid = policies.reduce((sum, p) => {
    const c = calculateCumulativeInvestment({
      startDate: p.startDate,
      amount: p.premiumAmount,
      frequency: p.premiumFrequency,
      paymentEndDate: p.paymentEndDate,
      paymentHistory: p.paymentHistory,
      alreadyPaid: p.alreadyPaid
    });
    return sum + c.totalPaid;
  }, 0);

  const totalCumulativeAll = totalPortfolioInvested + totalPoliciesPaid;

  const totalPrincipalLent = loansGiven
    .filter(l => l.status === 'Active')
    .reduce((sum, l) => sum + Number(l.principalAmount || 0), 0);
  const totalMonthlyLendingPayout = loansGiven
    .filter(l => l.status === 'Active')
    .reduce((sum, l) => sum + Number(l.monthlyPayout || 0), 0);
  const curMonthKey = currentMonthKey();
  const activeLoans = loansGiven.filter(l => l.status === 'Active');
  const curMonthReceivedCount = activeLoans.filter(l => l.payouts?.[curMonthKey]?.status === 'Received').length;

  const upcomingAlerts = useMemo(() => {
    let count = 0;
    policies.forEach(p => {
      const due = getPolicyEffectiveDueDate(p);
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= 30) count++;
    });
    healthInsurance.forEach(h => {
      const due = getPolicyEffectiveDueDate({
        ...h,
        nextDueDate: h.nextDueDate || h.expiryDate
      });
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= 30) count++;
    });
    portfolio.forEach(item => {
      if (item.status !== 'Active' || item.frequency === 'One-Time') return;
      const due = getNextDueDate(item.startDate, item.frequency);
      if (!due) return;
      const d = daysUntil(due);
      if (d !== null && d <= 30) count++;
    });
    return count;
  }, [policies, healthInsurance, portfolio]);

  // Compute To-Do & Action Items (both auto-detected and user-created)
  const allTodoItems = useMemo(() => {
    const list = [];

    // 1. Auto-detected items from Life Policies
    policies.forEach(p => {
      if (isNomineeNeedUpdate(p.nominee)) {
        list.push({
          id: `auto-${p.id}-nominee`,
          isAuto: true,
          policy: p,
          category: 'nominee',
          priority: 'High',
          policyKind: 'Life / Savings Policy',
          policyName: p.policyName || 'Unnamed Policy',
          policyNumber: p.policyNumber,
          insurer: p.insurer,
          holderName: p.holderName,
          title: 'Nominee Update Required',
          description: `Nominee is marked as "${p.nominee || 'Need to update'}". Insurance policies require a valid, verified nominee on record for claim settlement.`,
          currentValue: p.nominee || 'Need to update',
          actionType: 'policy',
          isCompleted: false,
        });
      }
      if (isPhoneNeedUpdate(p.otpPhone)) {
        list.push({
          id: `auto-${p.id}-phone`,
          isAuto: true,
          policy: p,
          category: 'phone',
          priority: 'High',
          policyKind: 'Life / Savings Policy',
          policyName: p.policyName || 'Unnamed Policy',
          policyNumber: p.policyNumber,
          insurer: p.insurer,
          holderName: p.holderName,
          title: 'Registered Mobile Number Update Required',
          description: `Linked mobile number is ${p.otpPhone}. Update to active mobile number to receive OTPs, premium alerts, and policy servicing.`,
          currentValue: p.otpPhone,
          actionType: 'policy',
          isCompleted: false,
        });
      }
    });

    // 2. Auto-detected items from Health Policies
    healthInsurance.forEach(h => {
      if (isNomineeNeedUpdate(h.nominee)) {
        list.push({
          id: `auto-${h.id}-nominee`,
          isAuto: true,
          policy: h,
          category: 'nominee',
          priority: 'High',
          policyKind: 'Health Insurance',
          policyName: h.policyName || 'Health Policy',
          policyNumber: h.policyNumber,
          insurer: h.insurer,
          holderName: h.holderName || h.coveredMembers,
          title: 'Nominee Update Required',
          description: `Nominee is marked as "${h.nominee || 'Need to update'}". Update nominee details for cashless or reimbursement claims.`,
          currentValue: h.nominee || 'Need to update',
          actionType: 'health',
          isCompleted: false,
        });
      }
      if (isPhoneNeedUpdate(h.cashlessContact || h.notes || h.otpPhone)) {
        list.push({
          id: `auto-${h.id}-phone`,
          isAuto: true,
          policy: h,
          category: 'phone',
          priority: 'High',
          policyKind: 'Health Insurance',
          policyName: h.policyName || 'Health Policy',
          policyNumber: h.policyNumber,
          insurer: h.insurer,
          holderName: h.holderName || h.coveredMembers,
          title: 'Registered Mobile / Contact Update Required',
          description: `Contact number contains 8960009911 (${h.cashlessContact || h.otpPhone || '8960009911'}). Update for cashless claims, hospital approvals, and OTPs.`,
          currentValue: h.cashlessContact || h.otpPhone || '8960009911',
          actionType: 'health',
          isCompleted: false,
        });
      }
    });

    // 3. User-created manual action items
    policyTodos.forEach(item => {
      const linkedLife = policies.find(p => p.id === item.policyId);
      const linkedHealth = healthInsurance.find(h => h.id === item.policyId);
      list.push({
        ...item,
        isAuto: false,
        policy: linkedLife || linkedHealth || null,
        actionType: linkedLife ? 'policy' : linkedHealth ? 'health' : 'custom'
      });
    });

    return list;
  }, [policies, healthInsurance, policyTodos]);

  const pendingTodos = allTodoItems.filter(t => !t.isCompleted);
  const completedTodos = allTodoItems.filter(t => t.isCompleted);
  const nomineeIssueCount = pendingTodos.filter(t => t.category === 'nominee').length;
  const phoneIssueCount = pendingTodos.filter(t => t.category === 'phone' || (t.isAuto && t.id.includes('phone'))).length;
  const manualTodoCount = pendingTodos.filter(t => !t.isAuto).length;

  const filteredTodoItems = allTodoItems.filter(item => {
    // Search filter
    if (todoSearch.trim()) {
      const q = todoSearch.toLowerCase();
      const match = item.title?.toLowerCase().includes(q)
        || item.description?.toLowerCase().includes(q)
        || item.policyName?.toLowerCase().includes(q)
        || item.policyNumber?.includes(q)
        || item.insurer?.toLowerCase().includes(q)
        || item.holderName?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category filter
    if (todoCategoryFilter === 'pending') return !item.isCompleted;
    if (todoCategoryFilter === 'completed') return item.isCompleted;
    if (todoCategoryFilter === 'nominee') return item.category === 'nominee';
    if (todoCategoryFilter === 'phone') return item.category === 'phone' || (item.isAuto && item.id.includes('phone'));
    if (todoCategoryFilter === 'manual') return !item.isAuto;
    if (todoCategoryFilter === 'auto') return item.isAuto;
    return true;
  });

  return (
    <div className="animate-in">
      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Shield size={20} color="var(--accent-indigo)" />
          </div>
          <div className="stat-label">Life &amp; Savings Policies</div>
          <div className="stat-value">{activePolicies.length}</div>
          <div className="stat-sub">{policies.length} total life policies</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <IndianRupee size={20} color="var(--accent-red)" />
          </div>
          <div className="stat-label">Annual Insurance Outflow</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(Math.round(totalAnnualPremium + totalHealthAnnualPremium))}</div>
          <div className="stat-sub">{formatCurrency(totalPoliciesPaid)} paid in total till date</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Sparkles size={20} color="var(--accent-blue)" />
          </div>
          <div className="stat-label">Life &amp; Term Risk Cover</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalLifeSumAssured)}</div>
          <div className="stat-sub">Pure life risk cover (not an asset)</div>
        </div>

        <div className="stat-card" style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.03) 100%)' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.18)' }}>
            <HeartPulse size={20} color="var(--accent-green)" />
          </div>
          <div className="stat-label" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Health Cover (Mediclaim)</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent-green)' }}>{formatCurrency(totalHealthSumInsured)}</div>
          <div className="stat-sub">Hospitalization sum insured ({healthInsurance.length} policies)</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Briefcase size={20} color="var(--accent-cyan)" />
          </div>
          <div className="stat-label">Portfolio &amp; Lent Assets</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalPortfolioVal + totalPrincipalLent)}</div>
          <div className="stat-sub">{formatCurrency(totalCumulativeAll)} deposited till date</div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="tabs mb-20">
        <button
          className={`tab ${tab === 'policies' ? 'active' : ''}`}
          onClick={() => setTab('policies')}
        >
          <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
          Life &amp; Savings Policies ({policies.length})
        </button>
        <button
          className={`tab ${tab === 'health' ? 'active' : ''}`}
          onClick={() => setTab('health')}
        >
          <HeartPulse size={14} style={{ display: 'inline', marginRight: 6 }} />
          Health Insurance ({healthInsurance.length})
        </button>
        <button
          className={`tab ${tab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setTab('portfolio')}
        >
          <Briefcase size={14} style={{ display: 'inline', marginRight: 6 }} />
          Portfolio &amp; SWP ({portfolio.length})
        </button>
        <button
          className={`tab ${tab === 'lending' ? 'active' : ''}`}
          onClick={() => setTab('lending')}
        >
          <Landmark size={14} style={{ display: 'inline', marginRight: 6 }} />
          Loans Given ({loansGiven.length})
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
        <button
          className={`tab ${tab === 'todo' ? 'active' : ''}`}
          onClick={() => setTab('todo')}
        >
          <ListTodo size={14} style={{ display: 'inline', marginRight: 6, color: pendingTodos.length > 0 ? 'var(--accent-red)' : 'inherit' }} />
          To-Do &amp; Action Items
          {pendingTodos.length > 0 && (
            <span className="badge badge-red" style={{ marginLeft: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
              {pendingTodos.length} to fix
            </span>
          )}
        </button>
      </div>

      {/* ── Tab 1: Policies ─────────────────────────────────────────── */}
      {tab === 'policies' && (
        <div>
          {/* Action Required Callout Banner */}
          {pendingTodos.length > 0 && (
            <div
              onClick={() => setTab('todo')}
              style={{
                cursor: 'pointer',
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(245,158,11,0.08) 100%)',
                border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-red)',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Policy Action Items Detected ({pendingTodos.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {nomineeIssueCount > 0 && `${nomineeIssueCount} policy with nominee needing update`}
                    {nomineeIssueCount > 0 && phoneIssueCount > 0 && ' · '}
                    {phoneIssueCount > 0 && `${phoneIssueCount} policy with mobile 8960009911 needing update`}
                    {(nomineeIssueCount > 0 || phoneIssueCount > 0) && manualTodoCount > 0 && ' · '}
                    {manualTodoCount > 0 && `${manualTodoCount} manual task${manualTodoCount > 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--accent-red)', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); setTab('todo'); }}
              >
                View in To-Do Tab →
              </button>
            </div>
          )}

          {/* Insurance Policies Accumulated Overview */}
          {policies.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(14,165,233,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-indigo)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} /> Total Policy Premiums Paid (Till Date)
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {formatCurrency(totalPoliciesPaid)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Accumulated across all {policies.length} insurance policies based on tenure elapsed &amp; premiums
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Annual Outflow</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-red)' }}>
                    {formatCurrency(Math.round(totalAnnualPremium))} / yr
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Maturity Expected</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {formatCurrency(policies.reduce((sum, p) => sum + Number(p.maturityAmount || 0), 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Protection Cover</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>
                    {formatCurrency(totalLifeSumAssured)}
                  </div>
                </div>
              </div>
            </div>
          )}

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
              value={filterPolicyStatus}
              onChange={e => setFilterPolicyStatus(e.target.value)}
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
                onAddTodo={openAddTodoModal}
                policyTodos={policyTodos}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Health Insurance (Mediclaim) ───────────────────────── */}
      {tab === 'health' && (
        <div>
          {/* Health Insurance Summary Banner */}
          {healthInsurance.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.06) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HeartPulse size={15} /> Total Family Health Protection (Mediclaim)
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {formatCurrency(totalHealthSumInsured)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Hospitalization cover across {healthInsurance.length} health insurance {healthInsurance.length !== 1 ? 'policies' : 'policy'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Annual Renewal Outflow</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-red)' }}>
                    {formatCurrency(Math.round(totalHealthAnnualPremium))} / yr
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Health Policies</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>
                    {activeHealth.length} Active
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Actions Bar */}
          <div className="flex gap-10 mb-16 flex-wrap items-center">
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search health plan, number, insurer, or members..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 150 }}
              value={filterHealthInsurer}
              onChange={e => setFilterHealthInsurer(e.target.value)}
            >
              <option value="">All Health Insurers</option>
              {HEALTH_INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 120 }}
              value={filterHealthStatus}
              onChange={e => setFilterHealthStatus(e.target.value)}
            >
              <option value="">All Status</option>
              {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingHealthPolicy(null); setShowHealthModal(true); }}
            >
              <Plus size={15} /> Add Health Policy
            </button>
          </div>

          {filteredHealth.length === 0 && (
            <div className="empty-state">
              <HeartPulse size={48} color="var(--accent-green)" />
              <div className="empty-state-title">
                {healthInsurance.length === 0 ? 'No health insurance policies added yet' : 'No health policies match your search'}
              </div>
              <div className="empty-state-desc">
                {healthInsurance.length === 0
                  ? 'Track your family mediclaim, hospitalization sum insured, TPA cashless contacts, and renewal dates.'
                  : 'Try clearing your search query or filter dropdowns.'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredHealth.map(policy => (
              <HealthCard
                key={policy.id}
                policy={policy}
                onEdit={(p) => { setEditingHealthPolicy(p); setShowHealthModal(true); }}
                onDelete={deleteHealthPolicy}
                onTogglePayment={toggleHealthPayment}
                onAddTodo={openAddTodoModal}
                policyTodos={policyTodos}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 2: Portfolio & SWP ───────────────────────────────────── */}
      {tab === 'portfolio' && (
        <div>
          <SwpPanel investments={investments} updateInvestments={updateInvestments} />

          {/* Cumulative Contributions & Policies Total Paid Overview */}
          <div className="card mb-20" style={{ border: '1px solid rgba(99,102,241,0.25)', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, var(--bg-card) 100%)' }}>
            <div className="section-header" style={{ marginBottom: 14 }}>
              <div>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="var(--accent-indigo)" />
                  Cumulative Investment &amp; Policy Contributions (Till Date)
                </div>
                <div className="section-subtitle">
                  Total capital deposited across recurring SIPs, PPF, FDs, and annual/monthly Insurance Policies since inception
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div className="stat-label">Total Capital Deposited (All)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-indigo)' }}>
                  {formatCurrency(totalCumulativeAll)}
                </div>
                <div className="stat-sub">
                  Portfolio: {formatCurrency(totalPortfolioInvested)} + Policies: {formatCurrency(totalPoliciesPaid)}
                </div>
              </div>

              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div className="stat-label">Market Portfolio Valuation</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {formatCurrency(totalPortfolioVal)}
                </div>
                <div className="stat-sub">{portfolio.length} holdings tracked</div>
              </div>

              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div className="stat-label">Policies Paid Till Date</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)' }}>
                  {formatCurrency(totalPoliciesPaid)}
                </div>
                <div className="stat-sub">{policies.length} policies accumulated</div>
              </div>

              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div className="stat-label">Combined Assets &amp; Savings</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatCurrency(totalPortfolioVal + totalPoliciesPaid)}
                </div>
                <div className="stat-sub">Portfolio Value + Policies Paid</div>
              </div>
            </div>

            {/* Policies Summary Drawer / List */}
            {policies.length > 0 && (
              <div style={{ background: 'var(--bg-base)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    🛡️ Insurance Policies — Accumulated Premiums Paid (e.g. ₹50k/yr since 2019)
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => setTab('policies')}
                  >
                    View All Policies →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {policies.map(p => {
                    const c = calculateCumulativeInvestment({
                      startDate: p.startDate,
                      amount: p.premiumAmount,
                      frequency: p.premiumFrequency,
                      paymentEndDate: p.paymentEndDate,
                      paymentHistory: p.paymentHistory,
                      alreadyPaid: p.alreadyPaid
                    });

                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{p.policyName || 'Unnamed Policy'}</span>
                          {p.policyNumber && (
                            <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'var(--accent-blue)', marginLeft: 6 }}>
                              #{p.policyNumber}
                            </span>
                          )}
                          <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: 10 }}>{p.insurer}</span>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {formatCurrency(p.premiumAmount)} / {p.premiumFrequency}
                            {p.startDate ? ` · Started ${formatDate(p.startDate)}` : ''}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>
                            {formatCurrency(c.totalPaid)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {c.count} {p.premiumFrequency === 'Yearly' ? 'annual premium' : 'installment'}{c.count !== 1 ? 's' : ''} paid
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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

      {/* ── Tab: Lending / Loans Given ──────────────────────────────── */}
      {tab === 'lending' && (
        <div>
          {/* Lending Overview Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div className="stat-card" style={{ padding: '14px 18px' }}>
              <div className="stat-label">Total Principal Lent (Asset)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {formatCurrency(totalPrincipalLent)}
              </div>
              <div className="stat-sub">{activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''} out</div>
            </div>

            <div className="stat-card" style={{ padding: '14px 18px' }}>
              <div className="stat-label">Expected Monthly Inflow</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>
                {formatCurrency(totalMonthlyLendingPayout)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/ month</span>
              </div>
              <div className="stat-sub">Recurring monthly returns</div>
            </div>

            <div className="stat-card" style={{ padding: '14px 18px' }}>
              <div className="stat-label">{monthLabel(curMonthKey)} Status</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: curMonthReceivedCount === activeLoans.length && activeLoans.length > 0 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {curMonthReceivedCount} of {activeLoans.length} Recd
              </div>
              <div className="stat-sub">
                {activeLoans.length - curMonthReceivedCount === 0
                  ? 'All payouts collected this month'
                  : `${activeLoans.length - curMonthReceivedCount} payout pending this month`}
              </div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex gap-10 mb-16 flex-wrap items-center">
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search borrower name, contact, notes, or terms..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 130 }}
              value={filterLoanStatus}
              onChange={e => setFilterLoanStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Defaulted">Defaulted</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingLoan(null); setShowLoanModal(true); }}
            >
              <Plus size={15} /> Add Loan Given
            </button>
          </div>

          {filteredLoans.length === 0 && (
            <div className="empty-state">
              <Landmark size={48} />
              <div className="empty-state-title">
                {loansGiven.length === 0 ? 'No loans or lending records added yet' : 'No loans match your search'}
              </div>
              <div className="empty-state-desc">
                {loansGiven.length === 0
                  ? 'Track money lent to organizations, businesses, or individuals, along with fixed monthly interest/returns and payout receipts.'
                  : 'Try clearing your search query or status filter.'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredLoans.map(loan => (
              <LoanGivenCard
                key={loan.id}
                loan={loan}
                onEdit={(l) => { setEditingLoan(l); setShowLoanModal(true); }}
                onDelete={deleteLoanGiven}
                onTogglePayout={toggleLoanPayout}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 3: Calendar ──────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <PaymentCalendar
          investments={investments}
          onEditPolicy={(p) => { setEditingPolicy(p); setShowPolicyModal(true); }}
          onEditHealth={(h) => { setEditingHealthPolicy(h); setShowHealthModal(true); }}
          onTogglePolicyPayment={togglePolicyPayment}
          onToggleHealthPayment={toggleHealthPayment}
        />
      )}

      {/* ── Tab 4: To-Do & Action Items ───────────────────────────────── */}
      {tab === 'todo' && (
        <div>
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListTodo size={20} color="var(--accent-amber)" />
                Policy Action Items &amp; To-Do
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Track updates required for nominees, mobile numbers (8960009911), KYC, mandates, and add custom policy tasks.
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => openAddTodoModal()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} /> Add Action Item
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div className="stat-card" style={{ padding: '12px 16px', border: pendingTodos.length > 0 ? '1px solid rgba(239,68,68,0.3)' : undefined }}>
              <div className="stat-label">Total Action Items</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: pendingTodos.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {pendingTodos.length} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>pending</span>
              </div>
              <div className="stat-sub">{completedTodos.length} completed</div>
            </div>

            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Nominee Needs Update</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: nomineeIssueCount > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                {nomineeIssueCount}
              </div>
              <div className="stat-sub">Marked &quot;need to update&quot;</div>
            </div>

            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Mobile 8960009911</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: phoneIssueCount > 0 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                {phoneIssueCount}
              </div>
              <div className="stat-sub">Outdated phone to replace</div>
            </div>

            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Manual Custom Tasks</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {manualTodoCount}
              </div>
              <div className="stat-sub">{policyTodos.length} total tasks tracked</div>
            </div>
          </div>

          {/* Search & Filter Buttons Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  value={todoSearch}
                  onChange={e => setTodoSearch(e.target.value)}
                  placeholder="Search action items, policy name, number, or notes..."
                  style={{ paddingLeft: 36 }}
                />
              </div>

              {todoSearch && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTodoSearch('')}
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: `All (${allTodoItems.length})` },
                { key: 'pending', label: `Pending (${pendingTodos.length})` },
                { key: 'nominee', label: `Nominee Updates (${allTodoItems.filter(t => t.category === 'nominee').length})` },
                { key: 'phone', label: `Mobile 8960009911 (${allTodoItems.filter(t => t.category === 'phone' || (t.isAuto && t.id.includes('phone'))).length})` },
                { key: 'manual', label: `Manual Tasks (${allTodoItems.filter(t => !t.isAuto).length})` },
                { key: 'completed', label: `Completed (${completedTodos.length})` },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`btn btn-sm ${todoCategoryFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTodoCategoryFilter(f.key)}
                  style={{ fontSize: 12 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Action Items */}
          {filteredTodoItems.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} color="var(--accent-green)" />
              <div className="empty-state-title">
                {allTodoItems.length === 0
                  ? 'All caught up! No policy action items.'
                  : 'No action items match the current filter.'}
              </div>
              <div className="empty-state-desc">
                {allTodoItems.length === 0
                  ? 'All policy nominees and mobile numbers are up to date. You can manually add tasks for branch visits, address changes, or bond collection.'
                  : 'Try selecting "All" or "Pending" to view other items.'}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => openAddTodoModal()}
                style={{ marginTop: 12 }}
              >
                <Plus size={14} /> Add New Action Item
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredTodoItems.map(item => {
                const isNominee = item.category === 'nominee';
                const isPhone = item.category === 'phone' || (item.isAuto && item.id.includes('phone'));

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '16px 18px',
                      background: item.isCompleted
                        ? 'rgba(255,255,255,0.02)'
                        : item.isAuto
                          ? 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(245,158,11,0.03) 100%)'
                          : 'var(--bg-card)',
                      border: item.isCompleted
                        ? '1px solid rgba(255,255,255,0.06)'
                        : item.isAuto
                          ? '1px solid rgba(239,68,68,0.35)'
                          : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      opacity: item.isCompleted ? 0.75 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
                        {/* Status Checkbox / Icon */}
                        {!item.isAuto ? (
                          <button
                            type="button"
                            onClick={() => togglePolicyTodo(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2,
                              color: item.isCompleted ? 'var(--accent-green)' : 'var(--text-muted)',
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={item.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                          >
                            {item.isCompleted ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        ) : (
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isNominee ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                            color: isNominee ? 'var(--accent-red)' : 'var(--accent-amber)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 1
                          }}>
                            <AlertTriangle size={15} />
                          </div>
                        )}

                        <div style={{ flex: 1 }}>
                          {/* Badges line */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                            {item.isAuto ? (
                              <span className="badge badge-red" style={{ fontWeight: 700, fontSize: 10 }}>
                                ⚡ Auto-Detected
                              </span>
                            ) : (
                              <span className="badge badge-cyan" style={{ fontWeight: 600, fontSize: 10 }}>
                                📝 Custom Task
                              </span>
                            )}

                            {isNominee && (
                              <span className="badge badge-red" style={{ fontSize: 10 }}>
                                👤 Nominee Update
                              </span>
                            )}
                            {isPhone && (
                              <span className="badge badge-amber" style={{ fontSize: 10 }}>
                                📱 Mobile 8960009911
                              </span>
                            )}
                            {item.category === 'kyc' && <span className="badge badge-muted" style={{ fontSize: 10 }}>📄 KYC / Docs</span>}
                            {item.category === 'bank' && <span className="badge badge-muted" style={{ fontSize: 10 }}>🏦 Bank / Mandate</span>}
                            {item.category === 'service' && <span className="badge badge-muted" style={{ fontSize: 10 }}>⚙️ Claim / Servicing</span>}

                            {item.priority === 'High' && (
                              <span className="badge badge-red" style={{ fontSize: 10 }}>🔴 High Priority</span>
                            )}
                            {item.priority === 'Medium' && (
                              <span className="badge badge-amber" style={{ fontSize: 10 }}>🟡 Medium Priority</span>
                            )}
                            {item.priority === 'Low' && (
                              <span className="badge badge-green" style={{ fontSize: 10 }}>🟢 Low Priority</span>
                            )}

                            {item.isCompleted && (
                              <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700 }}>
                                ✓ Completed
                              </span>
                            )}
                          </div>

                          {/* Action Title */}
                          <div style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: item.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: item.isCompleted ? 'line-through' : 'none'
                          }}>
                            {item.title}
                          </div>

                          {/* Linked Policy Info */}
                          {(item.policyName || item.policyNumber) && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 4,
                              flexWrap: 'wrap',
                              fontSize: 12,
                              color: 'var(--text-secondary)'
                            }}>
                              <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                                {item.policyKind === 'Health Insurance' ? '🏥 [Health]' : '🛡️ [Life]'} {item.policyName || 'Unnamed Policy'}
                              </span>
                              {item.policyNumber && (
                                <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>
                                  #{item.policyNumber}
                                </span>
                              )}
                              {item.insurer && <span>· {item.insurer}</span>}
                              {item.holderName && <span>· Holder: {item.holderName}</span>}
                            </div>
                          )}

                          {/* Description / Highlight Box */}
                          {item.description && (
                            <div style={{
                              marginTop: 8,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: item.isAuto ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                              border: item.isAuto ? '1px solid rgba(239,68,68,0.18)' : '1px solid var(--border-subtle)',
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5
                            }}>
                              {item.currentValue && (
                                <div style={{ marginBottom: 4 }}>
                                  <strong>Current Value:</strong>{' '}
                                  <span style={{
                                    background: 'rgba(239,68,68,0.18)',
                                    color: 'var(--accent-red)',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    fontFamily: 'monospace',
                                    fontWeight: 700
                                  }}>
                                    {item.currentValue}
                                  </span>
                                </div>
                              )}
                              <div>{item.description}</div>
                            </div>
                          )}

                          {/* Due Date & Meta */}
                          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                            {item.dueDate && (
                              <span>📅 Target Date: <strong>{formatDate(item.dueDate)}</strong></span>
                            )}
                            {item.completedAt && (
                              <span style={{ color: 'var(--accent-green)' }}>✓ Completed on {formatDate(item.completedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.isAuto ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              if (item.actionType === 'health') {
                                setEditingHealthPolicy(item.policy);
                                setShowHealthModal(true);
                              } else {
                                setEditingPolicy(item.policy);
                                setShowPolicyModal(true);
                              }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <Edit2 size={13} /> Update Policy Now
                          </button>
                        ) : (
                          <>
                            {item.policy && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  if (item.actionType === 'health') {
                                    setEditingHealthPolicy(item.policy);
                                    setShowHealthModal(true);
                                  } else {
                                    setEditingPolicy(item.policy);
                                    setShowPolicyModal(true);
                                  }
                                }}
                                title="Open Policy Details"
                                style={{ fontSize: 11 }}
                              >
                                View Policy
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => {
                                setEditingTodo(item);
                                setShowTodoModal(true);
                              }}
                              title="Edit Action Item"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-danger btn-icon btn-sm"
                              onClick={() => deletePolicyTodo(item.id)}
                              title="Delete Action Item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showPolicyModal && (
        <PolicyModal
          initial={editingPolicy}
          onSave={savePolicy}
          onClose={() => { setShowPolicyModal(false); setEditingPolicy(null); }}
        />
      )}

      {showHealthModal && (
        <HealthModal
          initial={editingHealthPolicy}
          onSave={saveHealthPolicy}
          onClose={() => { setShowHealthModal(false); setEditingHealthPolicy(null); }}
        />
      )}

      {showPortfolioModal && (
        <PortfolioModal
          initial={editingPortfolio}
          onSave={savePortfolioItem}
          onClose={() => { setShowPortfolioModal(false); setEditingPortfolio(null); }}
        />
      )}

      {showLoanModal && (
        <LoanGivenModal
          initial={editingLoan}
          onSave={saveLoanGiven}
          onClose={() => { setShowLoanModal(false); setEditingLoan(null); }}
        />
      )}

      {showTodoModal && (
        <TodoModal
          initial={editingTodo}
          prefilledPolicy={prefilledPolicyForTodo}
          policies={policies}
          healthInsurance={healthInsurance}
          onSave={savePolicyTodo}
          onClose={() => {
            setShowTodoModal(false);
            setEditingTodo(null);
            setPrefilledPolicyForTodo(null);
          }}
        />
      )}
    </div>
  );
}
