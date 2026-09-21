import React from 'react';
import { Badge } from '../common/Badge';

/**
 * PageHeader Component
 * 
 * @purpose Standardized header at the top of each page container.
 * @inputs
 *   - title: string
 *   - subtitle: string
 *   - badge: string
 *   - actions: ReactNode (Action buttons such as 'Export', 'New Item')
 */
export const PageHeader = ({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/5 ${className}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>
          {badge && (
            <Badge status={badge} variant="purple" size="sm" dot={false} />
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
