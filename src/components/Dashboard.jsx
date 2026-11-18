import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Home, Truck, Zap, IndianRupee } from 'lucide-react';
import { daysUntil, formatDate, formatCurrency, currentMonthKey, monthLabel } from '../utils/storage';

const DOC_LABELS = { insurance: 'Insurance', puc: 'PUC', fitness: 'Fitness', permit: 'Permit' };

export default function Dashboard({ vehicles, rooms, investments }) {
  const thisMonth = currentMonthKey();

  // ── Fleet stats ──────────────────────────────────────────────────────
  const fleetIncome = useMemo(() => {
    const months = {};
    vehicles.forEach(v => {
      (v.income || []).forEach(e => {
        if (e.date && e.date.startsWith(thisMonth)) {
          months[thisMonth] = (months[thisMonth] || 0) + Number(e.amount || 0);
        }
      });
    });
    return months[thisMonth] || 0;
  }, [vehicles, thisMonth]);

  const emiDue = useMemo(() => {
    return vehicles.filter(v => v.emi?.amount > 0 && v.emi.paid?.[thisMonth] !== 'Paid');
  }, [vehicles, thisMonth]);

  // ── Expiry alerts ─────────────────────────────────────────────────────
  const expiryAlerts = useMemo(() => {
    const alerts = [];
    vehicles.forEach(v => {
      Object.entries(v.documents || {}).forEach(([docKey, doc]) => {
        if (!doc.expiry) return;
        const days = daysUntil(doc.expiry);
        if (days !== null && days <= 60) {
          alerts.push({ vehicle: v.name, doc: DOC_LABELS[docKey] || docKey, days, expiry: doc.expiry });
        }
      });
    });
    return alerts.sort((a, b) => a.days - b.days);
  }, [vehicles]);

  // ── Rent stats ────────────────────────────────────────────────────────
  const rentStats = useMemo(() => {
    let paid = 0, unpaid = 0, partial = 0, totalExpected = 0;
    rooms.forEach(r => {
      const rent = r.currentRent || 0;
      totalExpected += rent;
      const p = r.payments?.[thisMonth];
      if (!p || p.status === 'Unpaid') unpaid++;
      else if (p.status === 'Paid') { paid++; }
      else { partial++; }
    });
    const collected = rooms.reduce((sum, r) => {
      const p = r.payments?.[thisMonth];
      if (p?.status === 'Paid') return sum + (r.currentRent || 0);
      if (p?.status === 'Partial') return sum + (Number(p.amount) || 0);
      return sum;
    }, 0);
    return { paid, unpaid, partial, totalExpected, collected, total: rooms.length };
  }, [rooms, thisMonth]);

  // ── SWP ───────────────────────────────────────────────────────────────
  const swp = investments?.swp;
  const swpThisMonth = swp?.payouts?.[thisMonth];

  return (
    <div className="animate-in">
      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="mb-20">
          <div className="section-header">
            <div>
              <div className="section-title">🚨 Document Alerts</div>
              <div className="section-subtitle">Requiring attention in the next 60 days</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expiryAlerts.map((a, i) => (
              <div key={i} className={`alert ${a.days <= 0 ? 'alert-danger' : a.days <= 30 ? 'alert-danger' : 'alert-warning'}`}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <div>
                  <span className="font-bold">{a.vehicle}</span> — {a.doc}
                  {a.days <= 0
                    ? <span style={{ marginLeft: 8 }}>⚠️ EXPIRED {Math.abs(a.days)} day{Math.abs(a.days) !== 1 ? 's' : ''} ago ({formatDate(a.expiry)})</span>
                    : <span style={{ marginLeft: 8 }}>expires in <strong>{a.days} day{a.days !== 1 ? 's' : ''}</strong> ({formatDate(a.expiry)})</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid-cols-4 mb-20">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Truck size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="stat-label">Fleet Income (This Month)</div>
          <div className="stat-value">{formatCurrency(fleetIncome)}</div>
          <div className="stat-sub">{vehicles.length} vehicles</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <IndianRupee size={20} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div className="stat-label">EMI Pending (This Month)</div>
          <div className="stat-value">{formatCurrency(emiDue.reduce((s, v) => s + (v.emi?.amount || 0), 0))}</div>
          <div className="stat-sub">{emiDue.length} vehicle{emiDue.length !== 1 ? 's' : ''} unpaid</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Home size={20} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div className="stat-label">Rent Collected (This Month)</div>
          <div className="stat-value">{formatCurrency(rentStats.collected)}</div>
          <div className="stat-sub">{rentStats.paid}/{rentStats.total} rooms paid</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <TrendingUp size={20} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div className="stat-label">SWP Payout (This Month)</div>
          <div className="stat-value">{swp?.monthlyWithdrawal ? formatCurrency(swp.monthlyWithdrawal) : '—'}</div>
          <div className="stat-sub">
            {swpThisMonth?.status === 'Received' ? '✅ Received' : swp?.monthlyWithdrawal ? '⏳ Pending' : 'Not configured'}
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ gap: 20 }}>
        {/* Rent Breakdown */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div className="section-title">🏠 Rent — {monthLabel(thisMonth)}</div>
            <span className="badge badge-blue">{rentStats.total} rooms</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>{rentStats.paid}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paid</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-red)' }}>{rentStats.unpaid}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Unpaid</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-amber)' }}>{rentStats.partial}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Partial</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-secondary mb-4">
              <span>Collection progress</span>
              <span>{formatCurrency(rentStats.collected)} / {formatCurrency(rentStats.totalExpected)}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: rentStats.totalExpected ? `${Math.min(100, (rentStats.collected / rentStats.totalExpected) * 100)}%` : '0%',
                  background: 'linear-gradient(to right, var(--accent-green), var(--accent-cyan))'
                }}
              />
            </div>
          </div>
          {rooms.length === 0 && <div className="text-muted text-sm mt-8">No rooms added yet. Go to Rooms to add.</div>}
        </div>

        {/* EMI Status */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div className="section-title">🚗 EMI Status — {monthLabel(thisMonth)}</div>
          </div>
          {vehicles.filter(v => v.emi?.amount > 0).length === 0 ? (
            <div className="text-muted text-sm">No EMI configured. Add EMI details in Fleet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.filter(v => v.emi?.amount > 0).map(v => {
                const paid = v.emi.paid?.[thisMonth] === 'Paid';
                return (
                  <div key={v.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{v.name}</div>
                      <div className="text-sm text-muted">{v.emi.lender || 'No lender'}</div>
                    </div>
                    <div className="flex items-center gap-8">
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(v.emi.amount)}</span>
                      <span className={`badge ${paid ? 'badge-green' : 'badge-red'}`}>{paid ? 'Paid' : 'Pending'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick doc expiry table */}
      {expiryAlerts.length === 0 && (
        <div className="card mt-20">
          <div className="flex items-center gap-8" style={{ color: 'var(--accent-green)' }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600 }}>All documents are up to date</div>
              <div className="text-sm text-muted">No documents expiring in the next 60 days</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
