// Storage utilities for AssetFlow app

import { supabase, isSupabaseConfigured } from './supabase';

const KEYS = {
  VEHICLES: 'assetflow_vehicles',
  ROOMS: 'assetflow_rooms',
  INVESTMENTS: 'assetflow_investments',
  SETTINGS: 'assetflow_settings',
  PIN_HASH: 'assetflow_pin_hash',
  FLEET_PIN_HASH: 'assetflow_fleet_pin_hash',
  FINANCES: 'assetflow_finances',
};

// Generic get/set for localStorage
const get = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const set = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

// Cloud operations
export const saveToCloud = async (key, value) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    await supabase.from('app_data').upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('Cloud save error:', err);
  }
};

export const loadAllFromCloud = async () => {
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('app_data').select('*');
    if (error || !data) return null;
    const result = {};
    for (const row of data) {
      result[row.key] = row.value;
    }
    return result;
  } catch (err) {
    console.warn('Cloud load error:', err);
    return null;
  }
};

// Vehicles
export const getVehicles = () => get(KEYS.VEHICLES) || defaultVehicles();
export const saveVehicles = (vehicles) => {
  set(KEYS.VEHICLES, vehicles);
  saveToCloud('vehicles', vehicles);
};

// Rooms
export const getRooms = () => get(KEYS.ROOMS) || [];
export const saveRooms = (rooms) => {
  set(KEYS.ROOMS, rooms);
  saveToCloud('rooms', rooms);
};

// Investments
export const getInvestments = () => mergeInvestments(get(KEYS.INVESTMENTS));
export const saveInvestments = (data) => {
  set(KEYS.INVESTMENTS, data);
  saveToCloud('investments', data);
};

// Finances (Salary, Credit Cards, Expenses, Statements)
export const getFinances = () => mergeFinances(get(KEYS.FINANCES));
export const saveFinances = (data) => {
  set(KEYS.FINANCES, data);
  saveToCloud('finances', data);
};

// Settings
export const getSettings = () => get(KEYS.SETTINGS) || { currency: '₹' };
export const saveSettings = (settings) => {
  set(KEYS.SETTINGS, settings);
  saveToCloud('settings', settings);
};

// PIN Security
export const getPinHash = () => get(KEYS.PIN_HASH) || '';
export const savePinHash = (hash) => {
  set(KEYS.PIN_HASH, hash);
  saveToCloud('auth_pin', hash);
};

export const getFleetPinHash = () => get(KEYS.FLEET_PIN_HASH) || '';
export const saveFleetPinHash = (hash) => {
  set(KEYS.FLEET_PIN_HASH, hash);
  saveToCloud('auth_fleet_pin', hash);
};

// SHA-256 Hasher with dedicated salt
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_assetflow_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Default vehicle list
function defaultVehicles() {
  return [
    { id: 'v1', name: 'Truck 1', type: 'Truck', regNumber: '', color: '', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v2', name: 'Truck 2', type: 'Truck', regNumber: '', color: '', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v3', name: 'White Kia', type: 'Car', regNumber: '', color: 'White', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v4', name: 'White Nexon', type: 'Car', regNumber: '', color: 'White', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v5', name: 'Black Kia', type: 'Car', regNumber: '', color: 'Black', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v6', name: 'Green Nexon', type: 'Car', regNumber: '', color: 'Green', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v7', name: 'White Scorpio', type: 'Car', regNumber: '', color: 'White', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
    { id: 'v8', name: 'Traveller', type: 'Traveller', regNumber: '', color: '', income: [], emi: { amount: 0, dueDate: 1, lender: '', paid: {} }, documents: { insurance: { expiry: '', source: 'manual', insurer: '' }, puc: { expiry: '', source: 'manual' }, fitness: { expiry: '', source: 'manual' }, permit: { expiry: '', source: 'manual', type: '' } } },
  ];
}

function defaultInvestments() {
  return {
    swp: {
      corpus: 0,
      monthlyWithdrawal: 0,
      startDate: '',
      payouts: {},
    },
    additionalInvestments: [],
    policies: [],
    portfolio: [],
    loansGiven: [],
  };
}

// Merge loaded investments with defaults so new keys are always present
export const mergeInvestments = (loaded) => {
  const def = defaultInvestments();
  if (!loaded) return def;
  return {
    ...def,
    ...loaded,
    policies: loaded.policies || [],
    portfolio: loaded.portfolio || [],
    loansGiven: loaded.loansGiven || [],
    additionalInvestments: loaded.additionalInvestments || [],
    swp: { ...def.swp, ...(loaded.swp || {}) },
  };
};

function defaultFinances() {
  return {
    salary: {
      amount: 0,
      company: '',
      payDay: 1,
      history: {},
    },
    creditCards: [],
    recurringExpenses: [],
  };
}

export const mergeFinances = (loaded) => {
  const def = defaultFinances();
  if (!loaded) return def;
  return {
    ...def,
    ...loaded,
    salary: { ...def.salary, ...(loaded.salary || {}) },
    creditCards: loaded.creditCards || [],
    recurringExpenses: loaded.recurringExpenses || [],
  };
};

// ID generator
export const genId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

// Date helpers
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
};

