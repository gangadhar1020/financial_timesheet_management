import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateIncomeFromTimesheet,
  validateIncomeGeneration,
  aggregateRevenueByClient,
  aggregateRevenueByEmployee,
  aggregateRevenueByPlacement,
  aggregateRevenueByPeriod,
  calculateRevenueKPIs,
} from '../src/utils/revenueEngine.js';

describe('Revenue Engine - Hourly Billing Calculations', () => {
  it('calculates hourly revenue matching exact formula: 16 hours × $72 = $1,152', () => {
    const mockTimesheet = {
      id: 'TS-TEST-001',
      candidateName: 'Test Consultant',
      clientName: 'Test Client',
      regularHours: 16,
      overtimeHours: 0,
      holidayHours: 0,
      billRate: 72,
      payRate: 45,
      status: 'Approved',
      periodEnding: '2026-09-20',
      approvedBy: 'Test Approver',
      approvedAt: '2026-09-21T10:00:00Z',
    };

    const income = calculateIncomeFromTimesheet(mockTimesheet);

    assert.equal(income.billableHours, 16);
    assert.equal(income.billingRate, 72);
    assert.equal(income.amount, 1152);
    assert.equal(income.totalIncome, 1152);
    assert.equal(income.regularAmount, 1152);
    assert.equal(income.overtimeAmount, 0);
    assert.equal(income.costOfGoodsSold, 16 * 45); // 720
    assert.equal(income.grossProfit, 1152 - 720); // 432
    assert.equal(income.marginPercent, 37.5); // (432 / 1152) * 100
    assert.equal(income.status, 'Unbilled');
    assert.match(income.calculationFormula, /16 hrs × \$72\.00 = \$1,152\.00/);
  });

  it('correctly calculates overtime hours and rates when overtime is present', () => {
    const mockTimesheet = {
      id: 'TS-TEST-002',
      candidateName: 'Overtime Consultant',
      clientName: 'Acme Corp',
      regularHours: 40,
      overtimeHours: 5,
      holidayHours: 0,
      billRate: 100,
      overtimeBillRate: 150,
      payRate: 60,
      overtimePayRate: 90,
      status: 'Approved',
      periodEnding: '2026-09-20',
    };

    const income = calculateIncomeFromTimesheet(mockTimesheet);

    assert.equal(income.regularHours, 40);
    assert.equal(income.regularRate, 100);
    assert.equal(income.regularAmount, 4000);

    assert.equal(income.overtimeHours, 5);
    assert.equal(income.overtimeRate, 150);
    assert.equal(income.overtimeAmount, 750);

    assert.equal(income.billableHours, 45);
    assert.equal(income.totalIncome, 4750);
    assert.equal(income.costOfGoodsSold, (40 * 60) + (5 * 90)); // 2400 + 450 = 2850
    assert.equal(income.grossProfit, 4750 - 2850); // 1900
    assert.equal(income.marginPercent, 40.0); // (1900 / 4750) * 100 = 40%
  });

  it('guarantees complete traceability to the source timesheet', () => {
    const mockTimesheet = {
      id: 'TS-6001',
      organizationId: 'ORG-001',
      placementId: 'PLC-5001',
      candidateId: 'EMP-1001',
      candidateName: 'Sarah Jenkins',
      clientId: 'CLI-3001',
      clientName: 'FinTech Horizon Corp',
      periodEnding: '2026-09-13',
      regularHours: 40,
      overtimeHours: 0,
      holidayHours: 0,
      billRate: 165,
      payRate: 92.5,
      status: 'Approved',
      approvedBy: 'David K. Campbell',
      approvedAt: '2026-09-15T11:30:00Z',
    };

    const income = calculateIncomeFromTimesheet(mockTimesheet);

    assert.equal(income.sourceType, 'Timesheet');
    assert.equal(income.sourceId, 'TS-6001');
    assert.equal(income.placementId, 'PLC-5001');
    assert.equal(income.employeeId, 'EMP-1001');
    assert.equal(income.employeeName, 'Sarah Jenkins');
    assert.equal(income.clientId, 'CLI-3001');
    assert.equal(income.clientName, 'FinTech Horizon Corp');
    assert.equal(income.periodEnding, '2026-09-13');
    assert.equal(income.amount, 6600);

    assert.ok(income.traceability);
    assert.equal(income.traceability.sourceTimesheetId, 'TS-6001');
    assert.equal(income.traceability.approvedBy, 'David K. Campbell');
    assert.equal(income.traceability.approvedAt, '2026-09-15T11:30:00Z');
    assert.ok(income.traceability.calculationBreakdown);
    assert.equal(income.traceability.calculationBreakdown.regular.hours, 40);
  });
});

