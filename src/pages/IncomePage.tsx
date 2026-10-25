import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Tag,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { IncomeEntry, StreamConfig, CurrencyCode, IncomeStatus } from '../types';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';

interface IncomePageProps {
  entries: IncomeEntry[];
  streams: StreamConfig[];
  currency: CurrencyCode;
  onOpenAddModal: () => void;
  onEditEntry: (entry: IncomeEntry) => void;
  onDeleteEntry: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenImportModal: () => void;
  initialCategoryFilter?: string;
}

export const IncomePage: React.FC<IncomePageProps> = ({
  entries,
  streams,
  currency,
  onOpenAddModal,
  onEditEntry,
  onDeleteEntry,
  onToggleStatus,
  onOpenImportModal,
  initialCategoryFilter = 'all',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStream, setSelectedStream] = useState<string>(initialCategoryFilter);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Available months from entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach((e) => {
      if (e.date) months.add(e.date.slice(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [entries]);

  // Filtered & sorted entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchSource = e.source.toLowerCase().includes(q);
          const matchCat = e.category.toLowerCase().includes(q);
          const matchNote = (e.note || '').toLowerCase().includes(q);
          if (!matchSource && !matchCat && !matchNote) return false;
        }
        // Stream filter
        if (selectedStream !== 'all' && e.category !== selectedStream) {
          return false;
        }
        // Status filter
        if (selectedStatus !== 'all' && e.status !== selectedStatus) {
          return false;
        }
        // Month filter
        if (selectedMonth !== 'all' && !e.date.startsWith(selectedMonth)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [entries, searchTerm, selectedStream, selectedStatus, selectedMonth, sortBy]);

  // Aggregate stats for filtered view
  const summary = useMemo(() => {
    let total = 0;
    let received = 0;
    let pending = 0;
    filteredEntries.forEach((e) => {
      total += e.amount;
      if (e.status === 'Received') received += e.amount;
      else pending += e.amount;
    });
    return { total, received, pending, count: filteredEntries.length };
  }, [filteredEntries]);

  const handleExport = () => {
    exportToCSV(filteredEntries, `income_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedStream !== 'all' ||
    selectedStatus !== 'all' ||
    selectedMonth !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStream('all');
    setSelectedStatus('all');
    setSelectedMonth('all');
    setSortBy('date-desc');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Income Ledger</h3>
          <p className="text-xs text-slate-500">
            Track, filter, and manage all invoices and incoming payments
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client, brand, stream, or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-hidden transition-all"
            />
          </div>

          {/* Stream Filter */}
          <div>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Streams</option>
              {streams.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => {
                const [y, mm] = m.split('-');
                const d = new Date(parseInt(y), parseInt(mm) - 1, 1);
                const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Sub-bar: Sort & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 hover:text-amber-600 focus:outline-hidden cursor-pointer"
            >
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="amount-desc">Amount (Highest first)</option>
              <option value="amount-asc">Amount (Lowest first)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Filtered Total
          </span>
          <p className="mt-0.5 text-lg font-bold text-slate-900">
            {formatCurrency(summary.total, currency)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Received
          </span>
          <p className="mt-0.5 text-lg font-bold text-emerald-700">
            {formatCurrency(summary.received, currency)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Pending
          </span>
          <p className="mt-0.5 text-lg font-bold text-amber-700">
            {formatCurrency(summary.pending, currency)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Records
          </span>
          <p className="mt-0.5 text-lg font-bold text-slate-800">
            {summary.count} entries
          </p>
        </div>
      </div>

      {/* Main Income Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No income entries found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No entries match your current search or filter combination. Try clearing filters or
              add a new income record.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source (Client / Brand)</th>
                  <th className="px-4 py-3">Stream / Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredEntries.map((entry) => {
                  const streamConf = streams.find((s) => s.name === entry.category);
                  const isReceived = entry.status === 'Received';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-amber-50/20 transition-colors group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(entry.date)}
                      </td>

                      {/* Source & Note */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{entry.source}</div>
                        {entry.note ? (
                          <div className="text-[11px] text-slate-400 font-normal line-clamp-1 max-w-xs">
                            {entry.note}
                          </div>
                        ) : null}
                      </td>

                      {/* Stream Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${streamConf?.color || '#94A3B8'}18`,
                            color: streamConf?.color || '#334155',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: streamConf?.color || '#64748B' }}
                          />
                          {entry.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-extrabold text-sm text-slate-900">
                          {formatCurrency(entry.amount, currency)}
                        </span>
                      </td>

                      {/* Status toggle pill */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(entry.id)}
                          title="Click to toggle status between Received and Pending"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {isReceived ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{entry.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
