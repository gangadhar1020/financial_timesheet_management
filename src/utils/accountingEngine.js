/**
 * Accounting & Financial Operations Engine
 *
 * @module accountingEngine
 * @purpose Implements invoice generation from eligible income, worker/vendor cost calculations,
 * payment recording, real-time balance calculations, aging bucket determinations, and transactional controls.
 */

/**
 * Calculates line items subtotal, tax amount, total, and balance due for an invoice.
 * Formula: Balance = Invoice Total - Amount Paid
 *
 * @param {Array} lineItems - Array of line items: { quantity, rate, amount }
 * @param {number} [taxRate=0] - Optional tax rate as percentage (e.g., 5 for 5%)
 * @param {number} [paidAmount=0] - Amount already paid against invoice
 * @returns {Object} Calculated totals: { subtotal, taxAmount, totalAmount, paidAmount, balanceDue }
 */
export const calculateInvoiceTotals = (lineItems = [], taxRate = 0, paidAmount = 0) => {
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const itemAmount = item.amount !== undefined ? parseFloat(item.amount) : +(qty * rate).toFixed(2);
    return +(sum + itemAmount).toFixed(2);
  }, 0);

  const ratePct = parseFloat(taxRate) || 0;
  const taxAmount = ratePct > 0 ? +((subtotal * (ratePct / 100)).toFixed(2)) : 0;
  const totalAmount = +(subtotal + taxAmount).toFixed(2);
  const paid = parseFloat(paidAmount) || 0;
  const balanceDue = +(Math.max(0, totalAmount - paid)).toFixed(2);

  return {
    subtotal,
    taxRate: ratePct,
    taxAmount,
    totalAmount,
    paidAmount: paid,
    balanceDue,
  };
};

/**
 * Calculates Worker/Vendor Cost from an approved timesheet.
 * Standard Formula: Worker Cost = Payable Hours × Pay Rate
 * Example from specification: 16 hours × $48 = $768
 *
 * @param {Object} timesheet - The source approved timesheet.
 * @param {Object} [placement] - Placement for pay rate fallbacks.
 * @returns {Object} Complete worker cost calculation with regular and overtime breakdown.
 */
