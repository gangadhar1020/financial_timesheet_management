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
  addEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  addContractor,
  updateContractor,
  toggleContractorStatus,
  addToast,
} from '../store/dataSlice';
import {
  validateRequired,
  validateEmail,
  validatePositiveRate,
  validateUniqueId,
} from '../utils/validation';

/**
 * EmployeesContractorsView Component
 * 
 * @purpose Workforce management module supporting internal W2 employees and 1099/C2C contractors with full CRUD, validation, and deactivation workflows.
 */
export const EmployeesContractorsView = () => {
  const dispatch = useDispatch();
  const { employees, contractors, selectedOrgId } = useSelector((state) => state.data);

  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'contractors'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog targets
  const [inspectItem, setInspectItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDepartment, setFormDepartment] = useState('Product Engineering');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formContractType, setFormContractType] = useState('1099 Independent');
  const [formEmploymentType, setFormEmploymentType] = useState('Full-Time (W2)');
  const [formRate, setFormRate] = useState('');
  const [formHireDate, setFormHireDate] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formErrors, setFormErrors] = useState({});

  const currentList = activeTab === 'employees' ? employees : contractors;

  // Filtering
  const filteredList = currentList.filter((item) => {
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const searchTarget = activeTab === 'employees'
      ? `${item.firstName} ${item.lastName} ${item.email} ${item.role} ${item.department} ${item.id}`.toLowerCase()
      : `${item.companyName} ${item.contactPerson} ${item.email} ${item.specialty} ${item.id}`.toLowerCase();
    const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pagedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Open Add Modal
  const handleOpenAdd = () => {
    const count = activeTab === 'employees' ? employees.length : contractors.length;
    const prefix = activeTab === 'employees' ? 'EMP' : 'CON';
    setFormId(`${prefix}-${1000 + count + 1}`);
    setFormFirstName('');
    setFormLastName('');
    setFormCompanyName('');
    setFormContactPerson('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('');
    setFormDepartment('Product Engineering');
    setFormSpecialty('');
    setFormContractType('1099 Independent');
    setFormEmploymentType('Full-Time (W2)');
    setFormRate('75.00');
    setFormHireDate(new Date().toISOString().split('T')[0]);
    setFormPaymentTerms('Net 30');
    setFormErrors({});
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditTarget(item);
    setFormId(item.id);
    if (activeTab === 'employees') {
      setFormFirstName(item.firstName || '');
      setFormLastName(item.lastName || '');
      setFormEmail(item.email || '');
      setFormPhone(item.phone || '');
      setFormRole(item.role || '');
      setFormDepartment(item.department || 'Product Engineering');
      setFormEmploymentType(item.employmentType || 'Full-Time (W2)');
      setFormRate(item.payRate ? String(item.payRate) : '');
      setFormHireDate(item.hireDate || '');
    } else {
      setFormCompanyName(item.companyName || '');
      setFormContactPerson(item.contactPerson || '');
      setFormEmail(item.email || '');
      setFormPhone(item.phone || '');
      setFormSpecialty(item.specialty || '');
      setFormContractType(item.contractType || '1099 Independent');
      setFormRate(item.hourlyRate ? String(item.hourlyRate) : '');
      setFormPaymentTerms(item.paymentTerms || 'Net 30');
    }
    setFormErrors({});
  };

  // Validate form
  const validateForm = (isEdit = false) => {
    const errors = {};
    const existingList = activeTab === 'employees' ? employees : contractors;

    const idErr = validateUniqueId(formId, existingList, isEdit ? editTarget.id : null);
    if (idErr) errors.id = idErr;

    const emailErr = validateEmail(formEmail);
    if (emailErr) errors.email = emailErr;

    const rateErr = validatePositiveRate(formRate, activeTab === 'employees' ? 'Pay Rate' : 'Hourly Rate');
    if (rateErr) errors.rate = rateErr;

    if (activeTab === 'employees') {
      const fnErr = validateRequired(formFirstName, 'First Name');
      if (fnErr) errors.firstName = fnErr;
      const lnErr = validateRequired(formLastName, 'Last Name');
      if (lnErr) errors.lastName = lnErr;
      const roleErr = validateRequired(formRole, 'Job Title / Role');
      if (roleErr) errors.role = roleErr;
      const hireErr = validateRequired(formHireDate, 'Hire Date');
      if (hireErr) errors.hireDate = hireErr;
    } else {
      const cnErr = validateRequired(formCompanyName, 'Company / Consultant Name');
      if (cnErr) errors.companyName = cnErr;
      const cpErr = validateRequired(formContactPerson, 'Contact Person');
      if (cpErr) errors.contactPerson = cpErr;
      const specErr = validateRequired(formSpecialty, 'Specialty Area');
      if (specErr) errors.specialty = specErr;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = () => {
    if (!validateForm(false)) return;

    if (activeTab === 'employees') {
      dispatch(
        addEmployee({
          id: formId.trim().toUpperCase(),
          organizationId: selectedOrgId,
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: formRole.trim(),
          department: formDepartment,
          employmentType: formEmploymentType,
          payRate: parseFloat(formRate),
          hireDate: formHireDate,
        })
      );
      dispatch(
        addToast({
          title: 'Employee Added',
          message: `${formFirstName} ${formLastName} created with ID ${formId}.`,
          type: 'success',
        })
      );
    } else {
      dispatch(
        addContractor({
          id: formId.trim().toUpperCase(),
          organizationId: selectedOrgId,
          companyName: formCompanyName.trim(),
          contactPerson: formContactPerson.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          specialty: formSpecialty.trim(),
          contractType: formContractType,
          hourlyRate: parseFloat(formRate),
          paymentTerms: formPaymentTerms,
        })
      );
      dispatch(
        addToast({
          title: 'Contractor Added',
          message: `${formCompanyName} registered under ID ${formId}.`,
          type: 'success',
        })
      );
    }
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    if (!validateForm(true)) return;

    if (activeTab === 'employees') {
      dispatch(
        updateEmployee({
          id: editTarget.id,
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: formRole.trim(),
          department: formDepartment,
          employmentType: formEmploymentType,
          payRate: parseFloat(formRate),
          hireDate: formHireDate,
        })
      );
      dispatch(
        addToast({
          title: 'Employee Updated',
          message: `Profile updated for ${formFirstName} ${formLastName}.`,
          type: 'success',
        })
      );
    } else {
      dispatch(
        updateContractor({
          id: editTarget.id,
          companyName: formCompanyName.trim(),
          contactPerson: formContactPerson.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          specialty: formSpecialty.trim(),
          contractType: formContractType,
          hourlyRate: parseFloat(formRate),
          paymentTerms: formPaymentTerms,
        })
      );
      dispatch(
        addToast({
          title: 'Contractor Updated',
          message: `Record updated for ${formCompanyName}.`,
          type: 'success',
        })
      );
    }
    setEditTarget(null);
  };

  const handleConfirmToggleStatus = () => {
    if (!statusTarget) return;

    if (activeTab === 'employees') {
      dispatch(toggleEmployeeStatus(statusTarget.id));
    } else {
      dispatch(toggleContractorStatus(statusTarget.id));
    }

    const newStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
    const name = statusTarget.companyName || `${statusTarget.firstName} ${statusTarget.lastName}`;
    dispatch(
      addToast({
        title: `Status Changed: ${newStatus}`,
        message: `${name} marked as ${newStatus}.`,
        type: newStatus === 'Active' ? 'success' : 'warning',
      })
    );
    setStatusTarget(null);
  };

  const employeeColumns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Full Name',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.firstName} {row.lastName}</span>
          <span className="text-[11px] text-slate-400">{row.email}</span>
        </div>
      ),
    },
    { header: 'Department', accessor: 'department', sortable: true },
    { header: 'Role', accessor: 'role', sortable: true },
    {
      header: 'Type',
      accessor: 'employmentType',
      render: (row) => <span className="text-[11px] text-slate-400">{row.employmentType || 'W2'}</span>,
    },
    {
      header: 'Pay Rate',
      accessor: 'payRate',
      sortable: true,
      render: (row) => <CurrencyDisplay value={row.payRate} />,
    },
    {
      header: 'Hire Date',
      accessor: 'hireDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.hireDate} format="short" />,
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
              setInspectItem(row);
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

  const contractorColumns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Company / Firm',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.companyName}</span>
          <span className="text-[11px] text-slate-400">{row.contactPerson} ({row.email})</span>
        </div>
      ),
    },
    { header: 'Specialty', accessor: 'specialty', sortable: true },
    { header: 'Contract Type', accessor: 'contractType', sortable: true },
    {
      header: 'Hourly Rate',
      accessor: 'hourlyRate',
      sortable: true,
      render: (row) => <CurrencyDisplay value={row.hourlyRate} />,
    },
    { header: 'Terms', accessor: 'paymentTerms', sortable: true },
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
              setInspectItem(row);
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
        title="Workforce Management"
        subtitle="Maintain master profiles, compensation benchmarks, and compliance records for internal W2 staff and 1099/C2C consultants."
        badge={`${filteredList.length} Total ${activeTab === 'employees' ? 'Employees' : 'Contractors'}`}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add {activeTab === 'employees' ? 'Employee' : 'Contractor'}
          </button>
        }
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('employees');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'employees'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Internal Employees (W2) ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('contractors');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'contractors'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Contractors (1099 & C2C) ({contractors.length})
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['All', 'Active', 'Inactive', 'On Leave', 'Completed'],
            value: statusFilter,
            onChange: setStatusFilter,
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('All');
        }}
      />

      {/* Main Data Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={activeTab === 'employees' ? employeeColumns : contractorColumns}
          data={pagedList}
          onRowClick={(row) => setInspectItem(row)}
          emptyTitle={`No ${activeTab} found`}
          emptyDescription="Adjust your search query or status filter to see candidate records."
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSz) => {
            setPageSize(newSz);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Record Inspect Modal */}
      <Modal
        isOpen={Boolean(inspectItem)}
        onClose={() => setInspectItem(null)}
        title={inspectItem ? (inspectItem.companyName || `${inspectItem.firstName} ${inspectItem.lastName}`) : 'Details'}
        subtitle={`System ID: ${inspectItem?.id} • Organization: ${inspectItem?.organizationId || selectedOrgId}`}
        footer={
          <button
            type="button"
            onClick={() => setInspectItem(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        }
      >
        {inspectItem && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge status={inspectItem.status} />
              </div>
              <div>
                <span className="text-slate-400 block">Rate</span>
                <CurrencyDisplay value={inspectItem.payRate || inspectItem.hourlyRate} />/hr
              </div>
              <div>
                <span className="text-slate-400 block">Email Address</span>
                <span className="text-white font-medium">{inspectItem.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="text-white font-medium">{inspectItem.phone || '—'}</span>
              </div>
              {inspectItem.role && (
                <div>
                  <span className="text-slate-400 block">Role / Title</span>
                  <span className="text-white font-medium">{inspectItem.role}</span>
                </div>
              )}
              {inspectItem.department && (
                <div>
                  <span className="text-slate-400 block">Department</span>
                  <span className="text-white font-medium">{inspectItem.department}</span>
                </div>
              )}
              {inspectItem.specialty && (
                <div>
                  <span className="text-slate-400 block">Specialty Area</span>
                  <span className="text-white font-medium">{inspectItem.specialty}</span>
                </div>
              )}
              {inspectItem.hireDate && (
                <div>
                  <span className="text-slate-400 block">Hire Date</span>
                  <DateDisplay date={inspectItem.hireDate} format="medium" />
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Optimistic Version</span>
                <span className="text-indigo-400 font-mono">v{inspectItem.version || 1}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Updated</span>
                <DateDisplay date={inspectItem.updatedAt} format="short" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Record Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editTarget)}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        title={
          editTarget
            ? `Edit ${activeTab === 'employees' ? 'Employee' : 'Contractor'}: ${
                editTarget.companyName || `${editTarget.firstName} ${editTarget.lastName}`
              }`
            : `Add New ${activeTab === 'employees' ? 'Employee' : 'Contractor'}`
        }
        subtitle="Validate required parameters, unique identifier, email format, and positive rates."
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
              {editTarget ? 'Save Changes' : 'Create Record'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Record ID" required error={formErrors.id}>
            <TextInput
              value={formId}
              onChange={setFormId}
              placeholder={activeTab === 'employees' ? 'EMP-1005' : 'CON-2004'}
              disabled={Boolean(editTarget)}
            />
          </FormField>

          {activeTab === 'employees' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First Name" required error={formErrors.firstName}>
                  <TextInput
                    value={formFirstName}
                    onChange={setFormFirstName}
                    placeholder="Jane"
                  />
                </FormField>
                <FormField label="Last Name" required error={formErrors.lastName}>
                  <TextInput
                    value={formLastName}
                    onChange={setFormLastName}
                    placeholder="Doe"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Job Title / Role" required error={formErrors.role}>
                  <TextInput
                    value={formRole}
                    onChange={setFormRole}
                    placeholder="Senior Full-Stack Engineer"
                  />
                </FormField>
                <FormField label="Department">
                  <SelectInput
                    value={formDepartment}
                    onChange={setFormDepartment}
                    options={[
                      'Engineering & Architecture',
                      'Product Engineering',
                      'Infrastructure',
                      'Quality Assurance',
                      'Executive Management',
                    ]}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Employment Type">
                  <SelectInput
                    value={formEmploymentType}
                    onChange={setFormEmploymentType}
                    options={['Full-Time (W2)', 'Part-Time (W2)', 'Hourly (W2)']}
                  />
                </FormField>
                <FormField label="Hire Date" required error={formErrors.hireDate}>
                  <TextInput
                    type="date"
                    value={formHireDate}
                    onChange={setFormHireDate}
                  />
                </FormField>
              </div>
            </>
          ) : (
            <>
              <FormField label="Company / Entity Name" required error={formErrors.companyName}>
                <TextInput
                  value={formCompanyName}
                  onChange={setFormCompanyName}
                  placeholder="Apex Cloud Consulting LLC"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Contact Person" required error={formErrors.contactPerson}>
                  <TextInput
                    value={formContactPerson}
                    onChange={setFormContactPerson}
                    placeholder="Rajesh Sharma"
                  />
                </FormField>
                <FormField label="Contract Type">
                  <SelectInput
                    value={formContractType}
                    onChange={setFormContractType}
                    options={['1099 Independent', 'Corp-to-Corp (C2C)', 'Subcontractor']}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Specialty Area" required error={formErrors.specialty}>
                  <TextInput
                    value={formSpecialty}
                    onChange={setFormSpecialty}
                    placeholder="e.g. Data Engineering"
                  />
                </FormField>
                <FormField label="Payment Terms">
                  <SelectInput
                    value={formPaymentTerms}
                    onChange={setFormPaymentTerms}
                    options={['Net 15', 'Net 30', 'Net 45', 'Due on Receipt']}
                  />
                </FormField>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Primary Email" required error={formErrors.email}>
              <TextInput
                value={formEmail}
                onChange={setFormEmail}
                type="email"
                placeholder="name@company.com"
              />
            </FormField>
            <FormField label="Phone Number">
              <TextInput
                value={formPhone}
                onChange={setFormPhone}
                placeholder="+1 (555) 019-2831"
              />
            </FormField>
          </div>

          <FormField
            label={activeTab === 'employees' ? 'Pay Rate (USD/hr)' : 'Hourly Billable Rate (USD/hr)'}
            required
            error={formErrors.rate}
          >
            <TextInput
              value={formRate}
              onChange={setFormRate}
              type="number"
              step="0.5"
              placeholder="75.00"
            />
          </FormField>
        </div>
      </Modal>

      {/* Activate / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={
          statusTarget?.status === 'Active'
            ? `Deactivate ${activeTab === 'employees' ? 'Employee' : 'Contractor'}?`
            : `Reactivate ${activeTab === 'employees' ? 'Employee' : 'Contractor'}?`
        }
        message={
          statusTarget?.status === 'Active'
            ? `Are you sure you want to deactivate ${
                statusTarget?.companyName || `${statusTarget?.firstName} ${statusTarget?.lastName}`
              }? Deactivation preserves all historical timesheets, rate logs, and placement records while preventing new assignments.`
            : `Reactivating will restore active status and make this candidate available for new client job placements.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate' : 'Reactivate'}
        variant={statusTarget?.status === 'Active' ? 'warning' : 'primary'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};