describe('Revenue Engine - Validation & Prevention Rules', () => {
  it('allows generation for Approved timesheet with positive hours and rates', () => {
    const validTimesheet = {
      id: 'TS-6001',
      status: 'Approved',
      regularHours: 40,
      overtimeHours: 0,
      holidayHours: 0,
      billRate: 165,
      placementId: 'PLC-5001',
    };

    const result = validateIncomeGeneration(validTimesheet, []);
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
  });

  it('prevents income generation for Draft, Submitted, Returned, or Rejected timesheets', () => {
    const unapprovedStatuses = ['Draft', 'Submitted', 'Returned', 'Rejected'];

    for (const status of unapprovedStatuses) {
      const ts = {
        id: `TS-${status}`,
        status,
        regularHours: 40,
        billRate: 100,
      };

      const result = validateIncomeGeneration(ts, []);
      assert.equal(result.valid, false);
      assert.match(result.error, /Only timesheets in "Approved" status are eligible/);
    }
  });

  it('prevents duplicate income generation if an income record already exists for the timesheet', () => {
    const timesheet = {
      id: 'TS-6001',
      status: 'Approved',
      regularHours: 40,
      billRate: 165,
    };

    const existingIncomeRecords = [
      {
        id: 'INC-7004',
        sourceId: 'TS-6001',
        sourceType: 'Timesheet',
        amount: 6600,
      },
    ];

    const result = validateIncomeGeneration(timesheet, existingIncomeRecords);
    assert.equal(result.valid, false);
    assert.equal(result.existingIncomeId, 'INC-7004');
    assert.match(result.error, /Duplicate income generation is prevented/);
  });

  it('rejects timesheets with zero billable hours', () => {
    const zeroHourTimesheet = {
      id: 'TS-ZERO',
      status: 'Approved',
      regularHours: 0,
      overtimeHours: 0,
      holidayHours: 0,
      billRate: 100,
    };

    const result = validateIncomeGeneration(zeroHourTimesheet, []);
    assert.equal(result.valid, false);
    assert.match(result.error, /0 total hours/);
  });

  it('rejects timesheets with non-positive billing rates', () => {
    const zeroRateTimesheet = {
      id: 'TS-NO-RATE',
      status: 'Approved',
      regularHours: 40,
      billRate: 0,
      placementId: 'PLC-NONEXISTENT',
    };

    const result = validateIncomeGeneration(zeroRateTimesheet, [], []);
    assert.equal(result.valid, false);
    assert.match(result.error, /valid positive billing rate/);
  });
});

