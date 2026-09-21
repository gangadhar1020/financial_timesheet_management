import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInvoiceTotals,
  calculateWorkerCost,
  computeAgingBucket,
  computeInvoiceStatus,
  validateInvoiceCreation,
  validateARPayment,
  validateAPBillCreation,
  validateAPPayment,
} from '../src/utils/accountingEngine.js';

describe('Accounting Engine - Accounts Receivable Calculations & Validation', () => {
  it('calculates invoice totals, subtotal, tax, and balance due (Balance = Total - Paid)', () => {
    const lineItems = [
      { quantity: 40, rate: 165, amount: 6600 },
      { quantity: 10, rate: 150, amount: 1500 },
    ];

    // Subtotal: 6600 + 1500 = 8100
    // Tax 10%: 810
    // Total: 8910
    // Paid: 2000
    // Balance: 6910
    const totals = calculateInvoiceTotals(lineItems, 10, 2000);

    assert.equal(totals.subtotal, 8100);
    assert.equal(totals.taxRate, 10);
    assert.equal(totals.taxAmount, 810);
    assert.equal(totals.totalAmount, 8910);
    assert.equal(totals.paidAmount, 2000);
    assert.equal(totals.balanceDue, 6910);
  });

  it('validates invoice creation and rejects unapproved income', () => {
    const client = { id: 'CLI-3001', name: 'FinTech Horizon Corp' };
    const unapprovedIncome = [
      {
        id: 'INC-DRAFT-1',
        clientId: 'CLI-3001',
        clientName: 'FinTech Horizon Corp',
        status: 'Unapproved',
        amount: 2000,
      },
    ];

    const result = validateInvoiceCreation(client, unapprovedIncome, []);
    assert.equal(result.valid, false);
    assert.match(result.error, /is unapproved/);
  });

  it('prevents duplicate invoicing for income records that are already invoiced', () => {
    const client = { id: 'CLI-3001', name: 'FinTech Horizon Corp' };
    const alreadyInvoicedIncome = [
      {
        id: 'INC-7001',
        clientId: 'CLI-3001',
        clientName: 'FinTech Horizon Corp',
        status: 'Invoiced',
        invoiceId: 'INV-8001',
        amount: 28400,
      },
    ];

    const result = validateInvoiceCreation(client, alreadyInvoicedIncome, []);
    assert.equal(result.valid, false);
    assert.match(result.error, /Duplicate invoicing is blocked/);
  });

  it('prevents excessive AR payments exceeding invoice balance due', () => {
    const invoice = {
      id: 'INV-8002',
      totalAmount: 27000,
      paidAmount: 20000,
      balanceDue: 7000,
    };

    // Valid payment within balance
    const validResult = validateARPayment(invoice, 7000);
    assert.equal(validResult.valid, true);

    // Excessive payment: 7001 > 7000
    const excessiveResult = validateARPayment(invoice, 7500);
    assert.equal(excessiveResult.valid, false);
    assert.match(excessiveResult.error, /Excessive payment prevented/);
  });

  it('computes accurate invoice statuses across lifecycle (Open, Partially Paid, Paid, Overdue)', () => {
    // 1. Open (zero paid, not overdue)
    assert.equal(computeInvoiceStatus(5000, 0, '2099-12-31'), 'Open');

    // 2. Partially Paid (some paid, positive balance)
    assert.equal(computeInvoiceStatus(5000, 2000, '2099-12-31'), 'Partially Paid');

    // 3. Paid (full settlement, zero balance)
    assert.equal(computeInvoiceStatus(5000, 5000, '2026-01-01'), 'Paid');

    // 4. Overdue (unpaid and past due date)
    assert.equal(computeInvoiceStatus(5000, 0, '2020-01-01'), 'Overdue');
  });

  it('determines correct aging buckets based on days overdue', () => {
    const baseDate = new Date('2026-09-19T12:00:00Z');

    // Future due date -> Current
    assert.equal(computeAgingBucket('2026-10-15', 5000, baseDate), 'Current');

    // Paid -> Current
    assert.equal(computeAgingBucket('2026-08-01', 0, baseDate), 'Current');

    // 15 days overdue -> 1-30 Days
    assert.equal(computeAgingBucket('2026-09-04', 5000, baseDate), '1-30 Days');

    // 45 days overdue -> 31-60 Days
    assert.equal(computeAgingBucket('2026-08-05', 5000, baseDate), '31-60 Days');

    // 75 days overdue -> 61-90 Days
    assert.equal(computeAgingBucket('2026-07-06', 5000, baseDate), '61-90 Days');

    // 120 days overdue -> 90+ Days
    assert.equal(computeAgingBucket('2026-05-22', 5000, baseDate), '90+ Days');
  });
});

