import React, { useEffect } from 'react';
import { Icon } from './Icons';

/**
 * Modal Dialog Component
 * 
 * @purpose Provides an accessible, layered modal dialog with focus management, backdrop blur, and Escape key dismissal.
 * @usage 
 *   <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Client Account">
 *     <ClientForm />
 *   </Modal>
 * @inputs
 *   - isOpen: boolean (Controls modal visibility)
 *   - onClose: () => void (Dismissal handler)
 *   - title: string (Modal header title)
 *   - subtitle: string (Optional subtext)
 *   - children: ReactNode (Modal body content)
 *   - footer: ReactNode (Optional action buttons slot)
 *   - size: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @behavior Traps keyboard escape key, disables background scrolling when opened, animates in smoothly.
 * @reusability Used for entity creation forms, detail inspect drawers, and configuration dialogs.
 * @limitations Does not manage form dirty states; consumers should provide unsaved changes confirmation if needed.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${sizeClasses} bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 transform transition-all duration-300 scale-100`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-white/5 bg-slate-950/40 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ConfirmDialog Component
 * 
 * @purpose Specialized confirmation prompt for destructive or significant actions (deletions, status approvals).
 * @usage <ConfirmDialog isOpen={showConfirm} title="Approve Timesheet?" message="This will lock 40.0 hours." onConfirm={handleApprove} onCancel={() => setShowConfirm(false)} />
 * @inputs
 *   - isOpen: boolean
 *   - title: string
 *   - message: string
 *   - confirmLabel: string (default: 'Confirm')
 *   - cancelLabel: string (default: 'Cancel')
 *   - variant: 'danger' | 'warning' | 'primary' (default: 'primary')
 *   - onConfirm: () => void
 *   - onCancel: () => void
 */
export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const buttonVariants = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  }[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition-colors ${buttonVariants}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
    </Modal>
  );
};
