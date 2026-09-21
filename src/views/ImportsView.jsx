import React, { useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { DataTable } from '../components/common/DataTable';
import { FilterBar } from '../components/common/FilterBar';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { DateDisplay } from '../components/common/Formatters';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField, SelectInput } from '../components/common/FormField';
import { Icon } from '../components/common/Icons';
import { Alert } from '../components/common/Feedback';
import {
  addImport,
  processImport,
  rejectImport,
  addToast,
} from '../store/dataSlice';
import {
  parseCSVString,
  validateCSVHeaders,
  validateCSVRow,
  CSV_IMPORT_SCHEMAS,
} from '../utils/validation';

/**
 * ImportsView Component
 *
 * @purpose Traceable CSV import pipeline with file upload, parsing, preview, validation,
 *          process/reject stages, and full import history audit trail.
 * @behavior
 *   - Supports real CSV file reading via FileReader and drag-and-drop.
 *   - Parses CSV content, validates headers and rows against typed schemas.
 *   - Displays preview table with per-row validation status (Valid/Error).
 *   - Process: converts valid rows to JSON records and logs the import batch.
 *   - Reject: records rejection reasons and archives the batch.
 *   - Never modifies original CSV files (read-only ingestion).
 *   - Templates downloadable for Timesheets, Employees, and Placements.
 *   - Full import history with detail inspector showing pipeline stages and parsed records.
 * @reusability Consumes DataTable, FilterBar, Pagination, Modal, Badge, Alert, and Icon.
 */