describe('Revenue Engine - Multi-Dimensional Aggregations & Summaries', () => {
  const sampleIncomeRecords = [
    {
      id: 'INC-1',
      sourceId: 'TS-1',
      clientId: 'CLI-A',
      clientName: 'Client Alpha',
      employeeId: 'EMP-1',
      employeeName: 'Alice Smith',
      placementId: 'PLC-1',
      jobTitle: 'Cloud Architect',
      periodEnding: '2026-09-13',
      billableHours: 40,
      regularHours: 40,
      overtimeHours: 0,
      regularAmount: 4000,
      overtimeAmount: 0,
      amount: 4000,
      totalIncome: 4000,
      costOfGoodsSold: 2400,
      grossProfit: 1600,
      status: 'Unbilled',
      rate: 100,
      billingRate: 100,
    },
    {
      id: 'INC-2',
      sourceId: 'TS-2',
      clientId: 'CLI-A',
      clientName: 'Client Alpha',
      employeeId: 'EMP-2',
      employeeName: 'Bob Jones',
      placementId: 'PLC-2',
      jobTitle: 'Data Engineer',
      periodEnding: '2026-09-13',
      billableHours: 45,
      regularHours: 40,
      overtimeHours: 5,
      regularAmount: 4000,
      overtimeAmount: 750,
      amount: 4750,
      totalIncome: 4750,
      costOfGoodsSold: 2850,
      grossProfit: 1900,
      status: 'Unbilled',
      rate: 100,
      billingRate: 100,
    },
    {
      id: 'INC-3',
      sourceId: 'TS-3',
      clientId: 'CLI-B',
      clientName: 'Client Beta',
      employeeId: 'EMP-1',
      employeeName: 'Alice Smith',
      placementId: 'PLC-3',
      jobTitle: 'DevSecOps Specialist',
      periodEnding: '2026-09-20',
      billableHours: 20,
      regularHours: 20,
      overtimeHours: 0,
      regularAmount: 3000,
      overtimeAmount: 0,
      amount: 3000,
      totalIncome: 3000,
      costOfGoodsSold: 1800,
      grossProfit: 1200,
      status: 'Recognized',
      rate: 150,
      billingRate: 150,
    },
  ];

  it('aggregates revenue correctly by client', () => {
    const byClient = aggregateRevenueByClient(sampleIncomeRecords);

    assert.equal(byClient.length, 2);

    const clientAlpha = byClient.find((c) => c.clientId === 'CLI-A');
    assert.ok(clientAlpha);
    assert.equal(clientAlpha.totalHours, 85);
    assert.equal(clientAlpha.totalRevenue, 8750);
    assert.equal(clientAlpha.unbilledRevenue, 8750);
    assert.equal(clientAlpha.recognizedRevenue, 0);
    assert.equal(clientAlpha.placementCount, 2);

    const clientBeta = byClient.find((c) => c.clientId === 'CLI-B');
    assert.ok(clientBeta);
    assert.equal(clientBeta.totalHours, 20);
    assert.equal(clientBeta.totalRevenue, 3000);
    assert.equal(clientBeta.unbilledRevenue, 0);
    assert.equal(clientBeta.recognizedRevenue, 3000);
  });

  it('aggregates revenue correctly by employee', () => {
    const byEmployee = aggregateRevenueByEmployee(sampleIncomeRecords);

    assert.equal(byEmployee.length, 2);

    const alice = byEmployee.find((e) => e.employeeId === 'EMP-1');
    assert.ok(alice);
    assert.equal(alice.totalHours, 60); // 40 + 20
    assert.equal(alice.totalRevenue, 7000); // 4000 + 3000
    assert.equal(alice.recordsCount, 2);

    const bob = byEmployee.find((e) => e.employeeId === 'EMP-2');
    assert.ok(bob);
    assert.equal(bob.totalHours, 45);
    assert.equal(bob.totalRevenue, 4750);
  });

  it('aggregates revenue correctly by placement', () => {
    const byPlacement = aggregateRevenueByPlacement(sampleIncomeRecords);

    assert.equal(byPlacement.length, 3);
    assert.equal(byPlacement[0].placementId, 'PLC-2'); // 4750 highest
    assert.equal(byPlacement[0].totalRevenue, 4750);
  });

  it('aggregates revenue correctly by period', () => {
    const byPeriod = aggregateRevenueByPeriod(sampleIncomeRecords);

    assert.equal(byPeriod.length, 1); // both are in 2026-09
    assert.equal(byPeriod[0].period, '2026-09');
    assert.equal(byPeriod[0].totalHours, 105); // 40 + 45 + 20
    assert.equal(byPeriod[0].totalRevenue, 11750); // 4000 + 4750 + 3000
    assert.equal(byPeriod[0].unbilledRevenue, 8750);
    assert.equal(byPeriod[0].recognizedRevenue, 3000);
  });

  it('calculates accurate overall KPIs including unbilled income and billable hours', () => {
    const kpis = calculateRevenueKPIs(sampleIncomeRecords);

    assert.equal(kpis.totalRevenue, 11750);
    assert.equal(kpis.totalBillableHours, 105);
    assert.equal(kpis.unbilledIncome, 8750);
    assert.equal(kpis.recognizedIncome, 3000);
    assert.equal(kpis.totalGrossProfit, 4700); // 1600 + 1900 + 1200
    assert.equal(kpis.averageMargin, 40.0); // (4700 / 11750) * 100 = 40.00%
    assert.equal(kpis.recordsCount, 3);
  });

  it('handles empty states gracefully without crashing', () => {
    const emptyKPIs = calculateRevenueKPIs([]);
    assert.equal(emptyKPIs.totalRevenue, 0);
    assert.equal(emptyKPIs.totalBillableHours, 0);
    assert.equal(emptyKPIs.unbilledIncome, 0);
    assert.equal(emptyKPIs.averageMargin, 0);

    assert.deepEqual(aggregateRevenueByClient([]), []);
    assert.deepEqual(aggregateRevenueByEmployee([]), []);
    assert.deepEqual(aggregateRevenueByPlacement([]), []);
    assert.deepEqual(aggregateRevenueByPeriod([]), []);
  });
});
