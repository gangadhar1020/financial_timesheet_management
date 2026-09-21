import React, { useState } from 'react';
import { LoadingState, EmptyState } from './FeedbackStates';

/**
 * DataTable Component
 * 
 * @purpose Renders accessible, sortable, and responsive enterprise data tables with integrated empty and loading states.
 * @usage 
 *   <DataTable 
 *     columns={[
 *       { header: 'ID', accessor: 'id', sortable: true },
 *       { header: 'Name', accessor: 'name', sortable: true },
 *       { header: 'Status', accessor: 'status', render: (row) => <Badge status={row.status} /> }
 *     ]}
 *     data={items}
 *     isLoading={false}
 *     onRowClick={(row) => handleSelect(row)}
 *   />
 * @inputs
 *   - columns: Array<{ header: string, accessor?: string, sortable?: boolean, align?: 'left'|'center'|'right', render?: (row, index) => ReactNode, className?: string }>
 *   - data: Array<Object> (Rows to render)
 *   - isLoading: boolean (Render skeleton when true)
 *   - emptyTitle: string (Title when data is empty)
 *   - emptyDescription: string
 *   - onRowClick: (row: Object) => void (Optional click handler)
 *   - keyField: string (Unique row identifier property, default: 'id')
 * @behavior Manages client-side column sorting (ascending / descending toggle), handles null values gracefully, provides responsive horizontal scrolling.
 * @reusability Master table used across Employees, Clients, Jobs, Placements, Timesheets, Invoices, Bills, and Audit Logs.
 * @limitations Advanced column reordering or tree-grid hierarchies are deferred to future phases.
 */
export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No records available',
  emptyDescription = 'There are no records to display matching the current criteria.',
  onRowClick,
  keyField = 'id',
  className = '',
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (col) => {
    if (!col.sortable) return;
    const accessor = typeof col.accessor === 'string' ? col.accessor : col.header;
    if (sortKey === accessor) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(accessor);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey || !data.length) return data;
    return [...data].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  if (isLoading) {
    return <LoadingState type="table-skeleton" rows={5} />;
  }

  if (!sortedData || sortedData.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/5 bg-slate-900/70 text-slate-400 font-semibold tracking-wide uppercase text-[11px]">
            {columns.map((col, idx) => {
              const accessor = typeof col.accessor === 'string' ? col.accessor : col.header;
              const isSorted = sortKey === accessor;
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center'
                  : 'text-left';

              return (
                <th
                  key={idx}
                  onClick={() => handleSort(col)}
                  className={`px-4 py-3.5 ${alignClass} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-white transition-colors' : ''
                  } ${col.className || ''}`}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-500 inline-block">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <span className="text-indigo-400">▲</span>
                          ) : (
                            <span className="text-indigo-400">▼</span>
                          )
                        ) : (
                          <span className="opacity-30 hover:opacity-100">↕</span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-300">
          {sortedData.map((row, rowIdx) => {
            const rowKey = row[keyField] || rowIdx;
            return (
              <tr
                key={rowKey}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
              >
                {columns.map((col, colIdx) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';

                  let cellContent;
                  if (col.render) {
                    cellContent = col.render(row, rowIdx);
                  } else if (typeof col.accessor === 'function') {
                    cellContent = col.accessor(row);
                  } else if (col.accessor) {
                    cellContent = row[col.accessor];
                  } else {
                    cellContent = null;
                  }

                  return (
                    <td
                      key={colIdx}
                      className={`px-4 py-3.5 whitespace-nowrap ${alignClass} ${col.className || ''}`}
                    >
                      {cellContent !== null && cellContent !== undefined ? cellContent : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
