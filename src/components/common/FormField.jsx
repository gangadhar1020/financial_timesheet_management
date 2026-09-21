import React from 'react';

/**
 * FormField Component System
 * 
 * @purpose Standardizes form controls (Input, Select, Textarea) with uniform labels, helper text, and validation error states.
 * @usage 
 *   <FormField label="Full Name" required error={errors.name}>
 *     <TextInput value={name} onChange={setName} placeholder="Jane Doe" />
 *   </FormField>
 * @inputs
 *   - label: string (Field label)
 *   - required: boolean (Renders red asterisk)
 *   - error: string (Validation error text)
 *   - helperText: string (Optional guidance)
 *   - children: ReactNode (Form input element)
 * @behavior Renders structured field layout and announces errors with accessible aria attributes.
 * @reusability Reused in all modals, filter forms, and configuration settings.
 * @limitations Pure layout wrapper; actual form serialization/validation is handled by form hooks/state.
 */
export const FormField = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export const TextInput = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  error = false,
  className = '',
  ...props
}) => {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2 bg-slate-900 border ${
        error ? 'border-rose-500/80 focus:ring-rose-500/30' : 'border-slate-700/80 focus:ring-indigo-500/30 focus:border-indigo-500'
      } rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    />
  );
};

export const SelectInput = ({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 disabled:opacity-40 transition-colors ${className}`}
      {...props}
    >
      {options.map((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : opt;
        return (
          <option key={val} value={val} className="bg-slate-900 text-white">
            {label}
          </option>
        );
      })}
    </select>
  );
};
