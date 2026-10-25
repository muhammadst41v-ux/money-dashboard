import React, { useState } from 'react';
import {
  User,
  Globe,
  Calendar,
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { UserSettings, CurrencyCode, IncomeEntry } from '../types';
import { CURRENCY_CONFIG, exportToCSV } from '../utils/formatters';

interface SettingsPageProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  entries: IncomeEntry[];
  onResetToSampleData: () => void;
  onClearAllData: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  entries,
  onResetToSampleData,
  onClearAllData,
  onExportBackup,
  onImportBackup,
}) => {
  const [creatorName, setCreatorName] = useState(settings.creatorName);
  const [creatorHandle, setCreatorHandle] = useState(settings.creatorHandle);
  const [businessTitle, setBusinessTitle] = useState(settings.businessTitle);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [financialYearStartMonth, setFinancialYearStartMonth] = useState(
    settings.financialYearStartMonth
  );

  const [savedNotice, setSavedNotice] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      creatorName: creatorName.trim() || 'Freelance Creator',
      creatorHandle: creatorHandle.trim() || '@creator',
      businessTitle: businessTitle.trim() || 'Independent Consultant',
      currency,
      financialYearStartMonth,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const success = onImportBackup(text);
        if (success) {
          setImportStatus('Backup restored successfully!');
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus('Failed to import backup: invalid format.');
          setTimeout(() => setImportStatus(null), 4000);
        }
      };
      reader.readAsText(file);
    }
  };

  const currencies: CurrencyCode[] = ['PKR', 'USD', 'INR', 'AED', 'GBP'];

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">App Settings</h3>
        <p className="text-xs text-slate-500">
          Configure your profile, accounting preferences, default currency, and data backups
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings saved successfully!
        </div>
      )}

      {/* Profile & Currency Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Creator Profile</h4>
            <p className="text-[11px] text-slate-500">Personalize your dashboard branding</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Creator / Freelancer Name
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Social Handle or ID
            </label>
            <input
              type="text"
              value={creatorHandle}
              onChange={(e) => setCreatorHandle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Business Title / Specialization
            </label>
            <input
              type="text"
              value={businessTitle}
              onChange={(e) => setBusinessTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Currency & Financial Preferences */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              Primary Display Currency *
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden cursor-pointer"
            >
              {currencies.map((curr) => (
                <option key={curr} value={curr}>
                  {CURRENCY_CONFIG[curr].label}
                </option>
              ))}
            </select>
            <span className="block mt-1 text-[11px] text-slate-400">
              Default is PKR. All numbers and charts format with this symbol and separator.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Financial Year Start Month
            </label>
            <select
              value={financialYearStartMonth}
              onChange={(e) => setFinancialYearStartMonth(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value={1}>January (Calendar Year)</option>
              <option value={4}>April (UK / India standard)</option>
              <option value={7}>July (Pakistan / Australia standard)</option>
              <option value={10}>October (US Federal standard)</option>
            </select>
            <span className="block mt-1 text-[11px] text-slate-400">
              Used for fiscal year-to-date rollups
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Data Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Data & Storage Management</h4>
            <p className="text-[11px] text-slate-500">
              Your financial records are saved privately in your browser's localStorage
            </p>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export JSON */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
            <div>
              <h5 className="text-xs font-bold text-slate-900">Full JSON Backup</h5>
              <p className="text-[11px] text-slate-500 mt-1">
                Download all income records, stream configurations, targets, and settings as a JSON file.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportBackup}
              className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Backup (.json)</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
            <div>
              <h5 className="text-xs font-bold text-slate-900">Restore Backup</h5>
              <p className="text-[11px] text-slate-500 mt-1">
                Restore previously exported JSON backup data into this dashboard.
              </p>
            </div>
            <label className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import Backup (.json)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleBackupFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Export CSV */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
            <div>
              <h5 className="text-xs font-bold text-slate-900">Export Ledger (CSV)</h5>
              <p className="text-[11px] text-slate-500 mt-1">
                Export all {entries.length} income entries to a spreadsheet CSV compatible with Excel, Sheets, or Notion.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportToCSV(entries)}
              className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download CSV Spreadsheet</span>
            </button>
          </div>

          {/* Reset to Sample Data */}
          <div className="p-4 border border-amber-200/80 rounded-xl bg-amber-50/50 flex flex-col justify-between">
            <div>
              <h5 className="text-xs font-bold text-amber-900">Reset to Sample Data</h5>
              <p className="text-[11px] text-amber-800/90 mt-1">
                Re-populates the 6-month pre-filled dataset (May - October) for testing and chart evaluation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore 6-Month Demo Data</span>
            </button>
          </div>
        </div>

        {/* Clear All Data */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h5 className="text-xs font-bold text-rose-700">Clear All Financial Data</h5>
            <p className="text-[11px] text-slate-500">
              Permanently wipe all {entries.length} income entries and goals from this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Reset to 6-Month Sample Data?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              This will overwrite your existing ledger entries and goals with the rich 6-month
              creator sample dataset (May 2026 – October 2026).
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetToSampleData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-red-600">Permanently Clear All Data?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              This will delete all {entries.length} income transactions and goals from your local storage.
              This action cannot be undone. Consider exporting a backup first.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
