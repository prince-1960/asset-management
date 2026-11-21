import { useMemo, useState } from 'react';
import {
  AlertTriangle, TrendingUp, Home, Truck, Zap, IndianRupee,
  Landmark, Calendar, Check, ChevronRight, MessageCircle,
  Shield, ArrowUpRight, ArrowDownLeft, PieChart, Activity, Sparkles, Clock, Briefcase
} from 'lucide-react';
import {
  daysUntil, formatDate, formatCurrency, currentMonthKey, monthLabel,
  calculatePendingLoan, getRemainingMonthsCount, getLast12Months
} from '../utils/storage';

const DOC_LABELS = { insurance: 'Insurance', puc: 'PUC', fitness: 'Fitness', permit: 'Permit' };
const VEHICLE_EMOJI = { Truck: '🚛', Car: '🚗', Traveller: '🚐', Bike: '🏍️' };

export default function Dashboard({ vehicles, rooms, investments, updateVehicles, finances }) {
  const thisMonth = currentMonthKey();
  const last6Months = useMemo(() => getLast12Months().slice(6), []);

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
    const unpaidRooms = [];
    rooms.forEach(r => {
      const rent = r.currentRent || 0;
      totalExpected += rent;
      const p = r.payments?.[thisMonth];
      if (!p || p.status === 'Unpaid') {
        unpaid++;
        unpaidRooms.push({ ...r, status: 'Unpaid', pendingAmount: rent });
      } else if (p.status === 'Paid') {
        paid++;
      } else {
        partial++;
        const paidAmt = Number(p.amount) || 0;
        unpaidRooms.push({ ...r, status: 'Partial', pendingAmount: Math.max(0, rent - paidAmt) });
      }
    });
    const collected = rooms.reduce((sum, r) => {
      const p = r.payments?.[thisMonth];
      if (p?.status === 'Paid') return sum + (r.currentRent || 0);
      if (p?.status === 'Partial') return sum + (Number(p.amount) || 0);
      return sum;
    }, 0);
    return { paid, unpaid, partial, totalExpected, collected, total: rooms.length, unpaidRooms };
  }, [rooms, thisMonth]);

  // ── SWP ───────────────────────────────────────────────────────────────
  const swp = investments?.swp;
  const swpThisMonth = swp?.payouts?.[thisMonth];
  const swpReceivedAmount = swpThisMonth?.status === 'Received' ? Number(swpThisMonth.amount || swp.monthlyWithdrawal || 0) : 0;

  // ── Salary Inflow (Realized this month) ────────────────────────────────
  const salaryRecord = finances?.salary?.history?.[thisMonth] || finances?.salary?.receipts?.[thisMonth];
  const salaryAmount = Number(finances?.salary?.amount || 0);
  const isSalaryReceived = salaryRecord ? salaryRecord.status === 'Received' : false;
  const salaryInflow = isSalaryReceived ? (Number(salaryRecord?.amount) || salaryAmount) : 0;

  // ── Credit Card Monthly Dues & Total Debt ─────────────────────────────
  const ccObligations = useMemo(() => {
    let bills = 0;
    let emis = 0;
    let totalOutstanding = 0;
    (finances?.creditCards || []).forEach(c => {
      bills += Number(c.monthlyBill || 0);
      totalOutstanding += Number(c.totalOutstanding || 0);
      (c.emis || []).forEach(e => {
        emis += Number(e.emiAmount || 0);
      });
    });
    return { bills, emis, totalDue: bills + emis, totalOutstanding };
  }, [finances?.creditCards]);

  // ── Monthly Loans Given (Lending) Inflow ──────────────────────────────
  const lendingInflow = useMemo(() => {
    let total = 0;
    (investments?.loansGiven || []).forEach(l => {
      if (l.status !== 'Active') return;
      const payout = l.payouts?.[thisMonth];
      const monthlyAmt = Number(l.monthlyPayout || 0);
      if (payout?.status === 'Received') {
        total += Number(payout.amount || monthlyAmt);
      }
    });
    return total;
  }, [investments?.loansGiven, thisMonth]);

  // ── Principal Amount Lent (Asset Receivable) ──────────────────────────
  const totalPrincipalLent = useMemo(() => {
    return (investments?.loansGiven || []).reduce((sum, l) => {
      return l.status === 'Active' ? sum + Number(l.principalAmount || 0) : sum;
    }, 0);
  }, [investments?.loansGiven]);

  // ── Real Policy Maturity Assets (Excluding Health & pure Term) ─────────
  const policyMaturityAssets = useMemo(() => {
    return (investments?.policies || []).reduce((sum, p) => {
      if (p.status !== 'Active') return sum;
      // Health insurance is pure protection cover, NEVER an investment asset
      if (p.type === 'Health') return sum;
      // Pure Term insurance without maturity is life cover, not an asset
      if (p.type === 'Term' && !p.maturityAmount) return sum;
      return sum + Number(p.maturityAmount || 0);
    }, 0);
  }, [investments?.policies]);

  // ── Monthly Outflow Calculations (EMIs + Policies Due + SIPs + CC + Recurring Rent/Bills) ─────
  const monthlyObligations = useMemo(() => {
    let policyDueTotal = 0;
    const duePolicies = [];
    (investments?.policies || []).forEach(p => {
      if (p.status !== 'Active') return;
      const due = p.nextDueDate;
      if (due && due.startsWith(thisMonth)) {
        const amt = Number(p.premiumAmount || 0);
        policyDueTotal += amt;
        duePolicies.push({ name: p.policyName || p.insurer, amount: amt, due });
      }
    });

    let sipsDueTotal = 0;
    (investments?.portfolio || []).forEach(p => {
      if (p.status === 'Active' && p.frequency === 'Monthly') {
        sipsDueTotal += Number(p.amount || 0);
      }
    });

    let recurringDueTotal = 0;
    (finances?.recurringExpenses || []).forEach(e => {
      if (e.status !== 'Paused') {
        recurringDueTotal += Number(e.amount || 0);
      }
    });

    return {
      emiTotal: loanStats.totalMonthlyEmi,
      policyDueTotal,
      sipsDueTotal,
      ccDueTotal: ccObligations.totalDue,
      recurringDueTotal,
      totalOutflow: loanStats.totalMonthlyEmi + policyDueTotal + sipsDueTotal + ccObligations.totalDue + recurringDueTotal,
      duePolicies
    };
  }, [loanStats, investments, ccObligations.totalDue, finances?.recurringExpenses, thisMonth]);

  // ── Monthly P&L Summary ───────────────────────────────────────────────
  const monthlyPL = useMemo(() => {
    const totalInflow = fleetIncome + rentStats.collected + swpReceivedAmount + salaryInflow + lendingInflow;
    const totalOutflow = monthlyObligations.totalOutflow;
    const netCashflow = totalInflow - totalOutflow;
    const isSurplus = netCashflow >= 0;

    return {
      totalInflow,
      totalOutflow,
      netCashflow,
      isSurplus,
      fleetIncome,
      rentCollected: rentStats.collected,
      swpReceived: swpReceivedAmount,
      salaryInflow,
      lendingInflow
    };
  }, [fleetIncome, rentStats.collected, swpReceivedAmount, salaryInflow, lendingInflow, monthlyObligations.totalOutflow]);

  // ── Net Worth Estimator ───────────────────────────────────────────────
  const netWorth = useMemo(() => {
    const swpCorpus = Number(investments?.swp?.corpus || 0);
    const portfolioValue = (investments?.portfolio || []).reduce((sum, p) => sum + Number(p.currentValue || p.amount || 0), 0);
    // Realized wealth assets: SWP + Portfolio + Loans Given (Principal Lent) + Real Policy Maturities (excluding Health & pure Term)
    const totalAssets = swpCorpus + portfolioValue + policyMaturityAssets + totalPrincipalLent;
    const totalLiabilities = loanStats.totalPending + ccObligations.totalOutstanding;
    const net = totalAssets - totalLiabilities;
    return {
      swpCorpus,
      portfolioValue,
      policyMaturityAssets,
      totalPrincipalLent,
      totalAssets,
      totalLiabilities,
      net,
      ccOutstanding: ccObligations.totalOutstanding
    };
  }, [investments, policyMaturityAssets, totalPrincipalLent, loanStats, ccObligations.totalOutstanding]);

  // ── 6-Month Income Trend Data ─────────────────────────────────────────
  const trendData = useMemo(() => {
    return last6Months.map(monthKey => {
      let fleet = 0;
      vehicles.forEach(v => {
        (v.income || []).forEach(e => {
          if (e.date && e.date.startsWith(monthKey)) fleet += Number(e.amount || 0);
        });
      });
      let rent = 0;
      rooms.forEach(r => {
        const p = r.payments?.[monthKey];
        if (p?.status === 'Paid') rent += Number(r.currentRent || 0);
        else if (p?.status === 'Partial') rent += Number(p.amount || 0);
      });
      let sal = 0;
      const salRecord = finances?.salary?.history?.[monthKey] || finances?.salary?.receipts?.[monthKey];
      if (salRecord?.status === 'Received') {
        sal = Number(salRecord.amount || salaryAmount);
      }
      let lending = 0;
      (investments?.loansGiven || []).forEach(l => {
        if (l.status !== 'Active') return;
        const payout = l.payouts?.[monthKey];
        const monthlyAmt = Number(l.monthlyPayout || 0);
        if (payout?.status === 'Received') {
          lending += Number(payout.amount || monthlyAmt);
        }
      });
      return {
        key: monthKey,
        label: monthLabel(monthKey).split(' ')[0].slice(0, 3),
        fleet,
        rent,
        salary: sal,
        lending,
        total: fleet + rent + sal + lending
      };
    });
  }, [last6Months, vehicles, rooms, finances?.salary, investments?.loansGiven, salaryAmount, thisMonth]);

  const maxTrendTotal = Math.max(...trendData.map(d => d.total), 1);

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
            {expiryAlerts.map(a => (
              <div key={`${a.vehicle}-${a.doc}-${a.expiry}`} className={`alert ${a.days <= 0 ? 'alert-danger' : a.days <= 30 ? 'alert-danger' : 'alert-warning'}`}>
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

      {/* ── HIGHLIGHT: MONTHLY P&L SUMMARY & NET WORTH ─────────────────── */}
      <div className="grid-cols-2 mb-20" style={{ gap: 16 }}>
        {/* Monthly P&L Card */}
        <div className="card" style={{
          background: monthlyPL.isSurplus
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, var(--bg-card) 100%)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, var(--bg-card) 100%)',
          border: `1px solid ${monthlyPL.isSurplus ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          position: 'relative', overflow: 'hidden'
        }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <Activity size={18} color={monthlyPL.isSurplus ? 'var(--accent-green)' : 'var(--accent-red)'} />
                Monthly Cash Flow ({monthLabel(thisMonth).split(' ')[0]})
              </div>
              <div className="section-subtitle">Net position: Realized Inflow vs Monthly Commitments</div>
            </div>
            <span className={`badge ${monthlyPL.isSurplus ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 12, padding: '4px 10px' }}>
              {monthlyPL.isSurplus ? 'Surplus' : 'Deficit'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <div style={{
              fontSize: 32, fontWeight: 800,
              color: monthlyPL.isSurplus ? 'var(--accent-green)' : 'var(--accent-red)',
              letterSpacing: '-0.5px'
            }}>
              {monthlyPL.isSurplus ? '+' : ''}{formatCurrency(monthlyPL.netCashflow)}
            </div>
            <div className="text-sm text-secondary">
              Net {monthlyPL.isSurplus ? 'surplus' : 'deficit'} this month
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-base)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                <ArrowDownLeft size={13} /> Total Inflow Received
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {formatCurrency(monthlyPL.totalInflow)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {monthlyPL.salaryInflow > 0 && `Salary: ${formatCurrency(monthlyPL.salaryInflow)} · `}
                {monthlyPL.lendingInflow > 0 && `Lending: ${formatCurrency(monthlyPL.lendingInflow)} · `}
                Fleet: {formatCurrency(fleetIncome)} · Rent: {formatCurrency(rentStats.collected)}
                {swpReceivedAmount > 0 && ` · SWP: ${formatCurrency(swpReceivedAmount)}`}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-red)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                <ArrowUpRight size={13} /> Monthly Outflow Commitments
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {formatCurrency(monthlyPL.totalOutflow)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                EMIs: {formatCurrency(monthlyObligations.emiTotal)} · Policies/SIPs: {formatCurrency(monthlyObligations.policyDueTotal + monthlyObligations.sipsDueTotal)}
                {monthlyObligations.recurringDueTotal > 0 && ` · Rent/Bills: ${formatCurrency(monthlyObligations.recurringDueTotal)}`}
                {monthlyObligations.ccDueTotal > 0 && ` · CC: ${formatCurrency(monthlyObligations.ccDueTotal)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Net Worth Card */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--bg-card) 100%)',
          border: '1px solid rgba(99,102,241,0.25)'
        }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <Sparkles size={18} color="var(--accent-indigo)" />
                Estimated Net Worth
              </div>
              <div className="section-subtitle">Realizable Assets (SWP + Portfolio + Loans Given + Policy Maturities) minus Active Debts</div>
            </div>
            <span className="badge badge-purple" style={{ fontSize: 12, padding: '4px 10px' }}>
              Live Portfolio
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-indigo)', letterSpacing: '-0.5px' }}>
              {formatCurrency(netWorth.net)}
            </div>
            <div className="text-sm text-secondary">
              Assets - Liabilities
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-base)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>Total Tracked Assets</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {formatCurrency(netWorth.totalAssets)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                SWP: {formatCurrency(netWorth.swpCorpus)} · Inv: {formatCurrency(netWorth.portfolioValue)}
                {netWorth.totalPrincipalLent > 0 && ` · Lent: ${formatCurrency(netWorth.totalPrincipalLent)}`}
                {netWorth.policyMaturityAssets > 0 && ` · Mat: ${formatCurrency(netWorth.policyMaturityAssets)}`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase' }}>Total Active Debt</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-red)', marginTop: 2 }}>
                {formatCurrency(netWorth.totalLiabilities)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Loans: {formatCurrency(loanStats.totalPending)}
                {netWorth.ccOutstanding > 0 && ` · CC: ${formatCurrency(netWorth.ccOutstanding)}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className={salaryAmount > 0 ? "grid-cols-5 mb-20" : "grid-cols-4 mb-20"}>
        {salaryAmount > 0 && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Briefcase size={20} style={{ color: 'var(--accent-indigo)' }} />
            </div>
            <div className="stat-label">Salary Income ({monthLabel(thisMonth).split(' ')[0]})</div>
            <div className="stat-value" style={{ color: 'var(--accent-indigo)' }}>
              {formatCurrency(salaryInflow)}
            </div>
            <div className="stat-sub">
              {finances?.salary?.company ? `${finances.salary.company} · ` : ''}
              {isSalaryReceived ? '✓ Realized' : '⏳ Expected'}
            </div>
          </div>
        )}

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

      {/* ── 6-MONTH INCOME TREND VISUALIZATION ─────────────────────────── */}
      <div className="card mb-20">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--accent-blue)" /> 6-Month Income History (Fleet + Rent)
            </div>
            <div className="section-subtitle">Monthly revenue trends across all assets</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, padding: '10px 0 20px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          {trendData.map(d => {
            const fleetHeightPct = maxTrendTotal > 0 ? (d.fleet / maxTrendTotal) * 100 : 0;
            const rentHeightPct = maxTrendTotal > 0 ? (d.rent / maxTrendTotal) * 100 : 0;
            const salaryHeightPct = maxTrendTotal > 0 ? (d.salary / maxTrendTotal) * 100 : 0;
            const lendingHeightPct = maxTrendTotal > 0 ? (d.lending / maxTrendTotal) * 100 : 0;
            const isCurrent = d.key === thisMonth;

            return (
              <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isCurrent ? 'var(--accent-blue)' : 'var(--text-muted)', marginBottom: 6 }}>
                  {formatCurrency(d.total)}
                </div>
                <div style={{ width: '100%', maxWidth: 44, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', borderRadius: '6px 6px 0 0', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                  {d.lending > 0 && (
                    <div
                      style={{
                        height: `${lendingHeightPct}%`,
                        background: isCurrent ? 'var(--accent-cyan)' : 'rgba(6,182,212,0.6)',
                        transition: 'height 0.3s'
                      }}
                      title={`Lending: ${formatCurrency(d.lending)}`}
                    />
                  )}
                  {d.salary > 0 && (
                    <div
                      style={{
                        height: `${salaryHeightPct}%`,
                        background: isCurrent ? 'var(--accent-purple)' : 'rgba(168,85,247,0.6)',
                        transition: 'height 0.3s'
                      }}
                      title={`Salary: ${formatCurrency(d.salary)}`}
                    />
                  )}
                  {d.rent > 0 && (
                    <div
                      style={{
                        height: `${rentHeightPct}%`,
                        background: isCurrent ? 'var(--accent-green)' : 'rgba(16,185,129,0.6)',
                        transition: 'height 0.3s'
                      }}
                      title={`Rent: ${formatCurrency(d.rent)}`}
                    />
                  )}
                  {d.fleet > 0 && (
                    <div
                      style={{
                        height: `${fleetHeightPct}%`,
                        background: isCurrent ? 'var(--accent-blue)' : 'rgba(59,130,246,0.6)',
                        transition: 'height 0.3s'
                      }}
                      title={`Fleet: ${formatCurrency(d.fleet)}`}
                    />
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {d.label} {isCurrent && '●'}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 11, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-blue)', display: 'inline-block' }} /> Fleet
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-green)', display: 'inline-block' }} /> Property Rent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-purple)', display: 'inline-block' }} /> Salary
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-cyan)', display: 'inline-block' }} /> Lending
          </span>
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
              Live breakdown of pending loans across all Trucks, Cars, Bikes, and Travellers
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
          <div className="mb-16">
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

          {/* Quick WhatsApp Reminder for Pending Tenants */}
          {rentStats.unpaidRooms.length > 0 && (
            <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                Pending Rent Nudges ({rentStats.unpaidRooms.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rentStats.unpaidRooms.map(r => {
                  const phone = r.tenantPhone ? r.tenantPhone.replace(/\D/g, '') : '';
                  const msg = encodeURIComponent(`Hi ${r.tenant || 'there'}, friendly reminder that your rent of ₹${r.pendingAmount || r.currentRent} for ${monthLabel(thisMonth)} is pending. Kindly pay at the earliest. - AssetFlow`);
                  const cleanPhone = phone.length === 12 ? phone :
                    phone.length === 11 && phone.startsWith('0') ? '91' + phone.slice(1) :
                    phone.length === 10 ? '91' + phone : phone;
                  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : null;

                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({r.tenant || 'No tenant'})</span>
                        <span style={{ color: 'var(--accent-red)', fontWeight: 600, marginLeft: 8 }}>
                          {formatCurrency(r.pendingAmount)}
                        </span>
                      </div>
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#25D366', borderColor: 'rgba(37,211,102,0.3)', padding: '3px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Send reminder via WhatsApp"
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No phone</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
