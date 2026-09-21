import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Badge } from '../components/common/Badge';
import { DateDisplay } from '../components/common/Formatters';
import { Modal } from '../components/common/Modal';
import { Icon } from '../components/common/Icons';

/**
 * AuditLogsView Component
 * 
 * @purpose Compliance, security, and governance audit trail recording state modifications and operational events.
 */
export const AuditLogsView = () => {
  const auditLogs = useSelector((state) => state.data.auditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const filteredLogs = auditLogs.filter((log) => {
    const target = `${log.actor} ${log.action} ${log.entityType} ${log.details}`.toLowerCase();
    return !searchQuery || target.includes(searchQuery.toLowerCase());
  });

  const columns = [
    { header: 'Log ID', accessor: 'id', sortable: true },
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      sortable: true,
      render: (row) => <DateDisplay date={row.timestamp} format="full" />,
    },
    {
      header: 'Actor & IP',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.actor}</span>
          <span className="text-[10px] font-mono text-slate-500">{row.ipAddress}</span>
        </div>
      ),
    },
    {
      header: 'Action / Event',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      sortable: true,
      render: (row) => (
        <span className="text-xs">
          {row.entityType} ({row.entityId})
        </span>
      ),
    },
    {
      header: 'Details',
      accessor: 'details',
      render: (row) => (
        <span className="text-xs text-slate-300 truncate max-w-xs block" title={row.details}>
          {row.details}
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
      header: 'Inspect',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Inspect Payload"
        >
          <Icon name="eye" className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs & Compliance Trail"
        subtitle="Immutable security logs, state transitions, administrative overrides, and system event diagnostics."
        badge="Governance"
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onReset={() => setSearchQuery('')}
      />

      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredLogs}
          onRowClick={(row) => setSelectedLog(row)}
        />
      </div>

      {/* Inspect Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action}`}
        subtitle={`ID: ${selectedLog?.id} • Timestamp: ${selectedLog?.timestamp}`}
        footer={
          <button
            type="button"
            onClick={() => setSelectedLog(null)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Done
          </button>
        }
      >
        {selectedLog && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-xl font-mono text-slate-300 whitespace-pre-wrap border border-white/5">
              {JSON.stringify(selectedLog, null, 2)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
