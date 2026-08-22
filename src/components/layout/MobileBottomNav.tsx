/**
 * SomaSikolo / KalanGest - Mobile Bottom Quick Navigation Bar
 * Optimized for touch interactions and 1-hand mobile phone navigation
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CreditCard, 
  Menu
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenFullMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenFullMenu,
}) => {
  const quickItems = [
    { id: 'dashboard' as NavTab, label: 'Accueil', icon: LayoutDashboard },
    { id: 'students' as NavTab, label: 'Élèves', icon: Users },
    { id: 'grades' as NavTab, label: 'Notes', icon: ClipboardList },
    { id: 'payments' as NavTab, label: 'Caisse', icon: CreditCard },
  ];

  return (
    <nav 
      aria-label="Navigation mobile"
      className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around select-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      {quickItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-blue-900 font-black'
                : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <div className={`p-1 rounded-lg transition-transform ${isActive ? 'bg-blue-100/70 scale-110' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-900' : 'text-slate-500'}`} />
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-black text-blue-950' : 'text-slate-500'}`}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Menu / Plus Button */}
      <button
        type="button"
        onClick={onOpenFullMenu}
        className="flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl transition-all text-slate-600 hover:text-blue-950 font-semibold cursor-pointer"
        title="Ouvrir tout le menu"
      >
        <div className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
          <Menu className="w-5 h-5 text-slate-700" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 text-slate-600 font-bold">
          Menu (11)
        </span>
      </button>
    </nav>
  );
};
