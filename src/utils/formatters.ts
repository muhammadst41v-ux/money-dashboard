import { CurrencyCode, IncomeEntry, IncomeStatus } from '../types';

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { label: string; symbol: string; prefix: string; locale: string }
> = {
  PKR: { label: 'Pakistani Rupee (PKR)', symbol: 'PKR', prefix: 'PKR ', locale: 'ur-PK' },
  USD: { label: 'US Dollar (USD)', symbol: '$', prefix: '$', locale: 'en-US' },
  INR: { label: 'Indian Rupee (INR)', symbol: '₹', prefix: '₹', locale: 'en-IN' },
  AED: { label: 'UAE Dirham (AED)', symbol: 'AED', prefix: 'AED ', locale: 'ar-AE' },
  GBP: { label: 'British Pound (GBP)', symbol: '£', prefix: '£', locale: 'en-GB' },
};

/**
 * Formats a numeric amount with thousands separators and the specified currency symbol.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: CurrencyCode = 'PKR',
  showDecimals = false
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }

  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.PKR;
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;

  // Use Intl.NumberFormat for standard separator formatting
  const formattedNumber = new Intl.NumberFormat(
    currency === 'PKR' ? 'en-US' : config.locale,
    {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }
  ).format(absAmount);

  const formattedWithSymbol = `${config.prefix}${formattedNumber}`;
  return isNegative ? `-${formattedWithSymbol}` : formattedWithSymbol;
}

/**
 * Format a number as compact (e.g. 1.2M, 450K) with currency symbol
 */
export function formatCompactCurrency(
  amount: number,
  currency: CurrencyCode = 'PKR'
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.PKR;
  if (Math.abs(amount) >= 1_000_000) {
    return `${config.prefix}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${config.prefix}${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency);
}

/**
 * Formats a percentage with sign (e.g. "+12.4%", "-5.0%")
 */
export function formatPercentage(pct: number): string {
  if (isNaN(pct) || !isFinite(pct)) return '0.0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Convert YYYY-MM-DD or YYYY-MM to human friendly string
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (parts.length === 2) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatMonthName(monthStr: string): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length >= 2) {
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return monthStr;
}

export function formatShortMonth(monthStr: string): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length >= 2) {
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return monthStr;
}

/**
 * Export entries to CSV
 */
export function exportToCSV(entries: IncomeEntry[], filename = 'money_dashboard_income.csv'): void {
  const headers = ['Date', 'Amount', 'Category', 'Source', 'Status', 'Note'];
  const rows = entries.map((entry) => [
    entry.date,
    entry.amount.toString(),
    `"${(entry.category || '').replace(/"/g, '""')}"`,
    `"${(entry.source || '').replace(/"/g, '""')}"`,
    entry.status,
    `"${(entry.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse a CSV text into IncomeEntry objects
 */
export function parseCSV(csvText: string): { entries: Partial<IncomeEntry>[]; errors: string[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { entries: [], errors: ['CSV file must have at least a header and one data row.'] };
  }

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const headers = splitCSVLine(headerLine);

  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('revenue') || h.includes('price'));
  const catIdx = headers.findIndex((h) => h.includes('category') || h.includes('stream'));
  const sourceIdx = headers.findIndex((h) => h.includes('source') || h.includes('client') || h.includes('brand'));
  const noteIdx = headers.findIndex((h) => h.includes('note') || h.includes('description'));
  const statusIdx = headers.findIndex((h) => h.includes('status'));

  if (dateIdx === -1 || amountIdx === -1) {
    return {
      entries: [],
      errors: ['CSV must contain at least "date" and "amount" columns.'],
    };
  }

  const entries: Partial<IncomeEntry>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawTokens = splitCSVLine(lines[i]);
    if (rawTokens.length < 2) continue;

    const rawDate = rawTokens[dateIdx]?.trim();
    const rawAmount = rawTokens[amountIdx]?.replace(/[^0-9.-]/g, '');
    const amount = parseFloat(rawAmount);

    if (!rawDate || isNaN(amount)) {
      errors.push(`Row ${i + 1}: Invalid date or amount.`);
      continue;
    }

    // Standardize date to YYYY-MM-DD
    let cleanDate = rawDate;
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      cleanDate = dateObj.toISOString().split('T')[0];
    }

    const category = catIdx !== -1 && rawTokens[catIdx] ? rawTokens[catIdx].trim() : 'Other';
    const source = sourceIdx !== -1 && rawTokens[sourceIdx] ? rawTokens[sourceIdx].trim() : 'Unspecified Source';
    const note = noteIdx !== -1 && rawTokens[noteIdx] ? rawTokens[noteIdx].trim() : '';
    let status: IncomeStatus = 'Received';
    if (statusIdx !== -1 && rawTokens[statusIdx]) {
      const st = rawTokens[statusIdx].trim().toLowerCase();
      if (st.includes('pend') || st.includes('due') || st.includes('unpaid')) {
        status = 'Pending';
      }
    }

    entries.push({
      date: cleanDate,
      amount,
      category,
      source,
      note,
      status,
    });
  }

  return { entries, errors };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