export const calculateWorkerCost = (timesheet, placement = null) => {
  if (!timesheet) {
    throw new Error('Timesheet is required to calculate worker cost.');
  }

  const regularHours = parseFloat(timesheet.regularHours) || 0;
  const overtimeHours = parseFloat(timesheet.overtimeHours) || 0;
  const holidayHours = parseFloat(timesheet.holidayHours) || 0;
  const payableHours = +(regularHours + overtimeHours + holidayHours).toFixed(2);

  // Pay rates
  const basePayRate = parseFloat(timesheet.payRate) || parseFloat(placement?.payRate) || 0;
  const overtimePayRate = parseFloat(timesheet.overtimePayRate) || parseFloat(placement?.overtimePayRate) || +(basePayRate * 1.5).toFixed(2);
  const holidayPayRate = parseFloat(timesheet.holidayPayRate) || basePayRate;

  const regularCost = +(regularHours * basePayRate).toFixed(2);
  const overtimeCost = +(overtimeHours * overtimePayRate).toFixed(2);
  const holidayCost = +(holidayHours * holidayPayRate).toFixed(2);
  const totalPayable = +(regularCost + overtimeCost + holidayCost).toFixed(2);

  const formula = overtimeHours > 0 || holidayHours > 0
    ? `(${regularHours} hrs × $${basePayRate.toFixed(2)}) + (${overtimeHours} OT hrs × $${overtimePayRate.toFixed(2)})${holidayHours > 0 ? ` + (${holidayHours} Hol hrs × $${holidayPayRate.toFixed(2)})` : ''} = $${totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${payableHours} hrs × $${basePayRate.toFixed(2)} = $${totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return {
    payableHours,
    payRate: basePayRate,
    regularHours,
    regularPayRate: basePayRate,
    regularCost,
    overtimeHours,
    overtimePayRate,
    overtimeCost,
    holidayHours,
    holidayPayRate,
    holidayCost,
    totalAmount: totalPayable,
    totalPayable,
    formula,
  };
};

/**
 * Determines aging bucket based on due date and balance due.
 *
 * @param {string} dueDate - ISO date string of invoice/bill due date.
 * @param {number} balanceDue - Current outstanding balance due.
 * @param {string|Date} [currentDate] - Current comparison date (default: now).
 * @returns {string} Aging bucket: 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'
 */
export const computeAgingBucket = (dueDate, balanceDue, currentDate = new Date()) => {
  if (!balanceDue || balanceDue <= 0) return 'Current';
  if (!dueDate) return 'Current';

  const due = new Date(dueDate + (dueDate.length <= 10 ? 'T23:59:59Z' : ''));
  const now = new Date(currentDate);

  if (isNaN(due.getTime())) return 'Current';

  const diffMs = now.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Current';
  if (diffDays <= 30) return '1-30 Days';
  if (diffDays <= 60) return '31-60 Days';
  if (diffDays <= 90) return '61-90 Days';
  return '90+ Days';
};

/**
 * Computes the lifecycle status for an invoice.
 * Statuses: Draft, Open, Partially Paid, Paid, Overdue, Cancelled.
 *
 * @param {number} totalAmount - Total invoice amount.
 * @param {number} paidAmount - Total amount paid.
 * @param {string} dueDate - Due date string.
 * @param {string} [currentStatus='Open'] - Current status override if Draft/Cancelled.
 * @returns {string} Effective status.
 */
export const computeInvoiceStatus = (totalAmount, paidAmount, dueDate, currentStatus = 'Open') => {
  if (currentStatus === 'Draft' || currentStatus === 'Cancelled') {
    return currentStatus;
  }

  const balance = +(totalAmount - paidAmount).toFixed(2);

  if (balance <= 0 && totalAmount > 0) {
    return 'Paid';
  }

  if (paidAmount > 0 && balance > 0) {
    return 'Partially Paid';
  }

  // Check if overdue
  if (dueDate && balance > 0) {
    const due = new Date(dueDate + (dueDate.length <= 10 ? 'T23:59:59Z' : ''));
    if (!isNaN(due.getTime()) && new Date().getTime() > due.getTime()) {
      return 'Overdue';
    }
  }

  return 'Open';
};

/**
 * Validates invoice creation rules:
 * 1. Client must be specified.
 * 2. At least one income record must be selected.
 * 3. Income records must be approved / eligible (status !== 'Unapproved' / cannot invoice unapproved income).
 * 4. Duplicate prevention: none of the selected income records can already be attached to an active invoice.
 *
 * @param {Object} client - Target client account.
 * @param {Array} selectedIncomeRecords - Income records to invoice.
 * @param {Array} existingInvoices - Existing invoice records.
 * @returns {{ valid: boolean, error: string|null }} Validation result.
 */
export const validateInvoiceCreation = (client, selectedIncomeRecords = [], existingInvoices = []) => {
  if (!client || !client.id) {
    return { valid: false, error: 'A valid client account is required to generate an invoice.' };
  }

  if (!selectedIncomeRecords || selectedIncomeRecords.length === 0) {
    return { valid: false, error: 'At least one eligible income record must be selected for invoicing.' };
  }

  // Check client match
  for (const inc of selectedIncomeRecords) {
    if (inc.clientId && inc.clientId !== client.id) {
      return {
        valid: false,
        error: `Income record ${inc.id} belongs to client "${inc.clientName}" (${inc.clientId}), but invoice is for "${client.name}" (${client.id}).`,
      };
    }
  }

  // Check eligibility and unapproved income
  for (const inc of selectedIncomeRecords) {
    if (inc.status === 'Draft' || inc.status === 'Unapproved') {
      return {
        valid: false,
        error: `Income record ${inc.id} is unapproved. Only approved/recognized income can be invoiced.`,
      };
    }

    // Duplicate check: already invoiced
    if (inc.status === 'Invoiced' || inc.invoiceId) {
      return {
        valid: false,
        error: `Income record ${inc.id} has already been invoiced under invoice ${inc.invoiceId || 'N/A'}. Duplicate invoicing is blocked.`,
      };
    }

    // Check if attached in existing invoices
    const alreadyInvoiced = existingInvoices.find(
      (inv) => inv.status !== 'Cancelled' && inv.incomeReferences && inv.incomeReferences.includes(inc.id)
    );
    if (alreadyInvoiced) {
      return {
        valid: false,
        error: `Income record ${inc.id} is already attached to existing invoice ${alreadyInvoiced.invoiceNumber || alreadyInvoiced.id}.`,
      };
    }
  }

  return { valid: true, error: null };
};

/**
 * Validates AR payment recording:
 * 1. Amount must be positive.
 * 2. Excessive payment prevention: Amount cannot exceed invoice balance due.
 *
 * @param {Object} invoice - Target invoice.
 * @param {number|string} amount - Payment amount.
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateARPayment = (invoice, amount) => {
  if (!invoice) {
    return { valid: false, error: 'Invoice is required to record a payment.' };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Payment amount must be a positive number greater than zero.' };
  }

  const balanceDue = invoice.balanceDue !== undefined ? invoice.balanceDue : +(invoice.totalAmount - (invoice.paidAmount || 0)).toFixed(2);

  if (numAmount > balanceDue + 0.001) {
    return {
      valid: false,
      error: `Excessive payment prevented: Payment amount ($${numAmount.toFixed(2)}) exceeds invoice balance due ($${balanceDue.toFixed(2)}).`,
    };
  }

  return { valid: true, error: null };
};

/**
 * Validates AP bill creation from an approved timesheet:
 * 1. Timesheet must have status === 'Approved'.
 * 2. Duplicate prevention: timesheet must not already have an AP bill generated.
 * 3. Total payable hours and rate must be valid.
 *
 * @param {Object} timesheet - Source timesheet.
 * @param {Array} existingBills - Existing AP bill records.
 * @param {Array} [placements] - Placements for pay rate lookup.
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateAPBillCreation = (timesheet, existingBills = [], placements = []) => {
  if (!timesheet) {
    return { valid: false, error: 'Timesheet record is required.' };
  }

  if (timesheet.status !== 'Approved') {
    return {
      valid: false,
      error: `Cannot create AP bill from timesheet in "${timesheet.status}" status. Only "Approved" timesheets can generate AP bills.`,
    };
  }

  // Duplicate prevention check
  const duplicate = existingBills.find(
    (b) => b.sourceTimesheetId === timesheet.id || (b.sourceId === timesheet.id)
  );
  if (duplicate || timesheet.billId) {
    const billId = duplicate ? (duplicate.billNumber || duplicate.id) : timesheet.billId;
    return {
      valid: false,
      error: `AP Bill has already been generated for timesheet ${timesheet.id} (Bill: ${billId}). Duplicate AP billing is prevented.`,
    };
  }

  const totalHours = (parseFloat(timesheet.regularHours) || 0) +
    (parseFloat(timesheet.overtimeHours) || 0) +
    (parseFloat(timesheet.holidayHours) || 0);

  if (totalHours <= 0) {
    return { valid: false, error: `Timesheet ${timesheet.id} has 0 total hours. Cannot create AP bill.` };
  }

  const payRate = parseFloat(timesheet.payRate) || parseFloat(placements.find((p) => p.id === timesheet.placementId)?.payRate) || 0;
  if (payRate <= 0) {
    return { valid: false, error: `Timesheet ${timesheet.id} does not have a positive worker pay rate.` };
  }

  return { valid: true, error: null };
};

/**
 * Validates AP disbursement / payment:
 * 1. Amount must be positive.
 * 2. Excessive disbursement prevention: Amount cannot exceed bill balance due.
 *
 * @param {Object} bill - Target AP bill.
 * @param {number|string} amount - Disbursement amount.
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateAPPayment = (bill, amount) => {
  if (!bill) {
    return { valid: false, error: 'AP Bill is required to record a disbursement.' };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Disbursement amount must be a positive number greater than zero.' };
  }

  const balanceDue = bill.balanceDue !== undefined ? bill.balanceDue : +(bill.totalAmount - (bill.paidAmount || 0)).toFixed(2);

  if (numAmount > balanceDue + 0.001) {
    return {
      valid: false,
      error: `Excessive disbursement prevented: Disbursement amount ($${numAmount.toFixed(2)}) exceeds bill balance due ($${balanceDue.toFixed(2)}).`,
    };
  }

  return { valid: true, error: null };
};
