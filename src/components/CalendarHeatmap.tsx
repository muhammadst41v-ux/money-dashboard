import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Flame,
  TrendingUp,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { IncomeEntry, CurrencyCode } from '../types';
import { formatCurrency, formatCompactCurrency, formatDate, formatMonthName } from '../utils/formatters';

interface CalendarHeatmapProps {
  entries: IncomeEntry[];
  currency: CurrencyCode;
  selectedMonthKey?: string; // e.g. '2026-10' or undefined
  onSelectDateFilter?: (dateStr: string) => void;
  todayCellClassName?: string;
}

interface DayData {
  dayNumber: number;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  count: number;
  entries: IncomeEntry[];
  isToday: boolean;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  entries,
  currency,
  selectedMonthKey,
  onSelectDateFilter,
  todayCellClassName,
}) => {
  // Determine which month to display (defaults to selectedMonthKey or current month)
  const defaultMonth = useMemo(() => {
    if (selectedMonthKey && selectedMonthKey !== 'all') return selectedMonthKey;
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  }, [selectedMonthKey]);

  const [activeMonth, setActiveMonth] = useState<string>(defaultMonth);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayData | null>(null);

  // Sync if selectedMonthKey changes externally and is not 'all'
  React.useEffect(() => {
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      setActiveMonth(selectedMonthKey);
    }
  }, [selectedMonthKey]);

  const [yearStr, monthStr] = activeMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Days calculations
  const { days, peakDailyRevenue, totalMonthRevenue, totalActiveDays, totalMonthEntries } =
    useMemo(() => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun

      // Filter entries for this month
      const monthEntries = entries.filter((e) => e.date.startsWith(activeMonth));
      const dayMap = new Map<string, IncomeEntry[]>();

      monthEntries.forEach((e) => {
        if (!dayMap.has(e.date)) dayMap.set(e.date, []);
        dayMap.get(e.date)!.push(e);
      });

      let maxRevenue = 0;
      let monthTotal = 0;
      let activeDaysCount = 0;

      // Find max daily revenue for intensity normalization
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${activeMonth}-${String(d).padStart(2, '0')}`;
        const dayItems = dayMap.get(dStr) || [];
        const dayTotal = dayItems.reduce((acc, i) => acc + i.amount, 0);
        if (dayTotal > maxRevenue) maxRevenue = dayTotal;
        if (dayTotal > 0) activeDaysCount++;
        monthTotal += dayTotal;
      }

      const now = new Date();
      const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayUtcStr = now.toISOString().split('T')[0];
      const resultDays: (DayData | null)[] = [];

      // Add leading empty slots for first week padding
      for (let i = 0; i < firstDayOfWeek; i++) {
        resultDays.push(null);
      }

      // Populate day data
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${activeMonth}-${String(d).padStart(2, '0')}`;
        const dayItems = dayMap.get(dStr) || [];
        const dayTotal = dayItems.reduce((acc, i) => acc + i.amount, 0);
        const received = dayItems
          .filter((i) => i.status === 'Received')
          .reduce((acc, i) => acc + i.amount, 0);
        const pending = dayItems
          .filter((i) => i.status === 'Pending')
          .reduce((acc, i) => acc + i.amount, 0);

        let intensity: 0 | 1 | 2 | 3 | 4 = 0;
        if (dayTotal > 0 && maxRevenue > 0) {
          const ratio = dayTotal / maxRevenue;
          if (ratio >= 0.75) intensity = 4;
          else if (ratio >= 0.45) intensity = 3;
          else if (ratio >= 0.2) intensity = 2;
          else intensity = 1;
        }

        const dateObj = new Date(year, month - 1, d);

        resultDays.push({
          dayNumber: d,
          dateStr: dStr,
          dayOfWeek: dateObj.getDay(),
          totalAmount: dayTotal,
          receivedAmount: received,
          pendingAmount: pending,
          count: dayItems.length,
          entries: dayItems,
          isToday: dStr === todayLocalStr || dStr === todayUtcStr,
          intensity,
        });
      }

      return {
        days: resultDays,
        peakDailyRevenue: maxRevenue,
        totalMonthRevenue: monthTotal,
        totalActiveDays: activeDaysCount,
        totalMonthEntries: monthEntries.length,
      };
    }, [activeMonth, entries, year, month]);

  // Navigate months
  const handlePrevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    const mm = String(prev.getMonth() + 1).padStart(2, '0');
    setActiveMonth(`${prev.getFullYear()}-${mm}`);
    setSelectedDayDetail(null);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month, 1);
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    setActiveMonth(`${next.getFullYear()}-${mm}`);
    setSelectedDayDetail(null);
  };

  // Day cell background color & border styling based on intensity
  const getCellClasses = (day: DayData) => {
    const base = 'group relative flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer select-none text-left min-h-[58px] sm:min-h-[72px]';

    let colorStyle = '';
    switch (day.intensity) {
      case 4: // Peak
        colorStyle = day.isToday
          ? 'bg-amber-500 text-white'
          : 'bg-amber-500 border border-amber-600 text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 hover:border-amber-700';
        break;
      case 3: // High
        colorStyle = day.isToday
          ? 'bg-amber-400 text-white'
          : 'bg-amber-400 border border-amber-500 text-white hover:bg-amber-500 hover:border-amber-600';
        break;
      case 2: // Medium
        colorStyle = day.isToday
          ? 'bg-amber-200 text-amber-950'
          : 'bg-amber-200 border border-amber-300 text-amber-950 hover:bg-amber-300 hover:border-amber-400';
        break;
      case 1: // Low
        colorStyle = day.isToday
          ? 'bg-amber-50 text-amber-900'
          : 'bg-amber-50 border border-amber-200/90 text-amber-900 hover:bg-amber-100 hover:border-amber-300';
        break;
      default: // 0 income
        colorStyle = day.isToday
          ? 'bg-slate-50/90 text-slate-700'
          : 'bg-slate-50/70 border border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300 hover:shadow-2xs';
        break;
    }

    const todayStyle = day.isToday
      ? 'border-2 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] relative z-10'
      : '';
    const selectedRing = selectedDayDetail?.dateStr === day.dateStr ? 'ring-2 ring-amber-600 ring-offset-2' : '';

    return `${base} ${colorStyle} ${todayStyle} ${selectedRing}`;
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="activity-heatmap-container bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900">Income Activity Heatmap</h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60">
                Daily Frequency
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Visualizes payment cadence and concentration throughout {formatMonthName(activeMonth)}
            </p>
          </div>
        </div>

        {/* Month Navigator & Summary Pills */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[110px] text-center">
              {formatMonthName(activeMonth)}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Month Total
          </span>
          <p className="mt-0.5 text-base sm:text-lg font-extrabold text-slate-900">
            {formatCurrency(totalMonthRevenue, currency)}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Active Earning Days
          </span>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-800">
            {totalActiveDays} <span className="text-xs font-normal text-slate-500">/ {days.filter(Boolean).length} days</span>
          </p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Peak Single Day
          </span>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-amber-700">
            {peakDailyRevenue > 0 ? formatCurrency(peakDailyRevenue, currency) : 'N/A'}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Daily Average (Active)
          </span>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-800">
            {totalActiveDays > 0 ? formatCurrency(totalMonthRevenue / totalActiveDays, currency) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {weekdays.map((day, i) => (
            <span
              key={day}
              className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="rounded-xl bg-slate-50/30 border border-transparent min-h-[58px] sm:min-h-[72px]"
                />
              );
            }

            const hasIncome = day.totalAmount > 0;
            const textColor =
              day.intensity >= 3 ? 'text-white' : day.intensity >= 1 ? 'text-amber-950' : 'text-slate-700';

            const isFirstRow = index < 7;
            const isLeftEdge = day.dayOfWeek === 0;
            const isRightEdge = day.dayOfWeek === 6;

            const verticalPosition = isFirstRow ? 'top-full mt-2' : 'bottom-full mb-2';
            const horizontalPosition = isLeftEdge
              ? 'left-0'
              : isRightEdge
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2';

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDayDetail(selectedDayDetail?.dateStr === day.dateStr ? null : day)}
                className={getCellClasses(day)}
              >
                {/* Top Row: Day Number + Frequency Badge */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${textColor}`}>
                      {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500 animate-pulse"
                        title="Today"
                      />
                    )}
                  </div>

                  {hasIncome && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                        day.intensity >= 3
                          ? 'bg-black/20 text-white'
                          : 'bg-amber-500/20 text-amber-900 font-bold'
                      }`}
                    >
                      {day.count}x
                    </span>
                  )}
                </div>

                {/* Bottom Row: Amount or Placeholder */}
                <div className="mt-1">
                  {hasIncome ? (
                    <span
                      className={`block text-[11px] sm:text-xs font-extrabold truncate ${textColor}`}
                    >
                      {formatCompactCurrency(day.totalAmount, currency)}
                    </span>
                  ) : (
                    <span className="block text-[10px] text-slate-300 font-medium">
                      —
                    </span>
                  )}
                </div>

                {/* Hover Tooltip displaying exact total income and number of transactions */}
                <div
                  className={`absolute ${verticalPosition} ${horizontalPosition} hidden group-hover:flex flex-col z-50 pointer-events-none w-56 p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700/80 text-xs animate-in fade-in zoom-in-95 duration-150`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{formatDate(day.dateStr)}</span>
                      {day.isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950">
                          Today
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        hasIncome ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {day.count} {day.count === 1 ? 'transaction' : 'transactions'}
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                      Exact Total Income
                    </span>
                    <span className="text-sm font-extrabold text-amber-400 block mt-0.5">
                      {formatCurrency(day.totalAmount, currency)}
                    </span>
                  </div>

                  {hasIncome && (
                    <div className="pt-2 mt-1.5 border-t border-slate-800 text-[11px] space-y-1">
                      {day.receivedAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Received:
                          </span>
                          <span className="font-semibold">{formatCurrency(day.receivedAmount, currency)}</span>
                        </div>
                      )}
                      {day.pendingAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-amber-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Pending:
                          </span>
                          <span className="font-semibold">{formatCurrency(day.pendingAmount, currency)}</span>
                        </div>
                      )}
                      {day.entries.length > 0 && (
                        <div className="pt-1 text-[10px] text-slate-400 line-clamp-1 italic">
                          {day.entries.map((e) => e.source).join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tooltip Caret Pointer */}
                  <div
                    className={`absolute ${
                      isFirstRow
                        ? 'bottom-full -mb-1 border-b-slate-900 border-b-4'
                        : 'top-full -mt-1 border-t-slate-900 border-t-4'
                    } ${
                      isLeftEdge
                        ? 'left-4'
                        : isRightEdge
                        ? 'right-4'
                        : 'left-1/2 -translate-x-1/2'
                    } border-4 border-transparent`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Invoice Drilldown Drawer */}
      {selectedDayDetail && (
        <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
              <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                Activity on {formatDate(selectedDayDetail.dateStr)}
              </h5>
              <span className="text-xs font-bold text-amber-800 bg-white border border-amber-200 px-2 py-0.5 rounded-lg">
                Total: {formatCurrency(selectedDayDetail.totalAmount, currency)}
              </span>
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>

          {selectedDayDetail.entries.length === 0 ? (
            <p className="text-xs text-slate-500 pt-3">
              No revenue was logged on this calendar day.
            </p>
          ) : (
            <div className="pt-3 space-y-2">
              {selectedDayDetail.entries.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-2.5 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.status === 'Received' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <strong className="text-slate-900 font-semibold">{item.source}</strong>
                      <span className="text-[11px] text-slate-400 ml-2">({item.category})</span>
                      {item.note && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Received'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Heatmap Intensity Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span>Click any date cell to inspect detailed invoice breakdown</span>
        </div>

        {/* Intensity Scale */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-400">Revenue Density:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">None</span>
            <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" title="No Revenue" />
            <div className="w-4 h-4 rounded bg-amber-50 border border-amber-200" title="Low ($1 - 25% peak)" />
            <div className="w-4 h-4 rounded bg-amber-200 border border-amber-300" title="Medium (25% - 50% peak)" />
            <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500" title="High (50% - 75% peak)" />
            <div className="w-4 h-4 rounded bg-amber-500 border border-amber-600" title="Peak (> 75% peak)" />
            <span className="text-[10px] text-slate-600 font-bold">Peak</span>
          </div>
        </div>
      </div>
    </div>
  );
};
