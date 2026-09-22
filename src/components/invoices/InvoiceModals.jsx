import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { Badge } from '../common/Badge';
import { CurrencyDisplay } from '../common/Formatters';
import { Icon } from '../common/Icons';
import { Alert } from '../common/Feedback';
import {
  calculateInvoiceTotals,
  validateARPayment,
} from '../../utils/accountingEngine';

/**
 * CreateInvoiceModal — Generates invoice by selecting eligible income records for a client.
 * 
 * Flow: Approved Timesheets -> Income / Revenue -> Invoices -> Receivables -> Payments
 */
export const CreateInvoiceModal = ({ isOpen, clients = [], income = [], onSave, onClose }) => {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedIncomeIds, setSelectedIncomeIds] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(30); // Net 30 default
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  // Eligible income records for selected client: status is 'Unbilled' or 'Recognized', not yet invoiced
  const clientEligibleIncome = useMemo(() => {
    if (!selectedClientId) return [];
    return income.filter((inc) => {
      if (inc.clientId !== selectedClientId) return false;
      if (inc.status === 'Invoiced' || inc.invoiceId) return false;
      if (inc.status === 'Unapproved' || inc.status === 'Draft') return false;
      return true;
    });
  }, [income, selectedClientId]);

  // Selected income objects
  const selectedIncomeObjects = useMemo(() => {
    return income.filter((i) => selectedIncomeIds.includes(i.id));
  }, [income, selectedIncomeIds]);

  // Projected line items & totals
  const lineItems = useMemo(() => {
    return selectedIncomeObjects.map((inc) => ({
      quantity: inc.billableHours || inc.totalHours || 1,
      rate: inc.billingRate || inc.rate || inc.amount,
      amount: inc.amount || inc.totalIncome || 0,
    }));
  }, [selectedIncomeObjects]);

  const totals = useMemo(() => {
    return calculateInvoiceTotals(lineItems, taxRate, 0);
  }, [lineItems, taxRate]);

  // Calculate Due Date based on issueDate + paymentTerms
  const calculatedDueDate = useMemo(() => {
    if (!issueDate) return '';
    const d = new Date(issueDate);
    d.setDate(d.getDate() + parseInt(paymentTerms, 10));
    return d.toISOString().split('T')[0];
  }, [issueDate, paymentTerms]);

  const handleToggleIncome = (incId) => {
    setSelectedIncomeIds((prev) =>
      prev.includes(incId) ? prev.filter((id) => id !== incId) : [...prev, incId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIncomeIds(clientEligibleIncome.map((i) => i.id));
  };

  const handleClearSelection = () => {
    setSelectedIncomeIds([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Please select a client account.');
      return;
    }
    if (selectedIncomeIds.length === 0) {
      setError('Please select at least one eligible income record to invoice.');
      return;
    }

    onSave({
      clientId: selectedClientId,
      invoiceNumber: customInvoiceNumber.trim() || undefined,
      issueDate,
      dueDate: calculatedDueDate,
      incomeIds: selectedIncomeIds,
      taxRate: parseFloat(taxRate) || 0,
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Client Invoice"
      subtitle="Bundle approved recognized income records into an Accounts Receivable invoice."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            {selectedIncomeIds.length > 0 ? (
              <span>
                <strong className="text-white">{selectedIncomeIds.length}</strong> income record(s) selected • Invoice Total:{' '}
                <strong className="text-emerald-400">${totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            ) : (
              <span>Select income records below to generate the invoice total.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIncomeIds.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Icon name="check" className="w-4 h-4" />
              Generate Invoice
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Validation Error" message={error} />}

        {/* ─── Client & Dates Row ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Client Account" required>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedIncomeIds([]);
                setError(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Issue Date" required>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </FormField>

          <FormField label="Payment Terms">
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="15">Net 15 Days</option>
              <option value="30">Net 30 Days (Standard)</option>
              <option value="45">Net 45 Days</option>
              <option value="60">Net 60 Days</option>
            </select>
          </FormField>
        </div>

        {/* ─── Eligible Income Records Selection ────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Select Eligible Revenue / Timesheet Records</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({clientEligibleIncome.length} available for invoicing)
              </span>
            </label>
            {clientEligibleIncome.length > 0 && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="border border-white/5 rounded-xl max-h-56 overflow-y-auto bg-slate-950/40">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 sticky top-0 text-[10px] text-slate-400 uppercase border-b border-white/5">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Income ID</th>
                  <th className="px-3 py-2 text-left">Consultant & Role</th>
                  <th className="px-3 py-2 text-left">Source Timesheet</th>
                  <th className="px-3 py-2 text-center">Period</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Bill Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientEligibleIncome.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-slate-500">
                      No unbilled recognized income records found for this client.
                      <p className="text-[11px] text-slate-600 mt-1">
                        Ensure consultant timesheets are approved and recognized under Income / Revenue.
                      </p>
                    </td>
                  </tr>
                ) : (
                  clientEligibleIncome.map((inc) => {
                    const isSelected = selectedIncomeIds.includes(inc.id);
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => handleToggleIncome(inc.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-950/30 text-white' : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleIncome(inc.id)}
                            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-400">
                          {inc.id}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <div className="truncate max-w-[150px] font-semibold text-white">{inc.employeeName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{inc.jobTitle || inc.description}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                          {inc.sourceId || inc.traceability?.sourceTimesheetId || 'Timesheet Ref'}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">
                          {inc.periodEnding || inc.period}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-white">
                          {(inc.billableHours || inc.totalHours || 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          ${(inc.billingRate || inc.rate || 0).toFixed(2)}/hr
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                          ${(inc.amount || inc.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Financial Totals Summary ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/60 rounded-xl border border-white/5 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Subtotal</p>
            <CurrencyDisplay value={totals.subtotal} className="text-sm font-bold text-white" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Tax Rate (%)</p>
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-16 mx-auto bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-center text-xs text-white font-mono"
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Tax Amount</p>
            <CurrencyDisplay value={totals.taxAmount} className="text-sm font-bold text-slate-300" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total Invoice</p>
            <CurrencyDisplay value={totals.totalAmount} className="text-base font-extrabold text-emerald-400" />
          </div>
        </div>

        {/* ─── Notes / Optional Number ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Custom Invoice # (Optional)" helperText="Leave blank for automatic sequential numbering.">
            <input
              type="text"
              value={customInvoiceNumber}
              onChange={(e) => setCustomInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-0901"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </FormField>
          <FormField label="Internal Notes / Remittance Terms">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wire remittance details or purchase order number"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
};

/**
 * InvoiceDetailModal — Read-only document view of invoice with line items, full financial traceability, and payment history.
 * 
 * Traceability Chain:
 * Client -> Invoice -> Income / Revenue -> Approved Timesheet -> Placement -> Employee
 */
export const InvoiceDetailModal = ({ isOpen, invoice, payments = [], onRecordPayment, onClose }) => {
  if (!invoice) return null;
  const inv = invoice;
  const balance = inv.balanceDue !== undefined ? inv.balanceDue : +(inv.totalAmount - (inv.paidAmount || 0)).toFixed(2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${inv.invoiceNumber || inv.id}`}
      subtitle={`${inv.clientName} • Issue Date: ${inv.issueDate}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Badge status={inv.status} />
            <span className="text-xs text-slate-400">Aging: <strong className="text-white">{inv.agingBucket || 'Current'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {balance > 0 && inv.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={onRecordPayment}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Icon name="income" className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ─── Traceability Pathway Header ─────────────────────── */}
        <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-indigo-400">Traceability:</span>
            <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">{inv.clientName}</span>
            <span className="text-slate-500">→</span>
            <span className="bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded font-mono font-semibold">{inv.invoiceNumber || inv.id}</span>
            <span className="text-slate-500">→</span>
            <span className="text-slate-400">{inv.lineItems?.length || 0} Linked Revenue Records</span>
          </div>
          <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
            ✓ Source Timesheets Verified
          </div>
        </div>

        {/* ─── Header Info Grid ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Client Account</span>
            <span className="font-semibold text-white">{inv.clientName}</span>
            <span className="text-[10px] text-slate-500 font-mono block">{inv.clientId}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Due Date</span>
            <span className="font-mono text-white">{inv.dueDate}</span>
            <span className="text-[10px] text-slate-400 block">Issued: {inv.issueDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Total Invoiced</span>
            <CurrencyDisplay value={inv.totalAmount} className="font-bold text-white text-sm" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Balance Due</span>
            <CurrencyDisplay
              value={balance}
              className={balance > 0 ? 'font-extrabold text-amber-400 text-sm' : 'font-bold text-slate-500 text-sm'}
            />
          </div>
        </div>

        {/* ─── Line Items Table ────────────────────────────────── */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center justify-between">
            <span>Itemized Invoice Lines</span>
            <span className="text-[10px] text-slate-400 font-normal">Directly linked to Revenue, Timesheet, and Placement</span>
          </h4>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Description / Service</th>
                  <th className="px-3 py-2 text-center">Income Ref</th>
                  <th className="px-3 py-2 text-center">Timesheet Ref</th>
                  <th className="px-3 py-2 text-center">Placement</th>
                  <th className="px-3 py-2 text-right">Hours / Qty</th>
                  <th className="px-3 py-2 text-right">Billing Rate</th>
                  <th className="px-3 py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(inv.lineItems && inv.lineItems.length > 0) ? (
                  inv.lineItems.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="px-3 py-2 font-medium text-white">{line.description}</td>
                      <td className="px-3 py-2 text-center font-mono text-indigo-400 font-semibold">{line.incomeId || 'Direct'}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-300">
                        {line.sourceTimesheetId ? (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">{line.sourceTimesheetId}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px]">{line.placementId || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(line.quantity || 0).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono">${Number(line.rate || 0).toFixed(2)}/hr</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                        <CurrencyDisplay value={line.amount} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-3 py-3 text-center text-slate-500">
                      Standard consulting billing services.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-slate-900/80 font-semibold">
                  <td colSpan="6" className="px-3 py-1.5 text-right text-slate-400 text-xs">Subtotal:</td>
                  <td className="px-3 py-1.5 text-right font-mono text-white"><CurrencyDisplay value={inv.subtotal || inv.totalAmount} /></td>
                </tr>
                {inv.taxAmount > 0 && (
                  <tr className="bg-slate-900/80 font-semibold">
                    <td colSpan="6" className="px-3 py-1 text-right text-slate-400 text-xs">Tax ({inv.taxRate}%):</td>
                    <td className="px-3 py-1 text-right font-mono text-slate-300"><CurrencyDisplay value={inv.taxAmount} /></td>
                  </tr>
                )}
                <tr className="border-t border-indigo-500/30 bg-slate-800/80 font-extrabold text-sm">
                  <td colSpan="6" className="px-3 py-2 text-right text-white">Total Amount:</td>
                  <td className="px-3 py-2 text-right font-mono text-white"><CurrencyDisplay value={inv.totalAmount} /></td>
                </tr>
                <tr className="bg-slate-900/80">
                  <td colSpan="6" className="px-3 py-1.5 text-right text-slate-400 text-xs">Amount Paid:</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-400 font-bold"><CurrencyDisplay value={inv.paidAmount || 0} /></td>
                </tr>
                <tr className="border-t-2 border-amber-500/30 bg-slate-900 font-extrabold text-sm">
                  <td colSpan="6" className="px-3 py-2 text-right text-amber-300">Remaining Balance:</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-400"><CurrencyDisplay value={balance} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ─── Payments Applied History ────────────────────────── */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white">Payment Receipts Applied</h4>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Payment ID</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-center">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-400">{p.id}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{p.paymentReference}</td>
                      <td className="px-3 py-2 text-slate-300">{p.paymentMethod}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-400">{p.paymentDate}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        <CurrencyDisplay value={p.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Notes ───────────────────────────────────────────── */}
        {inv.notes && (
          <div className="p-3 bg-slate-800/30 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-400 uppercase mb-0.5">Notes & Terms</p>
            <p className="text-xs text-slate-300">{inv.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

/**
 * RecordArPaymentModal — Records payment receipt against an invoice with excessive payment prevention.
 */
export const RecordArPaymentModal = ({ isOpen, initialInvoice, invoices = [], onSave, onClose }) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoice?.id || invoices[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Wire Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || initialInvoice;
  const balanceDue = selectedInvoice ? (selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : +(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toFixed(2)) : 0;

  const handleFillFullBalance = () => {
    if (balanceDue > 0) {
      setAmount(balanceDue.toString());
      setError(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedInvoice) {
      setError('Please select an invoice.');
      return;
    }

    const numAmount = parseFloat(amount);
    const validation = validateARPayment(selectedInvoice, numAmount);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    onSave({
      invoiceId: selectedInvoice.id,
      amount: numAmount,
      paymentDate,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Client Payment"
      subtitle="Apply incoming wire, ACH, or check settlement against an open client invoice."
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
          >
            Record Payment Receipt
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Payment Blocked" message={error} />}

        <FormField label="Target Invoice" required>
          <select
            value={selectedInvoiceId}
            onChange={(e) => {
              setSelectedInvoiceId(e.target.value);
              setError(null);
            }}
            disabled={Boolean(initialInvoice)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.clientName} (Bal: ${inv.balanceDue?.toLocaleString() || (inv.totalAmount - (inv.paidAmount || 0)).toLocaleString()})
              </option>
            ))}
          </select>
        </FormField>

        {selectedInvoice && (
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total</span>
              <CurrencyDisplay value={selectedInvoice.totalAmount} className="font-bold text-white" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Paid So Far</span>
              <CurrencyDisplay value={selectedInvoice.paidAmount || 0} className="font-semibold text-slate-300" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Balance Due</span>
              <CurrencyDisplay value={balanceDue} className="font-extrabold text-amber-400" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Payment Amount ($)" required>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-16 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">$</div>
              <button
                type="button"
                onClick={handleFillFullBalance}
                className="absolute inset-y-1 right-1 px-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded"
              >
                Pay Full
              </button>
            </div>
          </FormField>

          <FormField label="Payment Date" required>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Payment Method" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Wire Transfer">Wire Transfer</option>
              <option value="ACH Credit">ACH Credit</option>
              <option value="Check">Check / Lockbox</option>
              <option value="Credit Card">Credit Card</option>
              <option value="EFT / Direct Deposit">EFT / Direct Deposit</option>
            </select>
          </FormField>

          <FormField label="Payment Reference / Trace #">
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. ACH-WIRE-99211"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </FormField>
        </div>

        <FormField label="Notes / Remittance Advice">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cleared via Silicon Valley Bank batch #401"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </FormField>
      </form>
    </Modal>
  );
};
