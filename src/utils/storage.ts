import { IncomeEntry, StreamConfig, UserSettings, MonthlyGoal, AIInsightsReport } from '../types';
import { DEFAULT_STREAMS, DEFAULT_SETTINGS, DEFAULT_GOALS, SAMPLE_INCOME_ENTRIES } from './sampleData';

const KEYS = {
  INCOME: 'money_dashboard_income_v1',
  STREAMS: 'money_dashboard_streams_v1',
  GOALS: 'money_dashboard_goals_v1',
  SETTINGS: 'money_dashboard_settings_v1',
  INSIGHTS: 'money_dashboard_insights_v1',
};

export function loadIncomeEntries(): IncomeEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.INCOME);
    if (!raw) {
      // First time initialization: populate sample data
      saveIncomeEntries(SAMPLE_INCOME_ENTRIES);
      return SAMPLE_INCOME_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_INCOME_ENTRIES;
  } catch (err) {
    console.error('Failed to load income entries from localStorage:', err);
    return SAMPLE_INCOME_ENTRIES;
  }
}

export function saveIncomeEntries(entries: IncomeEntry[]): void {
  try {
    localStorage.setItem(KEYS.INCOME, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save income entries to localStorage:', err);
  }
}

export function loadStreams(): StreamConfig[] {
  try {
    const raw = localStorage.getItem(KEYS.STREAMS);
    if (!raw) {
      saveStreams(DEFAULT_STREAMS);
      return DEFAULT_STREAMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STREAMS;
  } catch (err) {
    console.error('Failed to load streams from localStorage:', err);
    return DEFAULT_STREAMS;
  }
}

export function saveStreams(streams: StreamConfig[]): void {
  try {
    localStorage.setItem(KEYS.STREAMS, JSON.stringify(streams));
  } catch (err) {
    console.error('Failed to save streams to localStorage:', err);
  }
}

export function loadGoals(): MonthlyGoal[] {
  try {
    const raw = localStorage.getItem(KEYS.GOALS);
    if (!raw) {
      saveGoals(DEFAULT_GOALS);
      return DEFAULT_GOALS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_GOALS;
  } catch (err) {
    console.error('Failed to load goals from localStorage:', err);
    return DEFAULT_GOALS;
  }
}

export function saveGoals(goals: MonthlyGoal[]): void {
  try {
    localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save goals to localStorage:', err);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Failed to load settings from localStorage:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
}

export function loadInsights(): AIInsightsReport | null {
  try {
    const raw = localStorage.getItem(KEYS.INSIGHTS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveInsights(report: AIInsightsReport): void {
  try {
    localStorage.setItem(KEYS.INSIGHTS, JSON.stringify(report));
  } catch (err) {
    console.error('Failed to save insights:', err);
  }
}

export function resetAllDataToSample(): void {
  localStorage.setItem(KEYS.INCOME, JSON.stringify(SAMPLE_INCOME_ENTRIES));
  localStorage.setItem(KEYS.STREAMS, JSON.stringify(DEFAULT_STREAMS));
  localStorage.setItem(KEYS.GOALS, JSON.stringify(DEFAULT_GOALS));
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  localStorage.removeItem(KEYS.INSIGHTS);
}

export function clearAllUserData(): void {
  localStorage.setItem(KEYS.INCOME, JSON.stringify([]));
  localStorage.setItem(KEYS.STREAMS, JSON.stringify(DEFAULT_STREAMS));
  localStorage.setItem(KEYS.GOALS, JSON.stringify([]));
  localStorage.removeItem(KEYS.INSIGHTS);
}

export function exportFullJsonBackup(): void {
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    entries: loadIncomeEntries(),
    streams: loadStreams(),
    goals: loadGoals(),
    settings: loadSettings(),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `money_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function importFullJsonBackup(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || (!parsed.entries && !Array.isArray(parsed))) {
      throw new Error('Invalid backup format');
    }

    const entries = parsed.entries || parsed;
    if (Array.isArray(entries)) {
      saveIncomeEntries(entries);
    }
    if (Array.isArray(parsed.streams)) {
      saveStreams(parsed.streams);
    }
    if (Array.isArray(parsed.goals)) {
      saveGoals(parsed.goals);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveSettings(parsed.settings);
    }
    return true;
  } catch (err) {
    console.error('Error importing JSON backup:', err);
    return false;
  }
}
