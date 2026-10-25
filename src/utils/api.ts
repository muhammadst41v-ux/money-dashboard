import {
  IncomeEntry,
  StreamConfig,
  StreamRule,
  ConnectorInfo,
  MonthlyGoal,
  UserSettings,
  CurrencyCode,
  AIInsightsReport,
} from '../types';

// ==========================================
// INCOME ENTRIES
// ==========================================
export async function fetchIncomeEntries(): Promise<{
  entries: IncomeEntry[];
  hasSampleData: boolean;
  sampleCount: number;
}> {
  try {
    const res = await fetch('/api/income');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      entries: data.entries || [],
      hasSampleData: Boolean(data.hasSampleData),
      sampleCount: data.sampleCount || 0,
    };
  } catch (err) {
    console.warn('API error, falling back to local memory:', err);
    return { entries: [], hasSampleData: false, sampleCount: 0 };
  }
}

export async function createIncomeEntry(entry: Partial<IncomeEntry>): Promise<IncomeEntry> {
  const res = await fetch('/api/income', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create income entry');
  }
  const data = await res.json();
  return data.entry;
}

export async function updateIncomeEntry(id: string, entry: Partial<IncomeEntry>): Promise<IncomeEntry> {
  const res = await fetch(`/api/income/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update income entry');
  }
  const data = await res.json();
  return data.entry;
}

export async function deleteIncomeEntry(id: string): Promise<void> {
  const res = await fetch(`/api/income/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete income entry');
}

export async function toggleIncomeStatus(id: string): Promise<string> {
  const res = await fetch(`/api/income/toggle-status/${id}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle status');
  const data = await res.json();
  return data.status;
}

export async function importCsvEntries(entries: Partial<IncomeEntry>[]): Promise<{
  imported: number;
  skipped: number;
  message: string;
}> {
  const res = await fetch('/api/income/import-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to import CSV');
  }
  return res.json();
}

export async function clearSampleDataApi(): Promise<number> {
  const res = await fetch('/api/income/clear-sample', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear sample data');
  const data = await res.json();
  return data.removedCount;
}

export async function resetSampleDataApi(): Promise<void> {
  const res = await fetch('/api/income/reset-sample', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset sample data');
}

export async function clearAllIncomeApi(): Promise<void> {
  const res = await fetch('/api/income/clear-all', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear all income');
}

// ==========================================
// STREAMS & RULES
// ==========================================
export async function fetchStreamsApi(): Promise<StreamConfig[]> {
  try {
    const res = await fetch('/api/streams');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.streams || [];
  } catch (err) {
    console.warn('API error fetching streams:', err);
    return [];
  }
}

export async function createStreamApi(stream: Partial<StreamConfig>): Promise<StreamConfig> {
  const res = await fetch('/api/streams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stream),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create stream');
  }
  const data = await res.json();
  return data.stream;
}

export async function updateStreamApi(id: string, stream: Partial<StreamConfig>): Promise<StreamConfig> {
  const res = await fetch(`/api/streams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stream),
  });
  if (!res.ok) throw new Error('Failed to update stream');
  const data = await res.json();
  return data.stream;
}

export async function deleteStreamApi(id: string): Promise<void> {
  const res = await fetch(`/api/streams/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete stream');
}

export async function fetchRulesApi(): Promise<StreamRule[]> {
  try {
    const res = await fetch('/api/rules');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.rules || [];
  } catch {
    return [];
  }
}

export async function createRuleApi(rule: { pattern: string; stream_name: string }): Promise<StreamRule> {
  const res = await fetch('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error('Failed to create rule');
  const data = await res.json();
  return data.rule;
}

export async function deleteRuleApi(id: string): Promise<void> {
  const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete rule');
}

export async function applyAllRulesApi(): Promise<{ remapped: number; message: string }> {
  const res = await fetch('/api/rules/apply-all', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to apply rules');
  return res.json();
}

// ==========================================
// CONNECTORS
// ==========================================
export async function fetchConnectorsApi(): Promise<ConnectorInfo[]> {
  try {
    const res = await fetch('/api/connectors');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.connectors || [];
  } catch (err) {
    console.warn('API error fetching connectors:', err);
    return [];
  }
}

export async function syncConnectorApi(connectorId: string, payload?: any): Promise<{
  success: boolean;
  importedCount: number;
  skippedCount: number;
  message: string;
  lastSyncedAt: string;
}> {
  const res = await fetch(`/api/connectors/${connectorId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to sync connector');
  }
  return res.json();
}

// ==========================================
// GOALS
// ==========================================
export async function fetchGoalsApi(): Promise<MonthlyGoal[]> {
  try {
    const res = await fetch('/api/goals');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.goals || []).map((g: any) => ({
      month: g.month,
      targetAmount: g.target_amount,
    }));
  } catch {
    return [];
  }
}

export async function saveGoalApi(month: string, targetAmount: number): Promise<MonthlyGoal> {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, target_amount: targetAmount }),
  });
  if (!res.ok) throw new Error('Failed to save goal');
  const data = await res.json();
  return { month: data.goal.month, targetAmount: data.goal.target_amount };
}

// ==========================================
// SETTINGS
// ==========================================
export async function fetchSettingsApi(): Promise<UserSettings> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      creatorName: data.settings?.creatorName || 'Hamza Khan',
      creatorHandle: data.settings?.creatorHandle || '@hamza_creates',
      businessTitle: data.settings?.businessTitle || 'Independent Creator & Product Designer',
      currency: (data.settings?.currency as CurrencyCode) || 'PKR',
      financialYearStartMonth: parseInt(data.settings?.financialYearStartMonth || '1', 10),
    };
  } catch {
    return {
      creatorName: 'Hamza Khan',
      creatorHandle: '@hamza_creates',
      businessTitle: 'Independent Creator & Product Designer',
      currency: 'PKR',
      financialYearStartMonth: 1,
    };
  }
}

export async function saveSettingsApi(settings: Partial<UserSettings>): Promise<void> {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}
