/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchIncomeEntries,
  createIncomeEntry,
  updateIncomeEntry,
  deleteIncomeEntry,
  toggleIncomeStatus,
  importCsvEntries,
  clearSampleDataApi,
  resetSampleDataApi,
  clearAllIncomeApi,
  fetchStreamsApi,
  createStreamApi,
  updateStreamApi,
  deleteStreamApi,
  fetchRulesApi,
  createRuleApi,
  deleteRuleApi,
  applyAllRulesApi,
  fetchConnectorsApi,
  syncConnectorApi,
  fetchGoalsApi,
  saveGoalApi,
  fetchSettingsApi,
  saveSettingsApi,
} from './utils/api';
import {
  loadInsights,
  saveInsights,
  exportFullJsonBackup,
  importFullJsonBackup,
} from './utils/storage';
import {
  IncomeEntry,
  StreamConfig,
  StreamRule,
  ConnectorInfo,
  MonthlyGoal,
  UserSettings,
  CurrencyCode,
  AIInsightsReport,
} from './types';
import { Sidebar, PageId } from './components/Sidebar';
import { Header } from './components/Header';
import { IncomeModal } from './components/IncomeModal';
import { CsvImportModal } from './components/CsvImportModal';
import { ConfirmModal } from './components/ConfirmModal';