export const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (key) => {
  const [year, month] = key.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const getLast12Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
  }
  return months;
};

export const getRemainingMonthsCount = (endDateStr) => {
  if (!endDateStr) return 0;
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;

  const parts = endDateStr.split('-');
  const endY = parseInt(parts[0], 10);
  const endM = parseInt(parts[1], 10);
  if (isNaN(endY) || isNaN(endM)) return 0;

  const diff = (endY - currentY) * 12 + (endM - currentM) + 1;
  return Math.max(0, diff);
};

export const getMonthsBetween = (startKey, endKey) => {
  if (!startKey || !endKey) return [];
  const [startYear, startMonth] = startKey.split('-').map(Number);
  const [endYear, endMonth] = endKey.split('-').map(Number);
  const months = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
};

export const calculatePendingLoan = (emi) => {
  if (!emi || !emi.amount) return 0;
  const emiAmount = Number(emi.amount) || 0;
  if (emi.endDate) {
    const remainingMonths = getRemainingMonthsCount(emi.endDate);
    return remainingMonths * emiAmount;
  }
  if (emi.totalLoan) {
    const paidMonthsCount = Object.values(emi.paid || {}).filter(s => s === 'Paid').length;
    return Math.max(0, Number(emi.totalLoan) - (paidMonthsCount * emiAmount));
  }
  return 0;
};

export const formatCurrency = (amount) => {
  const n = Number(amount);
  if (amount === null || amount === undefined || amount === '' || isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
};

// ─── Policy Terms & Timeline Helpers ──────────────────────────────────────────
export const addYearsToDate = (dateStr, years) => {
  if (!dateStr || !years || isNaN(years)) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + Number(years));
  return d.toISOString().split('T')[0];
};

export const getYearsDifference = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return '';
  const d1 = new Date(startDateStr);
  const d2 = new Date(endDateStr);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';
  const diffYears = d2.getFullYear() - d1.getFullYear();
  return diffYears > 0 ? diffYears : '';
};

