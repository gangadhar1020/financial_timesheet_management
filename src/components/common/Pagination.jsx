import React from 'react';
import { Icon } from './Icons';

/**
 * Pagination Component
 * 
 * @purpose Handles tabular and list pagination with page jump controls, items per page selector, and range counter.
 * @usage 
 *   <Pagination 
 *     currentPage={page} 
 *     totalItems={48} 
 *     pageSize={10} 
 *     onPageChange={setPage} 
 *     onPageSizeChange={setPageSize} 
 *   />
 * @inputs
 *   - currentPage: number (1-based index)
 *   - totalItems: number (Total records available)
 *   - pageSize: number (Records per page, default: 10)
 *   - onPageChange: (newPage: number) => void
 *   - onPageSizeChange: (newSize: number) => void (Optional)
 *   - pageSizeOptions: number[] (default: [5, 10, 25, 50])
 * @behavior Calculates total pages, disables boundary buttons, and renders numerical page tabs.
 * @reusability Standard pagination wrapper for all tabular data screens.
 * @limitations Client-side pagination control; server-side paging token support requires feeding totalItems.
 */
export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate displayed page numbers (with ellipsis if large)
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= safePage - 1 && i <= safePage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-slate-900/60 border-t border-white/5 text-xs text-slate-400 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-white font-semibold">{startItem}</strong> to{' '}
          <strong className="text-white font-semibold">{endItem}</strong> of{' '}
          <strong className="text-white font-semibold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-800">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <Icon name="chevronLeft" className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-600">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(Number(page))}
              className={`min-w-[28px] h-7 px-2 rounded-lg font-medium transition-colors ${
                safePage === page
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <Icon name="chevronRight" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
