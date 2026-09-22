import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Badge } from '../components/common/Badge';
import { CurrencyDisplay, DateDisplay } from '../components/common/Formatters';
import { StatCard } from '../components/common/Card';
import { ConfirmDialog } from '../components/common/Modal';
import { Icon } from '../components/common/Icons';
import {
  createInvoice,
  recordArPayment,
  voidInvoice,
} from '../store/dataSlice';
import {
  CreateInvoiceModal,
  InvoiceDetailModal,
  RecordArPaymentModal,
} from '../components/invoices/InvoiceModals';

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

// Re-export shared modals for backwards compatibility
export { CreateInvoiceModal, InvoiceDetailModal, RecordArPaymentModal } from '../components/invoices/InvoiceModals';
export default AccountsReceivableView;
