import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Badge } from '../components/common/Badge';
import { CurrencyDisplay, DateDisplay } from '../components/common/Formatters';
import { StatCard } from '../components/common/Card';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { Icon } from '../components/common/Icons';
import { Alert } from '../components/common/Feedback';
import {
  createApBillFromTimesheet,
  batchCreateApBills,
  recordApPayment,
  voidApBill,
  setActiveView,
} from '../store/dataSlice';
import {
  calculateWorkerCost,
  validateAPPayment,
} from '../utils/accountingEngine';

/**
 * AccountsPayableView Component
 *
 * @purpose Accounts Payable module: create AP bills from approved consultant timesheets using
 * Worker Cost = Payable Hours × Pay Rate, schedule disbursements, track balance due, and prevent duplicates.
 */
export const AccountsPayableView = () => {
  const dispatch = useDispatch();
  const { apBills, apPayments, timesheets, contractors, placements } = useSelector((state) => state.data);

  // ─── Tab & Filter State ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'disbursements'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');

  // ─── Modal States ─────────────────────────────────────────────
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [inspectBill, setInspectBill] = useState(null);
  const [paymentTargetBill, setPaymentTargetBill] = useState(null);
  const [voidConfirmTarget, setVoidConfirmTarget] = useState(null);

  // ─── Financial KPI Aggregations ───────────────────────────────
  const totalPayableBalance = apBills.reduce((acc, curr) => acc + (curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0))), 0);
  const totalDisbursed = apPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const openBillsCount = apBills.filter((b) => (b.balanceDue > 0 || !b.balanceDue) && b.status !== 'Paid' && b.status !== 'Cancelled').length;
  const overdueBillsCount = apBills.filter((b) => b.status === 'Overdue').length;

  // ─── Eligible Timesheets for AP Billing ────────────────────────
  const unbilledApprovedTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (ts.status !== 'Approved') return false;
      // Check if bill already exists
      const existing = apBills.find((b) => b.sourceTimesheetId === ts.id || b.sourceId === ts.id);
      return !existing && !ts.billId;
    });
  }, [timesheets, apBills]);

  // ─── Filter Options ───────────────────────────────────────────
  const uniqueVendors = useMemo(() => {
    const names = [...new Set(apBills.map((b) => b.vendorName).filter(Boolean))];
    return ['All', ...names.sort()];
  }, [apBills]);

  // ─── Filtered Lists ───────────────────────────────────────────
  const filteredBills = useMemo(() => {
    return apBills.filter((bill) => {
      const matchesStatus = statusFilter === 'All' || bill.status === statusFilter;
      const matchesVendor = vendorFilter === 'All' || bill.vendorName === vendorFilter;
      const q = searchQuery.toLowerCase();
      const targetStr = `${bill.billNumber} ${bill.vendorName} ${bill.id} ${bill.sourceTimesheetId || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || targetStr.includes(q);
      return matchesStatus && matchesVendor && matchesSearch;
    });
  }, [apBills, statusFilter, vendorFilter, searchQuery]);

  const filteredDisbursements = useMemo(() => {
    return apPayments.filter((disb) => {
      const matchesVendor = vendorFilter === 'All' || disb.vendorName === vendorFilter;
      const q = searchQuery.toLowerCase();
      const targetStr = `${disb.id} ${disb.paymentReference} ${disb.vendorName} ${disb.billId || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || targetStr.includes(q);
      return matchesVendor && matchesSearch;
    });
  }, [apPayments, vendorFilter, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleOpenDisbursement = (bill) => {
    setPaymentTargetBill(bill);
    setShowPaymentModal(true);
  };

  // ─── Table Columns: Bills ─────────────────────────────────────
  const billColumns = [
    {
      header: 'Bill #',
      accessor: 'billNumber',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setInspectBill(row)}
          className="font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline text-left block"
          title="Inspect AP Bill & Worker Cost"
        >
          {row.billNumber}
        </button>
      ),
    },
    {
      header: 'Vendor / Contractor',
      accessor: 'vendorName',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.vendorName}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.contractorId || row.placementId}</span>
        </div>
      ),
    },
    {
      header: 'Placement',
      accessor: 'placementId',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-indigo-300">{row.placementId || 'PLC-N/A'}</span>,
    },
    {
      header: 'Period',
      accessor: 'periodEnding',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-slate-300">{row.periodEnding}</span>,
    },
    {
      header: 'Hours & Rate',
      accessor: 'payableHours',
      sortable: true,
      align: 'right',
      render: (row) => (
        <div className="text-right font-mono text-xs">
          <span className="font-semibold text-white">{(row.payableHours || 0).toFixed(1)} hrs</span>
          <span className="text-[10px] text-slate-400 block">${Number(row.payRate || 0).toFixed(2)}/hr</span>
        </div>
      ),
    },
    {
      header: 'Total Payable',
      accessor: 'totalAmount',
      sortable: true,
      align: 'right',
      render: (row) => <CurrencyDisplay value={row.totalAmount} className="font-bold text-white" />,
    },
    {
      header: 'Paid Amount',
      accessor: 'paidAmount',
      sortable: true,
      align: 'right',
      render: (row) => <CurrencyDisplay value={row.paidAmount || 0} className="text-slate-400 text-xs" />,
    },
    {
      header: 'Balance Due',
      accessor: 'balanceDue',
      sortable: true,
      align: 'right',
      render: (row) => {
        const bal = row.balanceDue !== undefined ? row.balanceDue : +(row.totalAmount - (row.paidAmount || 0)).toFixed(2);
        return (
          <CurrencyDisplay
            value={bal}
            className={bal > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}
          />
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      align: 'center',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Source Timesheet',
      accessor: 'sourceTimesheetId',
      sortable: true,
      render: (row) => (
        row.sourceTimesheetId ? (
          <span className="font-mono text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-white/5 font-semibold">
            {row.sourceTimesheetId}
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">Direct Bill</span>
        )
      ),
    },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => {
        const bal = row.balanceDue !== undefined ? row.balanceDue : +(row.totalAmount - (row.paidAmount || 0)).toFixed(2);
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setInspectBill(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect AP Bill"
            >
              <Icon name="eye" className="w-4 h-4" />
            </button>

            {bal > 0 && row.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => handleOpenDisbursement(row)}
                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition-all"
                title="Record ACH Disbursement"
              >
                Disburse
              </button>
            )}

            {row.paidAmount === 0 && row.status !== 'Paid' && (
              <button
                type="button"
                onClick={() => setVoidConfirmTarget(row)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Void Bill"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ─── Table Columns: Disbursements ─────────────────────────────
  const paymentColumns = [
    {
      header: 'Disbursement ID',
      accessor: 'id',
      sortable: true,
      render: (row) => <span className="font-mono font-bold text-indigo-400">{row.id}</span>,
    },
    {
      header: 'Reference',
      accessor: 'paymentReference',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-slate-300">{row.paymentReference}</span>,
    },
    {
      header: 'Vendor / Contractor',
      accessor: 'vendorName',
      sortable: true,
      render: (row) => <span className="font-semibold text-white">{row.vendorName}</span>,
    },
    {
      header: 'Bill Reference',
      accessor: 'billId',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-indigo-300">{row.billId}</span>,
    },
    { header: 'Disbursement Method', accessor: 'paymentMethod', sortable: true },
    {
      header: 'Date',
      accessor: 'paymentDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.paymentDate} format="short" />,
    },
    {
      header: 'Amount Disbursed',
      accessor: 'amount',
      sortable: true,
      align: 'right',
      render: (row) => <CurrencyDisplay value={row.amount} className="text-white font-bold" />,
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      align: 'center',
      render: (row) => <Badge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Payable (AP)"
        subtitle="Manage contractor vendor bills, review approval status, schedule disbursements, and track ACH runs."
        badge="Financials"
        actions={
          <div className="flex items-center gap-2">
            {unbilledApprovedTimesheets.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch(batchCreateApBills(unbilledApprovedTimesheets.map((t) => t.id)))}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/30 transition-colors"
                title="Batch generate bills for all eligible approved timesheets"
              >
                <Icon name="check" className="w-4 h-4 text-emerald-400" />
                Batch Generate Bills ({unbilledApprovedTimesheets.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPaymentTargetBill(null);
                setShowPaymentModal(true);
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
            >
              <Icon name="plus" className="w-4 h-4 text-emerald-400" />
              Disburse Payment
            </button>
            <button
              type="button"
              onClick={() => setShowCreateBillModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Icon name="plus" className="w-4 h-4" />
              New AP Bill
            </button>
          </div>
        }
      />

      {/* ─── Metric Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending AP Obligations"
          value={<CurrencyDisplay value={totalPayableBalance} />}
          change={`${openBillsCount} active bill(s) pending`}
          trend="neutral"
          icon="ap"
          accentColor="amber"
        />
        <StatCard
          label="Disbursed (MTD)"
          value={<CurrencyDisplay value={totalDisbursed} />}
          change={`${apPayments.length} disbursements issued`}
          trend="up"
          icon="check"
          accentColor="emerald"
        />
        <StatCard
          label="Overdue Obligations"
          value={overdueBillsCount > 0 ? `${overdueBillsCount} Overdue` : '$0.00'}
          change="Past payable due date"
          trend="down"
          icon="alert"
          accentColor="rose"
        />
        <StatCard
          label="Unbilled Approved Hours"
          value={`${unbilledApprovedTimesheets.length} Timecards`}
          change="Ready for bill generation"
          trend="neutral"
          icon="timesheets"
          accentColor="indigo"
        />
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'bills'
              ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="ap" className="w-3.5 h-3.5" />
          <span>Vendor & Contractor Bills</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full font-mono">
            {apBills.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('disbursements')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'disbursements'
              ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="income" className="w-3.5 h-3.5" />
          <span>ACH & Wire Disbursements</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full font-mono">
            {apPayments.length}
          </span>
        </button>
      </div>

      {/* ─── Filter Bar ────────────────────────────────────────── */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          ...(activeTab === 'bills'
            ? [
                {
                  key: 'status',
                  label: 'Status',
                  options: ['All', 'Approved', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
                  value: statusFilter,
                  onChange: setStatusFilter,
                },
              ]
            : []),
          {
            key: 'vendor',
            label: 'Vendor / Contractor',
            options: uniqueVendors,
            value: vendorFilter,
            onChange: setVendorFilter,
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setVendorFilter('All');
        }}
      />

      {/* ─── Table ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={activeTab === 'bills' ? billColumns : paymentColumns}
          data={activeTab === 'bills' ? filteredBills : filteredDisbursements}
          keyField="id"
          emptyTitle={activeTab === 'bills' ? 'No AP bills found' : 'No disbursements found'}
          emptyDescription="Generate AP bills from approved timesheets to establish payables."
        />
      </div>

      {/* ─── Modal 1: Create AP Bill Modal ─────────────────────── */}
      {showCreateBillModal && (
        <CreateApBillModal
          isOpen={true}
          timesheets={timesheets}
          apBills={apBills}
          contractors={contractors}
          placements={placements}
          onSaveSingle={(billData) => {
            dispatch(createApBillFromTimesheet(billData));
            setShowCreateBillModal(false);
          }}
          onSaveBatch={(tsIds) => {
            dispatch(batchCreateApBills(tsIds));
            setShowCreateBillModal(false);
          }}
          onClose={() => setShowCreateBillModal(false)}
        />
      )}

      {/* ─── Modal 2: AP Bill Detail Inspector ─────────────────── */}
      {inspectBill && (
        <ApBillDetailModal
          isOpen={true}
          bill={inspectBill}
          disbursements={apPayments.filter((p) => p.billId === inspectBill.id)}
          onRecordDisbursement={() => {
            const target = inspectBill;
            setInspectBill(null);
            handleOpenDisbursement(target);
          }}
          onNavigateToTimesheets={() => {
            setInspectBill(null);
            dispatch(setActiveView('timesheets'));
          }}
          onClose={() => setInspectBill(null)}
        />
      )}

      {/* ─── Modal 3: Record AP Disbursement Modal ─────────────── */}
      {showPaymentModal && (
        <RecordApPaymentModal
          isOpen={true}
          initialBill={paymentTargetBill}
          bills={apBills.filter((b) => (b.balanceDue > 0 || !b.balanceDue) && b.status !== 'Paid' && b.status !== 'Cancelled')}
          onSave={(paymentData) => {
            dispatch(recordApPayment(paymentData));
            setShowPaymentModal(false);
            setPaymentTargetBill(null);
          }}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentTargetBill(null);
          }}
        />
      )}

      {/* ─── Void Confirmation Dialog ──────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(voidConfirmTarget)}
        title="Void AP Bill?"
        message={`Are you sure you want to void ${voidConfirmTarget?.billNumber}? The linked approved timesheet will be released.`}
        confirmLabel="Void Bill"
        variant="danger"
        onConfirm={() => {
          if (voidConfirmTarget) {
            dispatch(voidApBill(voidConfirmTarget.id));
            setVoidConfirmTarget(null);
          }
        }}
        onCancel={() => setVoidConfirmTarget(null)}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Sub-Components: Modals
// ═══════════════════════════════════════════════════════════════

/**
 * CreateApBillModal — Generates AP bills from approved timesheets using Worker Cost = Payable Hours × Pay Rate.
 */
const CreateApBillModal = ({ isOpen, timesheets, apBills, placements, onSaveBatch, onClose }) => {
  const [selectedTsIds, setSelectedTsIds] = useState([]);
  const [search, setSearch] = useState('');

  const eligibleTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (ts.status !== 'Approved') return false;
      const existing = apBills.find((b) => b.sourceTimesheetId === ts.id || b.sourceId === ts.id);
      if (existing || ts.billId) return false;
      if (search) {
        const q = search.toLowerCase();
        const str = `${ts.id} ${ts.candidateName} ${ts.clientName} ${ts.placementId}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [timesheets, apBills, search]);

  const toggleSelect = (id) => {
    setSelectedTsIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedTsIds(eligibleTimesheets.map((t) => t.id));
  };

  const clearSelection = () => {
    setSelectedTsIds([]);
  };

  const selectedTotals = useMemo(() => {
    const selected = timesheets.filter((t) => selectedTsIds.includes(t.id));
    const totalCost = selected.reduce((sum, t) => sum + (t.totalPayable || (t.totalHours * t.payRate) || 0), 0);
    const totalHours = selected.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    return { count: selected.length, totalCost, totalHours };
  }, [selectedTsIds, timesheets]);

  const handleSubmit = () => {
    if (selectedTsIds.length === 0) return;
    onSaveBatch(selectedTsIds);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Contractor / Vendor AP Bills"
      subtitle="Generate accounts payable obligations from approved timesheets with calculated worker costs."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            {selectedTotals.count > 0 ? (
              <span>
                Selected <strong className="text-white">{selectedTotals.count}</strong> timesheet(s) • Total Payable Cost:{' '}
                <strong className="text-amber-400">${selectedTotals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ({selectedTotals.totalHours.toFixed(1)} hrs)
              </span>
            ) : (
              <span>Select approved consultant timesheets to generate accounts payable bills.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedTsIds.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Icon name="ap" className="w-4 h-4" />
              Generate AP Bills ({selectedTsIds.length})
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Formula Alert */}
        <Alert
          type="info"
          title="Worker Cost Calculation Rule"
          message="Worker Cost = Payable Hours × Pay Rate. Example: 16 hrs × $48 = $768. Unapproved timesheets and duplicate bills are strictly prevented."
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approved timesheets..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
              <Icon name="search" className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {eligibleTimesheets.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Select All ({eligibleTimesheets.length})
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-slate-400 hover:text-slate-300 font-medium"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Eligible Timesheet Table */}
        <div className="max-h-80 overflow-y-auto rounded-xl border border-white/5">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-white/5 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5 text-center w-8"></th>
                <th className="px-3 py-2.5 text-left">Timesheet ID</th>
                <th className="px-3 py-2.5 text-left">Consultant & Client</th>
                <th className="px-3 py-2.5 text-center">Period Ending</th>
                <th className="px-3 py-2.5 text-right">Payable Hours</th>
                <th className="px-3 py-2.5 text-right">Worker Pay Rate</th>
                <th className="px-3 py-2.5 text-right">Worker Cost Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {eligibleTimesheets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 text-xs">
                    No approved timesheets are currently pending AP bill generation.
                  </td>
                </tr>
              ) : (
                eligibleTimesheets.map((ts) => {
                  const isSelected = selectedTsIds.includes(ts.id);
                  const placement = placements.find((p) => p.id === ts.placementId);
                  const cost = calculateWorkerCost(ts, placement);

                  return (
                    <tr
                      key={ts.id}
                      onClick={() => toggleSelect(ts.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-600/15' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(ts.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-white block">{ts.id}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{ts.placementId}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-white block">{ts.candidateName}</span>
                        <span className="text-[11px] text-slate-400">{ts.clientName}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-slate-300">
                        {ts.periodEnding}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white">
                        {cost.payableHours.toFixed(1)} hrs
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">
                        ${cost.payRate.toFixed(2)}/hr
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono">
                          <span className="text-[10px] text-slate-400 block">{cost.payableHours}h × ${cost.payRate}</span>
                          <span className="font-bold text-amber-400">
                            ${cost.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

/**
 * ApBillDetailModal — Read-only inspector showing AP bill details, worker cost formula, and disbursement history.
 */
const ApBillDetailModal = ({ isOpen, bill, disbursements = [], onRecordDisbursement, onNavigateToTimesheets, onClose }) => {
  if (!bill) return null;
  const b = bill;
  const balance = b.balanceDue !== undefined ? b.balanceDue : +(b.totalAmount - (b.paidAmount || 0)).toFixed(2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AP Bill — ${b.billNumber || b.id}`}
      subtitle={`${b.vendorName} • Period Ending: ${b.periodEnding}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Badge status={b.status} />
          </div>
          <div className="flex items-center gap-2">
            {balance > 0 && b.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={onRecordDisbursement}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Icon name="income" className="w-3.5 h-3.5" />
                Disburse Payment
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ─── Worker Cost Formula Callout ─────────────────────── */}
        <div className="p-4 bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/30 rounded-2xl">
          <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider mb-1">
            Worker Cost Calculation Formula
          </p>
          <p className="text-base font-mono font-extrabold text-white">
            {b.formula || `${b.payableHours || 0} hrs × $${b.payRate || 0} = $${(b.totalAmount || 0).toLocaleString()}`}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Worker Cost = Payable Hours × Pay Rate. Example: 16 hrs × $48 = $768.
          </p>
        </div>

        {/* ─── Header Info Grid ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Vendor / Worker</span>
            <span className="font-semibold text-white">{b.vendorName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Due Date</span>
            <span className="font-mono text-white">{b.dueDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Total Payable</span>
            <CurrencyDisplay value={b.totalAmount} className="font-bold text-white" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Remaining Balance</span>
            <CurrencyDisplay
              value={balance}
              className={balance > 0 ? 'font-extrabold text-amber-400' : 'font-bold text-slate-500'}
            />
          </div>
        </div>

        {/* ─── Hours & Rate Breakdown Table ────────────────────── */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white">Hours & Rate Breakdown</h4>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Pay Rate</th>
                  <th className="px-3 py-2 text-right">Payable Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-3 py-2 font-semibold text-white">Regular Hours</td>
                  <td className="px-3 py-2 text-right font-mono">{(b.regularHours || b.payableHours || 0).toFixed(1)} hrs</td>
                  <td className="px-3 py-2 text-right font-mono">${(b.regularPayRate || b.payRate || 0).toFixed(2)}/hr</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                    <CurrencyDisplay value={b.regularCost || b.totalAmount} />
                  </td>
                </tr>
                {b.overtimeHours > 0 && (
                  <tr className="bg-amber-500/5">
                    <td className="px-3 py-2 font-semibold text-amber-300">Overtime Hours</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">{(b.overtimeHours || 0).toFixed(1)} hrs</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">${(b.overtimePayRate || b.payRate || 0).toFixed(2)}/hr</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-amber-400">
                      <CurrencyDisplay value={b.overtimeCost || 0} />
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-indigo-500/30 bg-slate-800/80 font-bold">
                  <td className="px-3 py-2 text-white">Total Payable Cost:</td>
                  <td className="px-3 py-2 text-right font-mono text-white">{(b.payableHours || 0).toFixed(1)} hrs</td>
                  <td className="px-3 py-2 text-right text-slate-400 text-[10px]">Net</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-400 text-sm">
                    <CurrencyDisplay value={b.totalAmount} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ─── Source Timesheet Traceability ───────────────────── */}
        {b.sourceTimesheetId && (
          <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Source Approved Timesheet</span>
              <span className="font-mono text-xs font-bold text-indigo-400">{b.sourceTimesheetId}</span>
            </div>
            <button
              type="button"
              onClick={onNavigateToTimesheets}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>View Timesheet</span>
              <Icon name="externalLink" className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── Disbursements Applied ───────────────────────────── */}
        {disbursements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white">Disbursements Applied</h4>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Disbursement ID</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-center">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {disbursements.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-400">{d.id}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{d.paymentReference}</td>
                      <td className="px-3 py-2 text-slate-300">{d.paymentMethod}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-400">{d.paymentDate}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        <CurrencyDisplay value={d.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

/**
 * RecordApPaymentModal — Disburses funds against an open AP bill with balance limit controls.
 */
const RecordApPaymentModal = ({ isOpen, initialBill, bills = [], onSave, onClose }) => {
  const [selectedBillId, setSelectedBillId] = useState(initialBill?.id || bills[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('ACH Credit');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const selectedBill = bills.find((b) => b.id === selectedBillId) || initialBill;
  const balanceDue = selectedBill ? (selectedBill.balanceDue !== undefined ? selectedBill.balanceDue : +(selectedBill.totalAmount - (selectedBill.paidAmount || 0)).toFixed(2)) : 0;

  const handleFillFullBalance = () => {
    if (balanceDue > 0) {
      setAmount(balanceDue.toString());
      setError(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBill) {
      setError('Please select an AP bill.');
      return;
    }

    const numAmount = parseFloat(amount);
    const validation = validateAPPayment(selectedBill, numAmount);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    onSave({
      billId: selectedBill.id,
      amount: numAmount,
      paymentDate,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record AP Disbursement"
      subtitle="Issue vendor/contractor payment settlement via ACH Credit or Wire Transfer."
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
          >
            Issue Disbursement
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Disbursement Blocked" message={error} />}

        <FormField label="Target AP Bill" required>
          <select
            value={selectedBillId}
            onChange={(e) => {
              setSelectedBillId(e.target.value);
              setError(null);
            }}
            disabled={Boolean(initialBill)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                {b.billNumber} — {b.vendorName} (Bal: ${b.balanceDue?.toLocaleString() || (b.totalAmount - (b.paidAmount || 0)).toLocaleString()})
              </option>
            ))}
          </select>
        </FormField>

        {selectedBill && (
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total</span>
              <CurrencyDisplay value={selectedBill.totalAmount} className="font-bold text-white" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Paid</span>
              <CurrencyDisplay value={selectedBill.paidAmount || 0} className="font-semibold text-slate-300" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Balance Due</span>
              <CurrencyDisplay value={balanceDue} className="font-extrabold text-amber-400" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Disbursement Amount ($)" required>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-16 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">$</div>
              <button
                type="button"
                onClick={handleFillFullBalance}
                className="absolute inset-y-1 right-1 px-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded"
              >
                Pay Full
              </button>
            </div>
          </FormField>

          <FormField label="Disbursement Date" required>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Payment Method" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ACH Credit">ACH Credit</option>
              <option value="Wire Transfer">Wire Transfer</option>
              <option value="Check">Check / Paper Voucher</option>
              <option value="Direct Deposit">Direct Deposit</option>
            </select>
          </FormField>

          <FormField label="Disbursement Reference #">
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. ACH-DISB-99201"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>

        <FormField label="Remittance Advice / Notes">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Batch run approved by controller"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </FormField>
      </form>
    </Modal>
  );
};
