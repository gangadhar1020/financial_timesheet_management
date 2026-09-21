/**
 * Revenue Calculation and Income Generation Engine
 * 
 * @module revenueEngine
 * @purpose Implements traceable income generation from approved timesheets, hourly billing
 * calculations, duplicate prevention, and multi-dimensional revenue aggregations.
 */

/**
 * Calculates hourly revenue and itemized breakdown from an approved timesheet.
 * Standard formula: Revenue = Billable Hours × Billing Rate
 * Example: 16 hours × $72 = $1,152
 *
 * @param {Object} timesheet - The source approved timesheet.
 * @param {Object} [placement] - Optional matching placement for fallback rates/details.
 * @param {Object} [options] - Options such as custom overtime multiplier (default: 1.5 if not specified).
 * @returns {Object} Complete traceable income record object.
 */
export const calculateIncomeFromTimesheet = (timesheet, placement = null, options = {}) => {
  if (!timesheet) {
    throw new Error('Timesheet is required for income calculation.');
  }

  const regularHours = parseFloat(timesheet.regularHours) || 0;
  const overtimeHours = parseFloat(timesheet.overtimeHours) || 0;
  const holidayHours = parseFloat(timesheet.holidayHours) || 0;
  const totalBillableHours = +(regularHours + overtimeHours + holidayHours).toFixed(2);

  // Bill rates
  const baseBillRate = parseFloat(timesheet.billRate) || parseFloat(placement?.billRate) || 0;
  // Overtime rate: default to placement's overtime bill rate or 1.5x regular or base rate
  const otMultiplier = options.overtimeMultiplier || 1.5;
  const overtimeBillRate = timesheet.overtimeBillRate || placement?.overtimeBillRate || +(baseBillRate * otMultiplier).toFixed(2);
  const holidayBillRate = timesheet.holidayBillRate || baseBillRate;

  // Pay rates (for COGS & margin calculation)
  const basePayRate = parseFloat(timesheet.payRate) || parseFloat(placement?.payRate) || 0;
  const overtimePayRate = timesheet.overtimePayRate || +(basePayRate * 1.5).toFixed(2);
  const holidayPayRate = timesheet.holidayPayRate || basePayRate;

  // Revenue amounts
  const regularAmount = +(regularHours * baseBillRate).toFixed(2);
  const overtimeAmount = +(overtimeHours * overtimeBillRate).toFixed(2);
  const holidayAmount = +(holidayHours * holidayBillRate).toFixed(2);
  const totalIncome = +(regularAmount + overtimeAmount + holidayAmount).toFixed(2);

  // COGS (Payables) & Gross Margin
  const cogsRegular = +(regularHours * basePayRate).toFixed(2);
  const cogsOvertime = +(overtimeHours * overtimePayRate).toFixed(2);
  const cogsHoliday = +(holidayHours * holidayPayRate).toFixed(2);
  const costOfGoodsSold = +(cogsRegular + cogsOvertime + cogsHoliday).toFixed(2);

  const grossProfit = +(totalIncome - costOfGoodsSold).toFixed(2);
  const marginPercent = totalIncome > 0 ? +(((grossProfit / totalIncome) * 100).toFixed(2)) : 0;

  // Explicit calculation formula string
  const calculationFormula = overtimeHours > 0 || holidayHours > 0
    ? `(${regularHours} hrs × $${baseBillRate.toFixed(2)}) + (${overtimeHours} OT hrs × $${overtimeBillRate.toFixed(2)})${holidayHours > 0 ? ` + (${holidayHours} Hol hrs × $${holidayBillRate.toFixed(2)})` : ''} = $${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${totalBillableHours} hrs × $${baseBillRate.toFixed(2)} = $${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const now = new Date().toISOString();

  return {
    sourceType: 'Timesheet',
    sourceId: timesheet.id,
    organizationId: timesheet.organizationId || placement?.organizationId || 'ORG-001',
    placementId: timesheet.placementId || placement?.id || '',
    jobTitle: placement?.jobTitle || 'Consultant Assignment',
    employeeId: timesheet.candidateId || placement?.candidateId || '',
    employeeName: timesheet.candidateName || placement?.candidateName || 'Unknown Consultant',
    clientId: timesheet.clientId || placement?.clientId || '',
    clientName: timesheet.clientName || placement?.clientName || 'Unknown Client',
    period: timesheet.periodEnding || timesheet.period || '',
    periodEnding: timesheet.periodEnding || '',

    // Line breakdown: Regular, Overtime, Holiday
    regularHours,
    regularRate: baseBillRate,
    regularAmount,
    overtimeHours,
    overtimeRate: overtimeBillRate,
    overtimeAmount,
    holidayHours,
    holidayRate: holidayBillRate,
    holidayAmount,

    // Totals & Rates
    billableHours: totalBillableHours,
    totalHours: totalBillableHours,
    billingRate: baseBillRate,
    rate: baseBillRate,
    amount: totalIncome,
    totalIncome,

    // Profitability & Cost
    costOfGoodsSold,
    grossProfit,
    marginPercent,

    // Lifecycle Status
    status: 'Unbilled', // 'Unbilled' | 'Recognized' | 'Invoiced'
    description: `Income generated from approved timesheet ${timesheet.id} (${timesheet.candidateName || 'Consultant'} • ${timesheet.clientName || 'Client'})`,
    
    // Traceability metadata
    traceability: {
      sourceTimesheetId: timesheet.id,
      sourceTimesheetStatus: timesheet.status,
      periodEnding: timesheet.periodEnding,
      approvedBy: timesheet.approvedBy || 'Manager',
      approvedAt: timesheet.approvedAt || now,
      submittedAt: timesheet.submittedAt || null,
      placementId: timesheet.placementId || placement?.id,
      billRate: baseBillRate,
      payRate: basePayRate,
      calculationFormula,
      calculationBreakdown: {
        regular: { hours: regularHours, rate: baseBillRate, amount: regularAmount },
        overtime: { hours: overtimeHours, rate: overtimeBillRate, amount: overtimeAmount },
        holiday: { hours: holidayHours, rate: holidayBillRate, amount: holidayAmount },
      },
    },
    calculationFormula,

    // Audit timestamps
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
};

/**
 * Validates whether an income record can be generated from the given timesheet.
 * Enforces:
 * 1. Approved status requirement (Draft, Submitted, Returned, Rejected cannot generate income).
 * 2. Duplicate prevention (blocks generation if income record already exists for timesheet).
 * 3. Hours and rate validity (> 0).
 *
 * @param {Object} timesheet - The timesheet to validate.
 * @param {Array} existingIncomeRecords - Current list of income records from store.
 * @param {Array} [placements] - Current list of placements from store.
 * @returns {{ valid: boolean, error: string|null, existingIncomeId?: string }}
 */
export const validateIncomeGeneration = (timesheet, existingIncomeRecords = [], placements = []) => {
  if (!timesheet) {
    return { valid: false, error: 'Timesheet record is required.' };
  }

  // 1. Status rule: Only Approved timesheets
  if (timesheet.status !== 'Approved') {
    return {
      valid: false,
      error: `Cannot generate income from a "${timesheet.status}" timesheet. Only timesheets in "Approved" status are eligible for income generation.`,
    };
  }

  // 2. Duplicate prevention rule: Cannot generate income twice for the same timesheet
  const existingIncome = existingIncomeRecords.find(
    (inc) => inc.sourceId === timesheet.id || (inc.traceability && inc.traceability.sourceTimesheetId === timesheet.id)
  );
  if (existingIncome) {
    return {
      valid: false,
      error: `Income has already been generated for timesheet ${timesheet.id} under Income Record ${existingIncome.id}. Duplicate income generation is prevented.`,
      existingIncomeId: existingIncome.id,
    };
  }

  // 3. Hours validation
  const totalHours = (parseFloat(timesheet.regularHours) || 0) +
    (parseFloat(timesheet.overtimeHours) || 0) +
    (parseFloat(timesheet.holidayHours) || 0);

  if (totalHours <= 0) {
    return {
      valid: false,
      error: `Timesheet ${timesheet.id} has 0 total hours. Cannot generate income from a zero-hour timesheet.`,
    };
  }

  // 4. Rate validation
  const rate = parseFloat(timesheet.billRate);
  if (isNaN(rate) || rate <= 0) {
    // Check placement fallback
    const placement = placements.find((p) => p.id === timesheet.placementId);
    const pRate = parseFloat(placement?.billRate);
    if (isNaN(pRate) || pRate <= 0) {
      return {
        valid: false,
        error: `Timesheet ${timesheet.id} does not have a valid positive billing rate.`,
      };
    }
  }

  return { valid: true, error: null };
};

/**
 * Aggregates revenue and hours grouped by Client.
 *
 * @param {Array} incomeRecords - All income records.
 * @returns {Array} Aggregated client records.
 */
export const aggregateRevenueByClient = (incomeRecords = []) => {
  const map = {};

  incomeRecords.forEach((item) => {
    const key = item.clientId || item.clientName || 'Unknown Client';
    if (!map[key]) {
      map[key] = {
        clientId: item.clientId || 'N/A',
        clientName: item.clientName || 'Unknown Client',
        totalHours: 0,
        regularRevenue: 0,
        overtimeRevenue: 0,
        totalRevenue: 0,
        unbilledRevenue: 0,
        recognizedRevenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        placements: new Set(),
        recordsCount: 0,
      };
    }

    const hrs = item.billableHours || item.totalHours || 0;
    const rev = item.totalIncome || item.amount || 0;
    const cogs = item.costOfGoodsSold || 0;

    map[key].totalHours += hrs;
    map[key].regularRevenue += item.regularAmount || rev;
    map[key].overtimeRevenue += item.overtimeAmount || 0;
    map[key].totalRevenue += rev;
    map[key].costOfGoodsSold += cogs;
    map[key].grossProfit += (item.grossProfit !== undefined ? item.grossProfit : rev - cogs);
    map[key].recordsCount += 1;

    if (item.placementId) map[key].placements.add(item.placementId);

    if (item.status === 'Unbilled') {
      map[key].unbilledRevenue += rev;
    } else {
      map[key].recognizedRevenue += rev;
    }
  });

  return Object.values(map)
    .map((c) => ({
      ...c,
      totalHours: +c.totalHours.toFixed(1),
      regularRevenue: +c.regularRevenue.toFixed(2),
      overtimeRevenue: +c.overtimeRevenue.toFixed(2),
      totalRevenue: +c.totalRevenue.toFixed(2),
      unbilledRevenue: +c.unbilledRevenue.toFixed(2),
      recognizedRevenue: +c.recognizedRevenue.toFixed(2),
      costOfGoodsSold: +c.costOfGoodsSold.toFixed(2),
      grossProfit: +c.grossProfit.toFixed(2),
      marginPercent: c.totalRevenue > 0 ? +(((c.grossProfit / c.totalRevenue) * 100).toFixed(1)) : 0,
      placementCount: c.placements.size,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
};

/**
 * Aggregates revenue and hours grouped by Employee / Consultant.
 *
 * @param {Array} incomeRecords - All income records.
 * @returns {Array} Aggregated employee records.
 */
export const aggregateRevenueByEmployee = (incomeRecords = []) => {
  const map = {};

  incomeRecords.forEach((item) => {
    const key = item.employeeId || item.employeeName || 'Unknown Employee';
    if (!map[key]) {
      map[key] = {
        employeeId: item.employeeId || 'N/A',
        employeeName: item.employeeName || 'Unknown Consultant',
        clientName: item.clientName || 'Multiple Clients',
        placementId: item.placementId || 'N/A',
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalRevenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        recordsCount: 0,
      };
    }

    const hrs = item.billableHours || item.totalHours || 0;
    const rev = item.totalIncome || item.amount || 0;
    const cogs = item.costOfGoodsSold || 0;

    map[key].totalHours += hrs;
    map[key].regularHours += item.regularHours || hrs;
    map[key].overtimeHours += item.overtimeHours || 0;
    map[key].totalRevenue += rev;
    map[key].costOfGoodsSold += cogs;
    map[key].grossProfit += (item.grossProfit !== undefined ? item.grossProfit : rev - cogs);
    map[key].recordsCount += 1;
  });

  return Object.values(map)
    .map((e) => ({
      ...e,
      totalHours: +e.totalHours.toFixed(1),
      regularHours: +e.regularHours.toFixed(1),
      overtimeHours: +e.overtimeHours.toFixed(1),
      totalRevenue: +e.totalRevenue.toFixed(2),
      costOfGoodsSold: +e.costOfGoodsSold.toFixed(2),
      grossProfit: +e.grossProfit.toFixed(2),
      effectiveRate: e.totalHours > 0 ? +(e.totalRevenue / e.totalHours).toFixed(2) : 0,
      marginPercent: e.totalRevenue > 0 ? +(((e.grossProfit / e.totalRevenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
};

/**
 * Aggregates revenue and hours grouped by Placement.
 *
 * @param {Array} incomeRecords - All income records.
 * @returns {Array} Aggregated placement records.
 */
export const aggregateRevenueByPlacement = (incomeRecords = []) => {
  const map = {};

  incomeRecords.forEach((item) => {
    const key = item.placementId || 'General Placement';
    if (!map[key]) {
      map[key] = {
        placementId: item.placementId || 'N/A',
        jobTitle: item.jobTitle || 'Consulting Engagement',
        clientName: item.clientName || 'N/A',
        employeeName: item.employeeName || 'N/A',
        hourlyRate: item.billingRate || item.rate || 0,
        totalHours: 0,
        totalRevenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        recordsCount: 0,
      };
    }

    const hrs = item.billableHours || item.totalHours || 0;
    const rev = item.totalIncome || item.amount || 0;
    const cogs = item.costOfGoodsSold || 0;

    map[key].totalHours += hrs;
    map[key].totalRevenue += rev;
    map[key].costOfGoodsSold += cogs;
    map[key].grossProfit += (item.grossProfit !== undefined ? item.grossProfit : rev - cogs);
    map[key].recordsCount += 1;
  });

  return Object.values(map)
    .map((p) => ({
      ...p,
      totalHours: +p.totalHours.toFixed(1),
      totalRevenue: +p.totalRevenue.toFixed(2),
      costOfGoodsSold: +p.costOfGoodsSold.toFixed(2),
      grossProfit: +p.grossProfit.toFixed(2),
      marginPercent: p.totalRevenue > 0 ? +(((p.grossProfit / p.totalRevenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
};

/**
 * Aggregates revenue and hours grouped by Period (e.g. Month or Week-Ending).
 *
 * @param {Array} incomeRecords - All income records.
 * @returns {Array} Aggregated period records.
 */
export const aggregateRevenueByPeriod = (incomeRecords = []) => {
  const map = {};

  incomeRecords.forEach((item) => {
    const rawPeriod = item.periodEnding || item.period || 'Unknown Period';
    // Normalize to YYYY-MM if it's a date or keep period string
    const key = rawPeriod.length >= 7 ? rawPeriod.substring(0, 7) : rawPeriod;

    if (!map[key]) {
      map[key] = {
        period: key,
        rawPeriod,
        recordsCount: 0,
        totalHours: 0,
        totalRevenue: 0,
        unbilledRevenue: 0,
        recognizedRevenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
      };
    }

    const hrs = item.billableHours || item.totalHours || 0;
    const rev = item.totalIncome || item.amount || 0;
    const cogs = item.costOfGoodsSold || 0;

    map[key].recordsCount += 1;
    map[key].totalHours += hrs;
    map[key].totalRevenue += rev;
    map[key].costOfGoodsSold += cogs;
    map[key].grossProfit += (item.grossProfit !== undefined ? item.grossProfit : rev - cogs);

    if (item.status === 'Unbilled') {
      map[key].unbilledRevenue += rev;
    } else {
      map[key].recognizedRevenue += rev;
    }
  });

  return Object.values(map)
    .map((p) => ({
      ...p,
      totalHours: +p.totalHours.toFixed(1),
      totalRevenue: +p.totalRevenue.toFixed(2),
      unbilledRevenue: +p.unbilledRevenue.toFixed(2),
      recognizedRevenue: +p.recognizedRevenue.toFixed(2),
      costOfGoodsSold: +p.costOfGoodsSold.toFixed(2),
      grossProfit: +p.grossProfit.toFixed(2),
      marginPercent: p.totalRevenue > 0 ? +(((p.grossProfit / p.totalRevenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.period.localeCompare(a.period));
};

/**
 * Calculates high-level financial summary KPIs across income records.
 *
 * @param {Array} incomeRecords - List of income records.
 * @returns {Object} KPI metrics.
 */
export const calculateRevenueKPIs = (incomeRecords = []) => {
  let totalRevenue = 0;
  let totalBillableHours = 0;
  let unbilledIncome = 0;
  let recognizedIncome = 0;
  let totalCOGS = 0;
  let totalGrossProfit = 0;

  incomeRecords.forEach((item) => {
    const rev = item.totalIncome || item.amount || 0;
    const hrs = item.billableHours || item.totalHours || 0;
    const cogs = item.costOfGoodsSold || 0;
    const gp = item.grossProfit !== undefined ? item.grossProfit : rev - cogs;

    totalRevenue += rev;
    totalBillableHours += hrs;
    totalCOGS += cogs;
    totalGrossProfit += gp;

    if (item.status === 'Unbilled') {
      unbilledIncome += rev;
    } else {
      recognizedIncome += rev;
    }
  });

  const avgMargin = totalRevenue > 0 ? +(((totalGrossProfit / totalRevenue) * 100).toFixed(2)) : 0;

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    totalBillableHours: +totalBillableHours.toFixed(1),
    unbilledIncome: +unbilledIncome.toFixed(2),
    recognizedIncome: +recognizedIncome.toFixed(2),
    totalGrossProfit: +totalGrossProfit.toFixed(2),
    totalCOGS: +totalCOGS.toFixed(2),
    averageMargin: avgMargin,
    recordsCount: incomeRecords.length,
  };
};
