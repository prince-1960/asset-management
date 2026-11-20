// Storage utilities for AssetFlow app

import { supabase, isSupabaseConfigured } from './supabase';

const KEYS = {
  VEHICLES: 'assetflow_vehicles',
  ROOMS: 'assetflow_rooms',
  INVESTMENTS: 'assetflow_investments',
  SETTINGS: 'assetflow_settings',
  PIN_HASH: 'assetflow_pin_hash',
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
export const getInvestments = () => get(KEYS.INVESTMENTS) || defaultInvestments();
export const saveInvestments = (data) => {
  set(KEYS.INVESTMENTS, data);
  saveToCloud('investments', data);
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
  };
}

// ID generator
export const genId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};
