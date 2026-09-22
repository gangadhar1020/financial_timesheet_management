/**
 * Enterprise Validation Engine
 * 
 * Centralized utility functions for validating entity forms across workforce, clients, jobs,
 * placements, vendors, timesheets, and CSV imports.
 * 
 * @module validation
 * @purpose Provides reusable, testable validation rules that enforce data integrity across all modules.
 * @reusability Imported by all CRUD modal forms and the CSV import pipeline.
 */

// ─── General Validators ────────────────────────────────────────

export const validateRequired = (val, fieldName) => {
  if (val === undefined || val === null || String(val).trim() === '') {
    return `${fieldName} is required.`;
  }
  return null;
};

export const validateEmail = (email) => {
  if (!email || !String(email).trim()) return 'Email address is required.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(String(email).trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
};

export const validatePositiveRate = (rate, fieldName = 'Rate') => {
  const num = parseFloat(rate);
  if (isNaN(num) || num <= 0) {
    return `${fieldName} must be a positive numerical value.`;
  }
  return null;
};

export const validateUniqueId = (id, existingItems = [], currentId = null) => {
  if (!id || !String(id).trim()) return 'Record ID is required.';
  const trimmed = String(id).trim().toUpperCase();
  const duplicate = existingItems.some(
    (item) => item.id && item.id.toUpperCase() === trimmed && item.id !== currentId
  );
  if (duplicate) {
    return `ID "${trimmed}" is already assigned to an existing record.`;
  }
  return null;
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate) return 'Start date is required.';
  if (!endDate) return null; // Open-ended allowed unless specified

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) return 'Start date is invalid.';
  if (isNaN(end.getTime())) return 'End date is invalid.';

  if (end < start) {
    return 'End date cannot precede start date.';
  }
  return null;
};

export const calculateGrossMargin = (billRate, payRate) => {
  const b = parseFloat(billRate);
  const p = parseFloat(payRate);
  if (!isNaN(b) && !isNaN(p) && b > 0) {
    return (((b - p) / b) * 100).toFixed(2);
  }
  return '0.00';
};

// ─── Phase 3: Timesheet Validators ─────────────────────────────

/**
 * Validates that an hours value is a non-negative number with a max of 24 per day.
 * @param {number|string} hours - The hours value to validate.
 * @param {string} fieldName - Human-readable field name for error messages.
 * @returns {string|null} Error message or null if valid.
 */
