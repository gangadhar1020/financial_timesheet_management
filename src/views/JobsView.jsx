import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { CurrencyDisplay } from '../components/common/Formatters';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField, TextInput, SelectInput } from '../components/common/FormField';
import { Icon } from '../components/common/Icons';
import {
  addJob,
  updateJob,
  toggleJobStatus,
  addToast,
} from '../store/dataSlice';
import {
  validateRequired,
  validatePositiveRate,
  validateUniqueId,
} from '../utils/validation';

/**
 * AssignmentsView Component
 * 
 * @purpose Client assignments and requisitions management module with client relationship binding, CRUD, and deactivation workflows.
 */
export const AssignmentsView = () => {
  const dispatch = useDispatch();
  const { jobs, clients, selectedOrgId } = useSelector((state) => state.data);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog states
  const [inspectJob, setInspectJob] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDepartment, setFormDepartment] = useState('Platform Services');
  const [formLocation, setFormLocation] = useState('Remote');
  const [formEmploymentType, setFormEmploymentType] = useState('Contract (1099/C2C)');
  const [formPositionsOpen, setFormPositionsOpen] = useState('1');
  const [formBillRate, setFormBillRate] = useState('150.00');
  const [formTargetPayRate, setFormTargetPayRate] = useState('90.00');
  const [formExperienceLevel, setFormExperienceLevel] = useState('Senior / Lead');
  const [formErrors, setFormErrors] = useState({});

  const filteredJobs = jobs.filter((j) => {
    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
    const target = `${j.title} ${j.clientName} ${j.department} ${j.location} ${j.id}`.toLowerCase();
    const matchesSearch = !searchQuery || target.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pagedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    const count = jobs.length + 1;
    setFormId(`JOB-400${count}`);
    setFormTitle('');
    setFormClientId(clients[0]?.id || '');
    setFormDepartment('Platform Services');
    setFormLocation('Remote');
    setFormEmploymentType('Contract (1099/C2C)');
    setFormPositionsOpen('1');
    setFormBillRate('160.00');
    setFormTargetPayRate('95.00');
    setFormExperienceLevel('Senior / Lead');
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEdit = (job) => {
    setEditTarget(job);
    setFormId(job.id);
    setFormTitle(job.title);
    setFormClientId(job.clientId || '');
    setFormDepartment(job.department || 'Platform Services');
    setFormLocation(job.location || 'Remote');
    setFormEmploymentType(job.employmentType || 'Contract (1099/C2C)');
    setFormPositionsOpen(String(job.positionsOpen || 1));
    setFormBillRate(String(job.billRate || ''));
    setFormTargetPayRate(String(job.targetPayRate || ''));
    setFormExperienceLevel(job.experienceLevel || 'Senior');
    setFormErrors({});
  };

  const validateForm = (isEdit = false) => {
    const errors = {};

    const idErr = validateUniqueId(formId, jobs, isEdit ? editTarget.id : null);
    if (idErr) errors.id = idErr;

    const titleErr = validateRequired(formTitle, 'Assignment Title');
    if (titleErr) errors.title = titleErr;

    const clientErr = validateRequired(formClientId, 'Client Association');
    if (clientErr) errors.clientId = clientErr;

    const rateErr = validatePositiveRate(formBillRate, 'Bill Rate');
    if (rateErr) errors.billRate = rateErr;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = () => {
    if (!validateForm(false)) return;

    const selectedClient = clients.find((c) => c.id === formClientId);

    dispatch(
      addJob({
        id: formId.trim().toUpperCase(),
        organizationId: selectedOrgId,
        clientId: formClientId,
        clientName: selectedClient?.name || 'Client Account',
        title: formTitle.trim(),
        department: formDepartment,
        location: formLocation,
        employmentType: formEmploymentType,
        positionsOpen: parseInt(formPositionsOpen, 10) || 1,
        positionsFilled: 0,
        billRate: parseFloat(formBillRate),
        targetPayRate: parseFloat(formTargetPayRate) || 0,
        currency: 'USD',
        experienceLevel: formExperienceLevel,
      })
    );

    dispatch(
      addToast({
        title: 'Assignment Created',
        message: `${formTitle} for ${selectedClient?.name} created under ${formId}.`,
        type: 'success',
      })
    );
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    if (!validateForm(true)) return;

    const selectedClient = clients.find((c) => c.id === formClientId);

    dispatch(
      updateJob({
        id: editTarget.id,
        clientId: formClientId,
        clientName: selectedClient?.name || editTarget.clientName,
        title: formTitle.trim(),
        department: formDepartment,
        location: formLocation,
        employmentType: formEmploymentType,
        positionsOpen: parseInt(formPositionsOpen, 10) || 1,
        billRate: parseFloat(formBillRate),
        targetPayRate: parseFloat(formTargetPayRate) || 0,
        experienceLevel: formExperienceLevel,
      })
    );

    dispatch(
      addToast({
        title: 'Assignment Updated',
        message: `Changes saved for ${formTitle}.`,
        type: 'success',
      })
    );
    setEditTarget(null);
  };

  const handleConfirmToggleStatus = () => {
    if (!statusTarget) return;
    dispatch(toggleJobStatus(statusTarget.id));
    const newStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
    dispatch(
      addToast({
        title: `Assignment ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
        message: `${statusTarget.title} marked as ${newStatus}.`,
        type: newStatus === 'Active' ? 'success' : 'warning',
      })
    );
    setStatusTarget(null);
  };

  const columns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Assignment & Client',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.title}</span>
          <span className="text-[11px] text-indigo-400">{row.clientName}</span>
        </div>
      ),
    },
    { header: 'Department', accessor: 'department', sortable: true },
    { header: 'Location', accessor: 'location', sortable: true },
    {
      header: 'Fill Ratio',
      align: 'center',
      render: (row) => (
        <span className="text-xs font-mono font-medium">
          {row.positionsFilled || 0} / {(row.positionsOpen || 0) + (row.positionsFilled || 0)}
        </span>
      ),
    },
    {
      header: 'Target Bill Rate',
      accessor: 'billRate',
      sortable: true,
      render: (row) => <CurrencyDisplay value={row.billRate} />,
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
              setInspectJob(row);
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
        title="Assignments"
        subtitle="Manage client assignments, open requisitions, bill rate targets, position fill progress, and candidate pipeline matches."
        badge={`${filteredJobs.length} Assignments`}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Icon name="plus" className="w-4 h-4" />
            Create Assignment
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
            options: ['All', 'Active', 'Inactive', 'Open', 'Filled', 'Closed'],
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
          data={pagedJobs}
          onRowClick={(row) => setInspectJob(row)}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredJobs.length}
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
        isOpen={Boolean(inspectJob)}
        onClose={() => setInspectJob(null)}
        title={inspectJob?.title}
        subtitle={`Client: ${inspectJob?.clientName} • ID: ${inspectJob?.id}`}
        footer={
          <button
            type="button"
            onClick={() => setInspectJob(null)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        }
      >
        {inspectJob && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge status={inspectJob.status} />
              </div>
              <div>
                <span className="text-slate-400 block">Target Bill Rate</span>
                <CurrencyDisplay value={inspectJob.billRate} />/hr
              </div>
              <div>
                <span className="text-slate-400 block">Department</span>
                <span className="text-white font-medium">{inspectJob.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Work Location</span>
                <span className="text-white font-medium">{inspectJob.location}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Employment Type</span>
                <span className="text-white font-medium">{inspectJob.employmentType || 'Contract'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Positions Open</span>
                <span className="text-white font-medium">{inspectJob.positionsOpen} open ({inspectJob.positionsFilled} filled)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Experience Level</span>
                <span className="text-white font-medium">{inspectJob.experienceLevel}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Record Version</span>
                <span className="text-indigo-400 font-mono">v{inspectJob.version || 1}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Job Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editTarget)}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Edit Assignment: ${editTarget.title}` : 'Create New Assignment'}
        subtitle="Select client account, define rate targets, and configure assignment headcount."
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
              {editTarget ? 'Save Changes' : 'Post Assignment'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Assignment ID" required error={formErrors.id}>
              <TextInput
                value={formId}
                onChange={setFormId}
                placeholder="JOB-4005"
                disabled={Boolean(editTarget)}
              />
            </FormField>

            <FormField label="Client Account (Relationship)" required error={formErrors.clientId}>
              <SelectInput
                value={formClientId}
                onChange={setFormClientId}
                options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              />
            </FormField>
          </div>

          <FormField label="Assignment Title" required error={formErrors.title}>
            <TextInput
              value={formTitle}
              onChange={setFormTitle}
              placeholder="e.g. Senior Cloud Architect"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department">
              <SelectInput
                value={formDepartment}
                onChange={setFormDepartment}
                options={[
                  'Platform Services',
                  'Genomics Research',
                  'InfoSec Risk',
                  'Rider Experience',
                  'Core Infrastructure',
                ]}
              />
            </FormField>
            <FormField label="Location">
              <TextInput
                value={formLocation}
                onChange={setFormLocation}
                placeholder="e.g. Remote or New York, NY"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employment Type">
              <SelectInput
                value={formEmploymentType}
                onChange={setFormEmploymentType}
                options={[
                  'Contract (1099/C2C)',
                  'Full-Time (W2)',
                  'Contract-to-Hire',
                ]}
              />
            </FormField>
            <FormField label="Headcount / Positions Open">
              <TextInput
                value={formPositionsOpen}
                onChange={setFormPositionsOpen}
                type="number"
                min="1"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Client Bill Rate (USD/hr)" required error={formErrors.billRate}>
              <TextInput
                value={formBillRate}
                onChange={setFormBillRate}
                type="number"
                step="0.5"
                placeholder="165.00"
              />
            </FormField>
            <FormField label="Target Pay Rate (USD/hr)">
              <TextInput
                value={formTargetPayRate}
                onChange={setFormTargetPayRate}
                type="number"
                step="0.5"
                placeholder="95.00"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.status === 'Active' ? 'Deactivate Assignment?' : 'Reactivate Assignment?'}
        message={
          statusTarget?.status === 'Active'
            ? `Are you sure you want to deactivate assignment "${statusTarget?.title}"? Existing placements will remain active, but the assignment will be marked closed to new applicants.`
            : `Reactivating "${statusTarget?.title}" will reopen this assignment for consultant matching.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate Assignment' : 'Reactivate Assignment'}
        variant={statusTarget?.status === 'Active' ? 'warning' : 'primary'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};

export const JobsView = AssignmentsView;
export default AssignmentsView;
