import * as XLSX from 'xlsx';
import { formatDate, formatCurrency, monthLabel, calculatePendingLoan, getRemainingMonthsCount } from './storage';

export const exportToExcel = (vehicles, rooms, investments) => {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Fleet Income ──────────────────────────────────────────────
  const incomeRows = [];
  vehicles.forEach(v => {
    (v.income || []).forEach(entry => {
      incomeRows.push({
        Vehicle: v.name,
        Type: v.type,
        Date: formatDate(entry.date),
        Amount: entry.amount,
        'Paid By': entry.paidBy || '',
        Notes: entry.notes || '',
      });
    });
  });
  if (incomeRows.length) {
    const ws1 = XLSX.utils.json_to_sheet(incomeRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Fleet Income');
  }

  // ── Sheet 2: Fleet Loans & EMI ─────────────────────────────────────────
  const emiRows = [];
  vehicles.forEach(v => {
    if (v.emi?.amount > 0) {
      const remainingMonths = v.emi.endDate ? getRemainingMonthsCount(v.emi.endDate) : 0;
      const pendingLoan = calculatePendingLoan(v.emi);
      const paidEntries = Object.entries(v.emi.paid || {});
      if (paidEntries.length === 0) {
        emiRows.push({
          Vehicle: v.name,
          Type: v.type,
          Lender: v.emi.lender || '',
          'Monthly EMI': v.emi.amount,
          'Due Day': v.emi.dueDate || 1,
          'Last EMI Month': v.emi.endDate ? monthLabel(v.emi.endDate) : '',
          'EMIs Remaining': remainingMonths || '',
          'Pending Loan Left': pendingLoan || '',
          Month: '',
          Status: ''
        });
      } else {
        paidEntries.forEach(([month, status]) => {
          emiRows.push({
            Vehicle: v.name,
            Type: v.type,
            Lender: v.emi.lender || '',
            'Monthly EMI': v.emi.amount,
            'Due Day': v.emi.dueDate || 1,
            'Last EMI Month': v.emi.endDate ? monthLabel(v.emi.endDate) : '',
            'EMIs Remaining': remainingMonths || '',
            'Pending Loan Left': pendingLoan || '',
            Month: monthLabel(month),
            Status: status
          });
        });
      }
    }
  });
  if (emiRows.length) {
    const ws2 = XLSX.utils.json_to_sheet(emiRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Fleet Loans & EMI');
  }

  // ── Sheet 3: Vehicle Documents ─────────────────────────────────────────
  const docRows = vehicles.map(v => ({
    Vehicle: v.name,
    'Reg Number': v.regNumber || '',
    'Insurance Expiry': formatDate(v.documents?.insurance?.expiry),
    Insurer: v.documents?.insurance?.insurer || '',
    'PUC Expiry': formatDate(v.documents?.puc?.expiry),
    'Fitness Expiry': formatDate(v.documents?.fitness?.expiry),
    'Permit Expiry': formatDate(v.documents?.permit?.expiry),
    'Permit Type': v.documents?.permit?.type || '',
  }));
  const ws3 = XLSX.utils.json_to_sheet(docRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Vehicle Documents');

  // ── Sheet 4: Rent Payments ─────────────────────────────────────────────
  const rentRows = [];
  rooms.forEach(room => {
    const paymentKeys = Object.keys(room.payments || {}).sort();
    if (paymentKeys.length === 0) {
      rentRows.push({ Room: room.name, Tenant: room.tenant || '', Rent: room.currentRent || 0, Month: '', Status: '', Amount: '', Notes: '' });
    } else {
      paymentKeys.forEach(month => {
        const p = room.payments[month];
        const rentAtTime = getRentForMonth(room, month);
        rentRows.push({ Room: room.name, Tenant: room.tenant || '', Rent: rentAtTime, Month: monthLabel(month), Status: p.status, Amount: p.amount || rentAtTime, Notes: p.notes || '' });
      });
    }
  });
  if (rentRows.length) {
    const ws4 = XLSX.utils.json_to_sheet(rentRows);
    XLSX.utils.book_append_sheet(wb, ws4, 'Rent Payments');
  }

  // ── Sheet 5: Electricity ───────────────────────────────────────────────
  const elecRows = [];
  rooms.forEach(room => {
    if (room.electricity && room.electricity.length > 0) {
      room.electricity.forEach(entry => {
        elecRows.push({
          Room: room.name,
          Date: formatDate(entry.date),
          'Prev Reading': entry.prevReading,
          'Curr Reading': entry.currReading,
          Units: entry.currReading - entry.prevReading,
          Amount: entry.amount || '',
          Status: entry.status || 'Unpaid',
          Notes: entry.notes || '',
        });
      });
    }
  });
  if (elecRows.length) {
    const ws5 = XLSX.utils.json_to_sheet(elecRows);
    XLSX.utils.book_append_sheet(wb, ws5, 'Electricity');
  }

  // ── Sheet 6: SWP Payouts ───────────────────────────────────────────────
  const swpRows = [];
  if (investments?.swp) {
    Object.entries(investments.swp.payouts || {}).forEach(([month, payout]) => {
      swpRows.push({ Month: monthLabel(month), 'Monthly Withdrawal': investments.swp.monthlyWithdrawal, Status: payout.status, 'Received Amount': payout.amount || '', Notes: payout.notes || '' });
    });
  }
  if (swpRows.length) {
    const ws6 = XLSX.utils.json_to_sheet(swpRows);
    XLSX.utils.book_append_sheet(wb, ws6, 'SWP Payouts');
  }

  // ── Sheet 7: Insurance Policies ───────────────────────────────────────
  const policyRows = (investments?.policies || []).map(p => ({
    'Policy Name': p.policyName || '',
    'Policy Number': p.policyNumber || '',
    Insurer: p.insurer || '',
    Type: p.type || '',
    'Holder Name': p.holderName || '',
    Nominee: p.nominee || '',
    Status: p.status || '',
    'Sum Assured': p.sumAssured || '',
    'Maturity Amount': p.maturityAmount || '',
    'Premium Amount': p.premiumAmount || '',
    'Premium Frequency': p.premiumFrequency || '',
    'Start Date': formatDate(p.startDate),
    'Maturity Date': formatDate(p.maturityDate),
    'Pay Till Date': formatDate(p.paymentEndDate),
    'Next Due Date': formatDate(p.nextDueDate),
    'OTP Phone': p.otpPhone || '',
    'Agent Name': p.agentName || '',
    'Agent Phone': p.agentPhone || '',
    Notes: p.notes || '',
  }));
  if (policyRows.length) {
    const ws7 = XLSX.utils.json_to_sheet(policyRows);
    XLSX.utils.book_append_sheet(wb, ws7, 'Insurance Policies');
  }

  // ── Sheet 8: Portfolio ─────────────────────────────────────────────────
  const portfolioRows = (investments?.portfolio || []).map(p => ({
    Type: p.type || '',
    Name: p.name || '',
    Platform: p.platform || '',
    'Account/Folio': p.accountNumber || '',
    'Amount (₹)': p.amount || '',
    Frequency: p.frequency || '',
    'Start Date': formatDate(p.startDate),
    'Maturity Date': formatDate(p.maturityDate),
    'Expected Return %': p.expectedReturn || '',
    'Current Value': p.currentValue || '',
    Status: p.status || '',
    Notes: p.notes || '',
  }));
  if (portfolioRows.length) {
    const ws8 = XLSX.utils.json_to_sheet(portfolioRows);
    XLSX.utils.book_append_sheet(wb, ws8, 'Portfolio');
  }

  // ── Sheet 9: Legacy Investments ───────────────────────────────────────
  const addInvRows = (investments?.additionalInvestments || []).map(inv => ({
    Date: formatDate(inv.date),
    Type: inv.type || '',
    Platform: inv.platform || '',
    Amount: inv.amount,
    Notes: inv.notes || '',
  }));
  if (addInvRows.length) {
    const ws9 = XLSX.utils.json_to_sheet(addInvRows);
    XLSX.utils.book_append_sheet(wb, ws9, 'Investments (Legacy)');
  }

  // Save file
  const filename = `AssetFlow_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};

function getRentForMonth(room, monthKey) {
  if (!room.rentHistory || room.rentHistory.length === 0) {
    return room.currentRent || 0;
  }
  // Find the rent that was effective at that month
  const sorted = [...room.rentHistory].sort((a, b) => a.from.localeCompare(b.from));
  let rent = room.currentRent || 0;
  for (const entry of sorted) {
    if (entry.from <= monthKey) {
      rent = entry.amount;
    }
  }
  return rent;
}
