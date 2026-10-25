import React from 'react';
import { Menu, Plus, Globe } from 'lucide-react';
import { CurrencyCode, UserSettings } from '../types';
import { CURRENCY_CONFIG } from '../utils/formatters';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title: string;
  subtitle?: string;
  settings: UserSettings;
  onUpdateCurrency: (currency: CurrencyCode) => void;
  onOpenAddIncomeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  title,
  subtitle,
  settings,
  onUpdateCurrency,
  onOpenAddIncomeModal,
}) => {
  const currencies: CurrencyCode[] = ['PKR', 'USD', 'INR', 'AED', 'GBP'];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 h-18 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Currency Switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
          <div className="px-2 py-1 text-slate-400 hidden md:flex items-center gap-1 text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium">Currency:</span>
          </div>
          <select
            value={settings.currency}
            onChange={(e) => onUpdateCurrency(e.target.value as CurrencyCode)}
            className="bg-white border-0 text-slate-800 font-semibold text-xs sm:text-sm rounded-lg py-1 px-2.5 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {curr} ({CURRENCY_CONFIG[curr].symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Add Income Button */}
        <button
          onClick={onOpenAddIncomeModal}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Income</span>
        </button>
      </div>
    </header>
  );
};
