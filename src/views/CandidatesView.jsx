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
import {
  addClient,
  updateClient,
  toggleClientStatus,
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
 * CandidatesView Component
 *
 * @purpose Unified candidates registry consolidating Client customer accounts and Vendor partner suppliers
 *          with clear visual differentiation, tailored CRUD workflows, and preserved financial relationships.
 */
export const CandidatesView = () => {
  const dispatch = useDispatch();
  const { clients, vendors, selectedOrgId } = useSelector((state) => state.data);

  // ─── Filter & View State ─────────────────────────────────────────
  const [activeTypeTab, setActiveTypeTab] = useState('All'); // 'All' | 'Client' | 'Vendor'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ─── Dialog State ───────────────────────────────────────────────
  const [inspectItem, setInspectItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // ─── Form State ─────────────────────────────────────────────────
  const [formCandidateType, setFormCandidateType] = useState('Client'); // 'Client' | 'Vendor'
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formVendorType, setFormVendorType] = useState('Corp-to-Corp Staffing Partner');
  const [formContactName, setFormContactName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBillingAddress, setFormBillingAddress] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formCreditLimit, setFormCreditLimit] = useState('250000');
  const [formRating, setFormRating] = useState('Tier 1 Preferred');
  const [formErrors, setFormErrors] = useState({});

  // ─── Unified Data Transformation ────────────────────────────────
  const unifiedCandidates = useMemo(() => {
    const clientRecords = clients.map((c) => ({
      ...c,
      candidateType: 'Client',
      contactPerson: c.contactName,
      email: c.contactEmail,
      subCategory: c.industry || 'Client Account',
    }));

    const vendorRecords = vendors.map((v) => ({
      ...v,
      candidateType: 'Vendor',
      contactName: v.contactPerson,
      contactEmail: v.email,
      subCategory: v.vendorType || 'Vendor Partner',
    }));

    return [...clientRecords, ...vendorRecords];
  }, [clients, vendors]);

  const clientCount = clients.length;
  const vendorCount = vendors.length;

  // ─── Filtering ──────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    return unifiedCandidates.filter((item) => {
      // Tab filter
      const matchesTab =
        activeTypeTab === 'All' || item.candidateType === activeTypeTab;

      // Dropdown type filter
      const matchesType =
        typeFilter === 'All' || item.candidateType === typeFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter;

      // Search target
      const searchTarget = `${item.id} ${item.name} ${item.candidateType} ${
        item.contactPerson || item.contactName || ''
      } ${item.email || item.contactEmail || ''} ${item.subCategory || ''} ${
        item.paymentTerms || ''
      }`.toLowerCase();

      const matchesSearch =
        !searchQuery || searchTarget.includes(searchQuery.toLowerCase());

      return matchesTab && matchesType && matchesStatus && matchesSearch;
    });
  }, [unifiedCandidates, activeTypeTab, typeFilter, statusFilter, searchQuery]);

  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // ─── Open Add Modal ─────────────────────────────────────────────
  const handleOpenAdd = (defaultType = 'Client') => {
    const typeToUse = defaultType === 'Vendor' ? 'Vendor' : 'Client';
    setFormCandidateType(typeToUse);
    initAddForm(typeToUse);
    setShowAddModal(true);
  };

  const initAddForm = (type) => {
    if (type === 'Client') {
      const nextNum = clients.length + 1;
      setFormId(`CLI-300${nextNum}`);
      setFormName('');
      setFormIndustry('Financial Technology & Banking');
      setFormContactName('');
      setFormEmail('');
      setFormPhone('');
      setFormBillingAddress('');
      setFormPaymentTerms('Net 30');
      setFormCreditLimit('250000');
    } else {
      const nextNum = vendors.length + 1;
      setFormId(`VEN-300${nextNum}`);
      setFormName('');
      setFormVendorType('Corp-to-Corp Staffing Partner');
      setFormContactName('');
      setFormEmail('');
      setFormPhone('');
      setFormTaxId('XX-XXX0000');
      setFormPaymentTerms('Net 30');
      setFormRating('Tier 1 Preferred');
    }
    setFormErrors({});
  };

  const handleTypeChange = (newType) => {
    setFormCandidateType(newType);
    initAddForm(newType);
  };

  // ─── Open Edit Modal ────────────────────────────────────────────
  const handleOpenEdit = (item) => {
    setEditTarget(item);
    setFormCandidateType(item.candidateType);
    setFormId(item.id);
    setFormName(item.name || '');
    setFormPhone(item.phone || '');
    setFormPaymentTerms(item.paymentTerms || 'Net 30');

    if (item.candidateType === 'Client') {
      setFormIndustry(item.industry || '');
      setFormContactName(item.contactName || '');
      setFormEmail(item.contactEmail || item.email || '');
      setFormBillingAddress(item.billingAddress || '');
      setFormCreditLimit(item.creditLimit ? String(item.creditLimit) : '200000');
    } else {
      setFormVendorType(item.vendorType || 'Corp-to-Corp Staffing Partner');
      setFormContactName(item.contactPerson || item.contactName || '');
      setFormEmail(item.email || item.contactEmail || '');
      setFormTaxId(item.taxId || '');
      setFormRating(item.rating || 'Tier 1 Preferred');
    }
    setFormErrors({});
  };

  // ─── Form Validation ────────────────────────────────────────────
  const validateForm = (isEdit = false) => {
    const errors = {};
    const existingList =
      formCandidateType === 'Client' ? clients : vendors;

    const idErr = validateUniqueId(
      formId,
      existingList,
      isEdit ? editTarget?.id : null
    );
    if (idErr) errors.id = idErr;

    const nameErr = validateRequired(
      formName,
      formCandidateType === 'Client' ? 'Client Name' : 'Vendor Name'
    );
    if (nameErr) errors.name = nameErr;

    const contactErr = validateRequired(formContactName, 'Primary Contact');
    if (contactErr) errors.contactName = contactErr;

    const emailErr = validateEmail(formEmail);
    if (emailErr) errors.email = emailErr;

    if (formCandidateType === 'Client') {
      const creditNum = parseFloat(formCreditLimit);
      if (isNaN(creditNum) || creditNum < 0) {
        errors.creditLimit = 'Credit limit must be a valid non-negative number.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Save Add Record ────────────────────────────────────────────
  const handleSaveAdd = () => {
    if (!validateForm(false)) return;

    if (formCandidateType === 'Client') {
      dispatch(
        addClient({
          id: formId.trim().toUpperCase(),
          organizationId: selectedOrgId,
          name: formName.trim(),
          industry: formIndustry.trim(),
          contactName: formContactName.trim(),
          contactEmail: formEmail.trim(),
          phone: formPhone.trim(),
          billingAddress: formBillingAddress.trim(),
          paymentTerms: formPaymentTerms,
          creditLimit: parseFloat(formCreditLimit) || 0,
        })
      );
      dispatch(
        addToast({
          title: 'Candidate Client Created',
          message: `Client ${formName} (${formId}) added to registry.`,
          type: 'success',
        })
      );
    } else {
      dispatch(
        addVendor({
          id: formId.trim().toUpperCase(),
          name: formName.trim(),
          vendorType: formVendorType,
          contactPerson: formContactName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          taxId: formTaxId.trim() || 'XX-XXX0000',
          paymentTerms: formPaymentTerms,
          rating: formRating,
        })
      );
      dispatch(
        addToast({
          title: 'Candidate Vendor Created',
          message: `Vendor ${formName} (${formId}) added to registry.`,
          type: 'success',
        })
      );
    }

    setShowAddModal(false);
  };

  // ─── Save Edit Record ───────────────────────────────────────────
  const handleSaveEdit = () => {
    if (!validateForm(true)) return;

    if (editTarget.candidateType === 'Client') {
      dispatch(
        updateClient({
          id: editTarget.id,
          name: formName.trim(),
          industry: formIndustry.trim(),
          contactName: formContactName.trim(),
          contactEmail: formEmail.trim(),
          phone: formPhone.trim(),
          billingAddress: formBillingAddress.trim(),
          paymentTerms: formPaymentTerms,
          creditLimit: parseFloat(formCreditLimit) || 0,
        })
      );
      dispatch(
        addToast({
          title: 'Candidate Updated',
          message: `Client account parameters updated for ${formName}.`,
          type: 'success',
        })
      );
    } else {
      dispatch(
        updateVendor({
          id: editTarget.id,
          name: formName.trim(),
          vendorType: formVendorType,
          contactPerson: formContactName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          taxId: formTaxId.trim(),
          paymentTerms: formPaymentTerms,
          rating: formRating,
        })
      );
      dispatch(
        addToast({
          title: 'Candidate Updated',
          message: `Vendor partner profile updated for ${formName}.`,
          type: 'success',
        })
      );
    }

    setEditTarget(null);
  };

  // ─── Toggle Status ──────────────────────────────────────────────
  const handleConfirmToggleStatus = () => {
    if (!statusTarget) return;

    const isClient = statusTarget.candidateType === 'Client';
    if (isClient) {
      dispatch(toggleClientStatus(statusTarget.id));
    } else {
      dispatch(toggleVendorStatus(statusTarget.id));
    }

    const newStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
    dispatch(
      addToast({
        title: `${statusTarget.candidateType} ${
          newStatus === 'Active' ? 'Activated' : 'Deactivated'
        }`,
        message: `${statusTarget.name} marked as ${newStatus}.`,
        type: newStatus === 'Active' ? 'success' : 'warning',
      })
    );
    setStatusTarget(null);
  };

  // ─── Table Columns ──────────────────────────────────────────────
  const columns = [
    { header: 'ID', accessor: 'id', sortable: true },
    {
      header: 'Candidate Type',
      accessor: 'candidateType',
      sortable: true,
      render: (row) =>
        row.candidateType === 'Client' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Icon name="clients" className="w-3 h-3 text-sky-400" />
            Client
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Icon name="candidates" className="w-3 h-3 text-purple-400" />
            Vendor
          </span>
        ),
    },
    {
      header: 'Candidate Name',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.name}</span>
          <span className="text-[11px] text-slate-400">{row.subCategory}</span>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-white block">
            {row.contactPerson || row.contactName}
          </span>
          <span className="text-[11px] text-indigo-400">
            {row.email || row.contactEmail}
          </span>
        </div>
      ),
    },
    { header: 'Terms', accessor: 'paymentTerms', sortable: true },
    {
      header: 'Financial / Tier',
      render: (row) =>
        row.candidateType === 'Client' ? (
          <div>
            <div className="text-xs text-slate-300">
              Limit: <CurrencyDisplay value={row.creditLimit} />
            </div>
            {row.outstandingBalance !== undefined && row.outstandingBalance > 0 ? (
              <div className="text-[10px] text-amber-400 font-semibold">
                Due: <CurrencyDisplay value={row.outstandingBalance} />
              </div>
            ) : null}
          </div>
        ) : (
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
      {/* Page Header */}
      <PageHeader
        title="Candidates"
        subtitle="Unified repository of Client customer accounts and Vendor supplier partners with billing parameters, credit limits, and contact registries."
        badge={`${filteredList.length} Total Candidates (${clientCount} Clients, ${vendorCount} Vendors)`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAdd(activeTypeTab === 'Vendor' ? 'Vendor' : 'Client')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Candidate
            </button>
          </div>
        }
      />

      {/* Candidate Type Quick Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTypeTab('All');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
            activeTypeTab === 'All'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          All Candidates ({unifiedCandidates.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTypeTab('Client');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
            activeTypeTab === 'Client'
              ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          Clients ({clientCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTypeTab('Vendor');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
            activeTypeTab === 'Vendor'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          Vendors ({vendorCount})
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        filters={[
          {
            key: 'type',
            label: 'Candidate Type',
            options: ['All', 'Client', 'Vendor'],
            value: typeFilter,
            onChange: (val) => {
              setTypeFilter(val);
              setCurrentPage(1);
            },
          },
          {
            key: 'status',
            label: 'Status',
            options: ['All', 'Active', 'Inactive'],
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            },
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setTypeFilter('All');
          setStatusFilter('All');
          setCurrentPage(1);
        }}
      />

      {/* Main Data Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={columns}
          data={pagedList}
          onRowClick={(row) => setInspectItem(row)}
          emptyTitle="No candidates found"
          emptyDescription="Adjust your search query or filters to view Client or Vendor records."
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

      {/* ─── Record Inspect Modal ─────────────────────────────────── */}
      <Modal
        isOpen={Boolean(inspectItem)}
        onClose={() => setInspectItem(null)}
        title={
          inspectItem ? (
            <div className="flex items-center gap-2">
              <span>{inspectItem.name}</span>
              {inspectItem.candidateType === 'Client' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Client
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Vendor
                </span>
              )}
            </div>
          ) : (
            'Candidate Details'
          )
        }
        subtitle={`System ID: ${inspectItem?.id} • Type: ${inspectItem?.candidateType}`}
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
                <span className="text-slate-400 block">Candidate Type</span>
                <span className="font-semibold text-white">
                  {inspectItem.candidateType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge status={inspectItem.status} />
              </div>
              <div>
                <span className="text-slate-400 block">Primary Contact</span>
                <span className="text-white font-medium">
                  {inspectItem.contactPerson || inspectItem.contactName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Email Address</span>
                <span className="text-indigo-400 font-medium">
                  {inspectItem.email || inspectItem.contactEmail}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="text-white font-medium">
                  {inspectItem.phone || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Terms</span>
                <span className="text-white font-semibold">
                  {inspectItem.paymentTerms}
                </span>
              </div>

              {inspectItem.candidateType === 'Client' ? (
                <>
                  <div>
                    <span className="text-slate-400 block">Industry</span>
                    <span className="text-white font-medium">
                      {inspectItem.industry}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Credit Limit</span>
                    <span className="text-white font-semibold">
                      <CurrencyDisplay value={inspectItem.creditLimit} />
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Billing Address</span>
                    <span className="text-white font-medium">
                      {inspectItem.billingAddress || '—'}
                    </span>
                  </div>
                  {inspectItem.outstandingBalance !== undefined && (
                    <div>
                      <span className="text-slate-400 block">
                        Outstanding Balance
                      </span>
                      <span className="text-amber-400 font-bold">
                        <CurrencyDisplay value={inspectItem.outstandingBalance} />
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <span className="text-slate-400 block">Vendor Type</span>
                    <span className="text-white font-medium">
                      {inspectItem.vendorType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Rating Tier</span>
                    <span className="text-purple-300 font-semibold">
                      {inspectItem.rating || 'Standard'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tax ID / EIN</span>
                    <span className="text-white font-mono">
                      {inspectItem.taxId || '—'}
                    </span>
                  </div>
                </>
              )}

              <div>
                <span className="text-slate-400 block">Version</span>
                <span className="text-indigo-400 font-mono">
                  v{inspectItem.version || 1}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Updated</span>
                <DateDisplay date={inspectItem.updatedAt} format="short" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Add / Edit Candidate Modal ───────────────────────────── */}
      <Modal
        isOpen={showAddModal || Boolean(editTarget)}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        title={
          editTarget
            ? `Edit Candidate: ${editTarget.name} (${editTarget.candidateType})`
            : `Add New Candidate (${formCandidateType})`
        }
        subtitle={
          editTarget
            ? 'Update profile settings, billing terms, and contact parameters.'
            : 'Select Candidate Type (Client or Vendor) and configure parameters.'
        }
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
              {editTarget ? 'Save Changes' : 'Create Candidate'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Candidate Type Selector (only on create) */}
          {!editTarget && (
            <FormField
              label="Candidate Type"
              required
              helperText="Specify whether this candidate record represents a Client account or Vendor partner."
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('Client')}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    formCandidateType === 'Client'
                      ? 'bg-sky-600/20 border-sky-500/40 text-sky-200 shadow-sm'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name="clients" className="w-4 h-4" />
                  Client (Customer Account)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('Vendor')}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    formCandidateType === 'Vendor'
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-200 shadow-sm'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name="candidates" className="w-4 h-4" />
                  Vendor (Supplier / Agency)
                </button>
              </div>
            </FormField>
          )}

          <FormField label="Candidate Record ID" required error={formErrors.id}>
            <TextInput
              value={formId}
              onChange={setFormId}
              placeholder={formCandidateType === 'Client' ? 'CLI-3004' : 'VEN-3004'}
              disabled={Boolean(editTarget)}
            />
          </FormField>

          <FormField
            label={formCandidateType === 'Client' ? 'Client Entity Name' : 'Vendor Legal Name'}
            required
            error={formErrors.name}
          >
            <TextInput
              value={formName}
              onChange={setFormName}
              placeholder={
                formCandidateType === 'Client'
                  ? 'e.g. Acme FinTech Group Inc.'
                  : 'e.g. Apex Talent Solutions LLC'
              }
            />
          </FormField>

          {formCandidateType === 'Client' ? (
            <FormField label="Industry / Sector">
              <SelectInput
                value={formIndustry}
                onChange={setFormIndustry}
                options={[
                  'Financial Technology & Banking',
                  'Healthcare & Biotech',
                  'Public Sector & Transportation',
                  'E-Commerce & Retail',
                  'Telecommunications & Cloud',
                ]}
              />
            </FormField>
          ) : (
            <FormField label="Vendor Business Type">
              <SelectInput
                value={formVendorType}
                onChange={setFormVendorType}
                options={[
                  'Corp-to-Corp Staffing Partner',
                  'Specialized Security Agency',
                  'Subcontractor Studio',
                  'Legal & Immigration Counsel',
                  'Cloud Infrastructure & IT Solutions',
                ]}
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Primary Contact Person"
              required
              error={formErrors.contactName}
            >
              <TextInput
                value={formContactName}
                onChange={setFormContactName}
                placeholder="Alex Morgan"
              />
            </FormField>
            <FormField
              label="Primary Email"
              required
              error={formErrors.email}
            >
              <TextInput
                value={formEmail}
                onChange={setFormEmail}
                type="email"
                placeholder="contact@entity.com"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone Number">
              <TextInput
                value={formPhone}
                onChange={setFormPhone}
                placeholder="+1 (555) 019-2831"
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

          {formCandidateType === 'Client' ? (
            <>
              <FormField
                label="Credit Limit (USD)"
                error={formErrors.creditLimit}
              >
                <TextInput
                  value={formCreditLimit}
                  onChange={setFormCreditLimit}
                  type="number"
                  placeholder="250000"
                />
              </FormField>
              <FormField label="Billing Address">
                <TextInput
                  value={formBillingAddress}
                  onChange={setFormBillingAddress}
                  placeholder="123 Corporate Blvd, Suite 400, New York, NY"
                />
              </FormField>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tax Identification (EIN)">
                <TextInput
                  value={formTaxId}
                  onChange={setFormTaxId}
                  placeholder="XX-XXX1234"
                />
              </FormField>
              <FormField label="Partner Rating Tier">
                <SelectInput
                  value={formRating}
                  onChange={setFormRating}
                  options={[
                    'Tier 1 Preferred',
                    'Tier 2 Approved',
                    'Standard',
                    'Probationary',
                  ]}
                />
              </FormField>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Activate / Deactivate Confirmation Dialog ───────────── */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={
          statusTarget?.status === 'Active'
            ? `Deactivate ${statusTarget?.candidateType}: ${statusTarget?.name}?`
            : `Reactivate ${statusTarget?.candidateType}: ${statusTarget?.name}?`
        }
        message={
          statusTarget?.status === 'Active'
            ? `Are you sure you want to deactivate ${statusTarget?.name}? Deactivation prevents new jobs, assignments, and billing while preserving all historical invoices, placements, and payments.`
            : `Reactivating will restore active status and make this ${statusTarget?.candidateType} available for active operations.`
        }
        confirmLabel={
          statusTarget?.status === 'Active' ? 'Deactivate' : 'Reactivate'
        }
        variant={statusTarget?.status === 'Active' ? 'warning' : 'primary'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};

export const ClientsView = CandidatesView;
export const VendorsView = CandidatesView;
