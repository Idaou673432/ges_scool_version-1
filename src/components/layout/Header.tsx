/**
 * SomaSikolo / KalanGest - Header Bar Component
 * Responsive header with mobile drawer toggle, desktop sidebar collapse toggle,
 * multi-school cloud switcher, search & quick actions
 */

import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Cloud,
  Lock,
  Download,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Share2
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { PwaInstallModal } from '../common/PwaInstallModal';
import { CloudSchoolSwitcherModal } from '../common/CloudSchoolSwitcherModal';

interface HeaderProps {
  onSearchQuery?: (q: string) => void;
  onLock?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSearchQuery, 
  onLock,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileMenu
}) => {
  const { settings, payments, cloudSchoolCode, syncStatus } = useSchool();
  const { currentUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [search, setSearch] = useState('');

  // Pending payment count
  const pendingPayments = payments.filter(p => p.remainingAmount > 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onSearchQuery) onSearchQuery(e.target.value);
  };

  return (
    <header className="no-print h-16 sm:h-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20 transition-all">
      {/* Left Section: Menu Toggles & School Branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Ouvrir le menu"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 hover:text-blue-900 hover:bg-blue-50 border border-slate-200/80 rounded-xl transition-all cursor-pointer text-xs font-bold"
          title={isSidebarCollapsed ? "Agrandir le menu latéral" : "Masquer / Réduire le menu pour plus d'espace"}
        >
          {isSidebarCollapsed ? (
            <>
              <PanelLeftOpen className="w-4 h-4 text-blue-900" />
              <span className="text-[11px] text-blue-900 font-black">Menu</span>
            </>
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] text-slate-600">Masquer</span>
            </>
          )}
        </button>

        {/* School Logo */}
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Logo Établissement"
            className="w-8 h-8 sm:w-11 sm:h-11 object-contain rounded-xl border border-slate-200 p-0.5 bg-white shrink-0 shadow-2xs"
          />
        )}

        {/* School Info */}
        <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-[200px] md:max-w-xs lg:max-w-md">
          <h1 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
            {settings.academyName || 'Académie'} • {settings.capName || 'CAP'}
          </h1>
          <p className="text-xs sm:text-base lg:text-lg font-black text-slate-900 tracking-tight truncate leading-tight">
            {settings.schoolName || 'KalanGest Mali'}
          </p>
        </div>
      </div>

      {/* Global Search & Indicators */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-5">
        {/* Cloud Multi-Device Sync Button */}
        <button
          type="button"
          onClick={() => setShowCloudModal(true)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all cursor-pointer border ${
            syncStatus === 'CONNECTED' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
          }`}
          title="Gérer la synchronisation Cloud multi-écoles et multi-appareils"
        >
          <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'SYNCING' ? 'animate-bounce text-amber-600' : 'text-emerald-600'}`} />
          <span className="truncate max-w-[90px] sm:max-w-[130px] font-mono">{cloudSchoolCode}</span>
          <span className="hidden md:inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* Desktop / Tablet Search Input */}
        <div className="hidden md:flex items-center relative w-36 lg:w-60 xl:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all"
          />
        </div>

        {/* Mobile Search Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Rechercher"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* System Badges (Desktop Only) */}
        <div className="hidden xl:flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPwaModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full text-[11px] font-black uppercase tracking-wider shadow-2xs transition-all cursor-pointer border border-amber-400/50"
            title="Installer KalanGest sur votre téléphone ou PC"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>Installer l'App</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-100 text-blue-900 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-blue-700" />
            <span>{settings.currentAcademicYear}</span>
          </div>
        </div>

        {/* Notifications Popover Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-all cursor-pointer"
            title="Alertes & Notifications"
          >
            <Bell className="w-5 h-5" />
            {pendingPayments.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-black text-slate-900 uppercase tracking-wide text-[11px]">
                  Alertes & Retards
                </span>
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black text-[10px]">
                  {pendingPayments.length} retard(s)
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {pendingPayments.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-3 hover:bg-slate-50 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">
                        {p.studentName} ({p.className})
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Reste dû : <strong className="text-rose-600">{p.remainingAmount.toLocaleString()} FCFA</strong>
                      </p>
                    </div>
                  </div>
                ))}

                <div className="p-3 hover:bg-slate-50 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">
                      Synchronisation Cloud Live Activée
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Vos données sont répliquées en direct sur le Cloud.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lock App Button */}
        {onLock && (
          <button
            type="button"
            onClick={onLock}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center gap-1"
            title="Verrouiller l'Application (Code PIN)"
          >
            <Lock className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {/* User Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[110px]">
              {currentUser?.fullName}
            </p>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest truncate">
              {AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}
            </p>
          </div>
          <div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-900 text-white font-black text-xs sm:text-sm flex items-center justify-center border-2 border-white shadow-xs shrink-0 cursor-pointer"
            onClick={() => setShowCloudModal(true)}
            title={`${currentUser?.fullName} (${AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}) - Cliquez pour gérer la synchronisation Cloud`}
          >
            {currentUser?.fullName?.charAt(0) || 'A'}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay Bar */}
      {showMobileSearch && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-3 shadow-md z-30 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={handleSearchChange}
              placeholder="Rechercher élève, classe..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMobileSearch(false);
              setSearch('');
              if (onSearchQuery) onSearchQuery('');
            }}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* PWA Install Guide Modal */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />

      {/* Multi-School & Cloud Sync Switcher Modal */}
      <CloudSchoolSwitcherModal isOpen={showCloudModal} onClose={() => setShowCloudModal(false)} />
    </header>
  );
};
