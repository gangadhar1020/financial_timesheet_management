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
  createInvoice,
  recordArPayment,
  voidInvoice,
} from '../store/dataSlice';
import {
  calculateInvoiceTotals,
  validateARPayment,
} from '../utils/accountingEngine';

/**
 * AccountsReceivableView Component
 *
 * @purpose Full lifecycle Accounts Receivable management: create invoices from eligible income,
 * monitor aging buckets, record client payments, prevent excessive payments, and track real-time balances.
 */
export const AccountsReceivableView = () => {
  const dispatch = useDispatch();
  const { invoices, arPayments, income, clients } = useSelector((state) => state.data);

  // ─── Tab & Filter State ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');

  // ─── Modal States ─────────────────────────────────────────────
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [inspectInvoice, setInspectInvoice] = useState(null);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState(null);
  const [voidConfirmTarget, setVoidConfirmTarget] = useState(null);

  // ─── Financial KPI Aggregations ───────────────────────────────
  const totalOutstanding = invoices.reduce((acc, curr) => acc + (curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0))), 0);
  const overdueAmount = invoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((acc, curr) => acc + (curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0))), 0);
  const totalCollected = arPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const openInvoicesCount = invoices.filter((inv) => inv.status === 'Open' || inv.status === 'Partially Paid' || inv.status === 'Overdue').length;

  // ─── Unique Filter Options ────────────────────────────────────
  const uniqueClients = useMemo(() => {
    const names = [...new Set(invoices.map((inv) => inv.clientName).filter(Boolean))];
    return ['All', ...names.sort()];
  }, [invoices]);

  // ─── Filtering Invoices ───────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      const matchesClient = clientFilter === 'All' || inv.clientName === clientFilter;
      const q = searchQuery.toLowerCase();
      const targetStr = `${inv.invoiceNumber} ${inv.clientName} ${inv.id}`.toLowerCase();
      const matchesSearch = !searchQuery || targetStr.includes(q);
      return matchesStatus && matchesClient && matchesSearch;
    });
  }, [invoices, statusFilter, clientFilter, searchQuery]);

  // ─── Filtering Payments ───────────────────────────────────────
  const filteredPayments = useMemo(() => {
    return arPayments.filter((pay) => {
      const matchesClient = clientFilter === 'All' || pay.clientName === clientFilter;
      const q = searchQuery.toLowerCase();
      const targetStr = `${pay.id} ${pay.paymentReference} ${pay.clientName} ${pay.invoiceNumber || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || targetStr.includes(q);
      return matchesClient && matchesSearch;
    });
  }, [arPayments, clientFilter, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleOpenPayment = (invoice) => {
    setPaymentTargetInvoice(invoice);
    setShowPaymentModal(true);
  };

  // ─── Table Columns: Invoices ──────────────────────────────────
  const invoiceColumns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setInspectInvoice(row)}
          className="font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline text-left block"
          title="View Invoice Document"
        >
          {row.invoiceNumber}
        </button>
      ),
    },
    {
      header: 'Client Account',
      accessor: 'clientName',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.clientName}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.clientId}</span>
        </div>
      ),
    },
    {
      header: 'Issue Date',
      accessor: 'issueDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.issueDate} format="short" />,
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.dueDate} format="short" />,
    },
    {
      header: 'Total Amount',
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
        const bal = row.balanceDue !== undefined ? row.balanceDue : row.totalAmount - (row.paidAmount || 0);
        return (
          <CurrencyDisplay
            value={bal}
            className={bal > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}
          />
        );
      },
    },
    {
      header: 'Aging Bucket',
      accessor: 'agingBucket',
      sortable: true,
      render: (row) => (
        <span className={`text-xs font-semibold ${row.agingBucket === 'Current' ? 'text-slate-300' : 'text-rose-400'}`}>
          {row.agingBucket || 'Current'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      align: 'center',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => {
        const bal = row.balanceDue !== undefined ? row.balanceDue : row.totalAmount - (row.paidAmount || 0);
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setInspectInvoice(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect Invoice"
            >
              <Icon name="eye" className="w-4 h-4" />
            </button>

            {bal > 0 && row.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => handleOpenPayment(row)}
                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition-all"
                title="Record Payment Receipt"
              >
                Pay
              </button>
            )}

            {row.paidAmount === 0 && row.status !== 'Paid' && (
              <button
                type="button"
                onClick={() => setVoidConfirmTarget(row)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Void Invoice"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ─── Table Columns: Payments ──────────────────────────────────
  const paymentColumns = [
    {
      header: 'Payment ID',
      accessor: 'id',
      sortable: true,
      render: (row) => <span className="font-mono font-bold text-indigo-400">{row.id}</span>,
    },
    {
      header: 'Reference #',
      accessor: 'paymentReference',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-slate-300">{row.paymentReference}</span>,
    },
    {
      header: 'Client Account',
      accessor: 'clientName',
      sortable: true,
      render: (row) => <span className="font-semibold text-white">{row.clientName}</span>,
    },
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-indigo-300 font-semibold">
          {row.invoiceNumber || row.invoiceId || 'Prepayment'}
        </span>
      ),
    },
    { header: 'Payment Method', accessor: 'paymentMethod', sortable: true },
    {
      header: 'Payment Date',
      accessor: 'paymentDate',
      sortable: true,
      render: (row) => <DateDisplay date={row.paymentDate} format="short" />,
    },
    {
      header: 'Amount Received',
      accessor: 'amount',
      sortable: true,
      align: 'right',
      render: (row) => <CurrencyDisplay value={row.amount} className="text-emerald-400 font-bold" />,
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
        title="Accounts Receivable (AR)"
        subtitle="Customer invoice creation from recognized revenue, payment matching, aging buckets, and outstanding balance tracking."
        badge="Financials"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentTargetInvoice(null);
                setShowPaymentModal(true);
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
            >
              <Icon name="plus" className="w-4 h-4 text-emerald-400" />
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => setShowCreateInvoiceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Icon name="plus" className="w-4 h-4" />
              New Invoice
            </button>
          </div>
        }
      />

      {/* ─── Metric Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Outstanding Balance"
          value={<CurrencyDisplay value={totalOutstanding} />}
          change={`${openInvoicesCount} open invoice(s)`}
          trend="neutral"
          icon="ar"
          accentColor="indigo"
        />
        <StatCard
          label="Overdue Balances"
          value={<CurrencyDisplay value={overdueAmount} />}
          change="Past payment due date"
          trend="down"
          icon="alert"
          accentColor="amber"
        />
        <StatCard
          label="Payments Collected"
          value={<CurrencyDisplay value={totalCollected} />}
          change={`${arPayments.length} receipts cleared`}
          trend="up"
          icon="income"
          accentColor="emerald"
        />
        <StatCard
          label="Total Invoiced"
          value={<CurrencyDisplay value={invoices.reduce((sum, i) => sum + i.totalAmount, 0)} />}
          change={`${invoices.length} historical invoices`}
          trend="up"
          icon="reports"
          accentColor="purple"
        />
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'invoices'
              ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="ar" className="w-3.5 h-3.5" />
          <span>Customer Invoices</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full font-mono">
            {invoices.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'payments'
              ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="income" className="w-3.5 h-3.5" />
          <span>Payment Receipts</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full font-mono">
            {arPayments.length}
          </span>
        </button>
      </div>

      {/* ─── Filter Bar ────────────────────────────────────────── */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          ...(activeTab === 'invoices'
            ? [
                {
                  key: 'status',
                  label: 'Status',
                  options: ['All', 'Open', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
                  value: statusFilter,
                  onChange: setStatusFilter,
                },
              ]
            : []),
          {
            key: 'client',
            label: 'Client',
            options: uniqueClients,
            value: clientFilter,
            onChange: setClientFilter,
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('All');
          setClientFilter('All');
        }}
      />

      {/* ─── Table ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={activeTab === 'invoices' ? invoiceColumns : paymentColumns}
          data={activeTab === 'invoices' ? filteredInvoices : filteredPayments}
          keyField="id"
          emptyTitle={activeTab === 'invoices' ? 'No invoices found' : 'No payments found'}
          emptyDescription="Try adjusting your filters or generate a new invoice."
        />
      </div>

      {/* ─── Modal 1: Create Invoice Modal ─────────────────────── */}
      {showCreateInvoiceModal && (
        <CreateInvoiceModal
          isOpen={true}
          clients={clients}
          income={income}
          onSave={(invoiceData) => {
            dispatch(createInvoice(invoiceData));
            setShowCreateInvoiceModal(false);
          }}
          onClose={() => setShowCreateInvoiceModal(false)}
        />
      )}

      {/* ─── Modal 2: Invoice Detail Inspector ─────────────────── */}
      {inspectInvoice && (
        <InvoiceDetailModal
          isOpen={true}
          invoice={inspectInvoice}
          payments={arPayments.filter((p) => p.invoiceId === inspectInvoice.id)}
          onRecordPayment={() => {
            const target = inspectInvoice;
            setInspectInvoice(null);
            handleOpenPayment(target);
          }}
          onClose={() => setInspectInvoice(null)}
        />
      )}

      {/* ─── Modal 3: Record AR Payment Modal ──────────────────── */}
      {showPaymentModal && (
        <RecordArPaymentModal
          isOpen={true}
          initialInvoice={paymentTargetInvoice}
          invoices={invoices.filter((inv) => (inv.balanceDue > 0 || !inv.balanceDue) && inv.status !== 'Cancelled' && inv.status !== 'Paid')}
          onSave={(paymentData) => {
            dispatch(recordArPayment(paymentData));
            setShowPaymentModal(false);
            setPaymentTargetInvoice(null);
          }}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentTargetInvoice(null);
          }}
        />
      )}

      {/* ─── Void Confirmation Dialog ──────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(voidConfirmTarget)}
        title="Void Invoice?"
        message={`Are you sure you want to void ${voidConfirmTarget?.invoiceNumber}? Any attached income records will be released back to Unbilled status.`}
        confirmLabel="Void Invoice"
        variant="danger"
        onConfirm={() => {
          if (voidConfirmTarget) {
            dispatch(voidInvoice(voidConfirmTarget.id));
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
 * CreateInvoiceModal — Generates invoice by selecting eligible income records for a client.
 */
const CreateInvoiceModal = ({ isOpen, clients, income, onSave, onClose }) => {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedIncomeIds, setSelectedIncomeIds] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(30); // Net 30 default
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  // Eligible income records for selected client: status is 'Unbilled' or 'Recognized', not yet invoiced
  const clientEligibleIncome = useMemo(() => {
    if (!selectedClientId) return [];
    return income.filter((inc) => {
      if (inc.clientId !== selectedClientId) return false;
      if (inc.status === 'Invoiced' || inc.invoiceId) return false;
      if (inc.status === 'Unapproved' || inc.status === 'Draft') return false;
      return true;
    });
  }, [income, selectedClientId]);

  // Selected income objects
  const selectedIncomeObjects = useMemo(() => {
    return income.filter((i) => selectedIncomeIds.includes(i.id));
  }, [income, selectedIncomeIds]);

  // Projected line items & totals
  const lineItems = useMemo(() => {
    return selectedIncomeObjects.map((inc) => ({
      quantity: inc.billableHours || inc.totalHours || 1,
      rate: inc.billingRate || inc.rate || inc.amount,
      amount: inc.amount || inc.totalIncome || 0,
    }));
  }, [selectedIncomeObjects]);

  const totals = useMemo(() => {
    return calculateInvoiceTotals(lineItems, taxRate, 0);
  }, [lineItems, taxRate]);

  // Calculate Due Date based on issueDate + paymentTerms
  const calculatedDueDate = useMemo(() => {
    if (!issueDate) return '';
    const d = new Date(issueDate);
    d.setDate(d.getDate() + parseInt(paymentTerms, 10));
    return d.toISOString().split('T')[0];
  }, [issueDate, paymentTerms]);

  const handleToggleIncome = (incId) => {
    setSelectedIncomeIds((prev) =>
      prev.includes(incId) ? prev.filter((id) => id !== incId) : [...prev, incId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIncomeIds(clientEligibleIncome.map((i) => i.id));
  };

  const handleClearSelection = () => {
    setSelectedIncomeIds([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Please select a client account.');
      return;
    }
    if (selectedIncomeIds.length === 0) {
      setError('Please select at least one eligible income record to invoice.');
      return;
    }

    onSave({
      clientId: selectedClientId,
      invoiceNumber: customInvoiceNumber.trim() || undefined,
      issueDate,
      dueDate: calculatedDueDate,
      incomeIds: selectedIncomeIds,
      taxRate: parseFloat(taxRate) || 0,
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Client Invoice"
      subtitle="Bundle approved recognized income records into an Accounts Receivable invoice."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            {selectedIncomeIds.length > 0 ? (
              <span>
                <strong className="text-white">{selectedIncomeIds.length}</strong> income record(s) selected • Invoice Total:{' '}
                <strong className="text-emerald-400">${totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            ) : (
              <span>Select income records below to generate the invoice total.</span>
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
              disabled={selectedIncomeIds.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Icon name="check" className="w-4 h-4" />
              Generate Invoice
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Validation Error" message={error} />}

        {/* ─── Client & Dates Row ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Client Account" required>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedIncomeIds([]);
                setError(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Issue Date" required>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </FormField>

          <FormField label="Payment Terms">
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="15">Net 15 (Due: {new Date(new Date(issueDate).getTime() + 15 * 86400000).toISOString().split('T')[0]})</option>
              <option value="30">Net 30 (Due: {new Date(new Date(issueDate).getTime() + 30 * 86400000).toISOString().split('T')[0]})</option>
              <option value="45">Net 45 (Due: {new Date(new Date(issueDate).getTime() + 45 * 86400000).toISOString().split('T')[0]})</option>
              <option value="60">Net 60 (Due: {new Date(new Date(issueDate).getTime() + 60 * 86400000).toISOString().split('T')[0]})</option>
            </select>
          </FormField>
        </div>

        {/* ─── Income Records Selector ─────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Eligible Unbilled Income Records</span>
              <span className="text-[10px] text-indigo-400 font-mono">({clientEligibleIncome.length} available)</span>
            </label>
            {clientEligibleIncome.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Select All
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[11px] text-slate-400 hover:text-slate-300 font-medium"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-white/5">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-white/5 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-center w-8"></th>
                  <th className="px-3 py-2 text-left">Income ID</th>
                  <th className="px-3 py-2 text-left">Consultant & Assignment</th>
                  <th className="px-3 py-2 text-center">Period</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientEligibleIncome.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-500 text-xs">
                      No unbilled income records available for this client. Generate income from approved timesheets first.
                    </td>
                  </tr>
                ) : (
                  clientEligibleIncome.map((inc) => {
                    const isSelected = selectedIncomeIds.includes(inc.id);
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => handleToggleIncome(inc.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-600/15' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleIncome(inc.id)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-white">{inc.id}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-white block">{inc.employeeName}</span>
                          <span className="text-[10px] text-slate-400">{inc.jobTitle}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-300">
                          {inc.periodEnding || inc.period}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-white">
                          {(inc.billableHours || inc.totalHours || 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          ${(inc.billingRate || inc.rate || 0).toFixed(2)}/hr
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                          ${(inc.amount || inc.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Financial Totals Summary ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/60 rounded-xl border border-white/5 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Subtotal</p>
            <CurrencyDisplay value={totals.subtotal} className="text-sm font-bold text-white" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Tax Rate (%)</p>
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-16 mx-auto bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-center text-xs text-white font-mono"
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Tax Amount</p>
            <CurrencyDisplay value={totals.taxAmount} className="text-sm font-bold text-slate-300" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total Invoice</p>
            <CurrencyDisplay value={totals.totalAmount} className="text-base font-extrabold text-emerald-400" />
          </div>
        </div>

        {/* ─── Notes / Optional Number ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Custom Invoice # (Optional)" helperText="Leave blank for automatic sequential numbering.">
            <input
              type="text"
              value={customInvoiceNumber}
              onChange={(e) => setCustomInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-0901"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </FormField>
          <FormField label="Internal Notes / Remittance Terms">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wire remittance details or purchase order number"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
};

/**
 * InvoiceDetailModal — Read-only document view of invoice with line items and payment history.
 */
const InvoiceDetailModal = ({ isOpen, invoice, payments = [], onRecordPayment, onClose }) => {
  if (!invoice) return null;
  const inv = invoice;
  const balance = inv.balanceDue !== undefined ? inv.balanceDue : +(inv.totalAmount - (inv.paidAmount || 0)).toFixed(2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${inv.invoiceNumber || inv.id}`}
      subtitle={`${inv.clientName} • Issue Date: ${inv.issueDate}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Badge status={inv.status} />
            <span className="text-xs text-slate-400">Aging: <strong className="text-white">{inv.agingBucket || 'Current'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {balance > 0 && inv.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={onRecordPayment}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Icon name="income" className="w-3.5 h-3.5" />
                Record Payment
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
        {/* ─── Header Info Grid ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Client Account</span>
            <span className="font-semibold text-white">{inv.clientName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Due Date</span>
            <span className="font-mono text-white">{inv.dueDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Total Invoiced</span>
            <CurrencyDisplay value={inv.totalAmount} className="font-bold text-white" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Balance Due</span>
            <CurrencyDisplay
              value={balance}
              className={balance > 0 ? 'font-extrabold text-amber-400' : 'font-bold text-slate-500'}
            />
          </div>
        </div>

        {/* ─── Line Items Table ────────────────────────────────── */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white">Itemized Invoice Lines</h4>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Income Ref</th>
                  <th className="px-3 py-2 text-right">Hours / Qty</th>
                  <th className="px-3 py-2 text-right">Billing Rate</th>
                  <th className="px-3 py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(inv.lineItems && inv.lineItems.length > 0) ? (
                  inv.lineItems.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium text-white">{line.description}</td>
                      <td className="px-3 py-2 text-center font-mono text-indigo-400">{line.incomeId || 'Direct'}</td>
                      <td className="px-3 py-2 text-right font-mono">{line.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">${Number(line.rate).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                        <CurrencyDisplay value={line.amount} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-3 py-3 text-center text-slate-500">
                      Standard consulting billing services.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-slate-900/80 font-semibold">
                  <td colSpan="4" className="px-3 py-1.5 text-right text-slate-400 text-xs">Subtotal:</td>
                  <td className="px-3 py-1.5 text-right font-mono text-white"><CurrencyDisplay value={inv.subtotal || inv.totalAmount} /></td>
                </tr>
                {inv.taxAmount > 0 && (
                  <tr className="bg-slate-900/80 font-semibold">
                    <td colSpan="4" className="px-3 py-1 text-right text-slate-400 text-xs">Tax ({inv.taxRate}%):</td>
                    <td className="px-3 py-1 text-right font-mono text-slate-300"><CurrencyDisplay value={inv.taxAmount} /></td>
                  </tr>
                )}
                <tr className="border-t border-indigo-500/30 bg-slate-800/80 font-extrabold text-sm">
                  <td colSpan="4" className="px-3 py-2 text-right text-white">Total Amount:</td>
                  <td className="px-3 py-2 text-right font-mono text-white"><CurrencyDisplay value={inv.totalAmount} /></td>
                </tr>
                <tr className="bg-slate-900/80">
                  <td colSpan="4" className="px-3 py-1.5 text-right text-slate-400 text-xs">Amount Paid:</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-400 font-bold"><CurrencyDisplay value={inv.paidAmount || 0} /></td>
                </tr>
                <tr className="border-t-2 border-amber-500/30 bg-slate-900 font-extrabold text-sm">
                  <td colSpan="4" className="px-3 py-2 text-right text-amber-300">Remaining Balance:</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-400"><CurrencyDisplay value={balance} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ─── Payments Applied History ────────────────────────── */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white">Payment Receipts Applied</h4>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Payment ID</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-center">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-400">{p.id}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{p.paymentReference}</td>
                      <td className="px-3 py-2 text-slate-300">{p.paymentMethod}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-400">{p.paymentDate}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        <CurrencyDisplay value={p.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Notes ───────────────────────────────────────────── */}
        {inv.notes && (
          <div className="p-3 bg-slate-800/30 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-400 uppercase mb-0.5">Notes & Terms</p>
            <p className="text-xs text-slate-300">{inv.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

/**
 * RecordArPaymentModal — Records payment receipt against an invoice with excessive payment prevention.
 */
const RecordArPaymentModal = ({ isOpen, initialInvoice, invoices = [], onSave, onClose }) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoice?.id || invoices[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Wire Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || initialInvoice;
  const balanceDue = selectedInvoice ? (selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : +(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toFixed(2)) : 0;

  const handleFillFullBalance = () => {
    if (balanceDue > 0) {
      setAmount(balanceDue.toString());
      setError(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedInvoice) {
      setError('Please select an invoice.');
      return;
    }

    const numAmount = parseFloat(amount);
    const validation = validateARPayment(selectedInvoice, numAmount);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    onSave({
      invoiceId: selectedInvoice.id,
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
      title="Record Client Payment"
      subtitle="Apply incoming wire, ACH, or check settlement against an open client invoice."
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
            Record Payment Receipt
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Payment Blocked" message={error} />}

        <FormField label="Target Invoice" required>
          <select
            value={selectedInvoiceId}
            onChange={(e) => {
              setSelectedInvoiceId(e.target.value);
              setError(null);
            }}
            disabled={Boolean(initialInvoice)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.clientName} (Bal: ${inv.balanceDue?.toLocaleString() || (inv.totalAmount - (inv.paidAmount || 0)).toLocaleString()})
              </option>
            ))}
          </select>
        </FormField>

        {selectedInvoice && (
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total</span>
              <CurrencyDisplay value={selectedInvoice.totalAmount} className="font-bold text-white" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Paid So Far</span>
              <CurrencyDisplay value={selectedInvoice.paidAmount || 0} className="font-semibold text-slate-300" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Balance Due</span>
              <CurrencyDisplay value={balanceDue} className="font-extrabold text-amber-400" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Payment Amount ($)" required>
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

          <FormField label="Payment Date" required>
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
              <option value="Wire Transfer">Wire Transfer</option>
              <option value="ACH Credit">ACH Credit</option>
              <option value="Check">Check / Lockbox</option>
              <option value="Credit Card">Credit Card</option>
              <option value="EFT / Direct Deposit">EFT / Direct Deposit</option>
            </select>
          </FormField>

          <FormField label="Payment Reference / Trace #">
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. ACH-WIRE-99211"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>

        <FormField label="Notes / Remittance Advice">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cleared via Silicon Valley Bank batch #401"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </FormField>
      </form>
    </Modal>
  );
};