export const validateHours = (hours, fieldName = 'Hours') => {
  const num = parseFloat(hours);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number.`;
  }
  if (num < 0) {
    return `${fieldName} cannot be negative.`;
  }
  if (num > 24) {
    return `${fieldName} cannot exceed 24 hours per day.`;
  }
  return null;
};

/**
 * Validates that a timesheet period ending date is a valid date.
 * @param {string} periodEnding - ISO date string for the week-ending date.
 * @returns {string|null} Error message or null if valid.
 */
export const validateTimesheetPeriod = (periodEnding) => {
  if (!periodEnding) return 'Period ending date is required.';
  const d = new Date(periodEnding);
  if (isNaN(d.getTime())) return 'Period ending date is invalid.';
  return null;
};

/**
 * Validates that a placement reference exists among active placements.
 * @param {string} placementId - The placement ID to validate.
 * @param {Array} placements - Array of placement objects from Redux store.
 * @returns {string|null} Error message or null if valid.
 */
export const validatePlacementReference = (placementId, placements = []) => {
  if (!placementId) return 'Placement is required.';
  const found = placements.find((p) => p.id === placementId);
  if (!found) return `Placement "${placementId}" not found.`;
  if (found.status !== 'Active') return `Placement "${placementId}" is not currently active.`;
  return null;
};

/**
 * Detects duplicate timesheets for the same employee + period combination.
 * Returns a warning (not a hard block) for awareness.
 * @param {string} candidateId - Employee/contractor ID.
 * @param {string} periodEnding - Week-ending date (ISO string).
 * @param {Array} existingTimesheets - Existing timesheet records.
 * @param {string|null} currentId - Current timesheet ID (excluded from duplicate check on edit).
 * @returns {string|null} Warning message or null.
 */
export const validateDuplicatePeriod = (candidateId, periodEnding, existingTimesheets = [], currentId = null) => {
  if (!candidateId || !periodEnding) return null;
  const duplicate = existingTimesheets.find(
    (ts) =>
      ts.candidateId === candidateId &&
      ts.periodEnding === periodEnding &&
      ts.id !== currentId
  );
  if (duplicate) {
    return `Warning: A timesheet (${duplicate.id}) already exists for this employee and period ending ${periodEnding}.`;
  }
  return null;
};

/**
 * Validates that total daily hours (regular + overtime + holiday) do not exceed 24.
 * @param {Object} entry - Daily entry { regular, overtime, holiday }.
 * @param {string} dayLabel - The day label for error messages.
 * @returns {string|null} Error message or null if valid.
 */
export const validateDailyTotalHours = (entry, dayLabel = 'Day') => {
  const total = (parseFloat(entry.regular) || 0) + (parseFloat(entry.overtime) || 0) + (parseFloat(entry.holiday) || 0);
  if (total > 24) {
    return `${dayLabel}: Total hours (${total}) cannot exceed 24.`;
  }
  return null;
};

// ─── Phase 3: CSV Import Validators ────────────────────────────

/**
 * Parses a raw CSV string into an array of objects using the first row as headers.
 * Handles quoted fields and basic edge cases.
 * @param {string} csvText - Raw CSV text content.
 * @returns {{ headers: string[], rows: Object[] }} Parsed headers and row objects.
 */
export const parseCSVString = (csvText) => {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [] };
  }

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { headers: lines[0] ? splitCSVLine(lines[0]) : [], rows: [] };
  }

  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim();
    });
    row._rowNumber = i;
    rows.push(row);
  }

  return { headers, rows };
};

/**
 * Splits a single CSV line respecting quoted fields.
 * @param {string} line - A single line of CSV text.
 * @returns {string[]} Array of field values.
 */
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Validates that required CSV headers are present.
 * @param {string[]} headers - Actual headers found in the CSV.
 * @param {string[]} expectedHeaders - Required header names.
 * @returns {{ valid: boolean, missing: string[] }} Validation result.
 */
export const validateCSVHeaders = (headers, expectedHeaders) => {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  const missing = expectedHeaders.filter(
    (expected) => !normalizedHeaders.includes(expected.toLowerCase().trim())
  );
  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * Validates a single parsed CSV row against a field schema.
 * @param {Object} row - Parsed row object with header-keyed values.
 * @param {Array} schema - Array of { field, required, type, validate? } definitions.
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export const validateCSVRow = (row, schema) => {
  const errors = [];
  
  for (const fieldDef of schema) {
    const value = row[fieldDef.field];
    
    // Required check
    if (fieldDef.required && (!value || !String(value).trim())) {
      errors.push({ field: fieldDef.field, message: `${fieldDef.field} is required.` });
      continue;
    }

    if (!value || !String(value).trim()) continue; // Skip optional empty

    // Type checks
    if (fieldDef.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        errors.push({ field: fieldDef.field, message: `${fieldDef.field} must be a number.` });
      } else if (fieldDef.min !== undefined && num < fieldDef.min) {
        errors.push({ field: fieldDef.field, message: `${fieldDef.field} must be at least ${fieldDef.min}.` });
      }
    }

    if (fieldDef.type === 'date') {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        errors.push({ field: fieldDef.field, message: `${fieldDef.field} must be a valid date.` });
      }
    }

    if (fieldDef.type === 'email') {
      const emailError = validateEmail(value);
      if (emailError) {
        errors.push({ field: fieldDef.field, message: emailError });
      }
    }

    // Custom validate function
    if (fieldDef.validate) {
      const customErr = fieldDef.validate(value, row);
      if (customErr) {
        errors.push({ field: fieldDef.field, message: customErr });
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * CSV template schemas for different import types.
 * Used by the import preview and validation pipeline.
 */
export const CSV_IMPORT_SCHEMAS = {
  Timesheets: {
    expectedHeaders: ['placementId', 'periodEnding', 'regularHours', 'overtimeHours', 'holidayHours'],
    fieldSchema: [
      { field: 'placementId', required: true, type: 'string' },
      { field: 'periodEnding', required: true, type: 'date' },
      { field: 'regularHours', required: true, type: 'number', min: 0 },
      { field: 'overtimeHours', required: false, type: 'number', min: 0 },
      { field: 'holidayHours', required: false, type: 'number', min: 0 },
    ],
    templateCSV: 'placementId,periodEnding,regularHours,overtimeHours,holidayHours\nPLC-5001,2026-09-20,40,0,0\nPLC-5002,2026-09-20,40,5,0',
  },
  Employees: {
    expectedHeaders: ['id', 'firstName', 'lastName', 'email', 'role', 'payRate', 'hireDate'],
    fieldSchema: [
      { field: 'id', required: true, type: 'string' },
      { field: 'firstName', required: true, type: 'string' },
      { field: 'lastName', required: true, type: 'string' },
      { field: 'email', required: true, type: 'email' },
      { field: 'role', required: false, type: 'string' },
      { field: 'payRate', required: true, type: 'number', min: 0.01 },
      { field: 'hireDate', required: true, type: 'date' },
    ],
    templateCSV: 'id,firstName,lastName,email,role,payRate,hireDate\nEMP-9001,Jane,Smith,j.smith@company.com,Engineer,85.00,2026-10-01',
  },
  Placements: {
    expectedHeaders: ['candidateId', 'clientId', 'jobId', 'startDate', 'billRate', 'payRate'],
    fieldSchema: [
      { field: 'candidateId', required: true, type: 'string' },
      { field: 'clientId', required: true, type: 'string' },
      { field: 'jobId', required: true, type: 'string' },
      { field: 'startDate', required: true, type: 'date' },
      { field: 'endDate', required: false, type: 'date' },
      { field: 'billRate', required: true, type: 'number', min: 0.01 },
      { field: 'payRate', required: true, type: 'number', min: 0.01 },
    ],
    templateCSV: 'candidateId,clientId,jobId,startDate,endDate,billRate,payRate\nEMP-1001,CLI-3001,JOB-4001,2026-10-01,2027-03-31,150.00,85.00',
  },
  Candidates: {
    expectedHeaders: ['id', 'candidateType', 'name', 'contactPerson', 'email', 'phone', 'paymentTerms'],
    fieldSchema: [
      { field: 'id', required: true, type: 'string' },
      {
        field: 'candidateType',
        required: true,
        type: 'string',
        validate: (v) => (['Client', 'Vendor'].includes(v) ? null : 'Candidate Type must be Client or Vendor.'),
      },
      { field: 'name', required: true, type: 'string' },
      { field: 'contactPerson', required: true, type: 'string' },
      { field: 'email', required: true, type: 'email' },
      { field: 'phone', required: false, type: 'string' },
      { field: 'paymentTerms', required: false, type: 'string' },
    ],
    templateCSV: 'id,candidateType,name,contactPerson,email,phone,paymentTerms\nCLI-3004,Client,Acme Global Systems,Rachel Zane,rzane@acmeglobal.com,+1-555-0144,Net 30\nVEN-3004,Vendor,Apex Solutions Partner,Harvey Specter,harvey@apexpartner.com,+1-555-0188,Net 15',
  },
};
