import { useState } from 'react';
import { Plus, X, Edit2, Trash2, TrendingUp, IndianRupee, Check } from 'lucide-react';
import { genId, formatDate, formatCurrency, currentMonthKey, monthLabel, getLast12Months } from '../utils/storage';

const INV_TYPES = ['SIP', 'Lump Sum', 'FD', 'RD', 'Stocks', 'Mutual Fund', 'Gold', 'Other'];

export default function Investments({ investments, updateInvestments }) {
  const [tab, setTab] = useState('swp');
  const [showSwpSetup, setShowSwpSetup] = useState(false);
  const [showAddInv, setShowAddInv] = useState(false);
  const thisMonth = currentMonthKey();
  const months12 = getLast12Months();

  const swp = investments?.swp || {};
  const addInvestments = investments?.additionalInvestments || [];

  // SWP Setup
  const [swpForm, setSwpForm] = useState({ corpus: swp.corpus || '', monthlyWithdrawal: swp.monthlyWithdrawal || '', startDate: swp.startDate || '' });

  const saveSwpSetup = () => {
    updateInvestments({
      ...investments,
      swp: { ...swp, corpus: Number(swpForm.corpus), monthlyWithdrawal: Number(swpForm.monthlyWithdrawal), startDate: swpForm.startDate }
    });
    setShowSwpSetup(false);
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

  // Add Investment Modal
  const [invForm, setInvForm] = useState({ id: genId(), date: new Date().toISOString().split('T')[0], type: 'SIP', platform: '', amount: '', notes: '' });

  const saveInvestment = () => {
    updateInvestments({ ...investments, additionalInvestments: [invForm, ...addInvestments] });
    setInvForm({ id: genId(), date: new Date().toISOString().split('T')[0], type: 'SIP', platform: '', amount: '', notes: '' });
    setShowAddInv(false);
  };

  const deleteInvestment = (id) => {
    updateInvestments({ ...investments, additionalInvestments: addInvestments.filter(i => i.id !== id) });
  };

  const totalReceived = months12.reduce((sum, m) => {
    const p = swp.payouts?.[m];
    return sum + (p?.status === 'Received' ? Number(p.amount || swp.monthlyWithdrawal || 0) : 0);
  }, 0);

  const totalInvested = addInvestments.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div className="animate-in">
      <div className="tabs">
        <button className={`tab ${tab === 'swp' ? 'active' : ''}`} onClick={() => setTab('swp')}>📈 SWP</button>
        <button className={`tab ${tab === 'investments' ? 'active' : ''}`} onClick={() => setTab('investments')}>💼 Investments</button>
      </div>

      {/* SWP Tab */}
      {tab === 'swp' && (
        <div>
          {/* Corpus card */}
          <div className="swp-corpus-card mb-20">
            <div style={{ fontSize: 13, color: 'var(--accent-indigo)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>SWP — Systematic Withdrawal Plan</div>
            {swp.corpus ? (
              <div>
                <div style={{ fontSize: 38, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {formatCurrency(swp.corpus)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Corpus</div>
                <div className="divider" />
                <div className="flex gap-24" style={{ justifyContent: 'center' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-purple)' }}>{formatCurrency(swp.monthlyWithdrawal)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Monthly Withdrawal</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(totalReceived)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Received (last 12 months)</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 12 }}>Not configured yet</div>
                <button className="btn btn-primary" onClick={() => setShowSwpSetup(true)} id="btn-setup-swp">
                  <Plus size={15} /> Setup SWP
                </button>
              </div>
            )}
            {swp.corpus > 0 && (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => { setSwpForm({ corpus: swp.corpus, monthlyWithdrawal: swp.monthlyWithdrawal, startDate: swp.startDate }); setShowSwpSetup(true); }} id="btn-edit-swp">
                <Edit2 size={13} /> Edit SWP
              </button>
            )}
          </div>

          {/* Monthly payout grid */}
          {swp.monthlyWithdrawal > 0 && (
            <div className="card">
              <div className="section-header">
                <div className="section-title">Monthly Payouts</div>
                <span className="text-sm text-muted">Click to mark as received</span>
              </div>
              <div className="month-grid">
                {months12.map(month => {
                  const p = swp.payouts?.[month];
                  const received = p?.status === 'Received';
                  return (
                    <div
                      key={month}
                      className={`month-cell ${received ? 'month-cell-paid' : month === thisMonth ? 'month-cell-unpaid' : 'month-cell-none'}`}
                      onClick={() => togglePayout(month)}
                      id={`swp-payout-${month}`}
                    >
                      <div>{monthLabel(month).split(' ')[0].substring(0, 3)}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{monthLabel(month).split(' ')[1]}</div>
                      {received && <Check size={10} style={{ marginTop: 2, display: 'inline' }} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-16 text-sm text-muted">
                ✅ Green = received &nbsp;|&nbsp; 🔴 Red = current month pending &nbsp;|&nbsp; Gray = future/not applicable
              </div>
            </div>
          )}
        </div>
      )}

      {/* Investments Tab */}
      {tab === 'investments' && (
        <div>
          <div className="section-header mb-20">
            <div>
              <div className="section-title">Investment Log</div>
              <div className="section-subtitle">Track all investments — SIP, lump sums, FD, etc.</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddInv(true)} id="btn-add-investment">
              <Plus size={15} /> Add Investment
            </button>
          </div>

          {/* Summary */}
          <div className="grid-cols-2 mb-20">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <TrendingUp size={20} style={{ color: 'var(--accent-indigo)' }} />
              </div>
              <div className="stat-label">Total Invested (all time)</div>
              <div className="stat-value">{formatCurrency(totalInvested)}</div>
              <div className="stat-sub">{addInvestments.length} entries</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <IndianRupee size={20} style={{ color: 'var(--accent-green)' }} />
              </div>
              <div className="stat-label">SWP Corpus</div>
              <div className="stat-value">{swp.corpus ? formatCurrency(swp.corpus) : '—'}</div>
              <div className="stat-sub">{formatCurrency(swp.monthlyWithdrawal)}/month withdrawal</div>
            </div>
          </div>

          {addInvestments.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={48} />
              <div className="empty-state-title">No investments logged</div>
              <div className="empty-state-desc">Track your SIPs, lump sums, FDs and more</div>
            </div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Platform</th><th>Amount</th><th>Notes</th><th></th></tr>
                  </thead>
                  <tbody>
                    {addInvestments.map(inv => (
                      <tr key={inv.id}>
                        <td>{formatDate(inv.date)}</td>
                        <td><span className="badge badge-purple">{inv.type}</span></td>
                        <td>{inv.platform || '—'}</td>
                        <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                        <td>{inv.notes || '—'}</td>
                        <td>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteInvestment(inv.id)}>
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

      {/* SWP Setup Modal */}
      {showSwpSetup && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSwpSetup(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">SWP Configuration</div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowSwpSetup(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Total Corpus (₹)</label>
                <input className="form-input" type="number" value={swpForm.corpus} onChange={e => setSwpForm(p => ({ ...p, corpus: e.target.value }))} placeholder="e.g. 5000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Withdrawal Amount (₹)</label>
                <input className="form-input" type="number" value={swpForm.monthlyWithdrawal} onChange={e => setSwpForm(p => ({ ...p, monthlyWithdrawal: e.target.value }))} placeholder="e.g. 25000" />
              </div>
              <div className="form-group">
                <label className="form-label">SWP Start Date</label>
                <input className="form-input" type="date" value={swpForm.startDate} onChange={e => setSwpForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSwpSetup(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSwpSetup}>Save SWP</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddInv && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddInv(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add Investment</div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowAddInv(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={invForm.date} onChange={e => setInvForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={invForm.type} onChange={e => setInvForm(p => ({ ...p, type: e.target.value }))}>
                    {INV_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Platform / Fund</label>
                  <input className="form-input" value={invForm.platform} onChange={e => setInvForm(p => ({ ...p, platform: e.target.value }))} placeholder="e.g. Zerodha, HDFC MF" />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input className="form-input" type="number" value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={invForm.notes} onChange={e => setInvForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddInv(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveInvestment} disabled={!invForm.amount}>Save Investment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
