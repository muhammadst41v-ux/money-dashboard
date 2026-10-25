import React, { useState, useMemo } from 'react';
import {
  Target,
  Trophy,
  Calendar,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { MonthlyGoal, IncomeEntry, CurrencyCode } from '../types';
import { formatCurrency, formatMonthName, CURRENCY_CONFIG } from '../utils/formatters';

interface GoalsPageProps {
  goals: MonthlyGoal[];
  entries: IncomeEntry[];
  currency: CurrencyCode;
  onSaveGoal: (month: string, targetAmount: number) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  goals,
  entries,
  currency,
  onSaveGoal,
}) => {
  // Current month key (YYYY-MM)
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g., '2026-10'
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [targetInput, setTargetInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // Find goal for selected month
  const activeGoal = useMemo(() => {
    return goals.find((g) => g.month === selectedMonth) || {
      month: selectedMonth,
      targetAmount: 500000, // reasonable default
    };
  }, [goals, selectedMonth]);

  // Actual revenue earned in selected month
  const actualRevenue = useMemo(() => {
    return entries
      .filter((e) => e.date.startsWith(selectedMonth))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [entries, selectedMonth]);

  const receivedRevenue = useMemo(() => {
    return entries
      .filter((e) => e.date.startsWith(selectedMonth) && e.status === 'Received')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [entries, selectedMonth]);

  const progressPct =
    activeGoal.targetAmount > 0 ? (actualRevenue / activeGoal.targetAmount) * 100 : 0;
  const remainingAmount = Math.max(0, activeGoal.targetAmount - actualRevenue);
  const isGoalReached = actualRevenue >= activeGoal.targetAmount && activeGoal.targetAmount > 0;

  // Days left calculation
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysPassed = isCurrentMonth ? now.getDate() : totalDaysInMonth;
  const daysLeft = Math.max(0, totalDaysInMonth - daysPassed);
  const dailyRunRateNeeded = daysLeft > 0 ? remainingAmount / daysLeft : 0;

  const handleUpdateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(targetInput);
    if (!isNaN(parsed) && parsed > 0) {
      onSaveGoal(selectedMonth, parsed);
      setIsEditing(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  const handleStartEdit = () => {
    setTargetInput(activeGoal.targetAmount.toString());
    setIsEditing(true);
  };

  // Build list of months from available entries + goals
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthKey);
    entries.forEach((e) => {
      if (e.date) set.add(e.date.slice(0, 7));
    });
    goals.forEach((g) => set.add(g.month));
    return Array.from(set).sort().reverse();
  }, [entries, goals, currentMonthKey]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Revenue Targets & Goals</h3>
          <p className="text-xs text-slate-500">
            Keep your freelance hustle on track with monthly targets and live pacing
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-600">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setIsEditing(false);
            }}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)} {m === currentMonthKey ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Target Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Top Status & Edit Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                isGoalReached
                  ? 'bg-emerald-500 shadow-emerald-500/25'
                  : 'bg-amber-500 shadow-amber-500/25'
              }`}
            >
              {isGoalReached ? <Trophy className="w-6 h-6" /> : <Target className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Revenue Target for
              </span>
              <h4 className="text-lg sm:text-xl font-bold text-slate-900">
                {formatMonthName(selectedMonth)}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGoalReached ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Target Smashed! 🎉
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                {progressPct.toFixed(0)}% Achieved
              </span>
            )}

            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Change Target
              </button>
            )}
          </div>
        </div>

        {/* Edit Form if activated */}
        {isEditing && (
          <form
            onSubmit={handleUpdateTarget}
            className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Target Amount ({currency})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                autoFocus
                placeholder="e.g. 550000"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto sm:pt-5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Save Target
              </button>
            </div>
          </form>
        )}

        {savedNotice && (
          <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Target successfully updated for {formatMonthName(selectedMonth)}!
          </div>
        )}

        {/* Big Numbers Comparison */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Revenue
            </span>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900">
              {formatCurrency(actualRevenue, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatCurrency(receivedRevenue, currency)} cleared & deposited
            </p>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Target Goal
            </span>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold text-amber-600">
              {formatCurrency(activeGoal.targetAmount, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Target set for {formatMonthName(selectedMonth)}
            </p>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isGoalReached ? 'Surplus Earned' : 'Remaining Gap'}
            </span>
            <p
              className={`mt-1 text-3xl sm:text-4xl font-extrabold ${
                isGoalReached ? 'text-emerald-600' : 'text-slate-700'
              }`}
            >
              {isGoalReached
                ? `+${formatCurrency(actualRevenue - activeGoal.targetAmount, currency)}`
                : formatCurrency(remainingAmount, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isGoalReached
                ? 'Goal achieved! You beat the benchmark.'
                : `${remainingAmount > 0 ? `${formatCurrency(remainingAmount, currency)} left to hit goal` : 'Right on track'}`}
            </p>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-600">Pacing Progress</span>
            <span
              className={
                isGoalReached ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'
              }
            >
              {progressPct.toFixed(1)}% Completed
            </span>
          </div>

          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isGoalReached
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        </div>

        {/* Pacing & Daily Run-rate Card */}
        {isCurrentMonth && (
          <div className="mt-8 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Daily Pacing Needed to Hit Target
                </p>
                <p className="text-xs text-amber-800">
                  {daysLeft} days remaining in this month.
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              {isGoalReached ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                  Target Already Hit! 🎉
                </span>
              ) : (
                <div>
                  <span className="text-base font-extrabold text-amber-900">
                    {formatCurrency(dailyRunRateNeeded, currency)} / day
                  </span>
                  <span className="block text-[11px] text-amber-700">required run rate</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historical Goals Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h4 className="text-base font-bold text-slate-900 mb-4">Goal Performance History</h4>
        <div className="space-y-3">
          {availableMonths.map((m) => {
            const goalForMonth = goals.find((g) => g.month === m)?.targetAmount || 450000;
            const rev = entries
              .filter((e) => e.date.startsWith(m))
              .reduce((sum, e) => sum + e.amount, 0);
            const pct = goalForMonth > 0 ? (rev / goalForMonth) * 100 : 0;
            const hit = rev >= goalForMonth;

            return (
              <div
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  selectedMonth === m
                    ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      hit ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      {formatMonthName(m)}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {hit ? 'Target reached' : `${(100 - pct).toFixed(0)}% below target`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(rev, currency)}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      target: {formatCurrency(goalForMonth, currency)}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                      hit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
