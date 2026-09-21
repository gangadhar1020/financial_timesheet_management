import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { DateDisplay } from '../components/common/Formatters';
import { Icon } from '../components/common/Icons';
import { addToast } from '../store/dataSlice';

/**
 * ReportsView Component
 * 
 * @purpose Financial and operational BI catalog displaying reports, margin analytics, DSO metrics, and export triggers.
 */
export const ReportsView = () => {
  const dispatch = useDispatch();
  const reports = useSelector((state) => state.data.reports);

  const handleExport = (reportTitle) => {
    dispatch(
      addToast({
        title: 'Export Generated',
        message: `${reportTitle} exported successfully to CSV.`,
        type: 'success',
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Business Intelligence"
        subtitle="Standardized executive intelligence reports for placement margins, aged accounts receivable, and consultant utilization."
        badge="Governance"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {reports.map((rep) => (
          <Card key={rep.id} hover className="flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {rep.category}
                </span>
                <Badge status={rep.status} size="sm" />
              </div>

              <h3 className="text-sm font-bold text-white mb-1.5">{rep.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {rep.description}
              </p>

              {/* Key Metrics Snapshot */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5 text-xs">
                {Object.entries(rep.metrics || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-semibold text-slate-200">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="text-[10px] text-slate-500">
                <span>Run: {rep.frequency} &bull; </span>
                <DateDisplay date={rep.lastGenerated} format="short" />
              </div>

              <button
                type="button"
                onClick={() => handleExport(rep.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
