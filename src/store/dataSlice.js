import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { calculateIncomeFromTimesheet, validateIncomeGeneration } from '../utils/revenueEngine';
import {
  calculateInvoiceTotals,
  calculateWorkerCost,
  computeAgingBucket,
  computeInvoiceStatus,
  validateInvoiceCreation,
  validateARPayment,
  validateAPBillCreation,
  validateAPPayment,
} from '../utils/accountingEngine';

/**
 * Generic helper to fetch JSON from public/data
 * Allows smooth API swapping in future phases.
 */
async function fetchEndpoint(endpoint) {
  const response = await fetch(`/data/${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${endpoint}`);
  }
  return await response.json();
}

// Preserved existing async thunk
export const fetchProjects = createAsyncThunk('data/fetchProjects', () => fetchEndpoint('projects.json'));

// Core entity async thunks
export const fetchOrganizations = createAsyncThunk('data/fetchOrganizations', () => fetchEndpoint('organizations.json'));
export const fetchEmployees = createAsyncThunk('data/fetchEmployees', () => fetchEndpoint('employees.json'));
export const fetchContractors = createAsyncThunk('data/fetchContractors', () => fetchEndpoint('contractors.json'));
export const fetchClients = createAsyncThunk('data/fetchClients', () => fetchEndpoint('clients.json'));
export const fetchJobs = createAsyncThunk('data/fetchJobs', () => fetchEndpoint('jobs.json'));
export const fetchPlacements = createAsyncThunk('data/fetchPlacements', () => fetchEndpoint('placements.json'));
export const fetchVendors = createAsyncThunk('data/fetchVendors', () => fetchEndpoint('vendors.json'));
export const fetchTimesheets = createAsyncThunk('data/fetchTimesheets', () => fetchEndpoint('timesheets.json'));
export const fetchIncome = createAsyncThunk('data/fetchIncome', () => fetchEndpoint('income.json'));
export const fetchInvoices = createAsyncThunk('data/fetchInvoices', () => fetchEndpoint('invoices.json'));
export const fetchArPayments = createAsyncThunk('data/fetchArPayments', () => fetchEndpoint('ar_payments.json'));
export const fetchApBills = createAsyncThunk('data/fetchApBills', () => fetchEndpoint('ap_bills.json'));
export const fetchApPayments = createAsyncThunk('data/fetchApPayments', () => fetchEndpoint('ap_payments.json'));
export const fetchImports = createAsyncThunk('data/fetchImports', () => fetchEndpoint('imports.json'));
export const fetchReports = createAsyncThunk('data/fetchReports', () => fetchEndpoint('reports.json'));
export const fetchAuditLogs = createAsyncThunk('data/fetchAuditLogs', () => fetchEndpoint('audit_logs.json'));
export const fetchConfiguration = createAsyncThunk('data/fetchConfiguration', () => fetchEndpoint('configuration.json'));

/**
 * Batch thunk to initialize all application foundations in one shot
 */
export const fetchAllInitialData = createAsyncThunk('data/fetchAllInitialData', async (_, { dispatch }) => {
  await Promise.all([
    dispatch(fetchProjects()),
    dispatch(fetchOrganizations()),
    dispatch(fetchEmployees()),
    dispatch(fetchContractors()),
    dispatch(fetchClients()),
    dispatch(fetchJobs()),
    dispatch(fetchPlacements()),
    dispatch(fetchVendors()),
    dispatch(fetchTimesheets()),
    dispatch(fetchIncome()),
    dispatch(fetchInvoices()),
    dispatch(fetchArPayments()),
    dispatch(fetchApBills()),
    dispatch(fetchApPayments()),
    dispatch(fetchImports()),
    dispatch(fetchReports()),
    dispatch(fetchAuditLogs()),
    dispatch(fetchConfiguration()),
  ]);
  return true;
});

