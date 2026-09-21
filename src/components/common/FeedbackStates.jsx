import React from 'react';
import { Icon } from './Icons';

/**
 * Skeleton Loader Component
 * 
 * @purpose Renders shimmering placeholder blocks during asynchronous data fetches.
 * @usage <Skeleton className="h-4 w-32" />
 * @inputs
 *   - className: string (Tailwind classes for dimension, rounded corners)
 * @behavior Renders an animated pulse box with subtle slate background gradient.
 * @reusability Used inside table rows, card metrics, and form mockups.
 * @limitations Pure CSS animation; should not be overused to prevent CPU thrashing.
 */
export const Skeleton = ({ className = 'h-4 w-full' }) => {
  return (
    <div className={`animate-pulse bg-slate-800/80 rounded-md ${className}`} />
  );
};

/**
 * LoadingState Component
 * 
 * @purpose Full container loading screen or tabular loading skeleton state.
 * @usage <LoadingState message="Fetching master records..." rows={5} />
 * @inputs
 *   - message: string (Optional loading status label)
 *   - type: 'spinner' | 'table-skeleton' | 'cards-skeleton' (default: 'spinner')
 *   - rows: number (Number of skeleton rows to render if type='table-skeleton')
 * @behavior Displays a modern spinning gradient loader or structured skeleton mockups.
 * @reusability Reused whenever Redux dataSlice status === 'loading'.
 * @limitations Displays static number of skeleton items.
 */
export const LoadingState = ({
  message = 'Loading data...',
  type = 'spinner',
  rows = 4,
}) => {
  if (type === 'table-skeleton') {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
};

/**
 * EmptyState Component
 * 
 * @purpose Renders a visually engaging empty state when zero records match search/filter criteria or initial dataset is empty.
 * @usage <EmptyState title="No Invoices Found" description="Try adjusting your filters or date range." actionLabel="Create Invoice" onAction={openModal} />
 * @inputs
 *   - icon: string (Icon identifier, default: 'info')
 *   - title: string (Main title heading)
 *   - description: string (Subtext explanation or guidance)
 *   - actionLabel: string (Optional CTA button text)
 *   - onAction: () => void (Optional CTA button callback)
 * @behavior Displays central icon with soft glowing ring, title, description, and action button.
 * @reusability Displayed across all tables, search results, and notification panels.
 * @limitations Single primary action supported.
 */
export const EmptyState = ({
  icon = 'search',
  title = 'No records found',
  description = 'There are no items matching your current filters or query.',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 bg-slate-900/20 rounded-2xl border border-white/5 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon name={icon} className="w-7 h-7 text-indigo-400" />
      </div>
      <h4 className="text-base font-semibold text-white mb-1.5">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200"
        >
          <Icon name="plus" className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

/**
 * ErrorState Component
 * 
 * @purpose Displays standard contextual error messages when data loading or API operations fail.
 * @usage <ErrorState message={error} onRetry={() => dispatch(fetchEmployees())} />
 * @inputs
 *   - title: string (default: 'Unable to load records')
 *   - message: string (Detailed error description)
 *   - onRetry: () => void (Callback to re-trigger failed request)
 * @behavior Highlights error in high-contrast rose colors with direct retry action button.
 * @reusability Used whenever asynchronous fetching fails in views or modals.
 * @limitations Only handles presentation; error logging/telemetry handled by caller.
 */
export const ErrorState = ({
  title = 'Unable to load records',
  message = 'An unexpected error occurred while communicating with the data source.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mb-3">
        <Icon name="alert" className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-rose-300 mb-1">{title}</h4>
      <p className="text-xs text-rose-400/90 max-w-md mx-auto mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
        >
          <Icon name="refresh" className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
