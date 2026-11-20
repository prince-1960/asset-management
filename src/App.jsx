import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Truck, Home, TrendingUp, Download,
  AlertTriangle, Cloud, CloudOff, Database, X, Check, RefreshCw, Lock, Shield
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Fleet from './components/Fleet';
import Rooms from './components/Rooms';
import Investments from './components/Investments';
import PinLock from './components/PinLock';
import {
  getVehicles, saveVehicles,
  getRooms, saveRooms,
  getInvestments, saveInvestments,
  getPinHash, savePinHash,
  daysUntil, loadAllFromCloud, saveToCloud
} from './utils/storage';
import { exportToExcel } from './utils/export';
import { supabase, isSupabaseConfigured, setSupabaseAnonKey, getSupabaseAnonKey } from './utils/supabase';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { id: 'fleet',     label: 'Fleet',     icon: Truck,          section: 'MODULES' },
  { id: 'rooms',     label: 'Rooms',     icon: Home,           section: 'MODULES' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, section: 'MODULES' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [vehicles, setVehicles]       = useState(() => getVehicles());
  const [rooms, setRooms]             = useState(() => getRooms());
  const [investments, setInvestments] = useState(() => getInvestments());
  const [syncStatus, setSyncStatus]   = useState(isSupabaseConfigured() ? 'syncing' : 'offline');
  const [showDbModal, setShowDbModal] = useState(false);
  const [anonKeyInput, setAnonKeyInput] = useState(getSupabaseAnonKey() || '');

  // PIN Protection State
  const [pinHash, setPinHash]         = useState(() => getPinHash());
  const [isUnlocked, setIsUnlocked]   = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    let active = true;

    if (isSupabaseConfigured() && supabase) {
      setSyncStatus('syncing');
      loadAllFromCloud().then(cloudData => {
        if (!active) return;
        if (cloudData) {
          if (cloudData.vehicles) setVehicles(cloudData.vehicles);
          if (cloudData.rooms) setRooms(cloudData.rooms);
          if (cloudData.investments) setInvestments(cloudData.investments);
          if (cloudData.auth_pin) {
            setPinHash(cloudData.auth_pin);
            savePinHash(cloudData.auth_pin);
          }
          setSyncStatus('synced');
        } else {
          // If cloud is empty, upload initial local data to seed Supabase
          saveToCloud('vehicles', vehicles);
          saveToCloud('rooms', rooms);
          saveToCloud('investments', investments);
          if (pinHash) saveToCloud('auth_pin', pinHash);
          setSyncStatus('synced');
        }
      }).catch(() => {
        if (active) setSyncStatus('error');
      });

      // Realtime listener for cross-device sync (e.g. phone <-> laptop)
      const channel = supabase.channel('realtime_app_data')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, (payload) => {
          if (!active) return;
          const { key, value } = payload.new || {};
          if (key === 'vehicles' && value) setVehicles(value);
          if (key === 'rooms' && value) setRooms(value);
          if (key === 'investments' && value) setInvestments(value);
          if (key === 'auth_pin' && value) {
            setPinHash(value);
            savePinHash(value);
          }
          setSyncStatus('synced');
        })
        .subscribe();

      return () => {
        active = false;
        supabase.removeChannel(channel);
      };
    } else {
      setSyncStatus('offline');
    }
  }, []);

  const updateVehicles = (v) => { setVehicles(v); saveVehicles(v); };
  const updateRooms    = (r) => { setRooms(r);    saveRooms(r); };
  const updateInvestments = (i) => { setInvestments(i); saveInvestments(i); };

  const handleSaveAnonKey = () => {
    setSupabaseAnonKey(anonKeyInput);
    setShowDbModal(false);
    window.location.reload();
  };

  const handleSetPin = (hash) => {
    setPinHash(hash);
    savePinHash(hash);
  };

  const handleResetPin = () => {
    if (confirm('Are you sure you want to change your PIN? You will be prompted to enter a new 4-digit PIN.')) {
      setPinHash('');
      savePinHash('');
      setIsUnlocked(false);
      setShowDbModal(false);
    }
  };

  // If locked, render PIN screen only
  if (!isUnlocked) {
    return (
      <PinLock
        storedPinHash={pinHash}
        onUnlock={() => setIsUnlocked(true)}
        onSetPin={handleSetPin}
      />
    );
  }

  // Count expiry alerts
  const expiryAlerts = vehicles.reduce((count, v) => {
    const docs = v.documents || {};
    for (const doc of Object.values(docs)) {
      const days = daysUntil(doc.expiry);
      if (days !== null && days <= 30) count++;
    }
    return count;
  }, 0);

  const sections = [...new Set(NAV.map(n => n.section))];
  const handleExport = () => exportToExcel(vehicles, rooms, investments);
  const pageProps = { vehicles, rooms, investments, updateVehicles, updateRooms, updateInvestments };

  const pageTitle = {
    dashboard:   { title: 'Dashboard', subtitle: 'Your complete asset overview' },
    fleet:       { title: 'Fleet Management', subtitle: `${vehicles.length} vehicles tracked` },
    rooms:       { title: 'Property & Rooms', subtitle: `${rooms.length} room${rooms.length !== 1 ? 's' : ''} managed` },
    investments: { title: 'Investments', subtitle: 'SWP & portfolio tracking' },
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <div className="sidebar-logo-icon">💼</div>
            <div>
              <div className="sidebar-logo-text">AssetFlow</div>
              <div className="sidebar-logo-sub">Personal Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {NAV.filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}
                  id={`nav-${item.id}`}
                >
                  <item.icon className="nav-item-icon" size={18} />
                  {item.label}
                  {item.id === 'fleet' && expiryAlerts > 0 && (
                    <span className="nav-badge">{expiryAlerts}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-secondary w-full"
            style={{ fontSize: 12, justifyContent: 'center' }}
            onClick={() => setShowDbModal(true)}
          >
            {syncStatus === 'synced' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}>
                <Cloud size={14} /> Cloud Synced
              </span>
            ) : syncStatus === 'syncing' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-cyan)' }}>
                <RefreshCw size={14} className="spinner" /> Syncing...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                <Database size={14} /> Connect Cloud DB
              </span>
            )}
          </button>

          <button
            className="btn btn-secondary w-full"
            style={{ fontSize: 12, justifyContent: 'center' }}
            onClick={() => setIsUnlocked(false)}
            title="Lock app now"
          >
            <Lock size={14} /> Lock Dashboard
          </button>

          <button className="btn btn-secondary w-full" onClick={handleExport} id="btn-export-all">
            <Download size={15} />
            Export to Excel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{pageTitle[page]?.title}</div>
            <div className="topbar-subtitle">{pageTitle[page]?.subtitle}</div>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsUnlocked(false)}
              title="Lock dashboard"
            >
              <Lock size={14} /> Lock
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowDbModal(true)}
              title="Cloud Database Settings"
            >
              {syncStatus === 'synced' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-green)' }}>
                  <Cloud size={14} /> Synced
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={14} /> Database
                </span>
              )}
            </button>

            {expiryAlerts > 0 && (
              <div className="alert alert-danger" style={{ padding: '8px 14px', marginBottom: 0 }}>
                <AlertTriangle size={15} />
                <span>{expiryAlerts} document{expiryAlerts > 1 ? 's' : ''} expiring soon</span>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleExport} id="btn-topbar-export">
              <Download size={14} /> Export
            </button>
          </div>
        </header>

        <main className="page-content">
          {page === 'dashboard'   && <Dashboard {...pageProps} />}
          {page === 'fleet'       && <Fleet {...pageProps} />}
          {page === 'rooms'       && <Rooms {...pageProps} />}
          {page === 'investments' && <Investments {...pageProps} />}
        </main>
      </div>

      {/* Database & Security Modal */}
      {showDbModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDbModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} /> Cloud & Security Settings
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowDbModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {/* Security section */}
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={16} color="var(--accent-indigo)" /> Master PIN Protection
                    </div>
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                      {pinHash ? 'Your dashboard is protected with a 4-digit PIN.' : 'No PIN configured yet.'}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetPin}>
                    {pinHash ? 'Change PIN' : 'Set PIN'}
                  </button>
                </div>
              </div>

              {/* Connected Supabase Project */}
              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-soft)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>🔗 Connected Supabase Project</div>
                <div className="text-sm" style={{ color: 'var(--accent-indigo)', fontFamily: 'monospace' }}>
                  https://wtglmjmamlfcgevtfydp.supabase.co
                </div>
              </div>

              <div className="form-group mb-16">
                <label className="form-label">Supabase Anon / Public API Key</label>
                <input
                  className="form-input"
                  type="password"
                  value={anonKeyInput}
                  onChange={e => setAnonKeyInput(e.target.value)}
                  placeholder="Paste your anon public key (eyJh...)"
                />
                <div className="text-sm text-muted" style={{ marginTop: 6 }}>
                  Find this in your Supabase dashboard: <strong>Project Settings (⚙️) → API → anon public</strong> key.
                </div>
              </div>

              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-soft)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📋 One-Time Database Setup (Run in SQL Editor):</div>
                <div className="text-sm text-muted mb-8">
                  Copy and paste this into Supabase <strong>SQL Editor</strong> and click <strong>Run</strong>:
                </div>
                <pre style={{
                  background: '#0d1117',
                  color: '#e6edf3',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  overflowX: 'auto',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
{`create table if not exists public.app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_data enable row level security;

create policy "Allow all operations for anon"
  on public.app_data
  for all
  using (true)
  with check (true);

alter publication supabase_realtime add table public.app_data;`}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDbModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAnonKey}>
                <Check size={14} /> Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
