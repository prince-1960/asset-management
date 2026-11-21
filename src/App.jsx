import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Truck, Home, TrendingUp, CreditCard, Download,
  AlertTriangle, Cloud, CloudOff, Database, X, Check, RefreshCw, Lock, Shield, Plus,
  FileJson, Upload
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Fleet from './components/Fleet';
import Rooms from './components/Rooms';
import Investments from './components/Investments';
import Finances from './components/Finances';
import PinLock from './components/PinLock';
import {
  getVehicles, saveVehicles,
  getRooms, saveRooms,
  getInvestments, saveInvestments,
  getFinances, saveFinances,
  getPinHash, savePinHash,
  getFleetPinHash, saveFleetPinHash, hashPin,
  daysUntil, loadAllFromCloud, saveToCloud
} from './utils/storage';
import { exportToExcel, exportFleetToExcel } from './utils/export';
import { supabase, isSupabaseConfigured, setSupabaseAnonKey, getSupabaseAnonKey } from './utils/supabase';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',        icon: LayoutDashboard, section: 'OVERVIEW' },
  { id: 'fleet',       label: 'Fleet',            icon: Truck,          section: 'MODULES' },
  { id: 'rooms',       label: 'Rooms',            icon: Home,           section: 'MODULES' },
  { id: 'investments', label: 'Investments',      icon: TrendingUp,     section: 'MODULES' },
  { id: 'finances',    label: 'Expenses & Cards', icon: CreditCard,     section: 'MODULES' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [vehicles, setVehicles]       = useState(() => getVehicles());
  const [rooms, setRooms]             = useState(() => getRooms());
  const [investments, setInvestments] = useState(() => getInvestments());
  const [finances, setFinances]       = useState(() => getFinances());
  const [syncStatus, setSyncStatus]   = useState(isSupabaseConfigured() ? 'syncing' : 'offline');
  const [showDbModal, setShowDbModal] = useState(false);
  const [anonKeyInput, setAnonKeyInput] = useState(getSupabaseAnonKey() || '');

  // PIN & Role-Based Access Control State
  const [pinHash, setPinHash]             = useState(() => getPinHash());
  const [fleetPinHash, setFleetPinHash]   = useState(() => getFleetPinHash());
  const [userRole, setUserRole]           = useState('owner'); // 'owner' | 'fleet_only'
  const [isUnlocked, setIsUnlocked]       = useState(false);
  const [fleetPinInput, setFleetPinInput] = useState('');
  const [showFleetPinInput, setShowFleetPinInput] = useState(false);

  // Mobile FAB state
  const [showFabMenu, setShowFabMenu] = useState(false);

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
          if (cloudData.finances) setFinances(cloudData.finances);
          if (cloudData.auth_pin) {
            setPinHash(cloudData.auth_pin);
            savePinHash(cloudData.auth_pin);
          }
          if (cloudData.auth_fleet_pin) {
            setFleetPinHash(cloudData.auth_fleet_pin);
            saveFleetPinHash(cloudData.auth_fleet_pin);
          }
          setSyncStatus('synced');
        } else {
          // If cloud is empty, upload initial local data to seed Supabase
          saveToCloud('vehicles', vehicles);
          saveToCloud('rooms', rooms);
          saveToCloud('investments', investments);
          saveToCloud('finances', finances);
          if (pinHash) saveToCloud('auth_pin', pinHash);
          if (fleetPinHash) saveToCloud('auth_fleet_pin', fleetPinHash);
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
          if (key === 'finances' && value) setFinances(value);
          if (key === 'auth_pin' && value) {
            setPinHash(value);
            savePinHash(value);
          }
          if (key === 'auth_fleet_pin' && value) {
            setFleetPinHash(value);
            saveFleetPinHash(value);
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
  const updateFinances = (f) => { setFinances(f); saveFinances(f); };

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
    if (confirm('Are you sure you want to change your Master PIN? You will be prompted to enter a new 4-digit PIN.')) {
      setPinHash('');
      savePinHash('');
      setIsUnlocked(false);
      setShowDbModal(false);
    }
  };

  const handleSaveFleetPin = async (rawPin) => {
    if (!rawPin || rawPin.length !== 4) {
      alert('Please enter a 4-digit PIN for fleet access.');
      return;
    }
    const hash = await hashPin(rawPin);
    setFleetPinHash(hash);
    saveFleetPinHash(hash);
    setShowFleetPinInput(false);
    setFleetPinInput('');
    alert('Fleet Access PIN successfully saved! Your brother can now log in using this 4-digit PIN.');
  };

  const handleRemoveFleetPin = () => {
    if (confirm('Disable Fleet Access PIN? Your brother will no longer be able to log in with this PIN.')) {
      setFleetPinHash('');
      saveFleetPinHash('');
      setShowFleetPinInput(false);
      setFleetPinInput('');
      alert('Fleet Access PIN disabled.');
    }
  };

  // ── Browser Push Notifications ──────────────────────────
  const requestNotificationPermission = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') return;

      const today = new Date();
      const alerts = [];

      // Check vehicle EMI due dates
      vehicles.forEach(v => {
        if (v.emiDueDate) {
          const due = new Date(v.emiDueDate);
          const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) {
            alerts.push(`${v.name || v.regNumber || 'Vehicle'} EMI due in ${diffDays} day(s) (${v.emiDueDate})`);
          }
        }
      });

      // Check investment policy next due dates
      const policies = investments?.policies || [];
      policies.forEach(p => {
        if (p.nextDueDate) {
          const due = new Date(p.nextDueDate);
          const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) {
            alerts.push(`Policy "${p.name || 'Policy'}" premium due in ${diffDays} day(s) (${p.nextDueDate})`);
          }
        }
      });

      if (alerts.length > 0) {
        new Notification('AssetFlow Alert', {
          body: alerts.join('\n'),
          icon: '/favicon.ico',
        });
      }
    });
  };

  // Call notification check once after unlock
  useEffect(() => {
    if (isUnlocked) {
      requestNotificationPermission();
    }
  }, [isUnlocked]);

  // ── Auto-lock after 5 minutes of inactivity ─────────────
  useEffect(() => {
    if (!isUnlocked || !pinHash) return;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsUnlocked(false);
      }, 5 * 60 * 1000); // 5 minutes inactivity
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isUnlocked, pinHash]);

  // ── JSON Backup & Restore ────────────────────────────────
  const handleBackupJson = () => {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      vehicles,
      rooms,
      investments,
      finances,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AssetFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported.vehicles) {
          updateVehicles(imported.vehicles);
        }
        if (imported.rooms) {
          updateRooms(imported.rooms);
        }
        if (imported.investments) {
          updateInvestments(imported.investments);
        }
        if (imported.finances) {
          updateFinances(imported.finances);
        }
        alert('Data successfully restored from JSON backup!');
      } catch (err) {
        alert('Invalid or corrupted backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // If locked, render PIN screen only
  if (!isUnlocked) {
    return (
      <PinLock
        storedPinHash={pinHash}
        fleetPinHash={fleetPinHash}
        onUnlock={(role = 'owner') => {
          setUserRole(role);
          setIsUnlocked(true);
          if (role === 'fleet_only') {
            setPage('fleet');
          }
        }}
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

  const isFleetOnly = userRole === 'fleet_only';
  const effectivePage = isFleetOnly ? 'fleet' : page;
  const filteredNav = isFleetOnly ? NAV.filter(n => n.id === 'fleet') : NAV;
  const sections = [...new Set(filteredNav.map(n => n.section))];
  const handleExport = () => isFleetOnly ? exportFleetToExcel(vehicles) : exportToExcel(vehicles, rooms, investments);
  const pageProps = {
    vehicles,
    rooms,
    investments,
    finances,
    updateVehicles,
    updateRooms,
    updateInvestments,
    updateFinances,
    isFleetOnly
  };

  const pageTitle = {
    dashboard:   { title: 'Dashboard', subtitle: 'Your complete asset overview' },
    fleet:       { title: 'Fleet Management', subtitle: `${vehicles.length} vehicles tracked` },
    rooms:       { title: 'Property & Rooms', subtitle: `${rooms.length} room${rooms.length !== 1 ? 's' : ''} managed` },
    investments: { title: 'Investments', subtitle: 'SWP & portfolio tracking' },
    finances:    { title: 'Expenses & Cards', subtitle: 'Flat rent, monthly bills, upcoming projections & credit cards' },
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <div className="sidebar-logo-icon">{isFleetOnly ? '🚛' : '💼'}</div>
            <div>
              <div className="sidebar-logo-text">AssetFlow</div>
              <div className="sidebar-logo-sub">{isFleetOnly ? 'Fleet Portal' : 'Personal Dashboard'}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {filteredNav.filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${effectivePage === item.id ? 'active' : ''}`}
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
          {!isFleetOnly && (
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
          )}

          <button
            className="btn btn-secondary w-full"
            style={{ fontSize: 12, justifyContent: 'center' }}
            onClick={() => { setIsUnlocked(false); setUserRole('owner'); }}
            title="Lock app now"
          >
            <Lock size={14} /> Lock Dashboard
          </button>

          <button className="btn btn-secondary w-full" onClick={handleExport} id="btn-export-all">
            <Download size={15} />
            {isFleetOnly ? 'Export Fleet' : 'Export to Excel'}
          </button>

          {!isFleetOnly && (
            <button
              className="btn btn-secondary w-full"
              style={{ fontSize: 12, justifyContent: 'center' }}
              onClick={handleBackupJson}
              title="Download full JSON backup of all app data"
            >
              <FileJson size={14} /> Backup JSON
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{pageTitle[effectivePage]?.title}</div>
            <div className="topbar-subtitle">{pageTitle[effectivePage]?.subtitle}</div>
          </div>
          <div className="topbar-actions">
            {isFleetOnly && (
              <span className="badge badge-purple" style={{ padding: '6px 12px', fontSize: 12 }}>
                🚛 Fleet Access Mode
              </span>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setIsUnlocked(false); setUserRole('owner'); }}
              title="Lock dashboard"
            >
              <Lock size={14} /> Lock
            </button>

            {!isFleetOnly && (
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
            )}

            {expiryAlerts > 0 && (
              <div className="alert alert-danger" style={{ padding: '8px 14px', marginBottom: 0 }}>
                <AlertTriangle size={15} />
                <span>{expiryAlerts} document{expiryAlerts > 1 ? 's' : ''} expiring soon</span>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleExport} id="btn-topbar-export">
              <Download size={14} /> {isFleetOnly ? 'Export Fleet' : 'Export'}
            </button>
          </div>
        </header>

        <main className="page-content">
          {!isFleetOnly && effectivePage === 'dashboard'   && <Dashboard {...pageProps} />}
          {effectivePage === 'fleet'                       && <Fleet {...pageProps} isFleetOnly={isFleetOnly} />}
          {!isFleetOnly && effectivePage === 'rooms'       && <Rooms {...pageProps} />}
          {!isFleetOnly && effectivePage === 'investments' && <Investments {...pageProps} />}
          {!isFleetOnly && effectivePage === 'finances'    && <Finances {...pageProps} />}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ──────────────────── */}
      <nav className="mobile-bottom-nav">
        {filteredNav.map(item => (
          <button
            key={item.id}
            className={`mobile-bottom-nav-item ${effectivePage === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.id === 'fleet' && expiryAlerts > 0 && (
              <span className="mobile-nav-badge">{expiryAlerts}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Mobile FAB ────────────────────────────────────── */}
      <div className="mobile-fab-wrap">
        {showFabMenu && !isFleetOnly && (
          <div className="mobile-fab-menu">
            <button
              className="mobile-fab-menu-item"
              onClick={() => { setPage('fleet'); setShowFabMenu(false); }}
            >
              🚗 Log Fleet Income
            </button>
            <button
              className="mobile-fab-menu-item"
              onClick={() => { setPage('rooms'); setShowFabMenu(false); }}
            >
              🏠 Mark Rent Paid
            </button>
          </div>
        )}
        <button
          className="mobile-fab-btn"
          onClick={() => {
            if (isFleetOnly) {
              setPage('fleet');
            } else {
              setShowFabMenu(v => !v);
            }
          }}
          aria-label="Quick actions"
        >
          <Plus size={24} />
        </button>
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
                      <Shield size={16} color="var(--accent-indigo)" /> Master PIN (Owner - Full Access)
                    </div>
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                      {pinHash ? 'Owner PIN is active. Gives full access to all assets, finances, debts, and settings.' : 'No PIN configured yet.'}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetPin}>
                    {pinHash ? 'Change Master PIN' : 'Set Master PIN'}
                  </button>
                </div>
              </div>

              {/* Fleet-Only / Brother's Access PIN */}
              <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={16} color="var(--accent-cyan)" /> Fleet Access PIN (Brother's Access)
                    </div>
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                      {fleetPinHash
                        ? 'Active: Entering this 4-digit PIN gives access ONLY to Fleet Management.'
                        : 'No Fleet PIN configured. Set a separate 4-digit PIN for your brother.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {fleetPinHash && (
                      <button className="btn btn-danger btn-sm" onClick={handleRemoveFleetPin}>
                        Disable
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowFleetPinInput(p => !p)}>
                      {fleetPinHash ? 'Change Fleet PIN' : 'Set Fleet PIN'}
                    </button>
                  </div>
                </div>

                {showFleetPinInput && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      className="form-input"
                      type="password"
                      maxLength={4}
                      value={fleetPinInput}
                      onChange={e => setFleetPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 4-digit PIN for brother"
                      style={{ maxWidth: 220 }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSaveFleetPin(fleetPinInput)}
                      disabled={fleetPinInput.length !== 4}
                    >
                      <Check size={14} /> Save PIN
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowFleetPinInput(false); setFleetPinInput(''); }}>
                      Cancel
                    </button>
                  </div>
                )}

                <div className="text-sm" style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                  🔒 <strong>Privacy Guarantee:</strong> When your brother logs in using this PIN, the Dashboard, Rooms, Rent Collection, Family Loans, SWP, Insurance Policies, and Bank details are completely hidden and inaccessible to him.
                </div>
              </div>

              {/* Offline Backup & Restore */}
              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-soft)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileJson size={16} color="var(--accent-cyan)" /> Offline Data Backup &amp; Recovery
                </div>
                <div className="text-sm text-muted mb-12">
                  Download a full JSON snapshot of your data (Fleet, Rooms, Investments) or restore from a previously exported backup file.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleBackupJson}>
                    <Download size={13} /> Download JSON Backup
                  </button>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    <Upload size={13} /> Restore from JSON
                    <input type="file" accept=".json" onChange={handleRestoreJson} style={{ display: 'none' }} />
                  </label>
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