import { DashboardPage } from './pages/DashboardPage';
import { IncomePage } from './pages/IncomePage';
import { StreamsPage } from './pages/StreamsPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { GoalsPage } from './pages/GoalsPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  // Navigation
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState<string>('all');

  // Persistent State (SQLite Backend)
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [hasSampleData, setHasSampleData] = useState<boolean>(false);
  const [sampleCount, setSampleCount] = useState<number>(0);
  const [streams, setStreams] = useState<StreamConfig[]>([]);
  const [rules, setRules] = useState<StreamRule[]>([]);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    creatorName: 'Hamza Khan',
    creatorHandle: '@hamza_creates',
    businessTitle: 'Independent Creator & Product Designer',
    currency: 'PKR',
    financialYearStartMonth: 1,
  });
  const [cachedInsights, setCachedInsights] = useState<AIInsightsReport | null>(() =>
    loadInsights()
  );
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    message: string;
    type: 'entry' | 'stream';
  }>({
    isOpen: false,
    id: '',
    title: '',
    message: '',
    type: 'entry',
  });

  // Load all data from SQLite backend on mount
  const refreshAllData = useCallback(async () => {
    try {
      const [incomeData, streamsData, rulesData, connectorsData, goalsData, settingsData] =
        await Promise.all([
          fetchIncomeEntries(),
          fetchStreamsApi(),
          fetchRulesApi(),
          fetchConnectorsApi(),
          fetchGoalsApi(),
          fetchSettingsApi(),
        ]);

      setEntries(incomeData.entries);
      setHasSampleData(incomeData.hasSampleData);
      setSampleCount(incomeData.sampleCount);

      if (streamsData.length > 0) setStreams(streamsData);
      setRules(rulesData);
      setConnectors(connectorsData);
      setGoals(goalsData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Error refreshing dashboard data from SQLite:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Calculate current month's goal progress for sidebar mini-widget
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g., '2026-10'
  const goalProgressPct = useMemo(() => {
    const currentMonthRevenue = entries
      .filter((e) => e.date.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + e.amount, 0);

    const goal = goals.find((g) => g.month === currentMonthKey)?.targetAmount || 500000;
    return goal > 0 ? (currentMonthRevenue / goal) * 100 : 0;
  }, [entries, goals, currentMonthKey]);

  // Existing source names for autocomplete
  const existingSources = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.source) set.add(e.source.trim());
    });
    return Array.from(set).sort();
  }, [entries]);

  // Handlers for Income Entries
  const handleSaveIncomeEntry = async (entryData: Partial<IncomeEntry>) => {
    try {
      if (entryData.id) {
        await updateIncomeEntry(entryData.id, entryData);
      } else {
        await createIncomeEntry(entryData);
      }
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to save income entry: ' + err.message);
    }
  };

  const handleEditEntry = (entry: IncomeEntry) => {
    setEditingEntry(entry);
    setIsIncomeModalOpen(true);
  };

  const handleDeleteEntryPrompt = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    setDeleteConfirm({
      isOpen: true,
      id,
      title: 'Delete Income Entry?',
      message: `Are you sure you want to delete this ${entry?.source || ''} record for ${
        entry?.amount ? entry.amount.toLocaleString() : ''
      }? This cannot be undone.`,
      type: 'entry',
    });
  };

  const handleToggleEntryStatus = async (id: string) => {
    try {
      await toggleIncomeStatus(id);
      await refreshAllData();
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleImportCsvEntries = async (newEntries: IncomeEntry[]) => {
    try {
      const res = await importCsvEntries(newEntries);
      await refreshAllData();
      alert(res.message);
    } catch (err: any) {
      alert('CSV Import error: ' + err.message);
    }
  };

  const handleClearSampleData = async () => {
    try {
      await clearSampleDataApi();
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to clear sample data: ' + err.message);
    }
  };

  // Handlers for Streams
  const handleAddStream = async (newStream: StreamConfig) => {
    try {
      await createStreamApi(newStream);
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to add stream: ' + err.message);
    }
  };

  const handleUpdateStream = async (updatedStream: StreamConfig) => {
    try {
      await updateStreamApi(updatedStream.id, updatedStream);
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to update stream: ' + err.message);
    }
  };

  const handleDeleteStreamPrompt = (streamId: string, streamName: string) => {
    const count = entries.filter((e) => e.category === streamName).length;
    setDeleteConfirm({
      isOpen: true,
      id: streamId,
      title: `Delete Stream "${streamName}"?`,
      message:
        count > 0
          ? `This stream is currently assigned to ${count} entries. Deleting it will reassign those entries to "Other".`
          : `Are you sure you want to remove the stream "${streamName}"?`,
      type: 'stream',
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'entry') {
        await deleteIncomeEntry(deleteConfirm.id);
      } else if (deleteConfirm.type === 'stream') {
        await deleteStreamApi(deleteConfirm.id);
      }
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Rules Handlers
  const handleAddRule = async (rule: { pattern: string; stream_name: string }) => {
    try {
      await createRuleApi(rule);
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to create rule: ' + err.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRuleApi(id);
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to delete rule: ' + err.message);
    }
  };

  const handleApplyRulesAll = async (): Promise<number> => {
    const res = await applyAllRulesApi();
    await refreshAllData();
    return res.remapped;
  };

  // Connectors Sync Handler
  const handleSyncConnector = async (id: string, payload?: any) => {
    const res = await syncConnectorApi(id, payload);
    await refreshAllData();
    return res;
  };

  // Handlers for Goals
  const handleSaveGoal = async (month: string, targetAmount: number) => {
    try {
      await saveGoalApi(month, targetAmount);
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to save goal: ' + err.message);
    }
  };

  // Handlers for Settings & Currency
  const handleUpdateSettings = async (newSettings: UserSettings) => {
    try {
      setSettings(newSettings);
      await saveSettingsApi(newSettings);
      await refreshAllData();
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const handleQuickCurrencyChange = async (newCurrency: CurrencyCode) => {
    const updated = { ...settings, currency: newCurrency };
    setSettings(updated);
    await saveSettingsApi({ currency: newCurrency });
  };

  // Handlers for Insights
  const handleSaveInsights = (report: AIInsightsReport) => {
    setCachedInsights(report);
    saveInsights(report);
  };

  // Reset to Sample Data
  const handleResetToSampleData = async () => {
    try {
      await resetSampleDataApi();
      await refreshAllData();
      setCachedInsights(null);
    } catch (err: any) {
      alert('Failed to reset sample data: ' + err.message);
    }
  };

  // Clear All Data
  const handleClearAllData = async () => {
    try {
      await clearAllIncomeApi();
      await refreshAllData();
      setCachedInsights(null);
    } catch (err: any) {
      alert('Failed to clear data: ' + err.message);
    }
  };

  // Import Backup
  const handleImportBackup = (jsonStr: string): boolean => {
    const success = importFullJsonBackup(jsonStr);
    if (success) {
      refreshAllData();
      return true;
    }
    return false;
  };

  // Header Title & Subtitle based on active page
  const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Financial Overview',
      subtitle: `Welcome back, ${settings.creatorName}. Here's your consolidated revenue performance.`,
    },
    income: {
      title: 'Income Ledger',
      subtitle: 'Complete breakdown of all client invoices, brand sponsorships, and product sales.',
    },
    streams: {
      title: 'Income Streams & Rules',
      subtitle: 'Customize revenue channels and rules to automatically classify incoming invoices.',
    },
    connections: {
      title: 'Data Connectors',
      subtitle: 'Connect Google Sheets, Stripe, and CSV statements with automated de-duplication.',
    },
    goals: {
      title: 'Monthly Targets & Pacing',
      subtitle: 'Set revenue goals, monitor completion rate, and track daily required run rates.',
    },
    insights: {
      title: 'Gemini AI Insights',
      subtitle: 'Data-grounded financial intelligence and growth suggestions for your business.',
    },
    settings: {
      title: 'Dashboard Settings',
      subtitle: 'Manage your creator identity, currency formats, and local SQLite data persistence.',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          if (page === 'income') setIncomeCategoryFilter('all');
        }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        settings={settings}
        goalProgressPct={goalProgressPct}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Sticky Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          title={pageMeta[activePage].title}
          subtitle={pageMeta[activePage].subtitle}
          settings={settings}
          onUpdateCurrency={handleQuickCurrencyChange}
          onOpenAddIncomeModal={() => {
            setEditingEntry(null);
            setIsIncomeModalOpen(true);
          }}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {activePage === 'dashboard' && (
            <DashboardPage
              entries={entries}
              streams={streams}
              currency={settings.currency}
              settings={settings}
              hasSampleData={hasSampleData}
              sampleCount={sampleCount}
              onClearSampleData={handleClearSampleData}
              onOpenAddIncomeModal={() => {
                setEditingEntry(null);
                setIsIncomeModalOpen(true);
              }}
              onNavigateToIncome={(cat) => {
                setIncomeCategoryFilter(cat || 'all');
                setActivePage('income');
              }}
              onNavigateToInsights={() => setActivePage('insights')}
            />
          )}

          {activePage === 'income' && (
            <IncomePage
              entries={entries}
              streams={streams}
              currency={settings.currency}
              initialCategoryFilter={incomeCategoryFilter}
              onOpenAddModal={() => {
                setEditingEntry(null);
                setIsIncomeModalOpen(true);
              }}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntryPrompt}
              onToggleStatus={handleToggleEntryStatus}
              onOpenImportModal={() => setIsImportModalOpen(true)}
            />
          )}

          {activePage === 'streams' && (
            <StreamsPage
              streams={streams}
              entries={entries}
              rules={rules}
              currency={settings.currency}
              onAddStream={handleAddStream}
              onUpdateStream={handleUpdateStream}
              onDeleteStream={handleDeleteStreamPrompt}
              onAddRule={handleAddRule}
              onDeleteRule={handleDeleteRule}
              onApplyRulesAll={handleApplyRulesAll}
            />
          )}

          {activePage === 'connections' && (
            <ConnectionsPage
              connectors={connectors}
              currency={settings.currency}
              onSyncConnector={handleSyncConnector}
              onRefreshData={refreshAllData}
              onOpenImportModal={() => setIsImportModalOpen(true)}
            />
          )}

          {activePage === 'goals' && (
            <GoalsPage
              goals={goals}
              entries={entries}
              currency={settings.currency}
              onSaveGoal={handleSaveGoal}
            />
          )}

          {activePage === 'insights' && (
            <InsightsPage
              entries={entries}
              streams={streams}
              currency={settings.currency}
              settings={settings}
              cachedInsights={cachedInsights}
              onSaveInsights={handleSaveInsights}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              entries={entries}
              onResetToSampleData={handleResetToSampleData}
              onClearAllData={handleClearAllData}
              onExportBackup={exportFullJsonBackup}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Income Modal */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveIncomeEntry}
        entryToEdit={editingEntry}
        streams={streams}
        currency={settings.currency}
        existingSources={existingSources}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCsvEntries}
        currency={settings.currency}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
}