describe('Accounting Engine - Accounts Payable (Worker Costs & Bills)', () => {
  it('calculates Worker Cost matching exact formula: 16 hours × $48 = $768', () => {
    const mockTimesheet = {
      id: 'TS-PAYABLE-01',
      candidateName: 'Test Worker',
      regularHours: 16,
      overtimeHours: 0,
      holidayHours: 0,
      payRate: 48,
    };

    const cost = calculateWorkerCost(mockTimesheet);

    assert.equal(cost.payableHours, 16);
    assert.equal(cost.payRate, 48);
    assert.equal(cost.regularCost, 768);
    assert.equal(cost.totalAmount, 768);
    assert.equal(cost.totalPayable, 768);
    assert.match(cost.formula, /16 hrs × \$48\.00 = \$768\.00/);
  });

  it('calculates overtime worker cost correctly', () => {
    const mockTimesheet = {
      id: 'TS-PAYABLE-OT',
      regularHours: 40,
      overtimeHours: 5,
      holidayHours: 0,
      payRate: 50,
      overtimePayRate: 75,
    };

    const cost = calculateWorkerCost(mockTimesheet);

    assert.equal(cost.regularCost, 2000); // 40 * 50
    assert.equal(cost.overtimeCost, 375);  // 5 * 75
    assert.equal(cost.totalAmount, 2375);
    assert.equal(cost.payableHours, 45);
  });

  it('validates AP bill creation from approved timesheets and blocks unapproved timesheets', () => {
    const approvedTs = {
      id: 'TS-APPROVED',
      status: 'Approved',
      regularHours: 40,
      payRate: 60,
    };

    const validResult = validateAPBillCreation(approvedTs, []);
    assert.equal(validResult.valid, true);

    const draftTs = {
      id: 'TS-DRAFT',
      status: 'Draft',
      regularHours: 40,
      payRate: 60,
    };

    const draftResult = validateAPBillCreation(draftTs, []);
    assert.equal(draftResult.valid, false);
    assert.match(draftResult.error, /Only "Approved" timesheets can generate AP bills/);
  });

  it('prevents duplicate AP bill generation for the same timesheet', () => {
    const timesheet = {
      id: 'TS-6001',
      status: 'Approved',
      regularHours: 40,
      payRate: 92.5,
    };

    const existingBills = [
      {
        id: 'APB-1003',
        billNumber: 'BILL-2026-001',
        sourceTimesheetId: 'TS-6001',
        totalAmount: 3700,
      },
    ];

    const result = validateAPBillCreation(timesheet, existingBills);
    assert.equal(result.valid, false);
    assert.match(result.error, /Duplicate AP billing is prevented/);
  });

  it('prevents excessive AP payment disbursements exceeding bill balance due', () => {
    const bill = {
      id: 'APB-1002',
      totalAmount: 9200,
      paidAmount: 4000,
      balanceDue: 5200,
    };

    // Valid disbursement
    const validResult = validateAPPayment(bill, 5200);
    assert.equal(validResult.valid, true);

    // Excessive disbursement: 5300 > 5200
    const excessiveResult = validateAPPayment(bill, 5500);
    assert.equal(excessiveResult.valid, false);
    assert.match(excessiveResult.error, /Excessive disbursement prevented/);
  });
});