export const calculatePolicyTimeline = ({
  startDate,
  payingTerm,
  policyTerm,
  paymentEndDate,
  maturityDate,
  amount,
  frequency = 'Yearly',
  alreadyPaid,
  totalPaid
}) => {
  const pTerm = Number(policyTerm) || (startDate && maturityDate ? getYearsDifference(startDate, maturityDate) : null);
  const payTerm = Number(payingTerm) || (startDate && paymentEndDate ? getYearsDifference(startDate, paymentEndDate) : null);

  const amt = Number(amount) || 0;
  const intervalMonths = { Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12 }[frequency] || 12;
  const installmentsPerYear = 12 / intervalMonths;

  const totalInstallments = payTerm ? Math.round(Number(payTerm) * installmentsPerYear) : null;
  const totalCommitment = totalInstallments && amt ? totalInstallments * amt : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calcEndDate = paymentEndDate || (startDate && payTerm ? addYearsToDate(startDate, payTerm) : '');
  const calcMaturityDate = maturityDate || (startDate && pTerm ? addYearsToDate(startDate, pTerm) : '');

  let isPremiumCompleted = false;
  let daysUntilPayEnd = null;

  if (calcEndDate) {
    const end = new Date(calcEndDate);
    if (!isNaN(end.getTime())) {
      isPremiumCompleted = end <= today;
      daysUntilPayEnd = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    }
  }

  let isMatured = false;
  let daysUntilMaturity = null;
  let yearsUntilMaturity = null;

  if (calcMaturityDate) {
    const mat = new Date(calcMaturityDate);
    if (!isNaN(mat.getTime())) {
      isMatured = mat <= today;
      daysUntilMaturity = Math.ceil((mat - today) / (1000 * 60 * 60 * 24));
      yearsUntilMaturity = Math.max(0, Math.round(((mat - today) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10);
    }
  }

  const paidAmount = Number(alreadyPaid ?? totalPaid) || 0;
  const remainingCommitment = totalCommitment !== null ? Math.max(0, totalCommitment - paidAmount) : null;

  return {
    payingTerm: payTerm,
    policyTerm: pTerm,
    calculatedPayEndDate: calcEndDate,
    calculatedMaturityDate: calcMaturityDate,
    totalInstallments,
    totalCommitment,
    isPremiumCompleted,
    daysUntilPayEnd,
    isMatured,
    daysUntilMaturity,
    yearsUntilMaturity,
    remainingCommitment
  };
};

// ─── Cumulative Investment / Premium Paid Calculation ─────────────────────────
export const calculateCumulativeInvestment = ({
  startDate,
  amount,
  frequency = 'Yearly',
  endDate,
  paymentEndDate,
  paymentHistory,
  alreadyPaid,
  totalPaidOverride
}) => {
  const explicitPaid = Number(alreadyPaid ?? totalPaidOverride);
  if (!isNaN(explicitPaid) && explicitPaid > 0) {
    const amt = Number(amount) || 0;
    const count = amt > 0 ? Math.round(explicitPaid / amt) : 1;
    const unitLabel = frequency === 'Yearly' ? 'yr' : frequency === 'Monthly' ? 'mo' : frequency === 'Quarterly' ? 'qtr' : 'inst.';
    return {
      totalPaid: explicitPaid,
      count,
      label: count > 1 ? `${count} ${unitLabel}s (₹${explicitPaid.toLocaleString('en-IN')})` : `₹${explicitPaid.toLocaleString('en-IN')} paid`,
      isManual: true
    };
  }

  const amt = Number(amount) || 0;
  if (!amt) return { totalPaid: 0, count: 0, label: '—' };

  if (frequency === 'One-Time' || !startDate) {
    return {
      totalPaid: amt,
      count: 1,
      label: frequency === 'One-Time' ? 'One-time deposit' : '1 installment'
    };
  }

  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    return { totalPaid: amt, count: 1, label: '1 installment' };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (start > today) {
    return { totalPaid: 0, count: 0, label: 'Not started yet' };
  }

  const stopStr = paymentEndDate || endDate;
  let endLimit = today;
  if (stopStr) {
    const end = new Date(stopStr);
    if (!isNaN(end.getTime()) && end < today) {
      endLimit = end;
    }
  }

  const intervalMonths = {
    Monthly: 1,
    Quarterly: 3,
    'Half-Yearly': 6,
    Yearly: 12,
  }[frequency] || 12;

  let count = 0;
  let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cur <= endLimit) {
    count++;
    cur = new Date(cur.getFullYear(), cur.getMonth() + intervalMonths, cur.getDate());
  }

  // Deduct explicitly marked missed payments if available
  if (paymentHistory) {
    const missed = Object.values(paymentHistory).filter(p => p?.status === 'Missed').length;
    count = Math.max(0, count - missed);
  }

  const totalPaid = count * amt;
  const unitLabel = frequency === 'Yearly' ? 'yr' : frequency === 'Monthly' ? 'mo' : frequency === 'Quarterly' ? 'qtr' : 'half-yr';
  const label = `${count} ${unitLabel}${count !== 1 ? 's' : ''} (${frequency})`;

  return {
    totalPaid,
    count,
    label
  };
};
