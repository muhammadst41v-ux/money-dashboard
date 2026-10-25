export type CurrencyCode = 'PKR' | 'USD' | 'INR' | 'AED' | 'GBP';

export type IncomeStatus = 'Received' | 'Pending';

export interface IncomeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string; // Stream name, e.g. "Brand Deals", "Product Sales", "Client Work", "Other"
  source: string; // e.g., "Sponsor X", "Gumroad", "Client Acme", "AdSense"
  note: string;
  status: IncomeStatus;
  connector_id?: string;
  external_id?: string;
  is_sample?: number | boolean;
  createdAt?: string;
  created_at?: string;
}

export interface StreamConfig {
  id: string;
  name: string;
  color: string; // Hex color
  icon: string; // Icon identifier
  isDefault?: boolean;
  is_default?: number | boolean;
}

export interface StreamRule {
  id: string;
  pattern: string;
  stream_name: string;
  created_at?: string;
}

export interface ConnectorInfo {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'not_connected' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  entryCount: number;
  totalSyncedAmount: number;
  isConfigured: boolean;
  setupGuide: {
    title: string;
    description: string;
    envKeysNeeded: string[];
    steps: string[];
  };
}

export interface MonthlyGoal {
  month: string; // YYYY-MM
  targetAmount: number;
}

export interface UserSettings {
  creatorName: string;
  creatorHandle: string;
  businessTitle: string;
  currency: CurrencyCode;
  financialYearStartMonth: number; // 1 = Jan, 4 = Apr, 7 = Jul
}

export interface AIInsightsReport {
  generatedAt: string;
  executiveSummary: string;
  bestMonth: {
    month: string;
    revenue: number;
    details: string;
  };
  bestStream: {
    stream: string;
    revenue: number;
    percentage: number;
    details: string;
  };
  trend: {
    direction: 'Growing' | 'Stable' | 'Declining' | string;
    summary: string;
    details: string;
  };
  risks: string[];
  suggestions: string[];
  isFallback?: boolean;
}
