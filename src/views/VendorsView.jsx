import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField, TextInput, SelectInput } from '../components/common/FormField';
import { Icon } from '../components/common/Icons';
import {
  addVendor,
  updateVendor,
  toggleVendorStatus,
  addToast,
} from '../store/dataSlice';
import {
  validateRequired,
  validateEmail,
  validateUniqueId,
} from '../utils/validation';

/**
 * VendorsView Component
 * 
 * @purpose Supplier, agency, and subcontracting partner directory with full CRUD and status workflows.
 */
export const VendorsView = () => {
  const dispatch = useDispatch();
  const vendors = useSelector((state) => state.data.vendors);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [inspectVendor, setInspectVendor] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Corp-to-Corp Staffing Partner');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formTerms, setFormTerms] = useState('Net 30');
  const [formRating, setFormRating] = useState('Tier 1 Preferred');
  const [formErrors, setFormErrors] = useState({});

  const filteredVendors = vendors.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const target = `${v.name} ${v.contactPerson} ${v.email} ${v.vendorType} ${v.id}`.toLowerCase();
    const matchesSearch = !searchQuery || target.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pagedVendors = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Open Add Modal
  const handleOpenAdd = () => {
    const nextNum = vendors.length + 1;
    setFormId(`VEN-300${nextNum}`);
    setFormName('');
    setFormType('Corp-to-Corp Staffing Partner');
    setFormContact('');
    setFormEmail('');
    setFormPhone('');
    setFormTaxId('');
    setFormTerms('Net 30');
    setFormRating('Tier 1 Preferred');
    setFormErrors({});
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (v) => {
    setEditTarget(v);
    setFormId(v.id);
    setFormName(v.name);
    setFormType(v.vendorType || 'Corp-to-Corp Staffing Partner');
    setFormContact(v.contactPerson || '');
    setFormEmail(v.email || '');
    setFormPhone(v.phone || '');
    setFormTaxId(v.taxId || '');
    setFormTerms(v.paymentTerms || 'Net 30');
    setFormRating(v.rating || 'Tier 1 Preferred');
    setFormErrors({});
  };

  // Validate form
  const validateForm = (isEdit = false) => {
    const errors = {};

    const idErr = validateUniqueId(formId, vendors, isEdit ? editTarget.id : null);
    if (idErr) errors.id = idErr;

    const nameErr = validateRequired(formName, 'Vendor Name');
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmail(formEmail);
    if (emailErr) errors.email = emailErr;

    const contactErr = validateRequired(formContact, 'Primary Contact');
    if (contactErr) errors.contact = contactErr;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = () => {
    if (!validateForm(false)) return;

    dispatch(
      addVendor({
        id: formId.trim().toUpperCase(),
        name: formName.trim(),
        vendorType: formType,
        contactPerson: formContact.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        taxId: formTaxId.trim() || 'XX-XXX0000',
        paymentTerms: formTerms,
        rating: formRating,
      })
    );

    dispatch(
      addToast({
        title: 'Vendor Created',
        message: `${formName} added to vendor registry.`,
        type: 'success',
      })
    );
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    if (!validateForm(true)) return;

    dispatch(
      updateVendor({
        id: editTarget.id,
        name: formName.trim(),
        vendorType: formType,
        contactPerson: formContact.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        taxId: formTaxId.trim(),
        paymentTerms: formTerms,
        rating: formRating,
      })
    );

    dispatch(
      addToast({
        title: 'Vendor Updated',
        message: `Changes saved for ${formName}.`,
        type: 'success',
      })
    );
    setEditTarget(null);
  };

  const handleConfirmToggleStatus = () => {
    if (!statusTarget) return;
    dispatch(toggleVendorStatus(statusTarget.id));
    const newStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
    dispatch(
      addToast({
        title: `Vendor ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
        message: `${statusTarget.name} is now marked as ${newStatus}.`,
        type: newStatus === 'Active' ? 'success' : 'warning',
      })
    );
    setStatusTarget(null);
  };

  const columns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Vendor / Partner',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.name}</span>
          <span className="text-[11px] text-slate-400">{row.vendorType}</span>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-white block">{row.contactPerson}</span>
          <span className="text-[11px] text-indigo-400">{row.email}</span>
        </div>
      ),
    },
    { header: 'Terms', accessor: 'paymentTerms', sortable: true },
    {
      header: 'Tier / Rating',
      accessor: 'rating',
      render: (row) => (
        <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          {row.rating || 'Standard'}
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
              setInspectVendor(row);
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
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
            title="Edit Vendor"
          >
            <span className="text-xs font-semibold px-1">Edit</span>
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
        title="Vendors & Subcontracting Partners"
        subtitle="Manage supplier agencies, Corp-to-Corp subcontracting firms, procurement terms, and vendor lifecycle states."
        badge={`${filteredVendors.length} Registered Partners`}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add Vendor
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
          data={pagedVendors}
          onRowClick={(row) => setInspectVendor(row)}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredVendors.length}
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
        isOpen={Boolean(inspectVendor)}
        onClose={() => setInspectVendor(null)}
        title={inspectVendor?.name}
        subtitle={`Vendor ID: ${inspectVendor?.id} • Type: ${inspectVendor?.vendorType}`}
        footer={
          <button
            type="button"
            onClick={() => setInspectVendor(null)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        }
      >
        {inspectVendor && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge status={inspectVendor.status} />
              </div>
              <div>
                <span className="text-slate-400 block">Rating Tier</span>
                <span className="text-purple-300 font-semibold">{inspectVendor.rating || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Primary Contact</span>
                <span className="text-white font-medium">{inspectVendor.contactPerson}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="text-white font-medium">{inspectVendor.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="text-white font-medium">{inspectVendor.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Terms</span>
                <span className="text-white font-medium">{inspectVendor.paymentTerms}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tax ID / EIN</span>
                <span className="text-white font-mono">{inspectVendor.taxId || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Record Version</span>
                <span className="text-indigo-400 font-mono">v{inspectVendor.version || 1}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editTarget)}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Edit Vendor: ${editTarget.name}` : 'Add New Vendor'}
        subtitle="Ensure required fields, valid email, and unique identification are provided."
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
              {editTarget ? 'Save Changes' : 'Create Vendor'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vendor ID" required error={formErrors.id}>
              <TextInput
                value={formId}
                onChange={setFormId}
                placeholder="e.g. VEN-3004"
                disabled={Boolean(editTarget)}
              />
            </FormField>
            <FormField label="Vendor Classification">
              <SelectInput
                value={formType}
                onChange={setFormType}
                options={[
                  'Corp-to-Corp Staffing Partner',
                  'Specialized Security Agency',
                  'Subcontractor Studio',
                  'General IT Supplier',
                ]}
              />
            </FormField>
          </div>

          <FormField label="Company / Legal Entity Name" required error={formErrors.name}>
            <TextInput
              value={formName}
              onChange={setFormName}
              placeholder="e.g. Acme Talent Partners LLC"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Primary Contact Person" required error={formErrors.contact}>
              <TextInput
                value={formContact}
                onChange={setFormContact}
                placeholder="Jane Doe"
              />
            </FormField>
            <FormField label="Contact Email" required error={formErrors.email}>
              <TextInput
                value={formEmail}
                onChange={setFormEmail}
                type="email"
                placeholder="jane@partner.com"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Phone">
              <TextInput
                value={formPhone}
                onChange={setFormPhone}
                placeholder="+1 (555) 019-2831"
              />
            </FormField>
            <FormField label="Tax ID / EIN">
              <TextInput
                value={formTaxId}
                onChange={setFormTaxId}
                placeholder="XX-XXX1234"
              />
            </FormField>
            <FormField label="Payment Terms">
              <SelectInput
                value={formTerms}
                onChange={setFormTerms}
                options={['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']}
              />
            </FormField>
          </div>

          <FormField label="Partner Rating Tier">
            <SelectInput
              value={formRating}
              onChange={setFormRating}
              options={['Tier 1 Preferred', 'Tier 2 Approved', 'Standard', 'Under Review']}
            />
          </FormField>
        </div>
      </Modal>

      {/* Activate / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.status === 'Active' ? 'Deactivate Vendor Partner?' : 'Reactivate Vendor Partner?'}
        message={
          statusTarget?.status === 'Active'
            ? `Are you sure you want to deactivate ${statusTarget?.name}? Existing invoices and audit records will be preserved, but new placements will flag this partner as inactive.`
            : `Reactivating ${statusTarget?.name} will restore their active supplier status for new contractor placements.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate Vendor' : 'Reactivate Vendor'}
        variant={statusTarget?.status === 'Active' ? 'warning' : 'primary'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};
