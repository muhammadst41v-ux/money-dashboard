import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Check,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { StreamConfig, IncomeEntry, CurrencyCode, StreamRule } from '../types';
import { StreamIcon, AVAILABLE_ICONS, STREAM_COLORS } from '../components/StreamIcon';
import { formatCurrency } from '../utils/formatters';

interface StreamsPageProps {
  streams: StreamConfig[];
  entries: IncomeEntry[];
  rules: StreamRule[];
  currency: CurrencyCode;
  onAddStream: (stream: StreamConfig) => void;
  onUpdateStream: (stream: StreamConfig) => void;
  onDeleteStream: (streamId: string, streamName: string) => void;
  onAddRule: (rule: { pattern: string; stream_name: string }) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onApplyRulesAll: () => Promise<number>;
}

export const StreamsPage: React.FC<StreamsPageProps> = ({
  streams,
  entries,
  rules,
  currency,
  onAddStream,
  onUpdateStream,
  onDeleteStream,
  onAddRule,
  onDeleteRule,
  onApplyRulesAll,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<StreamConfig | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(STREAM_COLORS[0]);
  const [icon, setIcon] = useState(AVAILABLE_ICONS[0].id);
  const [error, setError] = useState('');

  // Rules form state
  const [rulePattern, setRulePattern] = useState('');
  const [ruleStream, setRuleStream] = useState(streams[0]?.name || 'Client Work');
  const [isApplyingRules, setIsApplyingRules] = useState(false);
  const [rulesNotice, setRulesNotice] = useState<string | null>(null);

  // Calculate stream metrics
  const totalRevenueAll = entries.reduce((acc, e) => acc + e.amount, 0);

  const streamMetrics = streams.map((s) => {
    const streamEntries = entries.filter((e) => e.category === s.name);
    const total = streamEntries.reduce((acc, e) => acc + e.amount, 0);
    const count = streamEntries.length;
    const avg = count > 0 ? total / count : 0;
    const percentage = totalRevenueAll > 0 ? (total / totalRevenueAll) * 100 : 0;

    return {
      ...s,
      total,
      count,
      avg,
      percentage,
    };
  });

  const openAddModal = () => {
    setEditingStream(null);
    setName('');
    setColor(STREAM_COLORS[Math.floor(Math.random() * STREAM_COLORS.length)]);
    setIcon('Briefcase');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (stream: StreamConfig) => {
    setEditingStream(stream);
    setName(stream.name);
    setColor(stream.color);
    setIcon(stream.icon);
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a stream name');
      return;
    }

    const isDuplicate = streams.some(
      (s) => s.name.toLowerCase() === name.trim().toLowerCase() && s.id !== editingStream?.id
    );
    if (isDuplicate) {
      setError('A stream with this name already exists');
      return;
    }

    if (editingStream) {
      onUpdateStream({
        ...editingStream,
        name: name.trim(),
        color,
        icon,
      });
    } else {
      onAddStream({
        id: `stream-${Date.now()}`,
        name: name.trim(),
        color,
        icon,
        isDefault: false,
      });
    }

    setIsModalOpen(false);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim() || !ruleStream) return;
    await onAddRule({
      pattern: rulePattern.trim(),
      stream_name: ruleStream,
    });
    setRulePattern('');
  };

  const handleApplyRules = async () => {
    setIsApplyingRules(true);
    setRulesNotice(null);
    try {
      const count = await onApplyRulesAll();
      setRulesNotice(`Successfully re-classified ${count} entries based on current rules.`);
      setTimeout(() => setRulesNotice(null), 4000);
    } catch (err: any) {
      setRulesNotice('Failed to apply rules: ' + err.message);
    } finally {
      setIsApplyingRules(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Income Streams & Auto-Mapping</h3>
          <p className="text-xs text-slate-500">
            Organize revenue streams and configure rules to automatically classify incoming invoices
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Stream</span>
        </button>
      </div>

      {/* Grid of Stream Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {streamMetrics.map((stream) => (
          <div
            key={stream.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
          >
            <div>
              {/* Header with Icon, Name, and Actions */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs"
                    style={{ backgroundColor: stream.color }}
                  >
                    <StreamIcon iconName={stream.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {stream.name}
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {stream.count} record{stream.count === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(stream)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Edit stream"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteStream(stream.id, stream.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete stream"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Revenue Numbers */}
              <div className="mt-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Earned
                </span>
                <p className="mt-0.5 text-xl font-extrabold text-slate-900">
                  {formatCurrency(stream.total, currency)}
                </p>
              </div>

              {/* Share Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-500 text-[11px]">Share</span>
                  <span className="text-slate-900 text-[11px]">{stream.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(2, stream.percentage))}%`,
                      backgroundColor: stream.color,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sub-metrics: Average deal size */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Avg Deal:</span>
              <span className="font-bold text-slate-800">
                {stream.count > 0 ? formatCurrency(stream.avg, currency) : 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Auto-Mapping Rules Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Auto-Mapping Rules</h4>
              <p className="text-xs text-slate-500">
                Automatically categorize synced payments and imported CSVs when the source matches a keyword
              </p>
            </div>
          </div>

          <button
            onClick={handleApplyRules}
            disabled={isApplyingRules}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isApplyingRules ? 'Re-classifying...' : 'Apply Rules to All Entries'}</span>
          </button>
        </div>

        {rulesNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{rulesNotice}</span>
          </div>
        )}

        {/* Add Rule Inline Form */}
        <form onSubmit={handleCreateRule} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">If source contains:</span>
            <input
              type="text"
              placeholder="e.g. Gumroad, Stripe, Sponsor, Retainer"
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 shrink-0">Map to:</span>
            <select
              value={ruleStream}
              onChange={(e) => setRuleStream(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800 cursor-pointer"
            >
              {streams.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!rulePattern.trim()}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
          >
            Add Rule
          </button>
        </form>

        {/* Existing Rules List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rules.map((rule) => {
            const targetStream = streams.find((s) => s.name === rule.stream_name);
            return (
              <div
                key={rule.id}
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] truncate max-w-[110px]">
                    "{rule.pattern}"
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span
                    className="font-semibold px-2 py-0.5 rounded text-[11px] text-white shrink-0"
                    style={{ backgroundColor: targetStream?.color || '#F59E0B' }}
                  >
                    {rule.stream_name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors ml-2"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Stream Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900">
                {editingStream ? 'Edit Income Stream' : 'Add New Income Stream'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure stream branding, color code, and icon representation
              </p>

              {error && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveStream} className="mt-4 space-y-4">
                {/* Stream Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Stream Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brand Deals, Digital Products, Coaching"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Badge & Chart Color
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {STREAM_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-105' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Stream Icon
                  </label>
                  <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                    {AVAILABLE_ICONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        title={item.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs transition-all cursor-pointer ${
                          icon === item.id ? 'bg-amber-500 text-white shadow-xs font-bold' : ''
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Badge */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500">Live Preview:</span>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-white font-semibold text-xs shadow-2xs"
                    style={{ backgroundColor: color }}
                  >
                    <StreamIcon iconName={icon} className="w-3.5 h-3.5" />
                    <span>{name || 'Stream Name'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-500/20"
                  >
                    {editingStream ? 'Save Changes' : 'Create Stream'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
