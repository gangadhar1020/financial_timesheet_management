import React, { useState } from 'react';
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
import {
  addPlacement,
  updatePlacement,
  togglePlacementStatus,
  addToast,
} from '../store/dataSlice';
import {
  validateRequired,
  validatePositiveRate,
  validateDateRange,
  validateUniqueId,
  calculateGrossMargin,
} from '../utils/validation';

/**
 * PlacementsView Component
 * 
 * @purpose Consultant engagement placement module binding Employee/Contractor, Client, and Job with full CRUD, margin calculations, and validation.
 */
export const PlacementsView = () => {
  const dispatch = useDispatch();
  const {
    placements,
    employees,
    contractors,
    clients,
    jobs,
    selectedOrgId,
  } = useSelector((state) => state.data);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog targets
  const [inspectPlacement, setInspectPlacement] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formCandidateType, setFormCandidateType] = useState('Employee'); // 'Employee' | 'Contractor'
  const [formCandidateId, setFormCandidateId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formJobId, setFormJobId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formBillRate, setFormBillRate] = useState('165.00');
  const [formPayRate, setFormPayRate] = useState('95.00');
  const [formBillingUnit, setFormBillingUnit] = useState('Hourly');
  const [formPayUnit, setFormPayUnit] = useState('Hourly');
  const [formFrequency, setFormFrequency] = useState('Weekly');
  const [formErrors, setFormErrors] = useState({});

  // Dynamic Candidate List based on candidateType
  const candidateOptions = formCandidateType === 'Employee'
    ? employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.id}) - ${e.role}` }))
    : contractors.map((c) => ({ value: c.id, label: `${c.companyName} (${c.id}) - ${c.contactPerson}` }));

  // Dynamic Job List filtered by selected client if available
  const jobOptions = jobs
    .filter((j) => !formClientId || j.clientId === formClientId)
    .map((j) => ({ value: j.id, label: `${j.title} (${j.id})` }));

  const filteredPlacements = placements.filter((p) => {
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const target = `${p.candidateName} ${p.clientName} ${p.jobTitle} ${p.id}`.toLowerCase();
    const matchesSearch = !searchQuery || target.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pagedPlacements = filteredPlacements.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Auto-calculated Margin
  const currentMargin = calculateGrossMargin(formBillRate, formPayRate);

  const handleOpenAdd = () => {
    const count = placements.length + 1;
    setFormId(`PLC-500${count}`);
    setFormCandidateType('Employee');
    setFormCandidateId(employees[0]?.id || '');
    setFormClientId(clients[0]?.id || '');
    setFormJobId(jobs[0]?.id || '');
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    // Default 6 months ahead
    const sixMos = new Date();
    sixMos.setMonth(sixMos.getMonth() + 6);
    setFormEndDate(sixMos.toISOString().split('T')[0]);
    setFormBillRate('165.00');
    setFormPayRate('95.00');
    setFormBillingUnit('Hourly');
    setFormPayUnit('Hourly');
    setFormFrequency('Weekly');
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditTarget(p);
    setFormId(p.id);
    setFormCandidateType(p.candidateType || 'Employee');
    setFormCandidateId(p.candidateId || '');
    setFormClientId(p.clientId || '');
    setFormJobId(p.jobId || '');
    setFormStartDate(p.startDate || '');
    setFormEndDate(p.endDate || '');
    setFormBillRate(p.billRate ? String(p.billRate) : '');
    setFormPayRate(p.payRate ? String(p.payRate) : '');
    setFormBillingUnit(p.billingUnit || 'Hourly');
    setFormPayUnit(p.payUnit || 'Hourly');
    setFormFrequency(p.timesheetFrequency || 'Weekly');
    setFormErrors({});
  };

  const validateForm = (isEdit = false) => {
    const errors = {};

    const idErr = validateUniqueId(formId, placements, isEdit ? editTarget.id : null);
    if (idErr) errors.id = idErr;

    const candErr = validateRequired(formCandidateId, 'Candidate Selection');
    if (candErr) errors.candidateId = candErr;

    const clientErr = validateRequired(formClientId, 'Client Selection');
    if (clientErr) errors.clientId = clientErr;

    const jobErr = validateRequired(formJobId, 'Job Order Selection');
    if (jobErr) errors.jobId = jobErr;

    const billErr = validatePositiveRate(formBillRate, 'Bill Rate');
    if (billErr) errors.billRate = billErr;

    const payErr = validatePositiveRate(formPayRate, 'Pay Rate');
    if (payErr) errors.payRate = payErr;

    // Strict Date Validation: End Date cannot precede Start Date
    const dateErr = validateDateRange(formStartDate, formEndDate);
    if (dateErr) errors.dateRange = dateErr;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = () => {
    if (!validateForm(false)) return;

    // Resolve relationship names
    const candidateObj = formCandidateType === 'Employee'
      ? employees.find((e) => e.id === formCandidateId)
      : contractors.find((c) => c.id === formCandidateId);
    const candName = formCandidateType === 'Employee'
      ? `${candidateObj?.firstName} ${candidateObj?.lastName}`
      : candidateObj?.companyName;

    const clientObj = clients.find((c) => c.id === formClientId);
    const jobObj = jobs.find((j) => j.id === formJobId);

    dispatch(
      addPlacement({
        id: formId.trim().toUpperCase(),
        organizationId: selectedOrgId,
        jobId: formJobId,
        jobTitle: jobObj?.title || 'Engagement',
        clientId: formClientId,
        clientName: clientObj?.name || 'Client Account',
        candidateId: formCandidateId,
        candidateName: candName || 'Candidate',
        candidateType: formCandidateType,
        startDate: formStartDate,
        endDate: formEndDate,
        billRate: parseFloat(formBillRate),
        payRate: parseFloat(formPayRate),
        billingUnit: formBillingUnit,
        payUnit: formPayUnit,
        grossMarginPercent: parseFloat(currentMargin),
        timesheetFrequency: formFrequency,
      })
    );

    dispatch(
      addToast({
        title: 'Placement Contract Created',
        message: `${candName} placed with ${clientObj?.name} (${currentMargin}% margin).`,
        type: 'success',
      })
    );
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    if (!validateForm(true)) return;

    const candidateObj = formCandidateType === 'Employee'
      ? employees.find((e) => e.id === formCandidateId)
      : contractors.find((c) => c.id === formCandidateId);
    const candName = formCandidateType === 'Employee'
      ? `${candidateObj?.firstName} ${candidateObj?.lastName}`
      : candidateObj?.companyName;

    const clientObj = clients.find((c) => c.id === formClientId);
    const jobObj = jobs.find((j) => j.id === formJobId);

    dispatch(
      updatePlacement({
        id: editTarget.id,
        jobId: formJobId,
        jobTitle: jobObj?.title || editTarget.jobTitle,
        clientId: formClientId,
        clientName: clientObj?.name || editTarget.clientName,
        candidateId: formCandidateId,
        candidateName: candName || editTarget.candidateName,
        candidateType: formCandidateType,
        startDate: formStartDate,
        endDate: formEndDate,
        billRate: parseFloat(formBillRate),
        payRate: parseFloat(formPayRate),
        billingUnit: formBillingUnit,
        payUnit: formPayUnit,
        grossMarginPercent: parseFloat(currentMargin),
        timesheetFrequency: formFrequency,
      })
    );

    dispatch(
      addToast({
        title: 'Placement Updated',
        message: `Updated assignment parameters for ${candName || editTarget.candidateName}.`,
        type: 'success',
      })
    );
    setEditTarget(null);
  };

  const handleConfirmToggleStatus = () => {
    if (!statusTarget) return;
    dispatch(togglePlacementStatus(statusTarget.id));
    const newStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
    dispatch(
      addToast({
        title: `Placement ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
        message: `${statusTarget.candidateName} placement set to ${newStatus}.`,
        type: newStatus === 'Active' ? 'success' : 'warning',
      })
    );
    setStatusTarget(null);
  };

  const columns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Consultant / Candidate',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.candidateName}</span>
          <span className="text-[11px] text-slate-400">{row.jobTitle} ({row.candidateType})</span>
        </div>
      ),
    },
    { header: 'Client Account', accessor: 'clientName', sortable: true },
    {
      header: 'Start Date',
      accessor: 'startDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.startDate} format="short" />,
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.endDate} format="short" />,
    },
    {
      header: 'Bill Rate',
      accessor: 'billRate',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-white">
          <CurrencyDisplay value={row.billRate} />
          <span className="text-[10px] text-slate-400">/{row.billingUnit || 'hr'}</span>
        </span>
      ),
    },
    {
      header: 'Pay Rate',
      accessor: 'payRate',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-slate-300">
          <CurrencyDisplay value={row.payRate} />
          <span className="text-[10px] text-slate-400">/{row.payUnit || 'hr'}</span>
        </span>
      ),
    },
    {
      header: 'Gross Margin',
      accessor: 'grossMarginPercent',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          {row.grossMarginPercent}%
        </span>
      ),
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInspectPlacement(row);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Inspect"
          >
            <Icon name="eye" className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors text-xs font-semibold px-1"
            title="Edit"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStatusTarget(row);
            }}
            className={`p-1 rounded-lg text-xs font-semibold transition-colors ${
              row.status === 'Active'
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
            title={row.status === 'Active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'Active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultant Placements"
        subtitle="Connect employees & contractors to client job orders, monitor bill/pay rates, automatically calculate margins, and enforce contract schedules."
        badge={`${filteredPlacements.length} Active Placements`}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Placement
          </button>
        }
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['All', 'Active', 'Inactive', 'Completed', 'Terminated'],
            value: statusFilter,
            onChange: setStatusFilter,
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('All');
        }}
      />

      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={columns}
          data={pagedPlacements}
          onRowClick={(row) => setInspectPlacement(row)}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPlacements.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Inspect Modal */}
      <Modal
        isOpen={Boolean(inspectPlacement)}
        onClose={() => setInspectPlacement(null)}
        title={`Placement: ${inspectPlacement?.candidateName}`}
        subtitle={`Client: ${inspectPlacement?.clientName} • ID: ${inspectPlacement?.id}`}
        footer={
          <button
            type="button"
            onClick={() => setInspectPlacement(null)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        }
      >
        {inspectPlacement && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge status={inspectPlacement.status} />
              </div>
              <div>
                <span className="text-slate-400 block">Gross Profit Margin</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {inspectPlacement.grossMarginPercent}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Bill Rate to Client</span>
                <span className="text-white font-medium">
                  <CurrencyDisplay value={inspectPlacement.billRate} /> / {inspectPlacement.billingUnit || 'hr'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Pay Rate to Candidate</span>
                <span className="text-white font-medium">
                  <CurrencyDisplay value={inspectPlacement.payRate} /> / {inspectPlacement.payUnit || 'hr'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Contract Start Date</span>
                <DateDisplay date={inspectPlacement.startDate} format="medium" />
              </div>
              <div>
                <span className="text-slate-400 block">Contract End Date</span>
                <DateDisplay date={inspectPlacement.endDate} format="medium" />
              </div>
              <div>
                <span className="text-slate-400 block">Timesheet Cycle</span>
                <span className="text-white font-medium">{inspectPlacement.timesheetFrequency}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Optimistic Version</span>
                <span className="text-indigo-400 font-mono">v{inspectPlacement.version || 1}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Placement Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editTarget)}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Edit Placement: ${editTarget.candidateName}` : 'Create New Consultant Placement'}
        subtitle="Connect existing candidate, client, and job requisition. End date cannot precede start date."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditTarget(null);
              }}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={editTarget ? handleSaveEdit : handleSaveAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md"
            >
              {editTarget ? 'Save Changes' : 'Confirm Placement'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {formErrors.dateRange && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl font-medium">
              ⚠️ {formErrors.dateRange}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Placement ID" required error={formErrors.id}>
              <TextInput
                value={formId}
                onChange={setFormId}
                placeholder="PLC-5004"
                disabled={Boolean(editTarget)}
              />
            </FormField>

            <FormField label="Candidate Classification">
              <SelectInput
                value={formCandidateType}
                onChange={(val) => {
                  setFormCandidateType(val);
                  setFormCandidateId(val === 'Employee' ? employees[0]?.id : contractors[0]?.id);
                }}
                options={['Employee', 'Contractor']}
              />
            </FormField>
          </div>

          {/* Relationship 1: Candidate */}
          <FormField label="Candidate (Employee / Contractor Reference)" required error={formErrors.candidateId}>
            <SelectInput
              value={formCandidateId}
              onChange={setFormCandidateId}
              options={candidateOptions}
            />
          </FormField>

          {/* Relationship 2: Client */}
          <FormField label="Client Account Reference" required error={formErrors.clientId}>
            <SelectInput
              value={formClientId}
              onChange={setFormClientId}
              options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
            />
          </FormField>

          {/* Relationship 3: Job */}
          <FormField label="Job Order Requisition Reference" required error={formErrors.jobId}>
            <SelectInput
              value={formJobId}
              onChange={setFormJobId}
              options={jobOptions.length > 0 ? jobOptions : [{ value: '', label: 'No open jobs for this client' }]}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date" required>
              <TextInput
                type="date"
                value={formStartDate}
                onChange={setFormStartDate}
              />
            </FormField>
            <FormField label="End Date" required>
              <TextInput
                type="date"
                value={formEndDate}
                onChange={setFormEndDate}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Client Bill Rate" required error={formErrors.billRate}>
              <TextInput
                type="number"
                step="0.5"
                value={formBillRate}
                onChange={setFormBillRate}
                placeholder="165.00"
              />
            </FormField>
            <FormField label="Candidate Pay Rate" required error={formErrors.payRate}>
              <TextInput
                type="number"
                step="0.5"
                value={formPayRate}
                onChange={setFormPayRate}
                placeholder="95.00"
              />
            </FormField>
            <FormField label="Timesheet Cycle">
              <SelectInput
                value={formFrequency}
                onChange={setFormFrequency}
                options={['Weekly', 'Bi-Weekly', 'Monthly']}
              />
            </FormField>
          </div>

          {/* Real-time Calculated Gross Margin Box */}
          <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Calculated Gross Margin:</span>
              <span className="text-[10px] text-slate-500">Margin = (Bill - Pay) / Bill</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-bold text-emerald-400">
                {currentMargin}%
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.status === 'Active' ? 'Deactivate Placement Contract?' : 'Reactivate Placement Contract?'}
        message={
          statusTarget?.status === 'Active'
            ? `Are you sure you want to deactivate placement for ${statusTarget?.candidateName} at ${statusTarget?.clientName}? Deactivation preserves all historical timesheets and invoice lines while stopping future automatic timesheet generation.`
            : `Reactivating will restore this placement as active for ongoing time tracking and invoicing.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate Placement' : 'Reactivate Placement'}
        variant={statusTarget?.status === 'Active' ? 'warning' : 'primary'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};
