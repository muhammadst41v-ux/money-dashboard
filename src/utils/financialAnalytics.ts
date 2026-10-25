import { IncomeEntry, StreamConfig, AIInsightsReport } from '../types';
import { formatMonthName, formatCurrency } from './formatters';

export interface MonthlyRevenueData {
  monthKey: string; // YYYY-MM
  monthName: string; // "May 2026"
  shortMonth: string; // "May"
  total: number;
  received: number;
  pending: number;
  count: number;
  byCategory: Record<string, number>;
}

export interface StreamSummaryData {
  name: string;
  color: string;
  icon: string;
  total: number;
  received: number;
  pending: number;
  percentage: number;
  count: number;
}

export interface FinancialStats {
  totalRevenue: number;
  totalReceived: number;
  totalPending: number;
  totalCount: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  monthOverMonthChange: number; // percentage, e.g. +14.2
  monthlyData: MonthlyRevenueData[];
  streamSummaries: StreamSummaryData[];
  topClient: { name: string; amount: number; percentage: number };
  topCategory: { name: string; amount: number; percentage: number };
}

/**
 * Computes all financial analytics across entries and streams.
 */
export function calculateFinancialStats(
  entries: IncomeEntry[],
  streams: StreamConfig[],
  selectedMonth?: string // optional YYYY-MM filter
): FinancialStats {
  const streamMap = new Map<string, StreamConfig>();
  streams.forEach((s) => streamMap.set(s.name, s));

  // Sort entries chronologically
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Group by YYYY-MM
  const monthGroups = new Map<string, IncomeEntry[]>();
  sorted.forEach((entry) => {
    const monthKey = entry.date.slice(0, 7); // "2026-05"
    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, []);
    }
    monthGroups.get(monthKey)!.push(entry);
  });

  // Build monthly data array
  const monthlyData: MonthlyRevenueData[] = [];
  const sortedMonthKeys = Array.from(monthGroups.keys()).sort();

  sortedMonthKeys.forEach((key) => {
    const monthEntries = monthGroups.get(key) || [];
    let total = 0;
    let received = 0;
    let pending = 0;
    const byCategory: Record<string, number> = {};

    monthEntries.forEach((e) => {
      total += e.amount;
      if (e.status === 'Received') received += e.amount;
      else pending += e.amount;

      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const [year, month] = key.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const shortMonth = dateObj.toLocaleDateString('en-US', { month: 'short' });

    monthlyData.push({
      monthKey: key,
      monthName,
      shortMonth,
      total,
      received,
      pending,
      count: monthEntries.length,
      byCategory,
    });
  });

  // Calculate totals (either filtered by selectedMonth or overall)
  const activeEntries = selectedMonth
    ? entries.filter((e) => e.date.startsWith(selectedMonth))
    : entries;

  let totalRevenue = 0;
  let totalReceived = 0;
  let totalPending = 0;

  activeEntries.forEach((e) => {
    totalRevenue += e.amount;
    if (e.status === 'Received') totalReceived += e.amount;
    else totalPending += e.amount;
  });

  // MoM change calculation
  // If a specific month is selected, compare it to the prior month in monthlyData
  // Otherwise compare the latest month in monthlyData to the second latest
  let currentMonthRevenue = 0;
  let lastMonthRevenue = 0;
  let monthOverMonthChange = 0;

  if (monthlyData.length > 0) {
    let targetIndex = monthlyData.length - 1;
    if (selectedMonth) {
      const idx = monthlyData.findIndex((m) => m.monthKey === selectedMonth);
      if (idx !== -1) targetIndex = idx;
    }

    currentMonthRevenue = monthlyData[targetIndex]?.total || 0;
    if (targetIndex > 0) {
      lastMonthRevenue = monthlyData[targetIndex - 1]?.total || 0;
      if (lastMonthRevenue > 0) {
        monthOverMonthChange = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      } else if (currentMonthRevenue > 0) {
        monthOverMonthChange = 100;
      }
    }
  }

  // Stream summaries
  const categoryTotals: Record<string, { total: number; received: number; pending: number; count: number }> = {};
  activeEntries.forEach((e) => {
    if (!categoryTotals[e.category]) {
      categoryTotals[e.category] = { total: 0, received: 0, pending: 0, count: 0 };
    }
    categoryTotals[e.category].total += e.amount;
    if (e.status === 'Received') categoryTotals[e.category].received += e.amount;
    else categoryTotals[e.category].pending += e.amount;
    categoryTotals[e.category].count += 1;
  });

  // Include all configured streams even if 0, plus any extra category present in activeEntries
  const allCategoryNames = new Set([
    ...streams.map((s) => s.name),
    ...Object.keys(categoryTotals),
  ]);

  const streamSummaries: StreamSummaryData[] = Array.from(allCategoryNames).map((name) => {
    const streamConf = streamMap.get(name);
    const data = categoryTotals[name] || { total: 0, received: 0, pending: 0, count: 0 };
    const percentage = totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0;

    return {
      name,
      color: streamConf?.color || '#64748B',
      icon: streamConf?.icon || 'CircleDollarSign',
      total: data.total,
      received: data.received,
      pending: data.pending,
      percentage,
      count: data.count,
    };
  }).sort((a, b) => b.total - a.total);

  // Top client / source
  const clientTotals: Record<string, number> = {};
  activeEntries.forEach((e) => {
    const src = e.source.trim();
    if (src) {
      clientTotals[src] = (clientTotals[src] || 0) + e.amount;
    }
  });

  let topClient = { name: 'None', amount: 0, percentage: 0 };
  let maxClientAmt = 0;
  Object.entries(clientTotals).forEach(([client, amt]) => {
    if (amt > maxClientAmt) {
      maxClientAmt = amt;
      topClient = {
        name: client,
        amount: amt,
        percentage: totalRevenue > 0 ? (amt / totalRevenue) * 100 : 0,
      };
    }
  });

  // Top category
  const topCategory = streamSummaries.length > 0
    ? {
        name: streamSummaries[0].name,
        amount: streamSummaries[0].total,
        percentage: streamSummaries[0].percentage,
      }
    : { name: 'None', amount: 0, percentage: 0 };

  return {
    totalRevenue,
    totalReceived,
    totalPending,
    totalCount: activeEntries.length,
    currentMonthRevenue,
    lastMonthRevenue,
    monthOverMonthChange,
    monthlyData,
    streamSummaries,
    topClient,
    topCategory,
  };
}

/**
 * Generate a truthful, rule-based fallback insight report if Gemini API is offline or fails
 */
export function generateDeterministicInsights(
  stats: FinancialStats,
  currency: string = 'PKR'
): AIInsightsReport {
  const { monthlyData, streamSummaries, topClient, totalRevenue, totalPending } = stats;

  // Best month
  let bestMonthData = { month: 'N/A', revenue: 0, details: 'Insufficient data' };
  if (monthlyData.length > 0) {
    const highest = [...monthlyData].sort((a, b) => b.total - a.total)[0];
    bestMonthData = {
      month: formatMonthName(highest.monthKey),
      revenue: highest.total,
      details: `Generated ${formatCurrency(highest.total, currency as any)} across ${highest.count} invoices, driven mainly by ${Object.entries(highest.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'active streams'}.`,
    };
  }

  // Best stream
  const topStream = streamSummaries[0] || { name: 'Client Work', total: 0, percentage: 0 };
  const bestStreamData = {
    stream: topStream.name,
    revenue: topStream.total,
    percentage: Math.round(topStream.percentage),
    details: `Contributed ${topStream.percentage.toFixed(1)}% of all income (${formatCurrency(topStream.total, currency as any)}) across ${topStream.count} logged items.`,
  };

  // Trend
  let direction: 'Growing' | 'Stable' | 'Declining' = 'Stable';
  let trendSummary = 'Revenue is maintaining steady consistency over the tracked period.';
  let trendDetails = `Month-over-month change is at ${stats.monthOverMonthChange >= 0 ? '+' : ''}${stats.monthOverMonthChange.toFixed(1)}%.`;

  if (stats.monthOverMonthChange > 5) {
    direction = 'Growing';
    trendSummary = `Strong positive upward momentum with a +${stats.monthOverMonthChange.toFixed(1)}% revenue surge compared to the previous month.`;
    trendDetails = `Recent client retainers and brand partnerships have expanded monthly cash flow above historical baseline.`;
  } else if (stats.monthOverMonthChange < -5) {
    direction = 'Declining';
    trendSummary = `Revenue declined by ${Math.abs(stats.monthOverMonthChange).toFixed(1)}% this month compared to prior peak.`;
    trendDetails = `Normal freelancer cyclicality or pending receivables awaiting client approval.`;
  }

  // Risks
  const risks: string[] = [];
  if (topClient.percentage > 35) {
    risks.push(
      `High client concentration: "${topClient.name}" represents ${topClient.percentage.toFixed(1)}% of total revenue. Losing this single relationship would significantly disrupt monthly cash flow.`
    );
  } else {
    risks.push(
      `Client distribution is relatively healthy, with "${topClient.name}" leading at ${topClient.percentage.toFixed(1)}% of your income.`
    );
  }

  if (totalPending > 0) {
    const pendingPct = (totalPending / (totalRevenue || 1)) * 100;
    risks.push(
      `Outstanding receivables: ${formatCurrency(totalPending, currency as any)} (${pendingPct.toFixed(1)}%) is currently marked as Pending. Timely follow-ups are essential to prevent liquidity delays.`
    );
  }

  const digitalProductStream = streamSummaries.find((s) => s.name.toLowerCase().includes('product'));
  if (!digitalProductStream || digitalProductStream.percentage < 15) {
    risks.push(
      `Heavy reliance on active hourly/project trading. Product or automated sales represent only ${digitalProductStream ? digitalProductStream.percentage.toFixed(1) : 0}% of earnings.`
    );
  }

  // 3 Practical suggestions
  const suggestions: string[] = [
    `Productize your top skill: Convert repeated custom deliverables from "${topStream.name}" into a fixed-scope productized sprint or downloadable template bundle.`,
    `Incentivize upfront retainer commitments: For active clients like "${topClient.name}", propose quarterly prepaid retainers with a 5% prepayment incentive to eliminate payment delays.`,
    `Diversify into recurring digital assets: Reinvest 10% of monthly client billables into creating high-margin digital templates to smooth out seasonal income dips.`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: `Total tracked revenue stands at ${formatCurrency(totalRevenue, currency as any)} across ${monthlyData.length} months. Your primary growth engine is ${topStream.name}, while client retention remains strong.`,
    bestMonth: bestMonthData,
    bestStream: bestStreamData,
    trend: {
      direction,
      summary: trendSummary,
      details: trendDetails,
    },
    risks: risks.slice(0, 3),
    suggestions: suggestions.slice(0, 3),
    isFallback: true,
  };
}
