import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeToast } from '../../store/dataSlice';
import { Icon } from './Icons';

/**
 * Alert Banner Component
 * 
 * @purpose Renders static or dismissable inline contextual banners to alert users of operational events.
 * @usage <Alert type="warning" title="Missing Timesheets" message="1 placement is missing time for this pay cycle." />
 * @inputs
 *   - type: 'info' | 'success' | 'warning' | 'error' (default: 'info')
 *   - title: string
 *   - message: string
 *   - onDismiss: () => void (Optional dismiss handler)
 * @behavior Renders high-contrast colored alert with icon and optional close button.
 * @reusability Reused across views to surface validation warnings, placeholder notices, and phase readiness notes.
 * @limitations Inline layout; for floating toasts use ToastContainer.
 */
export const Alert = ({
  type = 'info',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const styles = {
    info: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  }[type];

  const iconName = {
    info: 'info',
    success: 'check',
    warning: 'alert',
    error: 'alert',
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${styles} ${className}`}
      role="alert"
    >
      <Icon name={iconName} className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        {message && <p className="opacity-90 leading-relaxed">{message}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/20 transition-opacity"
          title="Dismiss alert"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Toast Notification Item & Container
 * 
 * @purpose Renders non-intrusive floating feedback messages in the bottom-right corner of the application shell.
 * @usage Automatically connected to Redux `state.data.toasts`. Dispatch `addToast({ title: 'Saved', message: 'Record updated' })`.
 * @behavior Auto-dismisses toasts after configured duration (default 4 seconds).
 * @reusability Global shell component rendered once in AppLayout.
 */
export const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const typeStyles = {
    success: 'border-emerald-500/30 bg-slate-900/90 text-emerald-400',
    error: 'border-rose-500/30 bg-slate-900/90 text-rose-400',
    warning: 'border-amber-500/30 bg-slate-900/90 text-amber-400',
    info: 'border-indigo-500/30 bg-slate-900/90 text-indigo-400',
  }[toast.type || 'info'];

  const iconName = {
    success: 'check',
    error: 'alert',
    warning: 'alert',
    info: 'info',
  }[toast.type || 'info'];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md w-80 sm:w-96 pointer-events-auto transform transition-all duration-300 animate-slide-in ${typeStyles}`}
    >
      <Icon name={iconName} className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        {toast.title && <h5 className="font-bold text-white mb-0.5">{toast.title}</h5>}
        {toast.message && <p className="text-slate-300 leading-snug">{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Icon name="close" className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.data.toasts);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={(id) => dispatch(removeToast(id))}
        />
      ))}
    </div>
  );
};
