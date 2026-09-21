import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';

/**
 * SearchInput Component
 * 
 * @purpose Provides a responsive, accessible search box with clear button, icon, and optional keyboard hint.
 * @usage <SearchInput value={query} onChange={setQuery} placeholder="Search employees..." />
 * @inputs
 *   - value: string (Current search string)
 *   - onChange: (value: string) => void (Callback when search string changes)
 *   - placeholder: string (Placeholder text, default: 'Search...')
 *   - debounceMs: number (Debounce delay in ms, default: 0)
 *   - showShortcut: boolean (Displays '/' keyboard badge, default: true)
 *   - className: string (Tailwind styling overrides)
 * @behavior Renders a styled input with a search icon, a clear (X) button when non-empty, and auto-focus shortcut.
 * @reusability Used on all list tables, header global search, and filter bars.
 * @limitations Pure text search matching; advanced regex or query-syntax parsing is handled by the consumer.
 */
export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 0,
  showShortcut = true,
  className = '',
}) => {
  const [internalVal, setInternalVal] = useState(value || '');
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setInternalVal(value || '');
  }

  useEffect(() => {
    if (debounceMs <= 0) return;
    const timer = setTimeout(() => {
      if (internalVal !== value) {
        onChange(internalVal);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [internalVal, debounceMs, onChange, value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setInternalVal(newVal);
    if (debounceMs <= 0) {
      onChange(newVal);
    }
  };

  const handleClear = () => {
    setInternalVal('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Icon name="search" className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={internalVal}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-16 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 shadow-inner"
      />
      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
        {internalVal && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear search"
          >
            <Icon name="close" className="w-3.5 h-3.5" />
          </button>
        )}
        {showShortcut && !internalVal && (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-sm">
            /
          </kbd>
        )}
      </div>
    </div>
  );
};

/**
 * FilterBar Component
 * 
 * @purpose Organizes multi-parameter filtering, category dropdowns, and search controls in a consistent bar.
 * @usage 
 *   <FilterBar 
 *     searchQuery={search} 
 *     onSearchChange={setSearch} 
 *     filters={[{ key: 'status', label: 'Status', options: ['All', 'Active', 'Inactive'], value: status, onChange: setStatus }]}
 *     onReset={handleReset}
 *   />
 * @inputs
 *   - searchQuery: string (Current text search query)
 *   - onSearchChange: (val: string) => void (Search change callback)
 *   - filters: Array<{ key: string, label: string, options: string[], value: string, onChange: Function }>
 *   - onReset: Function (Callback when Reset/Clear filters is clicked)
 *   - extraActions: ReactNode (Optional right-side actions like "Export" or "Add")
 * @behavior Renders dropdown selects, search input, and dynamic active filter badges with single-click reset.
 * @reusability Uniform filter toolbar across Employees, Clients, Invoices, Timesheets, and Placements.
 * @limitations Designed for horizontal bar layout; complex nested multi-level facet builders are not included.
 */
export const FilterBar = ({
  searchQuery,
  onSearchChange,
  filters = [],
  onReset,
  extraActions,
  className = '',
}) => {
  const hasActiveFilters = Boolean(
    (searchQuery && searchQuery.length > 0) ||
    filters.some((f) => f.value && f.value !== 'All')
  );

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {onSearchChange && (
          <div className="w-full sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search records..."
            />
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <select
              value={filter.value || 'All'}
              onChange={(e) => filter.onChange(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-slate-600 transition-colors cursor-pointer"
            >
              {filter.options.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {filter.label}: {opt}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="chevronDown" className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}

        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      {extraActions && (
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {extraActions}
        </div>
      )}
    </div>
  );
};
