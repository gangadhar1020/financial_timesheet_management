import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { CurrencyDisplay, DateDisplay } from '../components/common/Formatters';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField, TextInput, SelectInput } from '../components/common/FormField';
import { Icon } from '../components/common/Icons';
import { Alert } from '../components/common/Feedback';
import {
  addTimesheet,
  updateTimesheet,
  submitTimesheet,
  approveTimesheet,
  returnTimesheet,
  rejectTimesheet,
  addToast,
  setActiveView,
  generateIncomeFromTimesheet,
} from '../store/dataSlice';
import {
  validateRequired,
  validateHours,
  validateTimesheetPeriod,
  validatePlacementReference,
  validateDuplicatePeriod,
  validateDailyTotalHours,
} from '../utils/validation';

/**
 * TimesheetsView Component
 *
 * @purpose Full lifecycle timesheet management — create, edit, view details, submit, approve, return, reject.
 * @behavior
 *   - Lists all timesheets with search, status/employee/client filters, and pagination.
 *   - Create/Edit modals support daily hour entry grids (Mon-Sun) with auto-calculated totals.
 *   - Approval workflow: Draft → Submitted → Approved, with Returned/Rejected as rejection states.
 *   - Only Approved timesheets feed downstream financial calculations.
 *   - Validates placement references, hours, periods, and duplicate detection.
 * @reusability Consumes DataTable, FilterBar, Pagination, Modal, FormField, Badge, and CurrencyDisplay.
 */
