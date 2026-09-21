import React from 'react';

/**
 * CurrencyDisplay Component
 * 
 * @purpose Formats numeric currency values into localized, standardized monetary displays.
 * @usage <CurrencyDisplay value={28400} currency="USD" />
 * @inputs
 *   - value: number | string (Raw numeric value to display)
 *   - currency: string (ISO currency code, default: 'USD')
 *   - locale: string (e.g. 'en-US')
 *   - minimumFractionDigits: number (default: 2)
 *   - negativeStyle: 'minus' | 'parentheses' (default: 'minus')
 *   - className: string (Tailwind classes)
 * @behavior Applies Intl.NumberFormat and highlights negative amounts with rose styling if configured.
 * @reusability Reused across invoices, bills, timesheet totals, placements, and financial reports.
 * @limitations Relies on standard browser Intl API support.
 */
export const CurrencyDisplay = ({
  value,
  currency = 'USD',
  locale = 'en-US',
  minimumFractionDigits = 2,
  negativeStyle = 'minus',
  className = '',
}) => {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;

  if (numeric === null || numeric === undefined || isNaN(numeric)) {
    return <span className={`text-slate-500 ${className}`}>—</span>;
  }

  const isNegative = numeric < 0;
  const absVal = Math.abs(numeric);

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(absVal);

  const displayText = isNegative
    ? negativeStyle === 'parentheses'
      ? `(${formatted})`
      : `-${formatted}`
    : formatted;

  return (
    <span
      className={`font-mono font-medium tracking-tight ${
        isNegative ? 'text-rose-400' : 'text-slate-200'
      } ${className}`}
    >
      {displayText}
    </span>
  );
};

/**
 * DateDisplay Component
 * 
 * @purpose Formats ISO date strings into readable enterprise timestamps and relative dates.
 * @usage <DateDisplay date="2026-09-18T16:00:00Z" relative={true} />
 * @inputs
 *   - date: string | number | Date (Input date string or object)
 *   - format: 'short' | 'medium' | 'full' | 'monthYear' (default: 'medium')
 *   - relative: boolean (Show "3 days ago" if recent)
 *   - className: string (Tailwind classes)
 * @behavior Gracefully handles null/invalid dates and provides standard semantic <time> tag with ISO datetime.
 * @reusability Used in tables, audit logs, creation timestamps, and timesheet periods.
 * @limitations Relative dates are simplified for client-side display without live interval timers.
 */
export const DateDisplay = ({
  date,
  format = 'medium',
  relative = false,
  className = '',
}) => {
  if (!date) return <span className={`text-slate-500 ${className}`}>—</span>;

  const d = new Date(date);
  if (isNaN(d.getTime())) return <span className={`text-slate-500 ${className}`}>Invalid date</span>;

  // Format options
  const options = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    full: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    monthYear: { month: 'long', year: 'numeric' },
  }[format] || { month: 'short', day: 'numeric', year: 'numeric' };

  let displayText = new Intl.DateTimeFormat('en-US', options).format(d);

  if (relative) {
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) displayText = 'Today';
    else if (diffDays === 1) displayText = 'Yesterday';
    else if (diffDays > 1 && diffDays < 30) displayText = `${diffDays}d ago`;
  }

  return (
    <time
      dateTime={d.toISOString()}
      className={`text-slate-400 tabular-nums ${className}`}
      title={d.toLocaleString()}
    >
      {displayText}
    </time>
  );
};
