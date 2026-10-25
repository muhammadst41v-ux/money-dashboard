import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseCSV, formatCurrency } from '../utils/formatters';
import { IncomeEntry, CurrencyCode } from '../types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: IncomeEntry[]) => void;
  currency: CurrencyCode;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currency,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedEntries, setParsedEntries] = useState<Partial<IncomeEntry>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = (f: File) => {
    setFile(f);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { entries, errors } = parseCSV(text);
      setParsedEntries(entries);
      setParseErrors(errors);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setParseErrors(['Failed to read file. Please ensure it is a valid CSV.']);
      setIsProcessing(false);
    };
    reader.readAsText(f);
  };

  const handleConfirmImport = () => {
    if (parsedEntries.length === 0) return;

    const completeEntries: IncomeEntry[] = parsedEntries.map((pe, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      date: pe.date || new Date().toISOString().split('T')[0],
      amount: pe.amount || 0,
      category: pe.category || 'Other',
      source: pe.source || 'Imported Source',
      note: pe.note || '',
      status: pe.status || 'Received',
      createdAt: new Date().toISOString(),
    }));

    onImport(completeEntries);
    onClose();
  };

  const totalAmount = parsedEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import Income from CSV</h3>
              <p className="text-xs text-slate-500">
                Bulk upload transactions (expected columns: date, amount, category, source)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-amber-50/20 transition-all cursor-pointer relative"
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {file ? file.name : 'Click to select or drag & drop a .csv file'}
              </p>
              <p className="text-xs text-slate-500">
                Supported columns: <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700">date</code>,{' '}
                <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700">amount</code>,{' '}
                <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700">category</code>,{' '}
                <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700">source</code>
              </p>
            </div>
          </div>

          {/* Errors list */}
          {parseErrors.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Parsing Notices ({parseErrors.length})
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-red-600">
                {parseErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parseErrors.length > 3 && (
                  <li>...and {parseErrors.length - 3} more minor warnings</li>
                )}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedEntries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{parsedEntries.length} entries ready to import</span>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Total: {formatCurrency(totalAmount, currency)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {parsedEntries.slice(0, 20).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                        <td className="px-3 py-2 font-medium truncate max-w-[140px]">
                          {entry.source}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{entry.category}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {formatCurrency(entry.amount, currency)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              entry.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {entry.status || 'Received'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedEntries.length > 20 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Showing first 20 of {parsedEntries.length} rows
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedEntries.length === 0 || isProcessing}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
          >
            Import {parsedEntries.length > 0 ? `${parsedEntries.length} Entries` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
