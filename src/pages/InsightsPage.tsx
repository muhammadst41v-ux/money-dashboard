import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Layers,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import {
  IncomeEntry,
  StreamConfig,
  CurrencyCode,
  UserSettings,
  AIInsightsReport,
} from '../types';
import { calculateFinancialStats, generateDeterministicInsights } from '../utils/financialAnalytics';
import { formatCurrency, formatMonthName } from '../utils/formatters';

interface InsightsPageProps {
  entries: IncomeEntry[];
  streams: StreamConfig[];
  currency: CurrencyCode;
  settings: UserSettings;
  cachedInsights: AIInsightsReport | null;
  onSaveInsights: (report: AIInsightsReport) => void;
}

export const InsightsPage: React.FC<InsightsPageProps> = ({
  entries,
  streams,
  currency,
  settings,
  cachedInsights,
  onSaveInsights,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [insights, setInsights] = useState<AIInsightsReport | null>(cachedInsights);

  // Compute live local financial stats
  const stats = calculateFinancialStats(entries, streams);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // Prepare clean summary payload for Gemini
    const incomeDataSummary = {
      creatorName: settings.creatorName,
      businessTitle: settings.businessTitle,
      currency,
      totalTrackedRevenue: stats.totalRevenue,
      totalReceived: stats.totalReceived,
      totalPending: stats.totalPending,
      totalInvoicesCount: stats.totalCount,
      monthOverMonthChangePercentage: Number(stats.monthOverMonthChange.toFixed(2)),
      monthlyBreakdown: stats.monthlyData.map((m) => ({
        month: m.monthName,
        total: m.total,
        received: m.received,
        pending: m.pending,
        count: m.count,
        categories: m.byCategory,
      })),
      streamsBreakdown: stats.streamSummaries.map((s) => ({
        stream: s.name,
        total: s.total,
        percentage: Number(s.percentage.toFixed(1)),
        transactionsCount: s.count,
      })),
      topClient: stats.topClient,
      topStream: stats.topCategory,
    };

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomeDataSummary,
          currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.insights) {
        throw new Error(data.error || 'Invalid insights format returned by API');
      }

      const generatedReport: AIInsightsReport = {
        ...data.insights,
        generatedAt: new Date().toISOString(),
        isFallback: false,
      };

      setInsights(generatedReport);
      onSaveInsights(generatedReport);
    } catch (err: any) {
      console.warn('Gemini API call failed, deploying local deterministic insights engine:', err);
      setErrorMessage(
        err.message || 'Could not communicate with Gemini API. Showing local financial insights.'
      );

      // Provide truthful fallback calculation so the user is never left hanging
      const fallbackReport = generateDeterministicInsights(stats, currency);
      setInsights(fallbackReport);
      onSaveInsights(fallbackReport);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by Gemini 3.8 Flash</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Financial Intelligence & Strategic Insights
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
            Gemini audits your revenue streams, tracks month-over-month trajectory, flags client
            concentration risks, and gives 3 practical moves to increase billings.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={handleGenerateInsights}
              disabled={isLoading || entries.length === 0}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-amber-50 active:scale-98 font-bold text-sm rounded-2xl shadow-lg shadow-black/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Analyzing {entries.length} Ledger Entries...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{insights ? 'Re-generate Insights' : 'Generate Insights'}</span>
                </>
              )}
            </button>

            {insights?.generatedAt && (
              <span className="text-xs text-amber-200/90">
                Last generated:{' '}
                {new Date(insights.generatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Fallback Notice if triggered */}
      {errorMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong className="font-bold">Notice: </strong>
            {errorMessage}
            <span className="block mt-0.5 text-amber-800">
              Generated via deterministic local analysis engine based strictly on your {entries.length} records.
            </span>
          </div>
        </div>
      )}

      {/* When no insights yet */}
      {!insights && !isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Ready to uncover your revenue patterns?</h4>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Click "Generate Insights" above to let Gemini review all {entries.length} income entries,
            spot trends, and detect revenue risks.
          </p>
          <button
            onClick={handleGenerateInsights}
            className="mt-6 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            Run Financial Audit
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 bg-slate-200 rounded-2xl" />
            <div className="h-44 bg-slate-200 rounded-2xl" />
          </div>
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      )}

      {/* Generated Insights Content */}
      {insights && !isLoading && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          {insights.executiveSummary && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs border-l-4 border-l-amber-500">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">
                Executive CFO Summary
              </span>
              <p className="mt-1 text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                "{insights.executiveSummary}"
              </p>
            </div>
          )}

          {/* Core Findings Grid: Best Month & Best Stream */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Best Month Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Peak Performance
                      </span>
                      <h4 className="text-base font-bold text-slate-900">Best Month</h4>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    {insights.bestMonth.month}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-3xl font-extrabold text-slate-900">
                    {formatCurrency(insights.bestMonth.revenue, currency)}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {insights.bestMonth.details}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Highest grossing billing cycle on record</span>
              </div>
            </div>

            {/* Best Stream Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Primary Engine
                      </span>
                      <h4 className="text-base font-bold text-slate-900">Best Income Stream</h4>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {insights.bestStream.percentage}% of Revenue
                  </span>
                </div>

                <div className="mt-5">
                  <h5 className="text-lg font-bold text-slate-900">{insights.bestStream.stream}</h5>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">
                    {formatCurrency(insights.bestStream.revenue, currency)}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {insights.bestStream.details}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Largest cumulative contributor to your bottom line</span>
              </div>
            </div>
          </div>

          {/* Trend Analysis Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    insights.trend.direction.toLowerCase().includes('grow')
                      ? 'bg-emerald-100 text-emerald-700'
                      : insights.trend.direction.toLowerCase().includes('declin')
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {insights.trend.direction.toLowerCase().includes('grow') ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Revenue Trajectory
                  </span>
                  <h4 className="text-base font-bold text-slate-900">Trend & Momentum</h4>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-lg ${
                  insights.trend.direction.toLowerCase().includes('grow')
                    ? 'bg-emerald-100 text-emerald-800'
                    : insights.trend.direction.toLowerCase().includes('declin')
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {insights.trend.direction}
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="text-sm font-bold text-slate-900">{insights.trend.summary}</p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {insights.trend.details}
              </p>
            </div>
          </div>

          {/* Financial Risks Detected */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Vulnerability Check
                </span>
                <h4 className="text-base font-bold text-slate-900">Identified Financial Risks</h4>
              </div>
            </div>

            <div className="space-y-3">
              {insights.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-amber-50/50 border border-amber-200/70 rounded-xl flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {risk}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Practical Growth Suggestions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Action Plan
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  3 Practical Moves to Grow Income
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-amber-400 hover:bg-amber-50/20 transition-all"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center mb-3">
                      {idx + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                      {suggestion}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <span>High leverage</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