const initialState = {
  // Preserved project state
  projects: [],
  
  // Master & Transactional Data
  organizations: [],
  employees: [],
  contractors: [],
  clients: [],
  jobs: [],
  placements: [],
  vendors: [],
  timesheets: [],
  income: [],
  invoices: [],
  arPayments: [],
  apBills: [],
  apPayments: [],
  imports: [],
  reports: [],
  auditLogs: [],
  configuration: null,

  // Global Status & Diagnostics
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,

  // Shell & Navigation UI State
  activeView: 'dashboard',
  selectedOrgId: 'ORG-001',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  globalSearchQuery: '',
  toasts: [],
  activeModal: null,
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setActiveView: (state, action) => {
      state.activeView = action.payload;
      state.mobileNavOpen = false;
    },
    setSelectedOrgId: (state, action) => {
      state.selectedOrgId = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setMobileNavOpen: (state, action) => {
      state.mobileNavOpen = action.payload;
    },
    setGlobalSearchQuery: (state, action) => {
      state.globalSearchQuery = action.payload;
    },
    openModal: (state, action) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    addToast: (state, action) => {
      const toast = {
        id: action.payload.id || Date.now().toString(),
        type: action.payload.type || 'info',
        title: action.payload.title || '',
        message: action.payload.message || '',
        duration: action.payload.duration || 4000,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    // --- Phase 2: Employee CRUD ---
    addEmployee: (state, action) => {
      const newEmp = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: action.payload.status || 'Active',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.employees.unshift(newEmp);
    },
    updateEmployee: (state, action) => {
      const idx = state.employees.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) {
        state.employees[idx] = {
          ...state.employees[idx],
          ...action.payload,
          version: (state.employees[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    toggleEmployeeStatus: (state, action) => {
      const emp = state.employees.find((e) => e.id === action.payload);
      if (emp) {
        emp.status = emp.status === 'Active' ? 'Inactive' : 'Active';
        emp.version = (emp.version || 1) + 1;
        emp.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 2: Contractor CRUD ---
    addContractor: (state, action) => {
      const newCon = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: action.payload.status || 'Active',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.contractors.unshift(newCon);
    },
    updateContractor: (state, action) => {
      const idx = state.contractors.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) {
        state.contractors[idx] = {
          ...state.contractors[idx],
          ...action.payload,
          version: (state.contractors[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    toggleContractorStatus: (state, action) => {
      const con = state.contractors.find((c) => c.id === action.payload);
      if (con) {
        con.status = con.status === 'Active' ? 'Inactive' : 'Active';
        con.version = (con.version || 1) + 1;
        con.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 2: Client CRUD ---
    addClient: (state, action) => {
      const newClient = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: action.payload.status || 'Active',
        outstandingBalance: action.payload.outstandingBalance || 0,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.clients.unshift(newClient);
    },
    updateClient: (state, action) => {
      const idx = state.clients.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) {
        state.clients[idx] = {
          ...state.clients[idx],
          ...action.payload,
          version: (state.clients[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    toggleClientStatus: (state, action) => {
      const client = state.clients.find((c) => c.id === action.payload);
      if (client) {
        client.status = client.status === 'Active' ? 'Inactive' : 'Active';
        client.version = (client.version || 1) + 1;
        client.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 2: Job CRUD ---
    addJob: (state, action) => {
      const newJob = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        positionsFilled: action.payload.positionsFilled || 0,
        status: action.payload.status || 'Active',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.jobs.unshift(newJob);
    },
    updateJob: (state, action) => {
      const idx = state.jobs.findIndex((j) => j.id === action.payload.id);
      if (idx !== -1) {
        state.jobs[idx] = {
          ...state.jobs[idx],
          ...action.payload,
          version: (state.jobs[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    toggleJobStatus: (state, action) => {
      const job = state.jobs.find((j) => j.id === action.payload);
      if (job) {
        job.status = job.status === 'Active' ? 'Inactive' : 'Active';
        job.version = (job.version || 1) + 1;
        job.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 2: Placement CRUD ---
    addPlacement: (state, action) => {
      const newPlacement = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: action.payload.status || 'Active',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.placements.unshift(newPlacement);
    },
    updatePlacement: (state, action) => {
      const idx = state.placements.findIndex((p) => p.id === action.payload.id);
      if (idx !== -1) {
        state.placements[idx] = {
          ...state.placements[idx],
          ...action.payload,
          version: (state.placements[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    togglePlacementStatus: (state, action) => {
      const placement = state.placements.find((p) => p.id === action.payload);
      if (placement) {
        placement.status = placement.status === 'Active' ? 'Inactive' : 'Active';
        placement.version = (placement.version || 1) + 1;
        placement.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 2: Vendor CRUD ---
    addVendor: (state, action) => {
      const newVendor = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: action.payload.status || 'Active',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.vendors.unshift(newVendor);
    },
    updateVendor: (state, action) => {
      const idx = state.vendors.findIndex((v) => v.id === action.payload.id);
      if (idx !== -1) {
        state.vendors[idx] = {
          ...state.vendors[idx],
          ...action.payload,
          version: (state.vendors[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    toggleVendorStatus: (state, action) => {
      const vendor = state.vendors.find((v) => v.id === action.payload);
      if (vendor) {
        vendor.status = vendor.status === 'Active' ? 'Inactive' : 'Active';
        vendor.version = (vendor.version || 1) + 1;
        vendor.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 3: Timesheet CRUD & Workflow ---
    addTimesheet: (state, action) => {
      const newTs = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: 'Draft',
        submittedAt: null,
        approvedBy: null,
        approvedAt: null,
        returnedReason: null,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.timesheets.unshift(newTs);
    },
    updateTimesheet: (state, action) => {
      const idx = state.timesheets.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) {
        const ts = state.timesheets[idx];
        if (ts.status === 'Draft' || ts.status === 'Returned') {
          state.timesheets[idx] = {
            ...ts,
            ...action.payload,
            version: (ts.version || 1) + 1,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    },
    submitTimesheet: (state, action) => {
      const ts = state.timesheets.find((t) => t.id === action.payload);
      if (ts && (ts.status === 'Draft' || ts.status === 'Returned')) {
        ts.status = 'Submitted';
        ts.submittedAt = new Date().toISOString();
        ts.returnedReason = null;
        ts.version = (ts.version || 1) + 1;
        ts.updatedAt = new Date().toISOString();
      }
    },
    approveTimesheet: (state, action) => {
      const { id, approvedBy } = action.payload;
      const ts = state.timesheets.find((t) => t.id === id);
      if (ts && ts.status === 'Submitted') {
        ts.status = 'Approved';
        ts.approvedBy = approvedBy || 'Manager';
        ts.approvedAt = new Date().toISOString();
        ts.version = (ts.version || 1) + 1;
        ts.updatedAt = new Date().toISOString();
      }
    },
    returnTimesheet: (state, action) => {
      const { id, reason } = action.payload;
      const ts = state.timesheets.find((t) => t.id === id);
      if (ts && ts.status === 'Submitted') {
        ts.status = 'Returned';
        ts.returnedReason = reason || 'Returned for correction.';
        ts.version = (ts.version || 1) + 1;
        ts.updatedAt = new Date().toISOString();
      }
    },
    rejectTimesheet: (state, action) => {
      const { id, reason } = action.payload;
      const ts = state.timesheets.find((t) => t.id === id);
      if (ts && ts.status === 'Submitted') {
        ts.status = 'Rejected';
        ts.returnedReason = reason || 'Rejected.';
        ts.version = (ts.version || 1) + 1;
        ts.updatedAt = new Date().toISOString();
      }
    },

    // --- Phase 3: Import Pipeline ---
    addImport: (state, action) => {
      const newImport = {
        ...action.payload,
        organizationId: action.payload.organizationId || state.selectedOrgId,
        status: 'Processing',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.imports.unshift(newImport);
    },
    processImport: (state, action) => {
      const idx = state.imports.findIndex((imp) => imp.id === action.payload.id);
      if (idx !== -1) {
        state.imports[idx] = {
          ...state.imports[idx],
          ...action.payload,
          status: action.payload.recordsFailed > 0 ? 'Completed with Warnings' : 'Completed',
          pipeline: {
            ...state.imports[idx].pipeline,
            processed: new Date().toISOString(),
          },
          version: (state.imports[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    rejectImport: (state, action) => {
      const idx = state.imports.findIndex((imp) => imp.id === action.payload.id);
      if (idx !== -1) {
        state.imports[idx] = {
          ...state.imports[idx],
          ...action.payload,
          status: 'Rejected',
          pipeline: {
            ...state.imports[idx].pipeline,
            rejected: new Date().toISOString(),
          },
          version: (state.imports[idx].version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
    },

    // --- Phase 4: Traceable Income Generation ---
    generateIncomeFromTimesheet: (state, action) => {
      const timesheetId = typeof action.payload === 'string' ? action.payload : action.payload.timesheetId;
      const ts = state.timesheets.find((t) => t.id === timesheetId);

      if (!ts) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Timesheet Not Found',
          message: `Timesheet "${timesheetId}" could not be found.`,
          duration: 4000,
        });
        return;
      }

      const placement = state.placements.find((p) => p.id === ts.placementId);
      const validation = validateIncomeGeneration(ts, state.income, state.placements);

      if (!validation.valid) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Income Generation Blocked',
          message: validation.error,
          duration: 5000,
        });
        return;
      }

      // Generate unique INC ID
      const existingNumericIds = state.income
        .map((i) => parseInt(String(i.id).replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n));
      const maxId = existingNumericIds.length > 0 ? Math.max(...existingNumericIds) : 7000;
      const nextId = `INC-${maxId + 1}`;

      const options = typeof action.payload === 'object' ? action.payload.options : {};
      const newIncomeRecord = {
        id: nextId,
        ...calculateIncomeFromTimesheet(ts, placement, options),
      };

      state.income.unshift(newIncomeRecord);

      // Link timesheet to generated income record
      ts.incomeId = nextId;
      ts.updatedAt = new Date().toISOString();

      state.toasts.push({
        id: Date.now().toString(),
        type: 'success',
        title: 'Income Generated',
        message: `${nextId} created for $${newIncomeRecord.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from timesheet ${ts.id}.`,
        duration: 4500,
      });
    },

    batchGenerateIncome: (state, action) => {
      const timesheetIds = action.payload || [];
      let successCount = 0;
      let skippedCount = 0;

      timesheetIds.forEach((tsId) => {
        const ts = state.timesheets.find((t) => t.id === tsId);
        if (!ts) {
          skippedCount++;
          return;
        }

        const validation = validateIncomeGeneration(ts, state.income, state.placements);
        if (!validation.valid) {
          skippedCount++;
          return;
        }

        const placement = state.placements.find((p) => p.id === ts.placementId);
        const existingNumericIds = state.income
          .map((i) => parseInt(String(i.id).replace(/\D/g, ''), 10))
          .filter((n) => !isNaN(n));
        const maxId = existingNumericIds.length > 0 ? Math.max(...existingNumericIds) : 7000;
        const nextId = `INC-${maxId + 1}`;

        const newRecord = {
          id: nextId,
          ...calculateIncomeFromTimesheet(ts, placement),
        };

        state.income.unshift(newRecord);
        ts.incomeId = nextId;
        ts.updatedAt = new Date().toISOString();
        successCount++;
      });

      state.toasts.push({
        id: Date.now().toString(),
        type: successCount > 0 ? 'success' : 'warning',
        title: 'Batch Generation Completed',
        message: `Generated ${successCount} income record(s). ${skippedCount > 0 ? `${skippedCount} skipped (unapproved or duplicate).` : ''}`,
        duration: 4500,
      });
    },

    updateIncomeStatus: (state, action) => {
      const { id, status } = action.payload;
      const inc = state.income.find((i) => i.id === id);
      if (inc) {
        inc.status = status;
        inc.version = (inc.version || 1) + 1;
        inc.updatedAt = new Date().toISOString();
      }
    },

    voidIncomeRecord: (state, action) => {
      const id = action.payload;
      const incIndex = state.income.findIndex((i) => i.id === id);
      if (incIndex !== -1) {
        const inc = state.income[incIndex];
        // Unlink corresponding timesheet if linked
        if (inc.sourceId) {
          const ts = state.timesheets.find((t) => t.id === inc.sourceId);
          if (ts) {
            delete ts.incomeId;
            ts.updatedAt = new Date().toISOString();
          }
        }
        state.income.splice(incIndex, 1);
        state.toasts.push({
          id: Date.now().toString(),
          type: 'info',
          title: 'Income Record Voided',
          message: `Record ${id} has been voided. Associated timesheet is eligible for regeneration.`,
          duration: 4000,
        });
      }
    },

    // --- Phase 5: Accounts Receivable (Invoices & Payments) ---
    createInvoice: (state, action) => {
      const { clientId, invoiceNumber, issueDate, dueDate, incomeIds, taxRate, notes } = action.payload;
      const client = state.clients.find((c) => c.id === clientId);

      if (!client) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Client Not Found',
          message: `Client "${clientId}" could not be found.`,
          duration: 4000,
        });
        return;
      }

      const selectedIncome = state.income.filter((inc) => (incomeIds || []).includes(inc.id));
      const validation = validateInvoiceCreation(client, selectedIncome, state.invoices);

      if (!validation.valid) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Invoice Creation Blocked',
          message: validation.error,
          duration: 5000,
        });
        return;
      }

      // Generate Line Items from Income Records
      const lineItems = selectedIncome.map((inc, index) => {
        const qty = inc.billableHours || inc.totalHours || 1;
        const rate = inc.billingRate || inc.rate || inc.amount;
        const amount = inc.amount || inc.totalIncome || +(qty * rate).toFixed(2);
        return {
          id: `LINE-${Date.now()}-${index}`,
          incomeId: inc.id,
          sourceTimesheetId: inc.sourceId,
          placementId: inc.placementId,
          description: `${inc.jobTitle || 'Consulting Services'} — ${inc.employeeName} (${inc.periodEnding || inc.period})`,
          quantity: qty,
          rate,
          amount,
        };
      });

      const totals = calculateInvoiceTotals(lineItems, taxRate || 0, 0);

      // Unique Invoice ID
      const existingNumericIds = state.invoices
        .map((inv) => parseInt(String(inv.id).replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n));
      const maxId = existingNumericIds.length > 0 ? Math.max(...existingNumericIds) : 8000;
      const nextId = `INV-${maxId + 1}`;

      const year = new Date().getFullYear();
      const generatedInvoiceNumber = invoiceNumber || `INV-${year}-${String(maxId + 1).padStart(4, '0')}`;
      const effectiveDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const agingBucket = computeAgingBucket(effectiveDueDate, totals.totalAmount);

      const newInvoice = {
        id: nextId,
        organizationId: client.organizationId || state.selectedOrgId || 'ORG-001',
        clientId: client.id,
        clientName: client.name,
        invoiceNumber: generatedInvoiceNumber,
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        dueDate: effectiveDueDate,
        lineItems,
        subtotal: totals.subtotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        paidAmount: 0.00,
        balanceDue: totals.totalAmount,
        agingBucket,
        incomeReferences: selectedIncome.map((i) => i.id),
        status: 'Open',
        notes: notes || '',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.invoices.unshift(newInvoice);

      // Update Income records to 'Invoiced' and link invoice
      selectedIncome.forEach((inc) => {
        const found = state.income.find((i) => i.id === inc.id);
        if (found) {
          found.status = 'Invoiced';
          found.invoiceId = nextId;
          found.updatedAt = new Date().toISOString();
        }
      });

      // Update client's outstanding balance
      client.outstandingBalance = +((client.outstandingBalance || 0) + totals.totalAmount).toFixed(2);
      client.updatedAt = new Date().toISOString();

      state.toasts.push({
        id: Date.now().toString(),
        type: 'success',
        title: 'Invoice Created',
        message: `${generatedInvoiceNumber} created for ${client.name} ($${totals.totalAmount.toLocaleString()}).`,
        duration: 4500,
      });
    },

    recordArPayment: (state, action) => {
      const { invoiceId, amount, paymentDate, paymentMethod, paymentReference, notes } = action.payload;
      const invoice = state.invoices.find((inv) => inv.id === invoiceId);

      if (!invoice) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Invoice Not Found',
          message: `Invoice "${invoiceId}" could not be found.`,
          duration: 4000,
        });
        return;
      }

      const numAmount = parseFloat(amount);
      const validation = validateARPayment(invoice, numAmount);

      if (!validation.valid) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Payment Blocked',
          message: validation.error,
          duration: 5000,
        });
        return;
      }

      // Generate payment ID
      const existingPayIds = state.arPayments
        .map((p) => parseInt(String(p.id).replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n));
      const nextPayId = `ARP-${(existingPayIds.length > 0 ? Math.max(...existingPayIds) : 9000) + 1}`;

      const newPaidAmount = +(invoice.paidAmount + numAmount).toFixed(2);
      const newBalanceDue = +(Math.max(0, invoice.totalAmount - newPaidAmount)).toFixed(2);

      invoice.paidAmount = newPaidAmount;
      invoice.balanceDue = newBalanceDue;
      invoice.status = computeInvoiceStatus(invoice.totalAmount, newPaidAmount, invoice.dueDate, invoice.status);
      invoice.agingBucket = computeAgingBucket(invoice.dueDate, newBalanceDue);
      invoice.version = (invoice.version || 1) + 1;
      invoice.updatedAt = new Date().toISOString();

      const newPayment = {
        id: nextPayId,
        organizationId: invoice.organizationId || state.selectedOrgId || 'ORG-001',
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentReference: paymentReference || `PAY-${Date.now().toString().slice(-6)}`,
        paymentMethod: paymentMethod || 'ACH Credit',
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        amount: numAmount,
        currency: 'USD',
        notes: notes || `Payment applied to ${invoice.invoiceNumber}`,
        status: 'Processed',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.arPayments.unshift(newPayment);

      // Reduce client outstanding balance
      const client = state.clients.find((c) => c.id === invoice.clientId);
      if (client) {
        client.outstandingBalance = +(Math.max(0, (client.outstandingBalance || 0) - numAmount)).toFixed(2);
        client.updatedAt = new Date().toISOString();
      }

      state.toasts.push({
        id: Date.now().toString(),
        type: 'success',
        title: 'Payment Recorded',
        message: `$${numAmount.toLocaleString()} received for ${invoice.invoiceNumber}. Remaining balance: $${newBalanceDue.toLocaleString()}.`,
        duration: 4500,
      });
    },

    voidInvoice: (state, action) => {
      const invoiceId = action.payload;
      const invIndex = state.invoices.findIndex((i) => i.id === invoiceId);

      if (invIndex !== -1) {
        const inv = state.invoices[invIndex];

        if (inv.paidAmount > 0) {
          state.toasts.push({
            id: Date.now().toString(),
            type: 'error',
            title: 'Cannot Void Invoice',
            message: `Invoice ${inv.invoiceNumber || inv.id} has $${inv.paidAmount.toLocaleString()} in recorded payments. Void payments first.`,
            duration: 5000,
          });
          return;
        }

        // Release income records back to Unbilled
        if (inv.incomeReferences && inv.incomeReferences.length > 0) {
          state.income.forEach((inc) => {
            if (inv.incomeReferences.includes(inc.id)) {
              inc.status = 'Unbilled';
              delete inc.invoiceId;
              inc.updatedAt = new Date().toISOString();
            }
          });
        }

        // Reduce client balance
        const client = state.clients.find((c) => c.id === inv.clientId);
        if (client) {
          client.outstandingBalance = +(Math.max(0, (client.outstandingBalance || 0) - inv.totalAmount)).toFixed(2);
          client.updatedAt = new Date().toISOString();
        }

        state.invoices.splice(invIndex, 1);

        state.toasts.push({
          id: Date.now().toString(),
          type: 'info',
          title: 'Invoice Voided',
          message: `Invoice ${inv.invoiceNumber || inv.id} voided. Attached income records returned to Unbilled status.`,
          duration: 4000,
        });
      }
    },

    // --- Phase 5: Accounts Payable (AP Bills & Disbursements) ---
    createApBillFromTimesheet: (state, action) => {
      const { timesheetId, billDate, dueDate, billNumber, description } = action.payload;
      const ts = state.timesheets.find((t) => t.id === timesheetId);

      if (!ts) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Timesheet Not Found',
          message: `Timesheet "${timesheetId}" could not be found.`,
          duration: 4000,
        });
        return;
      }

      const placement = state.placements.find((p) => p.id === ts.placementId);
      const validation = validateAPBillCreation(ts, state.apBills, state.placements);

      if (!validation.valid) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'AP Bill Creation Blocked',
          message: validation.error,
          duration: 5000,
        });
        return;
      }

      const workerCost = calculateWorkerCost(ts, placement);

      const existingBillIds = state.apBills
        .map((b) => parseInt(String(b.id).replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n));
      const nextId = `APB-${(existingBillIds.length > 0 ? Math.max(...existingBillIds) : 1000) + 1}`;

      const year = new Date().getFullYear();
      const generatedBillNumber = billNumber || `BILL-${year}-${String(nextId).replace(/\D/g, '')}`;

      // Contractor / Vendor lookup
      const contractor = state.contractors.find((c) => c.id === ts.candidateId);
      const vendorName = contractor?.vendorName || ts.candidateName || 'Contractor Partner';

      const effectiveDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const newBill = {
        id: nextId,
        organizationId: ts.organizationId || state.selectedOrgId || 'ORG-001',
        contractorId: ts.candidateId,
        vendorName,
        placementId: ts.placementId,
        sourceTimesheetId: ts.id,
        sourceId: ts.id,
        billNumber: generatedBillNumber,
        billDate: billDate || new Date().toISOString().split('T')[0],
        dueDate: effectiveDueDate,
        periodEnding: ts.periodEnding,
        regularHours: workerCost.regularHours,
        regularPayRate: workerCost.regularPayRate,
        regularCost: workerCost.regularCost,
        overtimeHours: workerCost.overtimeHours,
        overtimePayRate: workerCost.overtimePayRate,
        overtimeCost: workerCost.overtimeCost,
        holidayHours: workerCost.holidayHours,
        holidayCost: workerCost.holidayCost,
        payableHours: workerCost.payableHours,
        payRate: workerCost.payRate,
        totalAmount: workerCost.totalAmount,
        paidAmount: 0.00,
        balanceDue: workerCost.totalAmount,
        description: description || `Worker cost for ${ts.candidateName} (${ts.periodEnding})`,
        formula: workerCost.formula,
        status: 'Approved',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.apBills.unshift(newBill);

      // Link timesheet to generated bill
      ts.billId = nextId;
      ts.updatedAt = new Date().toISOString();

      state.toasts.push({
        id: Date.now().toString(),
        type: 'success',
        title: 'AP Bill Generated',
        message: `${generatedBillNumber} generated for ${vendorName} ($${workerCost.totalAmount.toLocaleString()}).`,
        duration: 4500,
      });
    },

    batchCreateApBills: (state, action) => {
      const timesheetIds = action.payload || [];
      let successCount = 0;
      let skippedCount = 0;

      timesheetIds.forEach((tsId) => {
        const ts = state.timesheets.find((t) => t.id === tsId);
        if (!ts) {
          skippedCount++;
          return;
        }

        const placement = state.placements.find((p) => p.id === ts.placementId);
        const validation = validateAPBillCreation(ts, state.apBills, state.placements);

        if (!validation.valid) {
          skippedCount++;
          return;
        }

        const workerCost = calculateWorkerCost(ts, placement);
        const existingBillIds = state.apBills
          .map((b) => parseInt(String(b.id).replace(/\D/g, ''), 10))
          .filter((n) => !isNaN(n));
        const nextId = `APB-${(existingBillIds.length > 0 ? Math.max(...existingBillIds) : 1000) + 1}`;

        const contractor = state.contractors.find((c) => c.id === ts.candidateId);
        const vendorName = contractor?.vendorName || ts.candidateName || 'Contractor Partner';

        const newBill = {
          id: nextId,
          organizationId: ts.organizationId || state.selectedOrgId || 'ORG-001',
          contractorId: ts.candidateId,
          vendorName,
          placementId: ts.placementId,
          sourceTimesheetId: ts.id,
          sourceId: ts.id,
          billNumber: `BILL-${new Date().getFullYear()}-${String(nextId).replace(/\D/g, '')}`,
          billDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          periodEnding: ts.periodEnding,
          regularHours: workerCost.regularHours,
          regularPayRate: workerCost.regularPayRate,
          regularCost: workerCost.regularCost,
          overtimeHours: workerCost.overtimeHours,
          overtimePayRate: workerCost.overtimePayRate,
          overtimeCost: workerCost.overtimeCost,
          holidayHours: workerCost.holidayHours,
          holidayCost: workerCost.holidayCost,
          payableHours: workerCost.payableHours,
          payRate: workerCost.payRate,
          totalAmount: workerCost.totalAmount,
          paidAmount: 0.00,
          balanceDue: workerCost.totalAmount,
          description: `Worker cost for ${ts.candidateName} (${ts.periodEnding})`,
          formula: workerCost.formula,
          status: 'Approved',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.apBills.unshift(newBill);
        ts.billId = nextId;
        ts.updatedAt = new Date().toISOString();
        successCount++;
      });

      state.toasts.push({
        id: Date.now().toString(),
        type: successCount > 0 ? 'success' : 'warning',
        title: 'Batch AP Billing Completed',
        message: `Generated ${successCount} AP bill(s). ${skippedCount > 0 ? `${skippedCount} skipped (unapproved or duplicate).` : ''}`,
        duration: 4500,
      });
    },

    recordApPayment: (state, action) => {
      const { billId, amount, paymentDate, paymentMethod, paymentReference, notes } = action.payload;
      const bill = state.apBills.find((b) => b.id === billId);

      if (!bill) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Bill Not Found',
          message: `Bill "${billId}" could not be found.`,
          duration: 4000,
        });
        return;
      }

      const numAmount = parseFloat(amount);
      const validation = validateAPPayment(bill, numAmount);

      if (!validation.valid) {
        state.toasts.push({
          id: Date.now().toString(),
          type: 'error',
          title: 'Disbursement Blocked',
          message: validation.error,
          duration: 5000,
        });
        return;
      }

      const existingDisbIds = state.apPayments
        .map((p) => parseInt(String(p.id).replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n));
      const nextDisbId = `APP-${(existingDisbIds.length > 0 ? Math.max(...existingDisbIds) : 1100) + 1}`;

      const newPaidAmount = +(bill.paidAmount + numAmount).toFixed(2);
      const newBalanceDue = +(Math.max(0, bill.totalAmount - newPaidAmount)).toFixed(2);

      bill.paidAmount = newPaidAmount;
      bill.balanceDue = newBalanceDue;
      bill.status = newBalanceDue <= 0 ? 'Paid' : 'Partially Paid';
      bill.version = (bill.version || 1) + 1;
      bill.updatedAt = new Date().toISOString();

      const newDisbursement = {
        id: nextDisbId,
        organizationId: bill.organizationId || state.selectedOrgId || 'ORG-001',
        billId: bill.id,
        vendorName: bill.vendorName,
        paymentReference: paymentReference || `DISB-${Date.now().toString().slice(-6)}`,
        paymentMethod: paymentMethod || 'ACH Credit',
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        amount: numAmount,
        currency: 'USD',
        notes: notes || `Disbursement for ${bill.billNumber}`,
        status: 'Cleared',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.apPayments.unshift(newDisbursement);

      state.toasts.push({
        id: Date.now().toString(),
        type: 'success',
        title: 'Disbursement Recorded',
        message: `$${numAmount.toLocaleString()} disbursed to ${bill.vendorName}. Remaining balance: $${newBalanceDue.toLocaleString()}.`,
        duration: 4500,
      });
    },

    voidApBill: (state, action) => {
      const billId = action.payload;
      const billIndex = state.apBills.findIndex((b) => b.id === billId);

      if (billIndex !== -1) {
        const bill = state.apBills[billIndex];

        if (bill.paidAmount > 0) {
          state.toasts.push({
            id: Date.now().toString(),
            type: 'error',
            title: 'Cannot Void Bill',
            message: `Bill ${bill.billNumber || bill.id} has $${bill.paidAmount.toLocaleString()} in disbursements. Void disbursements first.`,
            duration: 5000,
          });
          return;
        }

        // Release timesheet
        if (bill.sourceTimesheetId) {
          const ts = state.timesheets.find((t) => t.id === bill.sourceTimesheetId);
          if (ts) {
            delete ts.billId;
            ts.updatedAt = new Date().toISOString();
          }
        }

        state.apBills.splice(billIndex, 1);

        state.toasts.push({
          id: Date.now().toString(),
          type: 'info',
          title: 'AP Bill Voided',
          message: `Bill ${bill.billNumber || bill.id} voided. Source timesheet released.`,
          duration: 4000,
        });
      }
    },
  },
  extraReducers(builder) {
    builder
      // Unified initialization
      .addCase(fetchAllInitialData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllInitialData.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(fetchAllInitialData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })

      // Individual entity handlers
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projects = action.payload;
      })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.organizations = action.payload;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.employees = action.payload;
      })
      .addCase(fetchContractors.fulfilled, (state, action) => {
        state.contractors = action.payload;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.jobs = action.payload;
      })
      .addCase(fetchPlacements.fulfilled, (state, action) => {
        state.placements = action.payload;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.vendors = action.payload;
      })
      .addCase(fetchTimesheets.fulfilled, (state, action) => {
        state.timesheets = action.payload;
      })
      .addCase(fetchIncome.fulfilled, (state, action) => {
        state.income = action.payload;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.invoices = action.payload;
      })
      .addCase(fetchArPayments.fulfilled, (state, action) => {
        state.arPayments = action.payload;
      })
      .addCase(fetchApBills.fulfilled, (state, action) => {
        state.apBills = action.payload;
      })
      .addCase(fetchApPayments.fulfilled, (state, action) => {
        state.apPayments = action.payload;
      })
      .addCase(fetchImports.fulfilled, (state, action) => {
        state.imports = action.payload;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reports = action.payload;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.auditLogs = action.payload;
      })
      .addCase(fetchConfiguration.fulfilled, (state, action) => {
        state.configuration = action.payload;
      });
  },
});

export const {
  setActiveView,
  setSelectedOrgId,
  toggleSidebar,
  setSidebarCollapsed,
  setMobileNavOpen,
  setGlobalSearchQuery,
  openModal,
  closeModal,
  addToast,
  removeToast,

  // Entity CRUD & Status actions
  addEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  addContractor,
  updateContractor,
  toggleContractorStatus,
  addClient,
  updateClient,
  toggleClientStatus,
  addJob,
  updateJob,
  toggleJobStatus,
  addPlacement,
  updatePlacement,
  togglePlacementStatus,
  addVendor,
  updateVendor,
  toggleVendorStatus,

  // Phase 3: Timesheet lifecycle actions
  addTimesheet,
  updateTimesheet,
  submitTimesheet,
  approveTimesheet,
  returnTimesheet,
  rejectTimesheet,

  // Phase 3: Import pipeline actions
  addImport,
  processImport,
  rejectImport,

  // Phase 4: Income generation actions
  generateIncomeFromTimesheet,
  batchGenerateIncome,
  updateIncomeStatus,
  voidIncomeRecord,

  // Phase 5: AR Invoices & Payments actions
  createInvoice,
  recordArPayment,
  voidInvoice,

  // Phase 5: AP Bills & Disbursements actions
  createApBillFromTimesheet,
  batchCreateApBills,
  recordApPayment,
  voidApBill,
} = dataSlice.actions;

export default dataSlice.reducer;
