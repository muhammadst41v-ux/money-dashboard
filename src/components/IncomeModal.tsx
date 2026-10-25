import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, DollarSign, Tag, Building2, FileText, Clock } from 'lucide-react';
import { IncomeEntry, IncomeStatus, StreamConfig, CurrencyCode } from '../types';
import { CURRENCY_CONFIG } from '../utils/formatters';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<IncomeEntry>) => void;
  entryToEdit?: IncomeEntry | null;
  streams: StreamConfig[];
  currency: CurrencyCode;
  existingSources?: string[];
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  entryToEdit,
  streams,
  currency,
  existingSources = [],
}) => {
  const [date, setDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<IncomeStatus>('Received');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (entryToEdit) {
      setDate(entryToEdit.date);
      setAmount(entryToEdit.amount.toString());
      setCategory(entryToEdit.category);
      setSource(entryToEdit.source);
      setNote(entryToEdit.note || '');
      setStatus(entryToEdit.status);
    } else {
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setAmount('');
      setCategory(streams[0]?.name || 'Client Work');
      setSource('');
      setNote('');
      setStatus('Received');
    }
    setError('');
  }, [entryToEdit, isOpen, streams]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!date) {
      setError('Please select a valid date');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }
    if (!category.trim()) {
      setError('Please select an income stream');
      return;
    }
    if (!source.trim()) {
      setError('Please provide a source name (client, brand, platform)');
      return;
    }

    onSave({
      id: entryToEdit?.id,
      date,
      amount: numAmount,
      category: category.trim(),
      source: source.trim(),
      note: note.trim(),
      status,
      createdAt: entryToEdit?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  const currencySymbol = CURRENCY_CONFIG[currency]?.symbol || currency;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {entryToEdit ? 'Edit Income Entry' : 'Add New Income'}
            </h3>
            <p className="text-xs text-slate-500">
              Record billable work, sponsorship, product sale, or other revenue
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Amount & Currency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Amount ({currency}) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm pointer-events-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 85000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={!entryToEdit}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Stream / Category & Date (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Stream / Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden transition-all"
              >
                {streams.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Source Name (Client, Brand, Platform) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Source Name *
            </label>
            <input
              type="text"
              list="sources-list"
              placeholder="e.g. Apex Software, NordVPN, Gumroad, Figma"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden transition-all"
            />
            <datalist id="sources-list">
              {existingSources.map((src, i) => (
                <option key={i} value={src} />
              ))}
            </datalist>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UI overhaul sprint milestone 1, sponsored post"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden transition-all"
            />
          </div>

          {/* Status Selection (Received vs Pending) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Payment Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('Received')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  status === 'Received'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Received</span>
                {status === 'Received' && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setStatus('Pending')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  status === 'Pending'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Pending</span>
                {status === 'Pending' && <Check className="w-4 h-4 ml-auto text-amber-600" />}
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
            >
              {entryToEdit ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
