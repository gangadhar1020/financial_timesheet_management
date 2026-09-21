import React from 'react';
import { Icon } from './Icons';

/**
 * Card Component
 * 
 * @purpose Base surface container supporting glassmorphic styling, borders, and hover micro-elevation.
 * @usage <Card title="Section Title" subtitle="Description">{content}</Card>
 * @inputs
 *   - children: ReactNode (Card content)
 *   - className: string (Tailwind classes)
 *   - hover: boolean (Elevate and glow on hover)
 *   - padding: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
 * @behavior Renders a dark glass container with subtle borders and lighting.
 * @reusability Fundamental building block for dashboard widgets, detail panels, and tables.
 * @limitations Does not provide built-in scrolling for overflowing contents.
 */
export const Card = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`relative bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl transition-all duration-300 ${
        hover ? 'hover:bg-slate-800/80 hover:shadow-indigo-500/10 hover:shadow-2xl hover:-translate-y-0.5' : ''
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * StatCard Component
 * 
 * @purpose Renders high-impact executive KPI metrics with trend badges, subtitles, and decorative icons.
 * @usage <StatCard label="Total Revenue" value="$84,200" change="+14.2%" trend="up" icon="income" />
 * @inputs
 *   - label: string (Metric description)
 *   - value: string | number (Primary display value)
 *   - change: string (e.g. "+12.5% vs last month")
 *   - trend: 'up' | 'down' | 'neutral' (Controls positive/negative coloring)
 *   - icon: string (Icon identifier from Icons.jsx)
 *   - accentColor: 'indigo' | 'emerald' | 'amber' | 'purple' | 'sky'
 * @behavior Displays formatted stats with glowing radial gradients and accessibility tags.
 * @reusability Reused across the Executive Dashboard and module summary headers.
 * @limitations Fixed layout tailored for numeric indicators and short delta summaries.
 */
export const StatCard = ({
  label,
  value,
  change,
  trend = 'neutral',
  icon = 'trendingUp',
  accentColor = 'indigo',
  className = '',
}) => {
  const accents = {
    indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30',
    sky: 'from-sky-500/20 to-sky-600/5 text-sky-400 border-sky-500/30',
  };

  const trendColors = {
    up: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    down: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-slate-400 bg-slate-800 border-slate-700',
  };

  return (
    <Card hover className={`overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {label}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {value}
          </h3>
          {change && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${trendColors[trend]}`}>
                <Icon
                  name={trend === 'up' ? 'trendingUp' : trend === 'down' ? 'trendingDown' : 'info'}
                  className="w-3 h-3 mr-1 inline"
                />
                {change}
              </span>
              <span className="text-xs text-slate-500">vs prev period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br border ${accents[accentColor]} shadow-inner`}>
          <Icon name={icon} className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};
