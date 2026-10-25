import React, { useState } from 'react';
import {
  Network,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  CreditCard,
  Layers,
  Database,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  X,
  FileText,
} from 'lucide-react';
import { ConnectorInfo, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ConnectionsPageProps {
  connectors: ConnectorInfo[];
  currency: CurrencyCode;
  onSyncConnector: (id: string, payload?: any) => Promise<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    message: string;
  }>;
  onRefreshData: () => void;
  onOpenImportModal: () => void;
}

export const ConnectionsPage: React.FC<ConnectionsPageProps> = ({
  connectors,
  currency,
  onSyncConnector,
  onRefreshData,
  onOpenImportModal,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<ConnectorInfo | null>(null);
  const [sheetUrlInput, setSheetUrlInput] = useState<string>('');

  const handleSync = async (connector: ConnectorInfo) => {
    if (connector.id === 'manual' || connector.id === 'gumroad_paypal') {
      onOpenImportModal();
      return;
    }

    setSyncingId(connector.id);
    setSyncFeedback(null);

    try {
      const payload = connector.id === 'sheets' && sheetUrlInput ? { sheetCsvUrl: sheetUrlInput } : undefined;
      const res = await onSyncConnector(connector.id, payload);
      setSyncFeedback({
        id: connector.id,
        success: res.success,
        message: res.message,
      });
      onRefreshData();
    } catch (err: any) {
      setSyncFeedback({
        id: connector.id,
        success: false,
        message: err.message || 'Sync failed',
      });
    } finally {
      setSyncingId(null);
    }
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return <FileSpreadsheet className="w-6 h-6 text-emerald-600" />;
      case 'google_sheets':
        return <FileText className="w-6 h-6 text-green-600" />;
      case 'stripe':
        return <CreditCard className="w-6 h-6 text-indigo-600" />;
      case 'csv_importer':
        return <Layers className="w-6 h-6 text-purple-600" />;
      default:
        return <Database className="w-6 h-6 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Data Connections</h3>
          <p className="text-xs text-slate-500">
            Pluggable connectors with automated de-duplication so syncing twice never doubles revenue
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Idempotent Sync & De-duplication Active</span>
        </div>
      </div>

      {/* Sync Feedback Alert */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start justify-between gap-3 animate-in fade-in ${
            syncFeedback.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {connectors.map((c) => {
          const isConnected = c.status === 'connected';
          const isSyncing = syncingId === c.id;

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      {getConnectorIcon(c.type)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{c.setupGuide.description}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {isConnected ? 'Connected' : 'Not connected'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="mt-5 grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Imported Revenue
                    </span>
                    <p className="mt-0.5 text-base font-bold text-slate-900">
                      {formatCurrency(c.totalSyncedAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Sync Volume
                    </span>
                    <p className="mt-0.5 text-base font-bold text-slate-800">
                      {c.entryCount} entries
                    </p>
                  </div>
                </div>

                {/* Google Sheet Direct CSV URL input if not OAuth */}
                {c.id === 'sheets' && (
                  <div className="mt-4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Published Google Sheet CSV Link (Optional Instant Sync)
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                      value={sheetUrlInput}
                      onChange={(e) => setSheetUrlInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons & Last synced */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {c.lastSyncedAt
                      ? `Synced ${new Date(c.lastSyncedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Never synced'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedGuide(c)}
                    className="text-slate-600 hover:text-amber-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How to connect</span>
                  </button>

                  <button
                    onClick={() => handleSync(c)}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync now'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* "How to connect" Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {selectedGuide.setupGuide.title}
                  </h4>
                  <p className="text-xs text-slate-500">Connection instructions & credentials guide</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuide(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-600">
              <p className="text-slate-700 font-medium leading-relaxed">
                {selectedGuide.setupGuide.description}
              </p>

              {selectedGuide.setupGuide.envKeysNeeded.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-800 block mb-1">
                    Environment Variables Required (.env):
                  </span>
                  <div className="space-y-1">
                    {selectedGuide.setupGuide.envKeysNeeded.map((k) => (
                      <code
                        key={k}
                        className="block font-mono text-[11px] bg-white border border-slate-200 px-2 py-1 rounded text-amber-700 font-bold"
                      >
                        {k}="your_key_here"
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-800 block mb-2">Step-by-step setup:</span>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
                  {selectedGuide.setupGuide.steps.map((st, i) => (
                    <li key={i} className="leading-relaxed">
                      {st}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Built-in de-duplication: Syncing multiple times will never double count or corrupt
                  your revenue numbers.
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedGuide(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
