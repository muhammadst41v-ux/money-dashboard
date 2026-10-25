import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { IncomeEntry, StreamConfig, CurrencyCode, UserSettings } from '../types';
import { calculateFinancialStats } from '../utils/financialAnalytics';
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';
import { StreamIcon } from '../components/StreamIcon';
import { CalendarHeatmap } from '../components/CalendarHeatmap';

interface DashboardPageProps {
  entries: IncomeEntry[];
  streams: StreamConfig[];
  currency: CurrencyCode;
  settings: UserSettings;
  hasSampleData?: boolean;
  sampleCount?: number;
  onClearSampleData?: () => void;
  onOpenAddIncomeModal: () => void;
  onNavigateToIncome: (filterCategory?: string) => void;
  onNavigateToInsights: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  entries,
  streams,
  currency,
  settings,
  hasSampleData = false,
  sampleCount = 0,
  onClearSampleData,
  onOpenAddIncomeModal,
  onNavigateToIncome,
  onNavigateToInsights,
}) => {
  // Filters: Month filter & Year filter
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedYear, setSelectedYear] = useState<string>('all'); // 'all' or 'YYYY'

  // Extract unique years and months from entries
  const { availableYears, availableMonths } = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();

    entries.forEach((e) => {
      if (e.date) {
        years.add(e.date.slice(0, 4));
        months.add(e.date.slice(0, 7));
      }
    });

    return {
      availableYears: Array.from(years).sort().reverse(),
      availableMonths: Array.from(months).sort().reverse(),
    };
  }, [entries]);

  // Filter entries based on Year and Month filters
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedYear !== 'all' && !e.date.startsWith(selectedYear)) return false;
      if (selectedMonth !== 'all' && !e.date.startsWith(selectedMonth)) return false;
      return true;
    });
  }, [entries, selectedYear, selectedMonth]);

  // Calculate full stats
  const stats = useMemo(() => {
    return calculateFinancialStats(
      filteredEntries,
      streams,
      selectedMonth !== 'all' ? selectedMonth : undefined
    );
  }, [filteredEntries, streams, selectedMonth]);

  // Overall monthly bar chart data (last 6 months or all months in view)
  const barChartData = useMemo(() => {
    // If specific year selected, show those months; otherwise show last 6-8 months
    const allMonths = stats.monthlyData;
    if (selectedYear !== 'all') {
      return allMonths.filter((m) => m.monthKey.startsWith(selectedYear));
    }
    return allMonths.slice(-6); // last 6 months
  }, [stats.monthlyData, selectedYear]);

  // Donut chart data: share by stream
  const pieChartData = useMemo(() => {
    return stats.streamSummaries
      .filter((s) => s.total > 0)
      .map((s) => ({
        name: s.name,
        value: s.total,
        color: s.color,
        percentage: s.percentage,
      }));
  }, [stats.streamSummaries]);

  // Top stream cards (Brand Deals, Product Sales, Client Work, Other, and any custom stream)
  const streamCards = stats.streamSummaries;

  // Recent 5 entries
  const recentEntries = useMemo(() => {
    return [...filteredEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [filteredEntries]);

  const isMoMPositive = stats.monthOverMonthChange >= 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Sample Data Notice Banner (One-click Clear sample data) */}
      {hasSampleData && (
        <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-2xs shrink-0">
              Sample Data Active
            </span>
            <p className="text-xs text-amber-950 font-medium">
              Showing <strong>6 months of pre-filled sample revenue</strong> ({sampleCount} entries). All charts, breakdowns, and insights are demonstrating full functionality.
            </p>
          </div>
          {onClearSampleData && (
            <button
              onClick={onClearSampleData}
              className="px-3.5 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto"
            >
              Clear sample data
            </button>
          )}
        </div>
      )}

      {/* Filters Bar & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span>Filter By:</span>
          </div>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              // Reset month filter if it doesn't match selected year
              if (e.target.value !== 'all' && selectedMonth !== 'all' && !selectedMonth.startsWith(e.target.value)) {
                setSelectedMonth('all');
              }
            }}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">All Months (Overview)</option>
            {availableMonths.map((m) => {
              const [y, mm] = m.split('-');
              const d = new Date(parseInt(y), parseInt(mm) - 1, 1);
              const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <option key={m} value={m}>
                  {label}
                </option>
              );
            })}
          </select>

          {(selectedMonth !== 'all' || selectedYear !== 'all') && (
            <button
              onClick={() => {
                setSelectedMonth('all');
                setSelectedYear('all');
              }}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 underline underline-offset-2 ml-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* AI Insights banner link */}
        <button
          onClick={onNavigateToInsights}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Ask Gemini AI for Insights</span>
        </button>
      </div>

      {/* Top Metrics Row: Big "Total Revenue" Card + Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* BIG Total Revenue Card with % Change vs Last Month */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Total Revenue {selectedMonth !== 'all' ? `(${selectedMonth})` : '(All Time)'}</span>
              </div>
              <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(stats.totalRevenue, currency)}
              </h3>
            </div>

            {/* % Change vs Last Month Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isMoMPositive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isMoMPositive ? (
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{formatPercentage(stats.monthOverMonthChange)} vs last mo</span>
            </div>
          </div>

          {/* Breakdown Pills: Received vs Pending */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Received</span>
              </div>
              <p className="mt-1 text-base sm:text-lg font-bold text-emerald-900">
                {formatCurrency(stats.totalReceived, currency)}
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Receivables</span>
              </div>
              <p className="mt-1 text-base sm:text-lg font-bold text-amber-900">
                {formatCurrency(stats.totalPending, currency)}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-xs font-medium text-slate-500">Total Deals / Invoices</div>
              <p className="mt-1 text-base sm:text-lg font-bold text-slate-800">
                {stats.totalCount} entries
              </p>
            </div>
          </div>
        </div>

        {/* Current Month & Top Client Quick Highlight */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Key Highlights
            </span>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Top Single Client / Source</p>
                <p className="text-base font-bold text-slate-900 truncate">
                  {stats.topClient.name}
                </p>
                <p className="text-xs font-semibold text-amber-600">
                  {formatCurrency(stats.topClient.amount, currency)} ({stats.topClient.percentage.toFixed(1)}% share)
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Dominant Stream</p>
                <p className="text-base font-bold text-slate-900">
                  {stats.topCategory.name}
                </p>
                <p className="text-xs font-semibold text-emerald-600">
                  {formatCurrency(stats.topCategory.amount, currency)} ({stats.topCategory.percentage.toFixed(1)}% share)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Currency: <strong className="text-slate-800">{currency}</strong></span>
            <button
              onClick={() => onNavigateToIncome()}
              className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              All Records <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Monthly Revenue Bar Chart (Amber/Yellow) + Stream Pie/Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">Monthly Revenue</h4>
              <p className="text-xs text-slate-500">
                {selectedYear !== 'all' ? `Revenue generated in ${selectedYear}` : 'Last 6 months revenue progression'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                Revenue ({currency})
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-72 w-full pt-2">
            {barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                No revenue records in this timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortMonth"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return String(val);
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: '#FEF3C7', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                            <p className="font-bold text-amber-400 text-sm">{data.monthName}</p>
                            <p className="font-semibold text-white">
                              Total: {formatCurrency(data.total, currency)}
                            </p>
                            <div className="pt-1.5 border-t border-slate-700 text-[11px] text-slate-300 space-y-0.5">
                              <p className="flex justify-between gap-4">
                                <span>Received:</span>
                                <strong className="text-emerald-400 font-semibold">
                                  {formatCurrency(data.received, currency)}
                                </strong>
                              </p>
                              {data.pending > 0 && (
                                <p className="flex justify-between gap-4">
                                  <span>Pending:</span>
                                  <strong className="text-amber-400 font-semibold">
                                    {formatCurrency(data.pending, currency)}
                                  </strong>
                                </p>
                              )}
                              <p className="text-slate-400">{data.count} transaction(s)</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Yellow/Amber bars with rounded tops as specifically requested */}
                  <Bar
                    dataKey="total"
                    fill="#F59E0B"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie/Donut Chart of Revenue by Stream (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-slate-900">Revenue by Stream</h4>
              <span className="text-xs font-semibold text-slate-400">Distribution</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Share of wallet across your primary income channels
            </p>

            <div className="h-52 w-full flex items-center justify-center">
              {pieChartData.length === 0 ? (
                <div className="text-slate-400 text-xs">No stream data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-md">
                              <p className="font-bold text-slate-200">{data.name}</p>
                              <p className="font-semibold text-amber-400">
                                {formatCurrency(data.value, currency)} ({data.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stream Legend / Quick List */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            {pieChartData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-700 truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {formatCurrency(item.value, currency)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold w-10 text-right">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar-Based Activity Heatmap (Income frequency & revenue concentration) */}
      <div className="activity-heatmap-container">
        <CalendarHeatmap
          entries={entries}
          currency={currency}
          selectedMonthKey={selectedMonth !== 'all' ? selectedMonth : undefined}
          todayCellClassName="border-2 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] relative z-10"
        />
      </div>

      {/* Stream Cards Grid: Brand Deals, Product Sales, Client Work, Other, etc. */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">Income Streams Breakdown</h4>
            <p className="text-xs text-slate-500">
              Detailed performance metrics per income channel
            </p>
          </div>
          <button
            onClick={() => onNavigateToIncome()}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View detailed ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {streamCards.map((stream) => {
            return (
              <div
                key={stream.name}
                onClick={() => onNavigateToIncome(stream.name)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs"
                      style={{ backgroundColor: stream.color }}
                    >
                      <StreamIcon iconName={stream.icon} className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {stream.percentage.toFixed(1)}%
                    </span>
                  </div>

                  <h5 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {stream.name}
                  </h5>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {formatCurrency(stream.total, currency)}
                  </p>
                </div>

                {/* Progress bar of stream share */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, stream.percentage))}%`,
                        backgroundColor: stream.color,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{stream.count} transaction{stream.count === 1 ? '' : 's'}</span>
                    {stream.pending > 0 && (
                      <span className="text-amber-600 font-medium">
                        {formatCurrency(stream.pending, currency)} pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Table Snippet */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">Recent Income Activity</h4>
            <p className="text-xs text-slate-500">Latest payouts and incoming payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAddIncomeModal}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Entry</span>
            </button>
            <button
              onClick={() => onNavigateToIncome()}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              View All
            </button>
          </div>
        </div>

        {recentEntries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No entries recorded yet. Click "Add Entry" to log income.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source / Client</th>
                  <th className="px-4 py-3">Stream</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-medium">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {entry.source}
                      {entry.note && (
                        <span className="block text-[11px] text-slate-400 font-normal truncate max-w-xs">
                          {entry.note}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(entry.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.status === 'Received'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