export const TimesheetsView = () => {
  const dispatch = useDispatch();
  const timesheets = useSelector((state) => state.data.timesheets);
  const placements = useSelector((state) => state.data.placements);
  const employees = useSelector((state) => state.data.employees);
  const contractors = useSelector((state) => state.data.contractors);
  const income = useSelector((state) => state.data.income);

  // ─── Filter & Pagination State ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ─── Modal State ────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, target, reason? }
  const [feedbackModal, setFeedbackModal] = useState(null); // { type: 'return'|'reject', target }

  // ─── Unique filter options ──────────────────────────────────
  const uniqueEmployees = useMemo(() => {
    const names = [...new Set(timesheets.map((t) => t.candidateName))];
    return ['All', ...names.sort()];
  }, [timesheets]);

  const uniqueClients = useMemo(() => {
    const names = [...new Set(timesheets.map((t) => t.clientName))];
    return ['All', ...names.sort()];
  }, [timesheets]);

  // ─── Filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return timesheets.filter((t) => {
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesEmployee = employeeFilter === 'All' || t.candidateName === employeeFilter;
      const matchesClient = clientFilter === 'All' || t.clientName === clientFilter;
      const searchTarget = `${t.candidateName} ${t.clientName} ${t.id} ${t.placementId}`.toLowerCase();
      const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesEmployee && matchesClient && matchesSearch;
    });
  }, [timesheets, statusFilter, employeeFilter, clientFilter, searchQuery]);

  // ─── Pagination ─────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // ─── Workflow Handlers ──────────────────────────────────────
  const handleSubmit = (ts) => {
    dispatch(submitTimesheet(ts.id));
    dispatch(addToast({ title: 'Timesheet Submitted', message: `${ts.id} for ${ts.candidateName} has been submitted for approval.`, type: 'success' }));
  };

  const handleApprove = (ts) => {
    dispatch(approveTimesheet({ id: ts.id, approvedBy: 'Alex Morgan (Admin)' }));
    dispatch(addToast({ title: 'Timesheet Approved', message: `${ts.id} approved. $${ts.totalBillable?.toLocaleString()} staged for AR invoicing.`, type: 'success' }));
  };

  const handleReturn = (ts, reason) => {
    dispatch(returnTimesheet({ id: ts.id, reason }));
    dispatch(addToast({ title: 'Timesheet Returned', message: `${ts.id} returned to ${ts.candidateName} for corrections.`, type: 'warning' }));
  };

  const handleReject = (ts, reason) => {
    dispatch(rejectTimesheet({ id: ts.id, reason }));
    dispatch(addToast({ title: 'Timesheet Rejected', message: `${ts.id} has been rejected.`, type: 'error' }));
  };

  // ─── Table Columns ──────────────────────────────────────────
  const columns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Consultant & Client',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.candidateName}</span>
          <span className="text-[11px] text-indigo-400">{row.clientName}</span>
        </div>
      ),
    },
    { header: 'Week Ending', accessor: 'periodEnding', sortable: true },
    {
      header: 'Reg / OT / Hol',
      render: (row) => (
        <span className="font-mono text-xs">
          <span className="text-white">{(row.regularHours || 0).toFixed(1)}</span>
          {' / '}
          <span className="text-amber-400">{(row.overtimeHours || 0).toFixed(1)}</span>
          {' / '}
          <span className="text-sky-400">{(row.holidayHours || 0).toFixed(1)}</span>
        </span>
      ),
    },
    {
      header: 'Total Hrs',
      accessor: 'totalHours',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono font-semibold text-white">{(row.totalHours || 0).toFixed(1)}</span>,
    },
    {
      header: 'Billable',
      accessor: 'totalBillable',
      sortable: true,
      render: (row) => <CurrencyDisplay value={row.totalBillable} />,
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {/* Inspect */}
          <button
            type="button"
            onClick={() => setInspectTarget(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="View Details"
          >
            <Icon name="eye" className="w-4 h-4" />
          </button>

          {/* Edit — only Draft/Returned */}
          {(row.status === 'Draft' || row.status === 'Returned') && (
            <button
              type="button"
              onClick={() => setEditTarget(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              title="Edit Timesheet"
            >
              <Icon name="settings" className="w-4 h-4" />
            </button>
          )}

          {/* Submit — Draft or Returned */}
          {(row.status === 'Draft' || row.status === 'Returned') && (
            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'submit', target: row })}
              className="px-2 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-semibold rounded-lg transition-all"
            >
              Submit
            </button>
          )}

          {/* Approve — Submitted */}
          {row.status === 'Submitted' && (
            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'approve', target: row })}
              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition-all"
            >
              Approve
            </button>
          )}

          {/* Return — Submitted */}
          {row.status === 'Submitted' && (
            <button
              type="button"
              onClick={() => setFeedbackModal({ type: 'return', target: row })}
              className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-[11px] font-semibold rounded-lg transition-all"
            >
              Return
            </button>
          )}

          {/* Reject — Submitted */}
          {row.status === 'Submitted' && (
            <button
              type="button"
              onClick={() => setFeedbackModal({ type: 'reject', target: row })}
              className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-semibold rounded-lg transition-all"
            >
              Reject
            </button>
          )}

          {/* Status label / Income generation for Approved */}
          {row.status === 'Approved' && (() => {
            const existingInc = income.find(
              (i) => i.sourceId === row.id || (i.traceability && i.traceability.sourceTimesheetId === row.id)
            );
            if (existingInc) {
              return (
                <button
                  type="button"
                  onClick={() => dispatch(setActiveView('income'))}
                  className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
                  title="Income already generated. Click to view in Financials Ledger."
                >
                  <Icon name="check" className="w-3 h-3 text-emerald-400" />
                  {existingInc.id}
                </button>
              );
            }
            return (
              <button
                type="button"
                onClick={() => dispatch(generateIncomeFromTimesheet(row.id))}
                className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold rounded-lg transition-all"
                title="Generate traceable revenue record from this approved timesheet"
              >
                Gen Income
              </button>
            );
          })()}

          {row.status === 'Invoiced' && (
            <span className="text-[11px] text-slate-500 italic">Invoiced</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheet Management"
        subtitle="Create, edit, submit, and manage approval workflows for consultant timecards."
        badge="Operations"
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Timesheet
          </button>
        }
      />

      <Alert
        type="info"
        title="Timesheet Workflow"
        message="Draft → Submitted → Approved. Only approved timesheets feed Accounts Receivable invoicing and Accounts Payable disbursements. Returned timesheets can be corrected and resubmitted."
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['All', 'Draft', 'Submitted', 'Approved', 'Returned', 'Rejected', 'Invoiced'],
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); setCurrentPage(1); },
          },
          {
            key: 'employee',
            label: 'Consultant',
            options: uniqueEmployees,
            value: employeeFilter,
            onChange: (v) => { setEmployeeFilter(v); setCurrentPage(1); },
          },
          {
            key: 'client',
            label: 'Client',
            options: uniqueClients,
            value: clientFilter,
            onChange: (v) => { setClientFilter(v); setCurrentPage(1); },
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setEmployeeFilter('All');
          setClientFilter('All');
          setCurrentPage(1);
        }}
      />

      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable columns={columns} data={paginatedData} keyField="id" />
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-3">
        {['Draft', 'Submitted', 'Approved', 'Returned', 'Rejected', 'Invoiced'].map((s) => {
          const count = timesheets.filter((t) => t.status === s).length;
          if (count === 0) return null;
          return (
            <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-white/5 rounded-xl">
              <Badge status={s} size="sm" />
              <span className="text-xs text-slate-300 font-medium">{count}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Create / Edit Modal ─────────────────────────────── */}
      {(showCreateModal || editTarget) && (
        <TimesheetFormModal
          isOpen={true}
          editData={editTarget}
          placements={placements}
          employees={employees}
          contractors={contractors}
          existingTimesheets={timesheets}
          onSave={(data) => {
            if (editTarget) {
              dispatch(updateTimesheet(data));
              dispatch(addToast({ title: 'Timesheet Updated', message: `${data.id} has been updated.`, type: 'success' }));
            } else {
              dispatch(addTimesheet(data));
              dispatch(addToast({ title: 'Timesheet Created', message: `${data.id} saved as Draft.`, type: 'success' }));
            }
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onClose={() => { setShowCreateModal(false); setEditTarget(null); }}
        />
      )}

      {/* ─── Detail Inspector Modal ──────────────────────────── */}
      {inspectTarget && (
        <TimesheetDetailModal
          isOpen={true}
          timesheet={inspectTarget}
          income={income}
          onGenerateIncome={(tsId) => dispatch(generateIncomeFromTimesheet(tsId))}
          onNavigateToIncome={() => {
            setInspectTarget(null);
            dispatch(setActiveView('income'));
          }}
          onClose={() => setInspectTarget(null)}
        />
      )}

      {/* ─── Confirm Action Dialog ───────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'submit' ? 'Submit Timesheet?' :
          confirmAction?.type === 'approve' ? 'Approve Timesheet?' : 'Confirm'
        }
        message={
          confirmAction?.type === 'submit'
            ? `Submit ${confirmAction?.target?.id} (${confirmAction?.target?.totalHours}hrs) for ${confirmAction?.target?.candidateName}? This will send it for manager approval.`
            : confirmAction?.type === 'approve'
            ? `Approve ${confirmAction?.target?.id}? This will stage $${confirmAction?.target?.totalBillable?.toLocaleString()} for Accounts Receivable invoicing.`
            : ''
        }
        confirmLabel={confirmAction?.type === 'submit' ? 'Submit for Approval' : 'Approve Hours'}
        variant={confirmAction?.type === 'approve' ? 'primary' : 'primary'}
        onConfirm={() => {
          if (confirmAction?.type === 'submit') handleSubmit(confirmAction.target);
          if (confirmAction?.type === 'approve') handleApprove(confirmAction.target);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* ─── Return / Reject Feedback Modal ──────────────────── */}
      {feedbackModal && (
        <FeedbackReasonModal
          isOpen={true}
          type={feedbackModal.type}
          target={feedbackModal.target}
          onSubmit={(reason) => {
            if (feedbackModal.type === 'return') handleReturn(feedbackModal.target, reason);
            if (feedbackModal.type === 'reject') handleReject(feedbackModal.target, reason);
            setFeedbackModal(null);
          }}
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Sub-Components (private to this module)
// ═══════════════════════════════════════════════════════════════

/**
 * TimesheetFormModal — Create / Edit form with daily hour entry grid.
 */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const emptyDailyEntries = () => DAYS.map((day) => ({ day, date: '', regular: 0, overtime: 0, holiday: 0 }));

const calcTotals = (entries, billRate, payRate) => {
  let regularHours = 0, overtimeHours = 0, holidayHours = 0;
  entries.forEach((e) => {
    regularHours += parseFloat(e.regular) || 0;
    overtimeHours += parseFloat(e.overtime) || 0;
    holidayHours += parseFloat(e.holiday) || 0;
  });
  const totalHours = regularHours + overtimeHours + holidayHours;
  const br = parseFloat(billRate) || 0;
  const pr = parseFloat(payRate) || 0;
  return {
    regularHours,
    overtimeHours,
    holidayHours,
    totalHours,
    totalBillable: +(totalHours * br).toFixed(2),
    totalPayable: +(totalHours * pr).toFixed(2),
  };
};

const generateDatesFromPeriodEnding = (periodEnding) => {
  if (!periodEnding) return emptyDailyEntries();
  const endDate = new Date(periodEnding + 'T00:00:00');
  if (isNaN(endDate.getTime())) return emptyDailyEntries();
  const entries = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    entries.push({
      day: dayNames[d.getDay()],
      date: d.toISOString().split('T')[0],
      regular: 0,
      overtime: 0,
      holiday: 0,
    });
  }
  return entries;
};

const TimesheetFormModal = ({ isOpen, editData, placements, employees, contractors, existingTimesheets, onSave, onClose }) => {
  const isEdit = Boolean(editData);

  const [form, setForm] = useState(() => {
    if (editData) {
      return {
        id: editData.id,
        placementId: editData.placementId || '',
        candidateId: editData.candidateId || '',
        candidateName: editData.candidateName || '',
        clientId: editData.clientId || '',
        clientName: editData.clientName || '',
        periodEnding: editData.periodEnding || '',
        dailyEntries: editData.dailyEntries || emptyDailyEntries(),
        billRate: editData.billRate || 0,
        payRate: editData.payRate || 0,
        notes: editData.notes || '',
      };
    }
    const nextId = `TS-${7001 + Math.floor(Math.random() * 900)}`;
    return {
      id: nextId,
      placementId: '',
      candidateId: '',
      candidateName: '',
      clientId: '',
      clientName: '',
      periodEnding: '',
      dailyEntries: emptyDailyEntries(),
      billRate: 0,
      payRate: 0,
      notes: '',
    };
  });

  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const activePlacements = placements.filter((p) => p.status === 'Active');

  const handlePlacementChange = (placementId) => {
    const placement = placements.find((p) => p.id === placementId);
    if (placement) {
      setForm((prev) => ({
        ...prev,
        placementId,
        candidateId: placement.candidateId || '',
        candidateName: placement.candidateName || '',
        clientId: placement.clientId || '',
        clientName: placement.clientName || '',
        billRate: placement.billRate || 0,
        payRate: placement.payRate || 0,
      }));
    } else {
      setForm((prev) => ({ ...prev, placementId, candidateId: '', candidateName: '', clientId: '', clientName: '', billRate: 0, payRate: 0 }));
    }
  };

  const handlePeriodChange = (periodEnding) => {
    const entries = generateDatesFromPeriodEnding(periodEnding);
    // Preserve existing hours if editing
    if (isEdit && form.dailyEntries?.length === 7) {
      entries.forEach((e, i) => {
        if (form.dailyEntries[i]) {
          e.regular = form.dailyEntries[i].regular;
          e.overtime = form.dailyEntries[i].overtime;
          e.holiday = form.dailyEntries[i].holiday;
        }
      });
    }
    setForm((prev) => ({ ...prev, periodEnding, dailyEntries: entries }));

    // Check duplicate
    if (form.candidateId && periodEnding) {
      const warn = validateDuplicatePeriod(form.candidateId, periodEnding, existingTimesheets, isEdit ? form.id : null);
      setDuplicateWarning(warn);
    }
  };

  const handleDailyHourChange = (dayIndex, field, value) => {
    setForm((prev) => {
      const entries = [...prev.dailyEntries];
      entries[dayIndex] = { ...entries[dayIndex], [field]: value === '' ? 0 : parseFloat(value) || 0 };
      return { ...prev, dailyEntries: entries };
    });
  };

  const totals = calcTotals(form.dailyEntries, form.billRate, form.payRate);

  const validate = () => {
    const newErrors = {};
    const placementErr = validatePlacementReference(form.placementId, placements);
    if (placementErr) newErrors.placementId = placementErr;

    const periodErr = validateTimesheetPeriod(form.periodEnding);
    if (periodErr) newErrors.periodEnding = periodErr;

    // Validate each daily entry
    for (let i = 0; i < form.dailyEntries.length; i++) {
      const entry = form.dailyEntries[i];
      for (const field of ['regular', 'overtime', 'holiday']) {
        const err = validateHours(entry[field], `${entry.day} ${field}`);
        if (err) { newErrors[`day_${i}_${field}`] = err; break; }
      }
      const totalErr = validateDailyTotalHours(entry, entry.day);
      if (totalErr) newErrors[`day_${i}_total`] = totalErr;
    }

    if (!isEdit) {
      const idErr = validateRequired(form.id, 'Timesheet ID');
      if (idErr) newErrors.id = idErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      ...totals,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Timesheet — ${form.id}` : 'Create New Timesheet'}
      subtitle={isEdit ? 'Modify hours and notes for this timecard.' : 'Select a placement and enter weekly hours.'}
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-colors">
            {isEdit ? 'Update Timesheet' : 'Save as Draft'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Duplicate warning */}
        {duplicateWarning && (
          <Alert type="warning" title="Duplicate Period Detected" message={duplicateWarning} />
        )}

        {/* Placement selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Placement" required error={errors.placementId}>
            <SelectInput
              value={form.placementId}
              onChange={handlePlacementChange}
              options={[
                { value: '', label: '— Select Placement —' },
                ...activePlacements.map((p) => ({
                  value: p.id,
                  label: `${p.id} — ${p.candidateName} → ${p.clientName}`,
                })),
              ]}
              disabled={isEdit}
            />
          </FormField>

          <FormField label="Period Ending (Week-End Date)" required error={errors.periodEnding}>
            <TextInput type="date" value={form.periodEnding} onChange={handlePeriodChange} />
          </FormField>
        </div>

        {/* Auto-populated fields */}
        {form.placementId && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-800/50 rounded-xl border border-white/5">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Consultant</p>
              <p className="text-xs text-white font-medium">{form.candidateName || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Client</p>
              <p className="text-xs text-white font-medium">{form.clientName || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Bill Rate</p>
              <p className="text-xs text-emerald-400 font-mono font-medium">${form.billRate}/hr</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pay Rate</p>
              <p className="text-xs text-slate-300 font-mono font-medium">${form.payRate}/hr</p>
            </div>
          </div>
        )}

        {/* Daily Hour Entry Grid */}
        <div>
          <h4 className="text-xs font-bold text-white mb-2">Daily Hour Entries</h4>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800/60">
                  <th className="px-3 py-2 text-left text-[10px] text-slate-400 uppercase font-semibold">Day</th>
                  <th className="px-3 py-2 text-left text-[10px] text-slate-400 uppercase font-semibold">Date</th>
                  <th className="px-2 py-2 text-center text-[10px] text-slate-400 uppercase font-semibold">Regular</th>
                  <th className="px-2 py-2 text-center text-[10px] text-amber-400/70 uppercase font-semibold">Overtime</th>
                  <th className="px-2 py-2 text-center text-[10px] text-sky-400/70 uppercase font-semibold">Holiday</th>
                  <th className="px-2 py-2 text-center text-[10px] text-slate-400 uppercase font-semibold">Day Total</th>
                </tr>
              </thead>
              <tbody>
                {form.dailyEntries.map((entry, idx) => {
                  const dayTotal = (parseFloat(entry.regular) || 0) + (parseFloat(entry.overtime) || 0) + (parseFloat(entry.holiday) || 0);
                  const hasError = errors[`day_${idx}_total`] || errors[`day_${idx}_regular`] || errors[`day_${idx}_overtime`] || errors[`day_${idx}_holiday`];
                  return (
                    <tr key={idx} className={`border-t border-white/5 ${hasError ? 'bg-rose-500/5' : (entry.day === 'Sat' || entry.day === 'Sun') ? 'bg-slate-800/30' : ''}`}>
                      <td className="px-3 py-1.5 font-semibold text-white">{entry.day}</td>
                      <td className="px-3 py-1.5 text-slate-400 font-mono">{entry.date || '—'}</td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.regular}
                          onChange={(e) => handleDailyHourChange(idx, 'regular', e.target.value)}
                          className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.overtime}
                          onChange={(e) => handleDailyHourChange(idx, 'overtime', e.target.value)}
                          className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-amber-300 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.holiday}
                          onChange={(e) => handleDailyHourChange(idx, 'holiday', e.target.value)}
                          className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-sky-300 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`font-mono font-semibold ${dayTotal > 24 ? 'text-rose-400' : dayTotal > 0 ? 'text-white' : 'text-slate-600'}`}>
                          {dayTotal.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-indigo-500/30 bg-slate-800/50">
                  <td colSpan="2" className="px-3 py-2 font-bold text-white text-xs">Weekly Totals</td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-white">{totals.regularHours.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-amber-400">{totals.overtimeHours.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-sky-400">{totals.holidayHours.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center font-mono font-extrabold text-indigo-400">{totals.totalHours.toFixed(1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Display day-level errors */}
          {Object.keys(errors).filter((k) => k.startsWith('day_')).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(errors).filter(([k]) => k.startsWith('day_')).map(([k, v]) => (
                <p key={k} className="text-[11px] text-rose-400">{v}</p>
              ))}
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/30 rounded-xl border border-white/5">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Billable (Client)</p>
            <CurrencyDisplay value={totals.totalBillable} className="text-lg" />
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Payable (Consultant)</p>
            <CurrencyDisplay value={totals.totalPayable} className="text-lg text-slate-400" />
          </div>
        </div>

        {/* Notes */}
        <FormField label="Notes" helperText="Optional notes for this timecard.">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors resize-none"
            placeholder="Any additional context, PTO notes, or overtime justification..."
          />
        </FormField>
      </div>
    </Modal>
  );
};

/**
 * TimesheetDetailModal — Read-only inspector showing full timesheet details.
 */
const TimesheetDetailModal = ({ isOpen, timesheet, income = [], onGenerateIncome, onNavigateToIncome, onClose }) => {
  if (!timesheet) return null;
  const ts = timesheet;
  const margin = ts.totalBillable && ts.totalPayable ? (((ts.totalBillable - ts.totalPayable) / ts.totalBillable) * 100).toFixed(1) : '0.0';
  const associatedIncome = income.find(
    (i) => i.sourceId === ts.id || (i.traceability && i.traceability.sourceTimesheetId === ts.id)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Timesheet Details — ${ts.id}`} subtitle={`${ts.candidateName} • ${ts.clientName}`} size="lg">
      <div className="space-y-5">
        {/* Status & Period */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge status={ts.status} />
          <span className="text-xs text-slate-400">Period Ending: <span className="text-white font-semibold">{ts.periodEnding}</span></span>
          <span className="text-xs text-slate-400">Placement: <span className="text-indigo-400 font-mono">{ts.placementId}</span></span>
        </div>

        {/* Returned/Rejected reason */}
        {ts.returnedReason && (
          <Alert
            type={ts.status === 'Rejected' ? 'error' : 'warning'}
            title={ts.status === 'Rejected' ? 'Rejection Reason' : 'Return Reason'}
            message={ts.returnedReason}
          />
        )}

        {/* Daily Entries */}
        {ts.dailyEntries && ts.dailyEntries.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-white mb-2">Daily Hour Breakdown</h4>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className="px-3 py-2 text-left text-[10px] text-slate-400 uppercase">Day</th>
                    <th className="px-3 py-2 text-left text-[10px] text-slate-400 uppercase">Date</th>
                    <th className="px-3 py-2 text-center text-[10px] text-slate-400 uppercase">Regular</th>
                    <th className="px-3 py-2 text-center text-[10px] text-amber-400/70 uppercase">OT</th>
                    <th className="px-3 py-2 text-center text-[10px] text-sky-400/70 uppercase">Holiday</th>
                    <th className="px-3 py-2 text-center text-[10px] text-slate-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ts.dailyEntries.map((entry, idx) => {
                    const dayTotal = (entry.regular || 0) + (entry.overtime || 0) + (entry.holiday || 0);
                    return (
                      <tr key={idx} className={`border-t border-white/5 ${(entry.day === 'Sat' || entry.day === 'Sun') ? 'bg-slate-800/30' : ''}`}>
                        <td className="px-3 py-1.5 font-semibold text-white">{entry.day}</td>
                        <td className="px-3 py-1.5 text-slate-400 font-mono">{entry.date}</td>
                        <td className="px-3 py-1.5 text-center font-mono text-white">{(entry.regular || 0).toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-center font-mono text-amber-400">{(entry.overtime || 0).toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-center font-mono text-sky-400">{(entry.holiday || 0).toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-center font-mono font-semibold text-white">{dayTotal.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Regular Hours', value: `${(ts.regularHours || 0).toFixed(1)}`, color: 'text-white' },
            { label: 'Overtime Hours', value: `${(ts.overtimeHours || 0).toFixed(1)}`, color: 'text-amber-400' },
            { label: 'Holiday Hours', value: `${(ts.holidayHours || 0).toFixed(1)}`, color: 'text-sky-400' },
            { label: 'Total Hours', value: `${(ts.totalHours || 0).toFixed(1)}`, color: 'text-indigo-400' },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className={`text-lg font-mono font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Billable</p>
            <CurrencyDisplay value={ts.totalBillable} className="text-base" />
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Payable</p>
            <CurrencyDisplay value={ts.totalPayable} className="text-base text-slate-400" />
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Margin</p>
            <p className="text-base font-mono font-bold text-emerald-400">{margin}%</p>
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 bg-slate-800/30 rounded-lg"><span className="text-slate-500">Bill Rate:</span> <span className="text-white font-mono">${ts.billRate}/hr</span></div>
          <div className="p-2 bg-slate-800/30 rounded-lg"><span className="text-slate-500">Pay Rate:</span> <span className="text-white font-mono">${ts.payRate}/hr</span></div>
        </div>

        {/* Revenue & Income Traceability Section */}
        <div className="p-3.5 bg-slate-800/40 rounded-xl border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Revenue Recognition & Income Status</p>
            {associatedIncome ? (
              <Badge status="Recognized" text={`Generated (${associatedIncome.id})`} />
            ) : ts.status === 'Approved' ? (
              <Badge status="Approved" text="Ready to Generate" />
            ) : (
              <Badge status="Draft" text="Approval Required" />
            )}
          </div>

          {associatedIncome ? (
            <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-white">Income Record: <span className="text-emerald-300 font-mono">{associatedIncome.id}</span></p>
                <p className="text-[11px] text-slate-400 font-mono">{associatedIncome.calculationFormula || `${ts.totalHours} hrs × $${ts.billRate} = $${ts.totalBillable}`}</p>
              </div>
              <button
                type="button"
                onClick={onNavigateToIncome}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition-colors"
              >
                View in Financials
              </button>
            </div>
          ) : ts.status === 'Approved' ? (
            <div className="flex items-center justify-between p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-white">Approved for Revenue Recognition</p>
                <p className="text-[11px] text-indigo-300 font-mono">{ts.totalHours} hrs × ${ts.billRate} = ${ts.totalBillable?.toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => onGenerateIncome && onGenerateIncome(ts.id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Generate Income Record
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Timesheets must reach "Approved" status before income records can be generated. Current status: {ts.status}.
            </p>
          )}
        </div>

        {/* Notes */}
        {ts.notes && (
          <div className="p-3 bg-slate-800/30 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-xs text-slate-300">{ts.notes}</p>
          </div>
        )}

        {/* Audit Trail */}
        <div className="p-3 bg-slate-800/30 rounded-xl border border-white/5 space-y-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Audit Trail</p>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Created: <DateDisplay date={ts.createdAt} format="full" /></p>
            {ts.submittedAt && <p>Submitted: <DateDisplay date={ts.submittedAt} format="full" /></p>}
            {ts.approvedAt && <p>Approved: <DateDisplay date={ts.approvedAt} format="full" /> by <span className="text-white">{ts.approvedBy}</span></p>}
            <p>Last Updated: <DateDisplay date={ts.updatedAt} format="full" /> <span className="text-slate-600">• v{ts.version}</span></p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/**
 * FeedbackReasonModal — Captures the reason for returning or rejecting a timesheet.
 */
const FeedbackReasonModal = ({ isOpen, type, target, onSubmit, onClose }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError(`A reason is required to ${type} this timesheet.`);
      return;
    }
    onSubmit(reason.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'return' ? 'Return Timesheet for Corrections' : 'Reject Timesheet'}
      subtitle={`${target?.id} — ${target?.candidateName}`}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition-colors ${
              type === 'return'
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {type === 'return' ? 'Return Timesheet' : 'Reject Timesheet'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-300">
          {type === 'return'
            ? 'Provide feedback on what needs to be corrected. The consultant will be able to edit and resubmit.'
            : 'Provide the reason for rejection. This action is final and the timesheet cannot be resubmitted.'}
        </p>
        <FormField label="Reason" required error={error}>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
            rows={3}
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors resize-none"
            placeholder={type === 'return' ? 'e.g., Missing overtime approval from project manager...' : 'e.g., Incorrect placement assignment for this period...'}
          />
        </FormField>
      </div>
    </Modal>
  );
};
