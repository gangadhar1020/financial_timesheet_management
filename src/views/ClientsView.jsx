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
  addClient,
  updateClient,
  toggleClientStatus,
  addToast,
} from '../store/dataSlice';
import {
  validateRequired,
  validateEmail,
  validateUniqueId,
} from '../utils/validation';

/**
 * ClientsView Component
 * 
 * @purpose Customer accounts management module with full CRUD, billing parameters, contacts, and deactivation workflows.
 */
export const ClientsView = () => {
  const dispatch = useDispatch();
  const { clients, selectedOrgId } = useSelector((state) => state.data);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [inspectClient, setInspectClient] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBillingAddress, setFormBillingAddress] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formCreditLimit, setFormCreditLimit] = useState('200000');
  const [formErrors, setFormErrors] = useState({});

  const filteredClients = clients.filter((c) => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const searchTarget = `${c.name} ${c.industry} ${c.contactName} ${c.contactEmail} ${c.id}`.toLowerCase();
    const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pagedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    const count = clients.length + 1;
    setFormId(`CLI-300${count}`);
    setFormName('');
    setFormIndustry('Financial Technology');
    setFormContactName('');
    setFormContactEmail('');
    setFormPhone('');
    setFormBillingAddress('');
    setFormPaymentTerms('Net 30');
    setFormCreditLimit('250000');
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEdit = (client) => {
    setEditTarget(client);
    setFormId(client.id);
    setFormName(client.name);
    setFormIndustry(client.industry || '');
    setFormContactName(client.contactName || '');
    setFormContactEmail(client.contactEmail || '');
    setFormPhone(client.phone || '');
    setFormBillingAddress(client.billingAddress || '');
    setFormPaymentTerms(client.paymentTerms || 'Net 30');
    setFormCreditLimit(client.creditLimit ? String(client.creditLimit) : '200000');
    setFormErrors({});
  };

  const validateForm = (isEdit = false) => {
    const errors = {};

    const idErr = validateUniqueId(formId, clients, isEdit ? editTarget.id : null);
    if (idErr) errors.id = idErr;

    const nameErr = validateRequired(formName, 'Client Name');
    if (nameErr) errors.name = nameErr;

    const contactErr = validateRequired(formContactName, 'Primary Contact');
    if (contactErr) errors.contactName = contactErr;

    const emailErr = validateEmail(formContactEmail);
    if (emailErr) errors.contactEmail = emailErr;

    const creditNum = parseFloat(formCreditLimit);
    if (isNaN(creditNum) || creditNum < 0) {
      errors.creditLimit = 'Credit limit must be a valid non-negative number.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = () => {
    if (!validateForm(false)) return;

    dispatch(
      addClient({
        id: formId.trim().toUpperCase(),
        organizationId: selectedOrgId,
        name: formName.trim(),
        industry: formIndustry.trim(),
        contactName: formContactName.trim(),
        contactEmail: formContactEmail.trim(),
        phone: formPhone.trim(),
        billingAddress: formBillingAddress.trim(),
        paymentTerms: formPaymentTerms,
        creditLimit: parseFloat(formCreditLimit) || 0,
      })
    );

    dispatch(
      addToast({
        title: 'Client Added',
        message: `${formName} created with ID ${formId}.`,
        type: 'success',
      })
    );
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    if (!validateForm(true)) return;

    dispatch(
      updateClient({
        id: editTarget.id,
        name: formName.trim(),
        industry: formIndustry.trim(),
        contactName: formContactName.trim(),
        contactEmail: formContactEmail.trim(),
        phone: formPhone.trim(),
        billingAddress: formBillingAddress.trim(),
        paymentTerms: formPaymentTerms,
        creditLimit: parseFloat(formCreditLimit) || 0,
      })
    );

    dispatch(
      addToast({
        title: 'Client Updated',
        message: `Account settings updated for ${formName}.`,
        type: 'success',
      })
    );
    setEditTarget(null);
  };

  const handleConfirmToggleStatus = () => {
    if (!statusTarget) return;
    dispatch(toggleClientStatus(statusTarget.id));
    const newStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
    dispatch(
      addToast({
        title: `Client ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
        message: `${statusTarget.name} status updated to ${newStatus}.`,
        type: newStatus === 'Active' ? 'success' : 'warning',
      })
    );
    setStatusTarget(null);
  };

  const columns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Client Name',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.name}</span>
          <span className="text-[11px] text-slate-400">{row.industry}</span>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-white block">{row.contactName}</span>
          <span className="text-[11px] text-indigo-400">{row.contactEmail}</span>
        </div>
      ),
    },
    { header: 'Terms', accessor: 'paymentTerms', sortable: true },
    {
      header: 'Credit Limit',
      accessor: 'creditLimit',
      sortable: true,
      render: (row) => <CurrencyDisplay value={row.creditLimit} />,
    },
    {
      header: 'Outstanding Balance',
      accessor: 'outstandingBalance',
      sortable: true,
      render: (row) => (
        <CurrencyDisplay
          value={row.outstandingBalance}
          className={row.outstandingBalance > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}
        />
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
              setInspectClient(row);
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
            title="Edit Client"
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
        title="Client Accounts"
        subtitle="Manage customer relationships, billing terms, credit limits, primary contacts, and accounts receivable exposure."
        badge={`${filteredClients.length} Accounts`}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add Client
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
            options: ['All', 'Active', 'Inactive'],
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
          data={pagedClients}
          onRowClick={(row) => setInspectClient(row)}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredClients.length}
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
        isOpen={Boolean(inspectClient)}
        onClose={() => setInspectClient(null)}
        title={inspectClient?.name}
        subtitle={`Client ID: ${inspectClient?.id} • Status: ${inspectClient?.status}`}
        footer={
          <button
            type="button"
            onClick={() => setInspectClient(null)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        }
      >
        {inspectClient && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-white/5 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Industry:</span>
                <span className="text-white font-medium">{inspectClient.industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Billing Address:</span>
                <span className="text-white font-medium text-right max-w-xs">{inspectClient.billingAddress || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Procurement Contact:</span>
                <span className="text-white font-medium">{inspectClient.contactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-indigo-400 font-medium">{inspectClient.contactEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-medium">{inspectClient.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Terms:</span>
                <span className="text-white font-medium">{inspectClient.paymentTerms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credit Limit:</span>
                <CurrencyDisplay value={inspectClient.creditLimit} />
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-slate-400">Current Outstanding AR:</span>
                <CurrencyDisplay value={inspectClient.outstandingBalance} className="text-amber-400 font-bold" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Record Version:</span>
                <span className="text-indigo-400 font-mono">v{inspectClient.version || 1}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editTarget)}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Edit Client: ${editTarget.name}` : 'Add New Client Account'}
        subtitle="Manage billing terms, credit limit, and designated contact details."
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
              {editTarget ? 'Save Changes' : 'Create Client'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Client ID" required error={formErrors.id}>
              <TextInput
                value={formId}
                onChange={setFormId}
                placeholder="CLI-3004"
                disabled={Boolean(editTarget)}
              />
            </FormField>
            <FormField label="Industry / Sector">
              <TextInput
                value={formIndustry}
                onChange={setFormIndustry}
                placeholder="e.g. Healthcare & Biotech"
              />
            </FormField>
          </div>

          <FormField label="Client Company Name" required error={formErrors.name}>
            <TextInput
              value={formName}
              onChange={setFormName}
              placeholder="e.g. Horizon Health Corp"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Primary Contact Person" required error={formErrors.contactName}>
              <TextInput
                value={formContactName}
                onChange={setFormContactName}
                placeholder="David Campbell"
              />
            </FormField>
            <FormField label="Contact Email" required error={formErrors.contactEmail}>
              <TextInput
                value={formContactEmail}
                onChange={setFormContactEmail}
                type="email"
                placeholder="billing@company.com"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone Number">
              <TextInput
                value={formPhone}
                onChange={setFormPhone}
                placeholder="+1 (555) 234-8900"
              />
            </FormField>
            <FormField label="Payment Terms">
              <SelectInput
                value={formPaymentTerms}
                onChange={setFormPaymentTerms}
                options={['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']}
              />
            </FormField>
          </div>

          <FormField label="Credit Limit (USD)" error={formErrors.creditLimit}>
            <TextInput
              value={formCreditLimit}
              onChange={setFormCreditLimit}
              type="number"
              placeholder="250000"
            />
          </FormField>

          <FormField label="Billing Headquarters Address">
            <TextInput
              value={formBillingAddress}
              onChange={setFormBillingAddress}
              placeholder="350 Park Avenue, New York, NY"
            />
          </FormField>
        </div>
      </Modal>

      {/* Confirmation Dialog for Deactivation / Activation */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.status === 'Active' ? 'Deactivate Client Account?' : 'Reactivate Client Account?'}
        message={
          statusTarget?.status === 'Active'
            ? `Are you sure you want to deactivate ${statusTarget?.name}? Existing invoices and revenue logs will be retained, but new job requisitions and placements will be restricted.`
            : `Reactivating ${statusTarget?.name} will restore account privileges for new job requisitions.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate Client' : 'Reactivate Client'}
        variant={statusTarget?.status === 'Active' ? 'warning' : 'primary'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};
