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
  setActiveView,
} from '../store/dataSlice';
import {
  CreateInvoiceModal,
  InvoiceDetailModal,
  RecordArPaymentModal,
} from '../components/invoices/InvoiceModals';

/**
 * InvoicesView Component
 *
 * @purpose Enterprise Invoices Management Module.
 * Connects directly into the core financial lifecycle:
 * Approved Timesheets -> Income / Revenue -> Invoices -> Receivables -> Payments
 */
export const InvoicesView = () => {
  const dispatch = useDispatch();
  const { invoices, arPayments, income, clients } = useSelector((state) => state.data);

  // ─── Filter States ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');

  // ─── Modal States ─────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [inspectInvoice, setInspectInvoice] = useState(null);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState(null);
  const [voidConfirmTarget, setVoidConfirmTarget] = useState(null);

  // ─── Financial KPI Calculations ───────────────────────────────
  const totalInvoiced = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  }, [invoices]);

  const totalOutstanding = useMemo(() => {
    return invoices.reduce((acc, curr) => {
      const bal = curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0));
      return acc + (bal > 0 ? bal : 0);
    }, 0);
  }, [invoices]);

  const totalCollected = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  }, [invoices]);

  const overdueSummary = useMemo(() => {
    const overdueList = invoices.filter((inv) => inv.status === 'Overdue');
    const amount = overdueList.reduce((acc, curr) => {
      const bal = curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0));
      return acc + bal;
    }, 0);
    return { count: overdueList.length, amount };
  }, [invoices]);

  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : 0;

  // ─── Unique Client Options for Filter ─────────────────────────
  const uniqueClients = useMemo(() => {
    const names = [...new Set(invoices.map((inv) => inv.clientName).filter(Boolean))];
    return ['All', ...names.sort()];
  }, [invoices]);

  // ─── Filtered Invoices List ───────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      const matchesClient = clientFilter === 'All' || inv.clientName === clientFilter;

      const q = searchQuery.toLowerCase();
      const lineDesc = (inv.lineItems || []).map((l) => l.description).join(' ');
      const targetStr = `${inv.invoiceNumber || ''} ${inv.id || ''} ${inv.clientName || ''} ${inv.clientId || ''} ${lineDesc} ${inv.notes || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || targetStr.includes(q);

      return matchesStatus && matchesClient && matchesSearch;
    });
  }, [invoices, statusFilter, clientFilter, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleOpenPayment = (invoice) => {
    setPaymentTargetInvoice(invoice);
    setShowPaymentModal(true);
  };

  // ─── Table Columns ────────────────────────────────────────────
  const invoiceColumns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setInspectInvoice(row)}
          className="font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 text-left"
          title="Inspect Invoice Document & Traceability"
        >
          <Icon name="invoices" className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          <span>{row.invoiceNumber || row.id}</span>
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
      render: (row) => {
        const isOverdue = row.status === 'Overdue';
        return (
          <div className="flex items-center gap-1.5">
            <DateDisplay date={row.dueDate} format="short" />
            {isOverdue && (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1 rounded">
                Overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total Amount',
      accessor: 'totalAmount',
      sortable: true,
      align: 'right',
      render: (row) => <CurrencyDisplay value={row.totalAmount} className="font-bold text-white" />,
    },
    {
      header: 'Amount Paid',
      accessor: 'paidAmount',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-emerald-400 font-semibold">
          <CurrencyDisplay value={row.paidAmount || 0} />
        </span>
      ),
    },
    {
      header: 'Outstanding Balance',
      accessor: 'balanceDue',
      sortable: true,
      align: 'right',
      render: (row) => {
        const bal = row.balanceDue !== undefined ? row.balanceDue : +(row.totalAmount - (row.paidAmount || 0)).toFixed(2);
        return (
          <span className={`font-mono font-extrabold ${bal > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
            <CurrencyDisplay value={bal} />
          </span>
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
      header: 'Actions',
      align: 'center',
      render: (row) => {
        const bal = row.balanceDue !== undefined ? row.balanceDue : +(row.totalAmount - (row.paidAmount || 0)).toFixed(2);
        const canPay = bal > 0 && row.status !== 'Cancelled';
        const canVoid = row.status === 'Open' && (row.paidAmount || 0) === 0;

        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setInspectInvoice(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect Invoice & Traceability"
            >
              <Icon name="eye" className="w-4 h-4" />
            </button>

            {canPay && (
              <button
                type="button"
                onClick={() => handleOpenPayment(row)}
                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-semibold rounded-lg transition-all"
                title="Record Client Payment Receipt"
              >
                Pay
              </button>
            )}

            {canVoid && (
              <button
                type="button"
                onClick={() => setVoidConfirmTarget(row)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Void Invoice"
              >
                <Icon name="close" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Page Header ────────────────────────────────────────── */}
      <PageHeader
        title="Client Invoices"
        subtitle="Generate customer billing invoices from approved revenue records, trace timecards and placements, track outstanding balances, and synchronize with Accounts Receivable."
        badge={`${filteredInvoices.length} Invoices`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(setActiveView('ar'))}
              className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-white/5 transition-all flex items-center gap-1.5"
            >
              <Icon name="ar" className="w-4 h-4 text-indigo-400" />
              <span>Receivables Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          </div>
        }
      />

      {/* ─── Financial Executive StatCards ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={<CurrencyDisplay value={totalInvoiced} />}
          change={`${invoices.length} historical invoice(s)`}
          isPositive={true}
          icon="invoices"
        />
        <StatCard
          title="Outstanding Receivables"
          value={<CurrencyDisplay value={totalOutstanding} />}
          change={`${invoices.filter((i) => i.balanceDue > 0 || (i.totalAmount - (i.paidAmount || 0)) > 0).length} open balances`}
          isPositive={totalOutstanding === 0}
          icon="ar"
        />
        <StatCard
          title="Collected Revenue"
          value={<CurrencyDisplay value={totalCollected} />}
          change={`${collectionRate}% settlement rate`}
          isPositive={true}
          icon="income"
        />
        <StatCard
          title="Overdue Invoices"
          value={<CurrencyDisplay value={overdueSummary.amount} />}
          change={`${overdueSummary.count} past due invoice(s)`}
          isPositive={overdueSummary.count === 0}
          icon="alert"
        />
      </div>

      {/* ─── Filters & Search ──────────────────────────────────── */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['All', 'Open', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: 'client',
            label: 'Client Account',
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

      {/* ─── Master Invoices Table ─────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={invoiceColumns}
          data={filteredInvoices}
          emptyTitle="No invoices found"
          emptySubtitle="Create a new client invoice from eligible recognized income records or adjust filter criteria."
          onRowClick={(row) => setInspectInvoice(row)}
        />
      </div>

      {/* ─── Modal 1: Create Invoice Modal ─────────────────────── */}
      {showCreateModal && (
        <CreateInvoiceModal
          isOpen={true}
          clients={clients}
          income={income}
          onSave={(invoiceData) => {
            dispatch(createInvoice(invoiceData));
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* ─── Modal 2: Invoice Detail Modal with Traceability ────── */}
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

      {/* ─── Modal 3: Record Payment Modal ─────────────────────── */}
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

      {/* ─── Modal 4: Void Confirmation Dialog ─────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(voidConfirmTarget)}
        title="Void Invoice?"
        message={`Are you sure you want to void ${voidConfirmTarget?.invoiceNumber || voidConfirmTarget?.id}? Any attached income records will be released back to Unbilled status.`}
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

export default InvoicesView;
