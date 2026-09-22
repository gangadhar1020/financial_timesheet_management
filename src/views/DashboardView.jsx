import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { StatCard, Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { CurrencyDisplay } from '../components/common/Formatters';
import { Alert } from '../components/common/Feedback';
import { Icon } from '../components/common/Icons';
import { setActiveView, addToast } from '../store/dataSlice';
import ProjectCard from '../components/ProjectCard';

/**
 * DashboardView Component
 * 
 * @purpose Executive command center displaying core KPIs, operational alerts, recent timesheets, and preserves the existing Projects overview.
 */
export const DashboardView = () => {
  const dispatch = useDispatch();
  const {
    projects,
    placements,
    timesheets,
    invoices,
    income,
    apBills = [],
    arPayments = [],
  } = useSelector((state) => state.data);

  // Compute live aggregates from data foundation (no hardcoded financial values)
  const totalRevenue = income.reduce((acc, curr) => acc + (curr.amount || curr.totalIncome || 0), 0);
  const totalWorkerCost = income.reduce((acc, curr) => acc + (curr.costOfGoodsSold || 0), 0);
  const grossMargin = totalRevenue - totalWorkerCost;
  const grossMarginPercent = totalRevenue > 0 ? ((grossMargin / totalRevenue) * 100).toFixed(1) : '0.0';

  const activePlacementsCount = placements.filter((p) => p.status === 'Active').length;
  const pendingTimesheetsCount = timesheets.filter((t) => t.status === 'Submitted' || t.status === 'Draft').length;
  const approvedTimesheetsCount = timesheets.filter((t) => t.status === 'Approved').length;

  const totalInvoiced = invoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalCollected = (arPayments || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const openInvoices = invoices.filter((inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled');
  const openInvoicesBalance = openInvoices.reduce((acc, curr) => {
    const bal = curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0));
    return acc + (bal > 0 ? bal : 0);
  }, 0);

  const openBills = (apBills || []).filter((b) => b.status !== 'Paid' && b.status !== 'Cancelled');
  const openBillsBalance = openBills.reduce((acc, curr) => {
    const bal = curr.balanceDue !== undefined ? curr.balanceDue : (curr.totalAmount - (curr.paidAmount || 0));
    return acc + (bal > 0 ? bal : 0);
  }, 0);

  const handleQuickAction = (viewId, actionName) => {
    dispatch(setActiveView(viewId));
    dispatch(
      addToast({
        title: 'Navigating',
        message: `Opening ${actionName}...`,
        type: 'info',
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time visibility into staffing margins, active engagements, billing pipelines, and project delivery."
        badge="Executive Overview"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickAction('timesheets', 'Timesheet Approval')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Icon name="timesheets" className="w-4 h-4 text-amber-400" />
              Review Timesheets
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('invoices', 'Client Invoices')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Icon name="invoices" className="w-4 h-4" />
              View Invoices
            </button>
          </div>
        }
      />

      {/* Operational Notice / Phase 1 Alert */}
      <Alert
        type="info"
        title="Staffing Financial & Timesheet Intelligence Operational"
        message="Active master data foundation connected. Hourly revenue recognition, gross margin tracking, invoice billing, and receivables are synchronized."
      />

      {/* Primary Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Recognized Revenue"
          value={<CurrencyDisplay value={totalRevenue} />}
          change={`${grossMarginPercent}% gross margin`}
          trend="up"
          icon="income"
          accentColor="emerald"
        />
        <StatCard
          label="Total Worker Cost"
          value={<CurrencyDisplay value={totalWorkerCost} />}
          change="Cost of goods sold / payroll"
          trend="neutral"
          icon="ap"
          accentColor="amber"
        />
        <StatCard
          label="Gross Profit Margin"
          value={<CurrencyDisplay value={grossMargin} />}
          change={`${grossMarginPercent}% margin efficiency`}
          trend="up"
          icon="reports"
          accentColor="indigo"
        />
        <StatCard
          label="Open AR Receivables"
          value={<CurrencyDisplay value={openInvoicesBalance} />}
          change={`${openInvoices.length} open customer invoice(s)`}
          trend={openInvoicesBalance > 0 ? "neutral" : "up"}
          icon="ar"
          accentColor="purple"
        />
      </div>

      {/* Secondary Operations & Settlements Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Outstanding AP Payables"
          value={<CurrencyDisplay value={openBillsBalance} />}
          change={`${openBills.length} pending bill disbursement(s)`}
          trend="neutral"
          icon="ap"
          accentColor="purple"
        />
        <StatCard
          label="Total Customer Invoiced"
          value={<CurrencyDisplay value={totalInvoiced} />}
          change={`${invoices.length} total billed invoices`}
          trend="up"
          icon="invoices"
          accentColor="indigo"
        />
        <StatCard
          label="Payments Collected"
          value={<CurrencyDisplay value={totalCollected} />}
          change="Settled AR collections"
          trend="up"
          icon="income"
          accentColor="emerald"
        />
        <StatCard
          label="Timesheets & Placements"
          value={`${approvedTimesheetsCount} Approved`}
          change={`${pendingTimesheetsCount} pending • ${activePlacementsCount} active placements`}
          trend="up"
          icon="timesheets"
          accentColor="amber"
        />
      </div>

      {/* Mid-Row: Recent Timesheets & Operational Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Timesheets Table */}
        <div className="lg:col-span-2">
          <Card padding="sm" className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">Recent Timesheet Submissions</h3>
                  <p className="text-xs text-slate-400">Timecards submitted by active consultants</p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(setActiveView('timesheets'))}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>View All</span>
                  <Icon name="chevronRight" className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {timesheets.slice(0, 3).map((ts) => (
                  <div key={ts.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{ts.candidateName}</span>
                        <span className="text-[10px] text-slate-400">({ts.id})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{ts.clientName}</span>
                        <span>&bull;</span>
                        <span>Ending {ts.periodEnding}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-xs text-white">{ts.totalHours} hrs</div>
                        <CurrencyDisplay value={ts.totalBillable} className="text-[11px] text-slate-400 block" />
                      </div>
                      <Badge status={ts.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950/30 border-t border-white/5 text-center text-xs text-slate-400">
              Automatic timesheet reminders scheduled for Monday 09:00 AM
            </div>
          </Card>
        </div>

        {/* Quick Launchpad & Status */}
        <div>
          <Card padding="md" className="h-full space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">
              Operations Quick Links
            </h3>
            <div className="space-y-2.5">
              {[
                { view: 'employees', title: 'Employee Roster', desc: 'Manage 4 internal employees', icon: 'users' },
                { view: 'assignments', title: 'Assignments', desc: '4 assignments (3 active placements)', icon: 'assignments' },
                { view: 'imports', title: 'Batch CSV Sync', desc: 'Sync timesheets & external employee records', icon: 'imports' },
                { view: 'reports', title: 'Financial Reports', desc: 'DSO, Margin Analysis & Utilization BI', icon: 'reports' },
              ].map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => dispatch(setActiveView(item.view))}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-indigo-400 border border-slate-700">
                      <Icon name={item.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  <Icon name="chevronRight" className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Preserved Feature: Active Internal Projects Grid */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Active Internal Initiatives</h2>
            <p className="text-xs text-slate-400">
              Ongoing engineering, compliance, and product sprints (Preserved from Previous Phase).
            </p>
          </div>
          <Badge status="4 Projects" variant="neutral" dot={false} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
};
