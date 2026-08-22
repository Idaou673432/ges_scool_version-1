/**
 * SomaSikolo - Header Bar Component
 */

import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Calendar, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  Database,
  Building2,
  Lock,
  Download
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { PwaInstallModal } from '../common/PwaInstallModal';

interface HeaderProps {
  onSearchQuery?: (q: string) => void;
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchQuery, onLock }) => {
  const { settings, payments } = useSchool();
  const { currentUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [search, setSearch] = useState('');

  // Pending payment count
  const pendingPayments = payments.filter(p => p.remainingAmount > 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onSearchQuery) onSearchQuery(e.target.value);
  };

  return (
    <header className="no-print h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 lg:px-10 flex items-center justify-between shrink-0 z-20">
      {/* Title & Eyebrow Header */}
      <div className="flex items-center gap-4">
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Logo Établissement"
            className="w-11 h-11 object-contain rounded-xl border border-slate-200 p-0.5 bg-white shrink-0 shadow-xs"
          />
        )}
        <div className="flex flex-col">
          <h1 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {settings.academyName} • {settings.capName}
          </h1>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {settings.schoolName}
          </p>
        </div>
      </div>

      {/* Global Search & Indicators */}
      <div className="flex items-center gap-6">
        {/* Search Input */}
        <div className="hidden md:flex items-center relative w-64 lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher élève, matricule, classe..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all"
          />
        </div>

        {/* System Badges & PWA Install Button */}
        <div className="hidden xl:flex items-center gap-2">
          <button
            onClick={() => setShowPwaModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer border border-amber-400/50"
            title="Installer KalanGest sur votre téléphone ou PC"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>Installer l'App</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-900 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-blue-700" />
            <span>{settings.currentAcademicYear}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>SQLite Offline</span>
          </div>
        </div>

        {/* Mobile Install App Button */}
        <button
          onClick={() => setShowPwaModal(true)}
          className="xl:hidden flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          title="Installer l'Application"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer</span>
        </button>

        {/* Notifications Popover Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-all cursor-pointer"
            title="Alertes & Notifications"
          >
            <Bell className="w-5 h-5" />
            {pendingPayments.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 text-xs">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-black text-slate-900 uppercase tracking-wide text-[11px]">
                  Alertes Retards
                </span>
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black text-[10px]">
                  {pendingPayments.length} élève(s)
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {pendingPayments.map((p) => (
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
                      Inscriptions DEF & BAC Activées
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Examens nationaux Mali 2026.
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
            onClick={onLock}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center gap-1"
            title="Verrouiller l'Application (Code PIN)"
          >
            <Lock className="w-5 h-5 text-slate-500" />
          </button>
        )}

        {/* Director Profile Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 leading-tight">
              {currentUser?.fullName}
            </p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
              {AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-900 text-white font-black text-sm flex items-center justify-center border-2 border-white shadow-md shrink-0">
            {currentUser?.fullName.charAt(0)}
          </div>
        </div>
      </div>

      {/* PWA Install Guide Modal */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
    </header>
  );
};
