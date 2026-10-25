import {
  LayoutDashboard,
  ReceiptText,
  Layers,
  Network,
  Target,
  Sparkles,
  Settings,
  Wallet,
  X,
  TrendingUp,
  CircleCheck,
} from 'lucide-react';
import { UserSettings } from '../types';

export type PageId = 'dashboard' | 'income' | 'streams' | 'connections' | 'goals' | 'insights' | 'settings';

interface SidebarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  goalProgressPct?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  onClose,
  settings,
  goalProgressPct = 0,
}) => {
  const navItems: { id: PageId; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'income', label: 'Income', icon: ReceiptText },
    { id: 'streams', label: 'Streams', icon: Layers },
    { id: 'connections', label: 'Connections', icon: Network },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'insights', label: 'AI Insights', icon: Sparkles, badge: 'Gemini' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-18 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
                Money Dashboard
              </h1>
              <span className="text-xs font-medium text-amber-600">Freelancer & Creator</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Goal Mini-Tracker in Sidebar */}
        <div className="px-4 py-3 mx-3 mb-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
            <span className="flex items-center gap-1.5 text-amber-800">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              Monthly Goal
            </span>
            <span className="text-amber-900 font-bold">{Math.round(goalProgressPct)}%</span>
          </div>
          <div className="w-full h-2 bg-amber-200/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, goalProgressPct))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Progress this month</span>
            {goalProgressPct >= 100 && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CircleCheck className="w-3 h-3" /> Met
              </span>
            )}
          </p>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 text-white font-semibold text-xs shadow-xs">
              {settings.creatorName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'ME'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {settings.creatorName || 'Freelance Creator'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {settings.creatorHandle || 'Currency: ' + settings.currency}
              </p>
            </div>
            <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
              {settings.currency}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