export const ImportsView = () => {
  const dispatch = useDispatch();
  const imports = useSelector((state) => state.data.imports);

  // ─── Upload & Parse State ───────────────────────────────────
  const [dragActive, setDragActive] = useState(false);
  const [importType, setImportType] = useState('Timesheets');
  const [parsedData, setParsedData] = useState(null); // { fileName, fileSize, headers, rows, validationResults }
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef(null);

  // ─── History State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [confirmReject, setConfirmReject] = useState(false);

  // ─── File Reading ───────────────────────────────────────────
  const handleFileRead = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      const { headers, rows } = parseCSVString(csvText);

      if (headers.length === 0) {
        dispatch(addToast({ title: 'Parse Error', message: 'Could not parse CSV file. Please check the file format.', type: 'error' }));
        return;
      }

      // Get schema for selected import type
      const schema = CSV_IMPORT_SCHEMAS[importType];
      if (!schema) {
        dispatch(addToast({ title: 'Unknown Type', message: `No schema defined for import type: ${importType}`, type: 'error' }));
        return;
      }

      // Validate headers
      const headerCheck = validateCSVHeaders(headers, schema.expectedHeaders);

      // Validate each row
      const validationResults = rows.map((row) => {
        const result = validateCSVRow(row, schema.fieldSchema);
        return {
          ...row,
          _valid: result.valid && headerCheck.valid,
          _errors: [
            ...(headerCheck.valid ? [] : headerCheck.missing.map((m) => ({ field: m, message: `Missing required column: ${m}` }))),
            ...result.errors,
          ],
        };
      });

      setParsedData({
        fileName: file.name,
        fileSize: file.size,
        headers,
        rows: validationResults,
        headerCheck,
        totalRows: rows.length,
        validRows: validationResults.filter((r) => r._valid).length,
        errorRows: validationResults.filter((r) => !r._valid).length,
      });
      setShowPreviewModal(true);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFileRead(file);
    } else {
      dispatch(addToast({ title: 'Invalid File', message: 'Please upload a CSV file (.csv).', type: 'warning' }));
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    e.target.value = ''; // Reset so same file can be re-selected
  };

  // ─── Process Import ─────────────────────────────────────────
  const handleProcessImport = () => {
    if (!parsedData) return;

    const batchId = `IMP-${1300 + Math.floor(Math.random() * 700)}`;
    const now = new Date().toISOString();

    const importRecord = {
      id: batchId,
      batchName: parsedData.fileName,
      originalFileName: parsedData.fileName,
      importType,
      module: importType,
      recordsRead: parsedData.totalRows,
      recordsProcessed: parsedData.totalRows,
      recordsSucceeded: parsedData.validRows,
      recordsFailed: parsedData.errorRows,
      importedBy: 'Admin (Alex Morgan)',
      fileSizeBytes: parsedData.fileSize,
      pipeline: {
        incoming: now,
        parsed: now,
        validated: now,
        processed: null,
        rejected: null,
      },
      rejectionReasons: parsedData.rows
        .filter((r) => !r._valid)
        .map((r) => ({
          row: r._rowNumber,
          field: r._errors?.[0]?.field || 'unknown',
          message: r._errors?.[0]?.message || 'Validation error',
        })),
      archiveRef: `ARCH-${new Date().toISOString().split('T')[0]}-${batchId}`,
      parsedRecords: parsedData.rows.slice(0, 5).map((r) => ({
        row: r._rowNumber,
        ...Object.fromEntries(
          parsedData.headers.slice(0, 4).map((h) => [h, r[h] || ''])
        ),
        status: r._valid ? 'Valid' : 'Error',
      })),
    };

    dispatch(addImport(importRecord));
    dispatch(processImport({
      id: batchId,
      recordsFailed: parsedData.errorRows,
    }));

    dispatch(addToast({
      title: 'Import Processed',
      message: `${batchId}: ${parsedData.validRows}/${parsedData.totalRows} records imported successfully from ${parsedData.fileName}.`,
      type: parsedData.errorRows > 0 ? 'warning' : 'success',
    }));

    setParsedData(null);
    setShowPreviewModal(false);
  };

  // ─── Reject Import ──────────────────────────────────────────
  const handleRejectImport = () => {
    if (!parsedData) return;

    const batchId = `IMP-${1300 + Math.floor(Math.random() * 700)}`;
    const now = new Date().toISOString();

    const importRecord = {
      id: batchId,
      batchName: parsedData.fileName,
      originalFileName: parsedData.fileName,
      importType,
      module: importType,
      recordsRead: parsedData.totalRows,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: parsedData.totalRows,
      importedBy: 'Admin (Alex Morgan)',
      fileSizeBytes: parsedData.fileSize,
      pipeline: {
        incoming: now,
        parsed: now,
        validated: now,
        processed: null,
        rejected: null,
      },
      rejectionReasons: parsedData.rows
        .filter((r) => !r._valid)
        .map((r) => ({
          row: r._rowNumber,
          field: r._errors?.[0]?.field || 'unknown',
          message: r._errors?.[0]?.message || 'Validation error',
        })),
      archiveRef: `ARCH-${new Date().toISOString().split('T')[0]}-${batchId}`,
      parsedRecords: parsedData.rows.slice(0, 5).map((r) => ({
        row: r._rowNumber,
        ...Object.fromEntries(
          parsedData.headers.slice(0, 4).map((h) => [h, r[h] || ''])
        ),
        status: r._valid ? 'Valid' : 'Error',
      })),
    };

    dispatch(addImport(importRecord));
    dispatch(rejectImport({
      id: batchId,
      recordsFailed: parsedData.totalRows,
    }));

    dispatch(addToast({
      title: 'Import Rejected',
      message: `${batchId}: Entire batch from ${parsedData.fileName} has been rejected and archived.`,
      type: 'error',
    }));

    setParsedData(null);
    setShowPreviewModal(false);
    setConfirmReject(false);
  };

  // ─── Template Download ──────────────────────────────────────
  const handleDownloadTemplate = (type) => {
    const schema = CSV_IMPORT_SCHEMAS[type];
    if (!schema) return;
    const blob = new Blob([schema.templateCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type.toLowerCase()}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch(addToast({ title: 'Template Downloaded', message: `${type} CSV template saved to your downloads.`, type: 'info' }));
  };

  // ─── History Filtering ─────────────────────────────────────
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(imports.map((i) => i.importType || i.module))];
    return ['All', ...types.sort()];
  }, [imports]);

  const filtered = useMemo(() => {
    return imports.filter((imp) => {
      const matchesStatus = statusFilter === 'All' || imp.status === statusFilter;
      const matchesType = typeFilter === 'All' || (imp.importType || imp.module) === typeFilter;
      const searchTarget = `${imp.id} ${imp.batchName} ${imp.importedBy}`.toLowerCase();
      const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [imports, statusFilter, typeFilter, searchQuery]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // ─── History Table Columns ──────────────────────────────────
  const historyColumns = [
    { header: 'Batch ID', accessor: 'id', sortable: true },
    {
      header: 'Filename & Type',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white block truncate max-w-[200px]">{row.batchName}</span>
          <span className="text-[11px] text-indigo-400">{row.importType || row.module}</span>
        </div>
      ),
    },
    {
      header: 'Records',
      render: (row) => (
        <span className="font-mono text-xs">
          <span className="text-white">{row.recordsRead || row.recordsProcessed}</span>
          {' read • '}
          <span className="text-emerald-400">{row.recordsSucceeded}</span>
          {' ok • '}
          <span className={row.recordsFailed > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
            {row.recordsFailed} fail
          </span>
        </span>
      ),
    },
    { header: 'Imported By', accessor: 'importedBy', sortable: true },
    {
      header: 'Date',
      accessor: 'createdAt',
      sortable: true,
      render: (row) => <DateDisplay date={row.createdAt} format="full" />,
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: '',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          onClick={() => setInspectTarget(row)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="View Import Details"
        >
          <Icon name="eye" className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CSV Import Pipeline"
        subtitle="Upload, parse, validate, and process CSV data files with full traceability and audit trail."
        badge="Operations"
      />

      <Alert
        type="info"
        title="Import Pipeline"
        message="Incoming → Parse → Validate → Convert to JSON → Process or Reject. Original CSV files are never modified. Each batch receives a unique tracking ID."
      />

      {/* ─── Import Type Selector + Upload Zone ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Type Selector & Templates */}
        <div className="p-5 bg-slate-900/50 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">Import Configuration</h3>

          <FormField label="Import Type" helperText="Select the data type to import.">
            <SelectInput
              value={importType}
              onChange={setImportType}
              options={Object.keys(CSV_IMPORT_SCHEMAS).map((k) => ({ value: k, label: k }))}
            />
          </FormField>

          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Expected Columns</p>
            <div className="flex flex-wrap gap-1.5">
              {CSV_IMPORT_SCHEMAS[importType]?.expectedHeaders.map((h) => (
                <span key={h} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-mono rounded-md border border-indigo-500/20">
                  {h}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Download Templates</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CSV_IMPORT_SCHEMAS).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleDownloadTemplate(type)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  <Icon name="download" className="w-3 h-3" />
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="lg:col-span-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`h-full min-h-[200px] flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-slate-700/80 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${
              dragActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <Icon name="imports" className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {dragActive ? 'Drop your CSV file here' : 'Drag and drop CSV file'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Upload a <span className="text-indigo-400 font-semibold">{importType}</span> CSV file.
              The file will be parsed, validated against the schema, and staged for processing.
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
            >
              Select File from Computer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* ─── Import History ────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Icon name="audit" className="w-4 h-4 text-slate-400" />
          Import History & Audit Trail
        </h3>

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: ['All', 'Completed', 'Completed with Warnings', 'Rejected', 'Processing'],
              value: statusFilter,
              onChange: (v) => { setStatusFilter(v); setCurrentPage(1); },
            },
            {
              key: 'type',
              label: 'Type',
              options: uniqueTypes,
              value: typeFilter,
              onChange: (v) => { setTypeFilter(v); setCurrentPage(1); },
            },
          ]}
          onReset={() => { setSearchQuery(''); setStatusFilter('All'); setTypeFilter('All'); setCurrentPage(1); }}
        />

        <div className="mt-3 rounded-2xl border border-white/5 overflow-hidden">
          <DataTable columns={historyColumns} data={paginatedHistory} keyField="id" />
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* ─── CSV Preview & Validation Modal ────────────────── */}
      {showPreviewModal && parsedData && (
        <ImportPreviewModal
          isOpen={true}
          data={parsedData}
          importType={importType}
          onProcess={handleProcessImport}
          onReject={() => setConfirmReject(true)}
          onClose={() => { setShowPreviewModal(false); setParsedData(null); }}
        />
      )}

      {/* ─── Reject Confirmation ───────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmReject}
        title="Reject Entire Import Batch?"
        message={`This will reject all ${parsedData?.totalRows || 0} records from ${parsedData?.fileName}. The batch will be archived with rejection reasons.`}
        confirmLabel="Reject Batch"
        variant="danger"
        onConfirm={handleRejectImport}
        onCancel={() => setConfirmReject(false)}
      />

      {/* ─── Import Detail Inspector ───────────────────────── */}
      {inspectTarget && (
        <ImportDetailModal
          isOpen={true}
          importRecord={inspectTarget}
          onClose={() => setInspectTarget(null)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Sub-Components (private to this module)
// ═══════════════════════════════════════════════════════════════

/**
 * ImportPreviewModal — Displays parsed CSV data with per-row validation status.
 * Allows the user to Process (import valid rows) or Reject (discard entire batch).
 */
const ImportPreviewModal = ({ isOpen, data, importType, onProcess, onReject, onClose }) => {
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 10;
  const paginatedRows = data.rows.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CSV Import Preview & Validation"
      subtitle={`${data.fileName} • ${importType} • ${data.totalRows} records parsed`}
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onReject} className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition-colors">
            Reject Batch
          </button>
          <button
            type="button"
            onClick={onProcess}
            disabled={data.validRows === 0}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Process {data.validRows} Valid Records
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Header Validation */}
        {!data.headerCheck?.valid && (
          <Alert
            type="error"
            title="Missing Required Columns"
            message={`The following required columns were not found: ${data.headerCheck.missing.join(', ')}. Please ensure your CSV matches the template.`}
          />
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Rows</p>
            <p className="text-lg font-bold text-white font-mono">{data.totalRows}</p>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Columns</p>
            <p className="text-lg font-bold text-indigo-400 font-mono">{data.headers.length}</p>
          </div>
          <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-center">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider">Valid</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{data.validRows}</p>
          </div>
          <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 text-center">
            <p className="text-[10px] text-rose-400 uppercase tracking-wider">Errors</p>
            <p className="text-lg font-bold text-rose-400 font-mono">{data.errorRows}</p>
          </div>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>File: <span className="text-white font-medium">{data.fileName}</span></span>
          <span>Size: <span className="text-white font-medium">{(data.fileSize / 1024).toFixed(1)} KB</span></span>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800/60">
                <th className="px-2 py-2 text-left text-[10px] text-slate-400 uppercase font-semibold w-10">#</th>
                {data.headers.map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[10px] text-slate-400 uppercase font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[10px] text-slate-400 uppercase font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-t border-white/5 ${!row._valid ? 'bg-rose-500/5' : ''}`}
                >
                  <td className="px-2 py-1.5 text-slate-500 font-mono">{row._rowNumber}</td>
                  {data.headers.map((h) => (
                    <td key={h} className="px-2 py-1.5 text-white truncate max-w-[150px]" title={row[h] || ''}>
                      {row[h] || <span className="text-slate-600">—</span>}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    {row._valid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <Icon name="check" className="w-3 h-3" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold" title={row._errors?.map((e) => e.message).join('; ')}>
                        <Icon name="alert" className="w-3 h-3" /> Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview pagination */}
        {data.totalRows > previewPageSize && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={previewPage <= 1}
              onClick={() => setPreviewPage((p) => p - 1)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {previewPage} of {Math.ceil(data.totalRows / previewPageSize)}
            </span>
            <button
              type="button"
              disabled={previewPage >= Math.ceil(data.totalRows / previewPageSize)}
              onClick={() => setPreviewPage((p) => p + 1)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Error Details */}
        {data.errorRows > 0 && (
          <div>
            <h4 className="text-xs font-bold text-rose-400 mb-2">Validation Errors ({data.errorRows} rows)</h4>
            <div className="max-h-40 overflow-y-auto space-y-1 p-3 bg-rose-500/5 rounded-xl border border-rose-500/20">
              {data.rows.filter((r) => !r._valid).map((row, idx) => (
                <div key={idx} className="text-[11px]">
                  <span className="text-rose-400 font-mono">Row {row._rowNumber}:</span>{' '}
                  {row._errors?.map((e, i) => (
                    <span key={i} className="text-slate-300">
                      {e.field}: {e.message}{i < row._errors.length - 1 ? ' | ' : ''}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

/**
 * ImportDetailModal — Read-only inspector for a completed import record.
 * Shows pipeline stages, parsed records, and rejection reasons.
 */
const ImportDetailModal = ({ isOpen, importRecord, onClose }) => {
  if (!importRecord) return null;
  const imp = importRecord;

  const pipelineStages = [
    { label: 'Incoming', time: imp.pipeline?.incoming, icon: 'imports' },
    { label: 'Parsed', time: imp.pipeline?.parsed, icon: 'filter' },
    { label: 'Validated', time: imp.pipeline?.validated, icon: 'check' },
    { label: imp.pipeline?.rejected ? 'Rejected' : 'Processed', time: imp.pipeline?.processed || imp.pipeline?.rejected, icon: imp.pipeline?.rejected ? 'alert' : 'check' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Import Details — ${imp.id}`} subtitle={imp.batchName} size="lg">
      <div className="space-y-5">
        {/* Status & Type */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge status={imp.status} />
          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold rounded-md border border-indigo-500/20">
            {imp.importType || imp.module}
          </span>
          <span className="text-xs text-slate-400">by <span className="text-white">{imp.importedBy}</span></span>
        </div>

        {/* Record Counts */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Read</p>
            <p className="text-lg font-bold text-white font-mono">{imp.recordsRead || imp.recordsProcessed}</p>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Processed</p>
            <p className="text-lg font-bold text-white font-mono">{imp.recordsProcessed}</p>
          </div>
          <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-center">
            <p className="text-[10px] text-emerald-400 uppercase">Succeeded</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{imp.recordsSucceeded}</p>
          </div>
          <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 text-center">
            <p className="text-[10px] text-rose-400 uppercase">Failed</p>
            <p className="text-lg font-bold text-rose-400 font-mono">{imp.recordsFailed}</p>
          </div>
        </div>

        {/* Pipeline Timeline */}
        {imp.pipeline && (
          <div>
            <h4 className="text-xs font-bold text-white mb-3">Pipeline Stages</h4>
            <div className="flex items-center gap-0">
              {pipelineStages.map((stage, idx) => (
                <div key={idx} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-1 ${stage.time ? '' : 'opacity-30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stage.time
                        ? stage.label === 'Rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-600'
                    }`}>
                      <Icon name={stage.icon} className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{stage.label}</p>
                    {stage.time && (
                      <p className="text-[9px] text-slate-600 font-mono">
                        {new Date(stage.time).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  {idx < pipelineStages.length - 1 && (
                    <div className={`h-0.5 w-full -mt-4 ${stage.time ? 'bg-emerald-500/30' : 'bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Records Preview */}
        {imp.parsedRecords && imp.parsedRecords.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-white mb-2">Parsed Records (Sample)</h4>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className="px-2 py-2 text-left text-[10px] text-slate-400 uppercase">Row</th>
                    {Object.keys(imp.parsedRecords[0] || {}).filter((k) => k !== 'row' && k !== 'status').map((key) => (
                      <th key={key} className="px-2 py-2 text-left text-[10px] text-slate-400 uppercase">{key}</th>
                    ))}
                    <th className="px-2 py-2 text-center text-[10px] text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {imp.parsedRecords.map((rec, idx) => (
                    <tr key={idx} className={`border-t border-white/5 ${rec.status === 'Error' ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-2 py-1.5 text-slate-500 font-mono">{rec.row}</td>
                      {Object.entries(rec).filter(([k]) => k !== 'row' && k !== 'status').map(([key, val]) => (
                        <td key={key} className="px-2 py-1.5 text-white truncate max-w-[120px]">{String(val)}</td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        {rec.status === 'Valid' ? (
                          <span className="text-emerald-400 text-[10px] font-semibold">Valid</span>
                        ) : (
                          <span className="text-rose-400 text-[10px] font-semibold">Error</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rejection Reasons */}
        {imp.rejectionReasons && imp.rejectionReasons.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-rose-400 mb-2">Rejection / Error Details</h4>
            <div className="max-h-40 overflow-y-auto space-y-1 p-3 bg-rose-500/5 rounded-xl border border-rose-500/20">
              {imp.rejectionReasons.map((reason, idx) => (
                <div key={idx} className="text-[11px]">
                  <span className="text-rose-400 font-mono">Row {reason.row}</span>
                  <span className="text-slate-500"> • {reason.field}: </span>
                  <span className="text-slate-300">{reason.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Metadata */}
        <div className="p-3 bg-slate-800/30 rounded-xl border border-white/5 space-y-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">File & Audit Metadata</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400">
            <p>Original File: <span className="text-white font-medium">{imp.originalFileName || imp.batchName}</span></p>
            <p>File Size: <span className="text-white font-medium">{imp.fileSizeBytes ? `${(imp.fileSizeBytes / 1024).toFixed(1)} KB` : '—'}</span></p>
            <p>Archive Ref: <span className="text-indigo-400 font-mono">{imp.archiveRef || '—'}</span></p>
            <p>Version: <span className="text-white">v{imp.version}</span></p>
            <p>Created: <DateDisplay date={imp.createdAt} format="full" /></p>
            <p>Updated: <DateDisplay date={imp.updatedAt} format="full" /></p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
