import { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, Home, Truck, Zap, IndianRupee, Landmark, Calendar, Check, ChevronRight } from 'lucide-react';
import {
  daysUntil, formatDate, formatCurrency, currentMonthKey, monthLabel,
  calculatePendingLoan, getRemainingMonthsCount
} from '../utils/storage';

const DOC_LABELS = { insurance: 'Insurance', puc: 'PUC', fitness: 'Fitness', permit: 'Permit' };
const VEHICLE_EMOJI = { Truck: '🚛', Car: '🚗', Traveller: '🚐' };

export default function Dashboard({ vehicles, rooms, investments, updateVehicles }) {
  const thisMonth = currentMonthKey();
  const [loanView, setLoanView] = useState('all'); // 'all' | 'pending_only'

  // ── Fleet stats ──────────────────────────────────────────────────────
  const fleetIncome = useMemo(() => {
    let total = 0;
    vehicles.forEach(v => {
      (v.income || []).forEach(e => {
        if (e.date && e.date.startsWith(thisMonth)) {
          total += Number(e.amount || 0);
        }
      });
    });
    return total;
  }, [vehicles, thisMonth]);

  const emiDue = useMemo(() => {
    return vehicles.filter(v => v.emi?.amount > 0 && v.emi.paid?.[thisMonth] !== 'Paid');
  }, [vehicles, thisMonth]);

  // ── Combined Loan & Debt Statistics ───────────────────────────────────
  const loanStats = useMemo(() => {
    let totalPending = 0;
    let totalMonthlyEmi = 0;
    let activeLoanCount = 0;
    let paidThisMonthCount = 0;
    const vehicleLoans = [];

    vehicles.forEach(v => {
      const emi = v.emi || {};
      const emiAmount = Number(emi.amount || 0);
      if (emiAmount > 0) {
        activeLoanCount++;
        totalMonthlyEmi += emiAmount;
        const pendingAmount = calculatePendingLoan(emi);
        totalPending += pendingAmount;
        const remainingMonths = emi.endDate ? getRemainingMonthsCount(emi.endDate) : 0;
        const isPaidThisMonth = emi.paid?.[thisMonth] === 'Paid';
        if (isPaidThisMonth) paidThisMonthCount++;

        vehicleLoans.push({
          id: v.id,
          name: v.name,
          type: v.type,
          regNumber: v.regNumber,
          lender: emi.lender || '—',
          monthlyEmi: emiAmount,
          dueDate: emi.dueDate || 1,
          endDate: emi.endDate,
          remainingMonths,
          pendingAmount,
          totalLoan: Number(emi.totalLoan || 0),
          isPaidThisMonth
        });
      }
    });

    return {
      totalPending,
      totalMonthlyEmi,
      activeLoanCount,
      paidThisMonthCount,
      unpaidThisMonthCount: activeLoanCount - paidThisMonthCount,
      vehicleLoans: vehicleLoans.sort((a, b) => b.pendingAmount - a.pendingAmount)
    };
  }, [vehicles, thisMonth]);

  // Toggle EMI status directly from Dashboard
  const toggleEmiPaid = (vehicleId) => {
    if (!updateVehicles) return;
    updateVehicles(vehicles.map(v => {
      if (v.id !== vehicleId) return v;
      const current = v.emi?.paid?.[thisMonth];
      const next = current === 'Paid' ? 'Unpaid' : 'Paid';
      return { ...v, emi: { ...v.emi, paid: { ...(v.emi?.paid || {}), [thisMonth]: next } } };
    }));
  };

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

      {/* Top Stat Cards */}
      <div className="grid-cols-4 mb-20">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Truck size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="stat-label">Fleet Income ({monthLabel(thisMonth).split(' ')[0]})</div>
          <div className="stat-value">{formatCurrency(fleetIncome)}</div>
          <div className="stat-sub">{vehicles.length} vehicles total</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <Landmark size={20} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div className="stat-label">Total Loan Left (Combined)</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>
            {loanStats.totalPending > 0 ? formatCurrency(loanStats.totalPending) : '₹0'}
          </div>
          <div className="stat-sub">Across {loanStats.activeLoanCount} vehicle loans</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <IndianRupee size={20} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="stat-label">Monthly EMI Due ({monthLabel(thisMonth).split(' ')[0]})</div>
          <div className="stat-value">
            {formatCurrency(emiDue.reduce((s, v) => s + (v.emi?.amount || 0), 0))}
          </div>
          <div className="stat-sub">{emiDue.length} of {loanStats.activeLoanCount} EMIs unpaid</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Home size={20} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div className="stat-label">Rent Collected ({monthLabel(thisMonth).split(' ')[0]})</div>
          <div className="stat-value">{formatCurrency(rentStats.collected)}</div>
          <div className="stat-sub">{rentStats.paid}/{rentStats.total} rooms paid</div>
        </div>
      </div>

      {/* COMBINED LOANS & DEBT PORTFOLIO SECTION */}
      <div className="card mb-20" style={{ border: '1px solid rgba(239, 68, 68, 0.25)', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.03) 0%, var(--bg-card) 100%)' }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Landmark size={20} color="var(--accent-red)" /> Combined Vehicle Loans & Outstanding Debt
            </div>
            <div className="section-subtitle">
              Live breakdown of pending loans across all Trucks, Cars, and Traveller
            </div>
          </div>
          <div className="flex items-center gap-8">
            <span className="badge badge-purple" style={{ fontSize: 13, padding: '4px 10px' }}>
              Total Monthly Commitment: {formatCurrency(loanStats.totalMonthlyEmi)}/mo
            </span>
          </div>
        </div>

        {loanStats.vehicleLoans.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-state-title">No vehicle loans configured yet</div>
            <div className="empty-state-desc">
              Go to Fleet → Edit Vehicle to set monthly EMI and loan end date.
            </div>
          </div>
        ) : (
          <div>
            {/* Summary highlight boxes */}
            <div className="grid-cols-3 gap-12 mb-16">
              <div style={{ background: 'var(--bg-base)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-sm text-muted">Total Pending Loan Principal</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-red)', marginTop: 4 }}>
                  {loanStats.totalPending > 0 ? formatCurrency(loanStats.totalPending) : '—'}
                </div>
                <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
                  Calculated from remaining EMIs up to end dates
                </div>
              </div>

              <div style={{ background: 'var(--bg-base)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-sm text-muted">This Month's EMI Status ({monthLabel(thisMonth).split(' ')[0]})</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: loanStats.unpaidThisMonthCount === 0 ? 'var(--accent-green)' : 'var(--accent-amber)', marginTop: 4 }}>
                  {loanStats.paidThisMonthCount} / {loanStats.activeLoanCount} Paid
                </div>
                <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
                  {loanStats.unpaidThisMonthCount > 0
                    ? `${formatCurrency(emiDue.reduce((s, v) => s + (v.emi?.amount || 0), 0))} still due this month`
                    : 'All vehicle EMIs cleared for this month! 🎉'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-base)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-sm text-muted">Total Active Vehicle Loans</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {loanStats.activeLoanCount} Vehicles
                </div>
                <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
                  {vehicles.length - loanStats.activeLoanCount} vehicles 100% debt-free
                </div>
              </div>
            </div>

            {/* Individual Vehicle Loan Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Lender / Bank</th>
                    <th>Monthly EMI</th>
                    <th>Last EMI Date</th>
                    <th>Tenure Left</th>
                    <th>Pending Loan Left</th>
                    <th>Status ({monthLabel(thisMonth).split(' ')[0]})</th>
                  </tr>
                </thead>
                <tbody>
                  {loanStats.vehicleLoans.map(vl => (
                    <tr key={vl.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{VEHICLE_EMOJI[vl.type] || '🚗'}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{vl.name}</div>
                            <div className="text-sm text-muted">
                              {vl.type} {vl.regNumber ? `· ${vl.regNumber.toUpperCase()}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{vl.lender}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{formatCurrency(vl.monthlyEmi)}</div>
                        <div className="text-sm text-muted">Due {vl.dueDate}th</div>
                      </td>
                      <td>
                        {vl.endDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} color="var(--accent-cyan)" />
                            <span>{monthLabel(vl.endDate)}</span>
                          </div>
                        ) : (
                          <span className="badge badge-muted">Not set</span>
                        )}
                      </td>
                      <td>
                        {vl.endDate ? (
                          <span className="badge badge-purple">{vl.remainingMonths} months</span>
                        ) : (
                          <span className="text-sm text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-red)' }}>
                          {vl.pendingAmount > 0 ? formatCurrency(vl.pendingAmount) : '—'}
                        </div>
                        {vl.totalLoan > 0 && (
                          <div className="text-sm text-muted">Sanctioned: {formatCurrency(vl.totalLoan)}</div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleEmiPaid(vl.id)}
                          className={`btn btn-sm ${vl.isPaidThisMonth ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            background: vl.isPaidThisMonth ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.2)',
                            borderColor: vl.isPaidThisMonth ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
                            color: vl.isPaidThisMonth ? 'var(--accent-green)' : 'var(--accent-red)'
                          }}
                          title="Click to toggle Paid/Due"
                        >
                          {vl.isPaidThisMonth ? '✓ Paid' : '⏳ Mark Paid'}
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

      {/* Rent & SWP Progress Grid */}
      <div className="grid-cols-2" style={{ gap: 20 }}>
        {/* Rent Breakdown */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div className="section-title">🏠 Rent Collection — {monthLabel(thisMonth)}</div>
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

        {/* SWP & Monthly Payouts */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div className="section-title">📈 Investments & SWP Payout</div>
            <span className="badge badge-purple">{monthLabel(thisMonth).split(' ')[0]}</span>
          </div>
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
            <div className="text-sm text-muted">SWP Monthly Expected Payout</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-purple)', marginTop: 4 }}>
              {swp?.monthlyWithdrawal ? formatCurrency(swp.monthlyWithdrawal) : 'Not configured'}
            </div>
            <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
              Corpus: {swp?.corpus ? formatCurrency(swp.corpus) : '—'}
            </div>
          </div>
          <div className="flex items-center justify-between" style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>This Month's Withdrawal</div>
              <div className="text-sm text-muted">{monthLabel(thisMonth)}</div>
            </div>
            <span className={`badge ${swpThisMonth?.status === 'Received' ? 'badge-green' : 'badge-amber'}`}>
              {swpThisMonth?.status === 'Received' ? '✅ Received' : '⏳ Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick doc expiry summary if all valid */}
      {expiryAlerts.length === 0 && (
        <div className="card mt-20">
          <div className="flex items-center gap-8" style={{ color: 'var(--accent-green)' }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600 }}>All vehicle documents are up to date</div>
              <div className="text-sm text-muted">No Insurance, PUC, Fitness, or Permits expiring in the next 60 days</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
