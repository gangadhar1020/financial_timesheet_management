import React from 'react';

/**
 * Badge Component
 * 
 * @purpose Displays categorical, lifecycle, and operational status values with high-contrast color coding.
 * @usage <Badge status="Active" variant="success" dot={true} />
 * @inputs
 *   - children: ReactNode | string (Badge label content)
 *   - status: string (Optional status name string, e.g. "Active", "Pending", "Overdue")
 *   - variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' (Visual theme)
 *   - size: 'sm' | 'md' (default: 'sm')
 *   - dot: boolean (Show glowing status dot indicator, default: true)
 *   - className: string (Additional Tailwind overrides)
 * @behavior Maps common status keywords to appropriate accessibility contrast colors.
 * @reusability Ubiquitous across tables, header metadata, stat cards, and entity details.
 * @limitations Only supports single-line short badges; not meant for multi-line tags.
 */
export const Badge = ({
  children,
  status,
  variant,
  size = 'sm',
  dot = true,
  className = '',
}) => {
  // Infer variant from status string if not explicitly passed
  const getAutoVariant = (val) => {
    if (!val) return 'neutral';
    const s = String(val).toLowerCase();
    if (['active', 'approved', 'paid', 'completed', 'cleared', 'success', 'ready'].includes(s)) return 'success';
    if (['in progress', 'submitted', 'pending', 'issued', 'scheduled', 'accrued'].includes(s)) return 'warning';
    if (['overdue', 'failed', 'cancelled', 'rejected', 'error'].includes(s)) return 'danger';
    if (['open', 'draft', 'on leave'].includes(s)) return 'info';
    if (['recognized', 'invoiced'].includes(s)) return 'purple';
    return 'neutral';
  };

  const resolvedVariant = variant || getAutoVariant(status || children);

  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const dotStyles = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    purple: 'bg-purple-400',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  const label = children || status;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${variantStyles[resolvedVariant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${dotStyles[resolvedVariant]}`}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
};
