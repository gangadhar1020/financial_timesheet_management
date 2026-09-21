import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { StatCard } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { FilterBar } from '../components/common/FilterBar';
import { CurrencyDisplay, DateDisplay } from '../components/common/Formatters';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { Icon } from '../components/common/Icons';
import { Alert } from '../components/common/Feedback';
import {
  batchGenerateIncome,
  updateIncomeStatus,
  voidIncomeRecord,
  setActiveView,
} from '../store/dataSlice';
import {
  aggregateRevenueByClient,
  aggregateRevenueByEmployee,
  aggregateRevenueByPlacement,
  aggregateRevenueByPeriod,
  calculateRevenueKPIs,
} from '../utils/revenueEngine';

/**
 * IncomeRevenueView Component
 *
 * @purpose Enterprise Financial intelligence view providing traceable income generation from approved timesheets,
 * hourly billing calculations, multi-dimensional revenue summaries (by client, employee, placement, period),
 * and duplicate-prevented revenue operations.
 */
export const IncomeRevenueView = () => {
  const dispatch = useDispatch();
  const income = useSelector((state) => state.data.income);
  const timesheets = useSelector((state) => state.data.timesheets);

  // ─── Active Tab State ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'client' | 'employee' | 'placement' | 'period'

  // ─── Filter States ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');

  // ─── Modal States ─────────────────────────────────────────────
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [inspectRecord, setInspectRecord] = useState(null);
  const [voidConfirmTarget, setVoidConfirmTarget] = useState(null);

  // ─── Filter Options ───────────────────────────────────────────
  const uniqueClients = useMemo(() => {
    const names = [...new Set(income.map((i) => i.clientName).filter(Boolean))];
    return ['All', ...names.sort()];
  }, [income]);

  const uniqueEmployees = useMemo(() => {
    const names = [...new Set(income.map((i) => i.employeeName).filter(Boolean))];
    return ['All', ...names.sort()];
  }, [income]);

  const uniquePeriods = useMemo(() => {
    const periods = [...new Set(income.map((i) => i.periodEnding || i.period).filter(Boolean))];
    return ['All', ...periods.sort().reverse()];
  }, [income]);

  // ─── Filtered Master Ledger ───────────────────────────────────
  const filteredIncome = useMemo(() => {
    return income.filter((item) => {
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesClient = clientFilter === 'All' || item.clientName === clientFilter;
      const matchesEmployee = employeeFilter === 'All' || item.employeeName === employeeFilter;
      const matchesPeriod = periodFilter === 'All' || (item.periodEnding || item.period) === periodFilter;

      const q = searchQuery.toLowerCase();
      const targetStr = `${item.id} ${item.employeeName || ''} ${item.clientName || ''} ${item.placementId || ''} ${item.sourceId || ''} ${item.description || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || targetStr.includes(q);

      return matchesStatus && matchesClient && matchesEmployee && matchesPeriod && matchesSearch;
    });
  }, [income, statusFilter, clientFilter, employeeFilter, periodFilter, searchQuery]);

  // ─── Aggregations & KPIs ──────────────────────────────────────
  const kpis = useMemo(() => calculateRevenueKPIs(income), [income]);
  const revenueByClient = useMemo(() => aggregateRevenueByClient(income), [income]);
  const revenueByEmployee = useMemo(() => aggregateRevenueByEmployee(income), [income]);
  const revenueByPlacement = useMemo(() => aggregateRevenueByPlacement(income), [income]);
  const revenueByPeriod = useMemo(() => aggregateRevenueByPeriod(income), [income]);

  // ─── Timesheets eligible for generation ───────────────────────
  const approvedTimesheets = useMemo(() => {
    return timesheets.filter((ts) => ts.status === 'Approved');
  }, [timesheets]);

  const ungeneratedApprovedTimesheets = useMemo(() => {
    return approvedTimesheets.filter(
      (ts) => !income.some((inc) => inc.sourceId === ts.id || inc.traceability?.sourceTimesheetId === ts.id)
    );
  }, [approvedTimesheets, income]);

  // ─── Columns: Master Income Ledger ────────────────────────────
  const masterColumns = [
    {
      header: 'Income ID',
      accessor: 'id',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setInspectRecord(row)}
          className="font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 text-left"
          title="Inspect Traceability & Calculation Formula"
        >
          <Icon name="income" className="w-3.5 h-3.5 shrink-0" />
          <span>{row.id}</span>
        </button>
      ),
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block truncate">{row.employeeName || 'N/A'}</span>
          {row.employeeId && <span className="text-[10px] text-slate-500 font-mono">{row.employeeId}</span>}
        </div>
      ),
    },
    {
      header: 'Client',
      accessor: 'clientName',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-300">{row.clientName}</span>,
    },
    {
      header: 'Placement',
      accessor: 'placementId',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold">{row.placementId || 'PLC-N/A'}</span>
          {row.jobTitle && <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{row.jobTitle}</span>}
        </div>
      ),
    },
    {
      header: 'Period',
      accessor: 'period',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-slate-300">{row.periodEnding || row.period}</span>,
    },
    {
      header: 'Hours',
      accessor: 'billableHours',
      sortable: true,
      align: 'right',
      render: (row) => {
        const hrs = row.billableHours !== undefined ? row.billableHours : row.totalHours;
        const ot = row.overtimeHours || 0;
        return (
          <div className="text-right font-mono text-xs">
            <span className="font-semibold text-white">{hrs !== undefined ? Number(hrs).toFixed(1) : '—'}</span>
            {ot > 0 && <span className="text-[10px] text-amber-400 block">+{ot.toFixed(1)} OT</span>}
          </div>
        );
      },
    },
    {
      header: 'Rate',
      accessor: 'billingRate',
      sortable: true,
      align: 'right',
      render: (row) => {
        const rate = row.billingRate || row.rate;
        return <span className="font-mono text-xs text-slate-300">{rate ? `$${Number(rate).toFixed(2)}` : '—'}</span>;
      },
    },
    {
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      align: 'right',
      render: (row) => (
        <CurrencyDisplay
          value={row.amount || row.totalIncome}
          className="font-extrabold text-white text-sm"
        />
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
      header: 'Source Timesheet',
      accessor: 'sourceId',
      sortable: true,
      render: (row) => {
        if (!row.sourceId) {
          return <span className="text-xs text-slate-500 italic">Direct Recognized</span>;
        }
        return (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-white/5 font-semibold">
              {row.sourceId}
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Traceable</span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => setInspectRecord(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Inspect Traceability & Calculation Formula"
          >
            <Icon name="eye" className="w-4 h-4" />
          </button>

          {/* Quick status transition */}
          {row.status === 'Unbilled' && (
            <button
              type="button"
              onClick={() => dispatch(updateIncomeStatus({ id: row.id, status: 'Recognized' }))}
              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-semibold rounded-lg transition-all"
              title="Mark as Recognized"
            >
              Recognize
            </button>
          )}

          {row.status === 'Recognized' && (
            <button
              type="button"
              onClick={() => dispatch(updateIncomeStatus({ id: row.id, status: 'Unbilled' }))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg transition-all"
              title="Revert to Unbilled status"
            >
              Unbill
            </button>
          )}

          {/* Void / Delete if Unbilled */}
          {row.status === 'Unbilled' && (
            <button
              type="button"
              onClick={() => setVoidConfirmTarget(row)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Void unbilled income record"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ─── Columns: Revenue by Client ───────────────────────────────
  const clientColumns = [
    { header: 'Client Account', accessor: 'clientName', sortable: true, render: (row) => (
      <div>
        <span className="font-semibold text-white block">{row.clientName}</span>
        <span className="text-[10px] text-slate-500 font-mono">{row.clientId}</span>
      </div>
    )},
    { header: 'Assignments', accessor: 'placementCount', sortable: true, align: 'center', render: (row) => (
      <span className="font-mono text-xs text-indigo-400 font-bold">{row.placementCount} active</span>
    )},
    { header: 'Timesheets', accessor: 'recordsCount', sortable: true, align: 'center', render: (row) => (
      <span className="font-mono text-xs text-slate-300">{row.recordsCount}</span>
    )},
    { header: 'Billable Hours', accessor: 'totalHours', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono text-xs font-semibold text-white">{row.totalHours.toFixed(1)} hrs</span>
    )},
    { header: 'Regular Revenue', accessor: 'regularRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.regularRevenue} className="text-slate-300 text-xs" />
    )},
    { header: 'Overtime Revenue', accessor: 'overtimeRevenue', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono text-xs text-amber-400 font-semibold">${row.overtimeRevenue.toLocaleString()}</span>
    )},
    { header: 'Total Revenue', accessor: 'totalRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.totalRevenue} className="font-extrabold text-white" />
    )},
    { header: 'Unbilled Revenue', accessor: 'unbilledRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.unbilledRevenue} className="text-sky-400 font-semibold" />
    )},
    { header: 'Margin %', accessor: 'marginPercent', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono font-bold text-emerald-400">{row.marginPercent}%</span>
    )},
  ];

  // ─── Columns: Revenue by Employee ─────────────────────────────
  const employeeColumns = [
    { header: 'Consultant', accessor: 'employeeName', sortable: true, render: (row) => (
      <div>
        <span className="font-semibold text-white block">{row.employeeName}</span>
        <span className="text-[10px] text-slate-500 font-mono">{row.employeeId}</span>
      </div>
    )},
    { header: 'Client Account', accessor: 'clientName', sortable: true, render: (row) => (
      <span className="text-xs text-slate-300">{row.clientName}</span>
    )},
    { header: 'Total Hours', accessor: 'totalHours', sortable: true, align: 'right', render: (row) => (
      <div className="font-mono text-xs text-right">
        <span className="font-bold text-white">{row.totalHours.toFixed(1)} hrs</span>
        {row.overtimeHours > 0 && <span className="text-[10px] text-amber-400 block">{row.overtimeHours.toFixed(1)} OT</span>}
      </div>
    )},
    { header: 'Effective Rate', accessor: 'effectiveRate', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono text-xs text-slate-300">${row.effectiveRate}/hr</span>
    )},
    { header: 'Total Revenue', accessor: 'totalRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.totalRevenue} className="font-bold text-white" />
    )},
    { header: 'Cost (COGS)', accessor: 'costOfGoodsSold', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.costOfGoodsSold} className="text-slate-400 text-xs" />
    )},
    { header: 'Gross Profit', accessor: 'grossProfit', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.grossProfit} className="text-emerald-400 font-bold" />
    )},
    { header: 'Margin %', accessor: 'marginPercent', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono font-bold text-emerald-400">{row.marginPercent}%</span>
    )},
  ];

  // ─── Columns: Revenue by Placement ────────────────────────────
  const placementColumns = [
    { header: 'Placement ID', accessor: 'placementId', sortable: true, render: (row) => (
      <span className="font-mono text-xs font-bold text-indigo-400">{row.placementId}</span>
    )},
    { header: 'Role / Assignment', accessor: 'jobTitle', sortable: true, render: (row) => (
      <span className="text-xs text-white font-medium">{row.jobTitle}</span>
    )},
    { header: 'Client', accessor: 'clientName', sortable: true, render: (row) => (
      <span className="text-xs text-slate-300">{row.clientName}</span>
    )},
    { header: 'Consultant', accessor: 'employeeName', sortable: true, render: (row) => (
      <span className="text-xs text-slate-300">{row.employeeName}</span>
    )},
    { header: 'Bill Rate', accessor: 'hourlyRate', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono text-xs text-slate-300">${row.hourlyRate}/hr</span>
    )},
    { header: 'Hours Billed', accessor: 'totalHours', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono text-xs font-semibold text-white">{row.totalHours.toFixed(1)}</span>
    )},
    { header: 'Total Revenue', accessor: 'totalRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.totalRevenue} className="font-bold text-white" />
    )},
    { header: 'Margin %', accessor: 'marginPercent', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono font-bold text-emerald-400">{row.marginPercent}%</span>
    )},
  ];

  // ─── Columns: Revenue by Period ───────────────────────────────
  const periodColumns = [
    { header: 'Billing Period', accessor: 'period', sortable: true, render: (row) => (
      <span className="font-mono text-xs font-bold text-indigo-300">{row.period}</span>
    )},
    { header: 'Timesheets Count', accessor: 'recordsCount', sortable: true, align: 'center', render: (row) => (
      <span className="font-mono text-xs text-slate-300">{row.recordsCount}</span>
    )},
    { header: 'Total Hours', accessor: 'totalHours', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono text-xs font-semibold text-white">{row.totalHours.toFixed(1)} hrs</span>
    )},
    { header: 'Gross Revenue', accessor: 'totalRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.totalRevenue} className="font-extrabold text-white text-sm" />
    )},
    { header: 'Unbilled Amount', accessor: 'unbilledRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.unbilledRevenue} className="text-sky-400 font-semibold" />
    )},
    { header: 'Recognized Amount', accessor: 'recognizedRevenue', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.recognizedRevenue} className="text-emerald-400 font-semibold" />
    )},
    { header: 'Gross Profit', accessor: 'grossProfit', sortable: true, align: 'right', render: (row) => (
      <CurrencyDisplay value={row.grossProfit} className="text-emerald-400 font-bold" />
    )},
    { header: 'Margin %', accessor: 'marginPercent', sortable: true, align: 'right', render: (row) => (
      <span className="font-mono font-bold text-emerald-400">{row.marginPercent}%</span>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* ─── Page Header ───────────────────────────────────────── */}
      <PageHeader
        title="Income & Revenue Management"
        subtitle="Traceable hourly revenue recognition from approved timesheets, gross margins, and multi-dimensional financial summaries."
        badge="Financials"
        actions={
          <div className="flex items-center gap-2">
            {ungeneratedApprovedTimesheets.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch(batchGenerateIncome(ungeneratedApprovedTimesheets.map((t) => t.id)))}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/30 transition-colors"
                title="Automatically generate income records for all unbilled approved timesheets"
              >
                <Icon name="check" className="w-4 h-4 text-emerald-400" />
                Batch Generate ({ungeneratedApprovedTimesheets.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Icon name="plus" className="w-4 h-4" />
              Generate Income
            </button>
          </div>
        }
      />

      {/* ─── Financial Executive KPI Stat Cards ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Recognized Revenue"
          value={<CurrencyDisplay value={kpis.totalRevenue} />}
          change={`${kpis.recordsCount} total records`}
          trend="up"
          icon="income"
          accentColor="emerald"
        />
        <StatCard
          label="Total Billable Hours"
          value={`${kpis.totalBillableHours.toLocaleString()} hrs`}
          change="From approved timesheets"
          trend="neutral"
          icon="timesheets"
          accentColor="indigo"
        />
        <StatCard
          label="Unbilled Income"
          value={<CurrencyDisplay value={kpis.unbilledIncome} />}
          change="Staged for AR Invoicing"
          trend="up"
          icon="trendingUp"
          accentColor="sky"
        />
        <StatCard
          label="Average Gross Margin"
          value={`${kpis.averageMargin}%`}
          change="Target benchmark: >35%"
          trend="up"
          icon="reports"
          accentColor="purple"
        />
      </div>

      {/* ─── Multi-Tab Navigation Bar ──────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { id: 'all', label: 'All Records', count: income.length, icon: 'income' },
            { id: 'client', label: 'By Client', count: revenueByClient.length, icon: 'clients' },
            { id: 'employee', label: 'By Consultant', count: revenueByEmployee.length, icon: 'users' },
            { id: 'placement', label: 'By Placement', count: revenueByPlacement.length, icon: 'placements' },
            { id: 'period', label: 'By Period', count: revenueByPeriod.length, icon: 'dashboard' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600/20 text-white border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon name={tab.icon} className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.id ? 'bg-indigo-500/40 text-indigo-200' : 'bg-slate-800 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab Content: All Records ──────────────────────────── */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: ['All', 'Unbilled', 'Recognized', 'Invoiced'],
                value: statusFilter,
                onChange: setStatusFilter,
              },
              {
                key: 'client',
                label: 'Client',
                options: uniqueClients,
                value: clientFilter,
                onChange: setClientFilter,
              },
              {
                key: 'employee',
                label: 'Consultant',
                options: uniqueEmployees,
                value: employeeFilter,
                onChange: setEmployeeFilter,
              },
              {
                key: 'period',
                label: 'Period',
                options: uniquePeriods,
                value: periodFilter,
                onChange: setPeriodFilter,
              },
            ]}
            onReset={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setClientFilter('All');
              setEmployeeFilter('All');
              setPeriodFilter('All');
            }}
          />

          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <DataTable
              columns={masterColumns}
              data={filteredIncome}
              keyField="id"
              emptyTitle="No income records found"
              emptyDescription="Generate income from approved timesheets to populate this ledger."
            />
          </div>
        </div>
      )}

      {/* ─── Tab Content: By Client ────────────────────────────── */}
      {activeTab === 'client' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <DataTable
              columns={clientColumns}
              data={revenueByClient}
              keyField="clientId"
              emptyTitle="No client revenue data"
              emptyDescription="No recognized income records are associated with clients yet."
            />
          </div>
        </div>
      )}

      {/* ─── Tab Content: By Employee ──────────────────────────── */}
      {activeTab === 'employee' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <DataTable
              columns={employeeColumns}
              data={revenueByEmployee}
              keyField="employeeId"
              emptyTitle="No consultant revenue data"
              emptyDescription="No recognized income records are associated with consultants yet."
            />
          </div>
        </div>
      )}

      {/* ─── Tab Content: By Placement ─────────────────────────── */}
      {activeTab === 'placement' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <DataTable
              columns={placementColumns}
              data={revenueByPlacement}
              keyField="placementId"
              emptyTitle="No placement revenue data"
              emptyDescription="No recognized income records are associated with placements yet."
            />
          </div>
        </div>
      )}

      {/* ─── Tab Content: By Period ────────────────────────────── */}
      {activeTab === 'period' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <DataTable
              columns={periodColumns}
              data={revenueByPeriod}
              keyField="period"
              emptyTitle="No period revenue data"
              emptyDescription="No recognized income records found across periods."
            />
          </div>
        </div>
      )}

      {/* ─── Modal 1: Generate Income Modal ────────────────────── */}
      {showGenerateModal && (
        <GenerateIncomeModal
          isOpen={true}
          timesheets={timesheets}
          income={income}
          onGenerateBatch={(tsIds) => dispatch(batchGenerateIncome(tsIds))}
          onClose={() => setShowGenerateModal(false)}
        />
      )}

      {/* ─── Modal 2: Traceability & Calculation Inspector ─────── */}
      {inspectRecord && (
        <TraceabilityModal
          isOpen={true}
          incomeRecord={inspectRecord}
          timesheets={timesheets}
          onStatusChange={(newStatus) => {
            dispatch(updateIncomeStatus({ id: inspectRecord.id, status: newStatus }));
            setInspectRecord({ ...inspectRecord, status: newStatus });
          }}
          onNavigateToTimesheet={() => {
            setInspectRecord(null);
            dispatch(setActiveView('timesheets'));
          }}
          onClose={() => setInspectRecord(null)}
        />
      )}

      {/* ─── Void Confirmation Dialog ──────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(voidConfirmTarget)}
        title="Void Income Record?"
        message={`Are you sure you want to void income record ${voidConfirmTarget?.id} for $${voidConfirmTarget?.amount?.toLocaleString()}? This will unlink the record and allow the approved timesheet ${voidConfirmTarget?.sourceId} to generate a fresh income record.`}
        confirmLabel="Void Record"
        variant="danger"
        onConfirm={() => {
          if (voidConfirmTarget) {
            dispatch(voidIncomeRecord(voidConfirmTarget.id));
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
 * GenerateIncomeModal — Lists timesheets, previews hourly billing calculations, and prevents duplicate generation.
 */
const GenerateIncomeModal = ({ isOpen, timesheets, income, onGenerateBatch, onClose }) => {
  const [selectedTsIds, setSelectedTsIds] = useState([]);
  const [filterApprovedOnly, setFilterApprovedOnly] = useState(true);
  const [search, setSearch] = useState('');

  // Check whether income is already generated for a timesheet
  const getExistingIncome = (tsId) => {
    return income.find((i) => i.sourceId === tsId || (i.traceability && i.traceability.sourceTimesheetId === tsId));
  };

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (filterApprovedOnly && ts.status !== 'Approved') return false;
      if (search) {
        const q = search.toLowerCase();
        const str = `${ts.id} ${ts.candidateName} ${ts.clientName} ${ts.placementId}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [timesheets, filterApprovedOnly, search]);

  const eligibleForSelection = useMemo(() => {
    return filteredTimesheets.filter((ts) => {
      if (ts.status !== 'Approved') return false;
      return !income.some((i) => i.sourceId === ts.id || (i.traceability && i.traceability.sourceTimesheetId === ts.id));
    });
  }, [filteredTimesheets, income]);

  const toggleSelect = (id) => {
    setSelectedTsIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllEligible = () => {
    setSelectedTsIds(eligibleForSelection.map((t) => t.id));
  };

  const clearSelection = () => {
    setSelectedTsIds([]);
  };

  // Calculate projected revenue of selection
  const selectedTotals = useMemo(() => {
    const selected = timesheets.filter((t) => selectedTsIds.includes(t.id));
    const totalRevenue = selected.reduce((sum, t) => sum + (t.totalBillable || (t.totalHours * t.billRate) || 0), 0);
    const totalHours = selected.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    return { count: selected.length, totalRevenue, totalHours };
  }, [selectedTsIds, timesheets]);

  const handleBatchSubmit = () => {
    if (selectedTsIds.length === 0) return;
    onGenerateBatch(selectedTsIds);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Traceable Income"
      subtitle="Generate revenue records from approved consultant timesheets with verified hourly calculations."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            {selectedTotals.count > 0 ? (
              <span>
                Selected <strong className="text-white">{selectedTotals.count}</strong> timesheet(s) • Projected Revenue:{' '}
                <strong className="text-emerald-400">${selectedTotals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ({selectedTotals.totalHours.toFixed(1)} hrs)
              </span>
            ) : (
              <span>Select eligible approved timesheets to generate income records.</span>
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
              onClick={handleBatchSubmit}
              disabled={selectedTsIds.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Icon name="income" className="w-4 h-4" />
              Generate Income ({selectedTsIds.length})
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Helper Alert Banner */}
        <Alert
          type="info"
          title="Hourly Revenue Calculation Engine"
          message="Hourly billing applies: Revenue = Billable Hours × Billing Rate. Example: 16 hrs × $72 = $1,152. Income generation is strictly prevented for Draft/Submitted timesheets and blocked for duplicate records."
        />

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search timesheets..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                <Icon name="search" className="w-3.5 h-3.5" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={filterApprovedOnly}
                onChange={(e) => setFilterApprovedOnly(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Approved Only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {eligibleForSelection.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={selectAllEligible}
                  className="px-2.5 py-1 text-xs text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600 rounded-lg transition-colors font-medium"
                >
                  Select All Ready ({eligibleForSelection.length})
                </button>
                {selectedTsIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg transition-colors font-medium"
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Timesheet List Table */}
        <div className="max-h-96 overflow-y-auto rounded-xl border border-white/5">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="border-b border-white/5 text-slate-400 uppercase text-[10px]">
                <th className="px-3 py-2.5 text-center w-10"></th>
                <th className="px-3 py-2.5 text-left">Timesheet</th>
                <th className="px-3 py-2.5 text-left">Consultant & Client</th>
                <th className="px-3 py-2.5 text-center">Period Ending</th>
                <th className="px-3 py-2.5 text-right">Hours</th>
                <th className="px-3 py-2.5 text-right">Hourly Rate</th>
                <th className="px-3 py-2.5 text-right">Calculation Preview</th>
                <th className="px-3 py-2.5 text-center">Eligibility / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTimesheets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500 text-xs">
                    No timesheets match current criteria.
                  </td>
                </tr>
              ) : (
                filteredTimesheets.map((ts) => {
                  const existing = getExistingIncome(ts.id);
                  const isApproved = ts.status === 'Approved';
                  const isBlocked = !isApproved || Boolean(existing);
                  const isSelected = selectedTsIds.includes(ts.id);
                  const billRate = ts.billRate || 0;
                  const totalHrs = ts.totalHours || 0;
                  const projectedAmount = ts.totalBillable || +(totalHrs * billRate).toFixed(2);

                  return (
                    <tr
                      key={ts.id}
                      onClick={() => {
                        if (!isBlocked) toggleSelect(ts.id);
                      }}
                      className={`transition-colors ${
                        isBlocked
                          ? 'opacity-60 bg-slate-950/40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600/10 cursor-pointer'
                          : 'hover:bg-slate-800/40 cursor-pointer'
                      }`}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isBlocked}
                          onChange={() => toggleSelect(ts.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 disabled:opacity-30 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-white block">{ts.id}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{ts.placementId}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-white block">{ts.candidateName}</span>
                        <span className="text-[11px] text-indigo-400">{ts.clientName}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-slate-300">
                        {ts.periodEnding}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className="font-bold text-white">{totalHrs.toFixed(1)}</span>
                        {ts.overtimeHours > 0 && (
                          <span className="text-[10px] text-amber-400 block">+{ts.overtimeHours} OT</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">
                        ${billRate.toFixed(2)}/hr
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono">
                          <span className="text-[10px] text-slate-400 block">{totalHrs}h × ${billRate}</span>
                          <span className="font-bold text-emerald-400 text-xs">
                            ${projectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {existing ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold">
                              Generated ({existing.id})
                            </span>
                            <span className="text-[9px] text-slate-500">Duplicate Blocked</span>
                          </div>
                        ) : isApproved ? (
                          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded text-[10px] font-semibold">
                            Ready to Generate
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-[10px] font-semibold">
                            {ts.status} (Unapproved)
                          </span>
                        )}
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
 * TraceabilityModal — Inspects full audit lineage, formula calculation, and source timesheet details.
 */
const TraceabilityModal = ({ isOpen, incomeRecord, timesheets, onStatusChange, onNavigateToTimesheet, onClose }) => {
  if (!incomeRecord) return null;
  const inc = incomeRecord;

  // Find source timesheet if linked
  const sourceTs = timesheets.find(
    (t) => t.id === inc.sourceId || t.id === inc.traceability?.sourceTimesheetId
  );

  const formula = inc.calculationFormula || inc.traceability?.calculationFormula || (
    `${inc.billableHours || inc.totalHours} hrs × $${inc.billingRate || inc.rate} = $${(inc.amount || inc.totalIncome)?.toLocaleString()}`
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Traceability Audit — ${inc.id}`}
      subtitle={`${inc.employeeName || 'Consultant'} • ${inc.clientName || 'Client'}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <Badge status={inc.status} />
          </div>
          <div className="flex items-center gap-2">
            {inc.status === 'Unbilled' && (
              <button
                type="button"
                onClick={() => onStatusChange('Recognized')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Recognize Revenue
              </button>
            )}
            {inc.status === 'Recognized' && (
              <button
                type="button"
                onClick={() => onStatusChange('Unbilled')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Mark as Unbilled
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
        {/* ─── Transparent Formula Banner ──────────────────────── */}
        <div className="p-4 bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 rounded-2xl">
          <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider mb-1">
            Revenue Calculation Formula (Hourly Billing)
          </p>
          <p className="text-base font-mono font-extrabold text-white">
            {formula}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Revenue = Billable Hours × Billing Rate. Line items are calculated and audited against source timesheet entries.
          </p>
        </div>

        {/* ─── Traceability Lineage ────────────────────────────── */}
        <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Icon name="timesheets" className="w-4 h-4 text-indigo-400" />
            Source Timesheet Traceability
          </h4>

          {inc.sourceId ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2 bg-slate-800/40 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Source Timesheet</span>
                <span className="font-mono font-bold text-indigo-400">{inc.sourceId}</span>
              </div>
              <div className="p-2 bg-slate-800/40 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Period Ending</span>
                <span className="font-mono text-white">{inc.periodEnding || inc.period}</span>
              </div>
              <div className="p-2 bg-slate-800/40 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Approved By</span>
                <span className="font-semibold text-white">{inc.traceability?.approvedBy || sourceTs?.approvedBy || 'Manager'}</span>
              </div>
              <div className="p-2 bg-slate-800/40 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Placement ID</span>
                <span className="font-mono text-indigo-300">{inc.placementId}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Directly recognized legacy income record without timesheet link.</p>
          )}

          {sourceTs && (
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <span className="text-[11px] text-slate-400">
                Source Timesheet Status: <Badge status={sourceTs.status} size="sm" />
              </span>
              <button
                type="button"
                onClick={() => onNavigateToTimesheet(sourceTs.id)}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <span>Open in Timesheet View</span>
                <Icon name="externalLink" className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ─── Itemized Hourly Breakdown ───────────────────────── */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white">Itemized Hours & Rates</h4>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60">
                <tr className="text-[10px] text-slate-400 uppercase">
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Billing Rate</th>
                  <th className="px-3 py-2 text-right">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-3 py-2 font-semibold text-white">Regular Hours</td>
                  <td className="px-3 py-2 text-right font-mono">{(inc.regularHours || (inc.billableHours || 0)).toFixed(1)} hrs</td>
                  <td className="px-3 py-2 text-right font-mono">${(inc.regularRate || inc.billingRate || inc.rate || 0).toFixed(2)}/hr</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                    ${(inc.regularAmount || inc.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {inc.overtimeHours > 0 && (
                  <tr className="bg-amber-500/5">
                    <td className="px-3 py-2 font-semibold text-amber-300">Overtime Hours</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">{(inc.overtimeHours || 0).toFixed(1)} hrs</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">${(inc.overtimeRate || inc.billingRate || 0).toFixed(2)}/hr</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-amber-400">
                      ${(inc.overtimeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {inc.holidayHours > 0 && (
                  <tr className="bg-sky-500/5">
                    <td className="px-3 py-2 font-semibold text-sky-300">Holiday Hours</td>
                    <td className="px-3 py-2 text-right font-mono text-sky-300">{(inc.holidayHours || 0).toFixed(1)} hrs</td>
                    <td className="px-3 py-2 text-right font-mono text-sky-300">${(inc.holidayRate || inc.billingRate || 0).toFixed(2)}/hr</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-sky-400">
                      ${(inc.holidayAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-indigo-500/30 bg-slate-800/80 font-bold">
                  <td className="px-3 py-2 text-white">Total Billable</td>
                  <td className="px-3 py-2 text-right font-mono text-white">{(inc.billableHours || inc.totalHours || 0).toFixed(1)} hrs</td>
                  <td className="px-3 py-2 text-right text-slate-400 text-[10px]">Blended</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400 text-sm">
                    ${(inc.amount || inc.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ─── Financial Margin Snapshot ───────────────────────── */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Gross Revenue</p>
            <CurrencyDisplay value={inc.amount || inc.totalIncome} className="text-base font-bold text-white" />
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Cost of Goods (COGS)</p>
            <CurrencyDisplay value={inc.costOfGoodsSold} className="text-base font-bold text-slate-400" />
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Gross Profit / Margin</p>
            <div className="flex items-center justify-center gap-1.5">
              <CurrencyDisplay value={inc.grossProfit} className="text-base font-bold text-emerald-400" />
              <span className="font-mono text-xs font-extrabold text-emerald-300">({inc.marginPercent}%)</span>
            </div>
          </div>
        </div>

        {/* ─── Audit Timestamps ────────────────────────────────── */}
        <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs text-slate-400 space-y-1">
          <p>Generated At: <DateDisplay date={inc.generatedAt || inc.createdAt} format="full" /></p>
          <p>Last Modified: <DateDisplay date={inc.updatedAt} format="full" /> <span className="text-slate-600 font-mono">• v{inc.version || 1}</span></p>
        </div>
      </div>
    </Modal>
  );
};
