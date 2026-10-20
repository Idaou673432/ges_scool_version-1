/**
 * SomaSikolo / KalanGest - Header Bar Component
 * En-tête ultra-simple, épuré et sans surcharge :
 * - Côté gauche : Bouton Menu + Nom de l'établissement
 * - Centre : Barre de recherche simple
 * - Côté droit : Notifications, Verrouillage et Avatar profil avec menu contextuel
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  Lock, 
  Menu, 
  PanelLeftClose, 
  PanelLeftOpen, 
  X, 
  Cloud, 
  QrCode, 
  Download, 
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { PwaInstallModal } from '../common/PwaInstallModal';
import { CloudSchoolSwitcherModal } from '../common/CloudSchoolSwitcherModal';

interface HeaderProps {
  onSearchQuery?: (q: string) => void;
  onLock?: () => void;
  onOpenQrScanner?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSearchQuery, 
  onLock,
  onOpenQrScanner,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileMenu
}) => {
  const { settings, payments, cloudSchoolCode, isFeatureEnabled } = useSchool();
  const { currentUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [search, setSearch] = useState('');
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingPayments = payments.filter(p => p.remainingAmount > 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onSearchQuery) onSearchQuery(e.target.value);
  };

  return (
    <header className="no-print h-14 sm:h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
      
      {/* 1. GAUCHE : Menu + Nom Établissement (Simple & Net) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Toggle Mobile */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Ouvrir le menu"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Toggle Desktop Sidebar (Icone seule, ultra-propre) */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title={isSidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          aria-label={isSidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        {/* Nom Établissement & Année */}
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
            {settings.schoolName || 'KalanGest'}
          </span>
          {settings.currentAcademicYear && (
            <span className="hidden md:inline text-xs font-semibold text-slate-400 font-mono">
              ({settings.currentAcademicYear})
            </span>
          )}
        </div>
      </div>

      {/* 2. CENTRE : Recherche Simple */}
      <div className="hidden md:flex items-center relative w-64 lg:w-80 mx-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Rechercher élève, classe..."
          className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              if (onSearchQuery) onSearchQuery('');
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. DROITE : Notifications, Verrouillage & Menu Utilisateur */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        
        {/* Loupe recherche sur Mobile */}
        <button
          type="button"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Rechercher"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* Notifications (Cloche avec pastille rouge si alertes) */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {pendingPayments.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 text-xs">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase text-[11px]">
                  Alertes de Scolarité
                </span>
                <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {pendingPayments.length} retard(s)
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {pendingPayments.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-3 hover:bg-slate-50 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {p.studentName} ({p.className})
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Reste : <strong className="text-rose-600 font-mono">{p.remainingAmount.toLocaleString()} FCFA</strong>
                      </p>
                    </div>
                  </div>
                ))}

                <div className="p-3 hover:bg-slate-50 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Synchronisation Active</p>
                    <p className="text-slate-500 text-[11px]">Données sécurisées en direct sur le Cloud.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verrouiller l'écran */}
        {onLock && (
          <button
            type="button"
            onClick={onLock}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Verrouiller l'application (Code PIN)"
          >
            <Lock className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Séparateur discret */}
        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Menu Utilisateur / Profil */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Options du compte"
          >
            <div className="w-7 h-7 rounded-full bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser?.fullName?.charAt(0) || 'A'}
            </div>
            <span className="hidden sm:inline font-bold text-xs text-slate-800 max-w-[100px] truncate">
              {currentUser?.fullName?.split(' ')[0] || 'Admin'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {/* Menu Déroulant Élégant */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs">
              {/* Entête utilisateur */}
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{currentUser?.fullName}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}
                </p>
              </div>

              {/* Options secondaires regroupées proprement */}
              <div className="py-1 space-y-0.5">
                {/* Scanner QR */}
                {onOpenQrScanner && isFeatureEnabled('qrScanner') && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenQrScanner();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-blue-900" />
                    <span>Scanner Carte Élève</span>
                  </button>
                )}

                {/* Cloud & Multi-écoles */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowCloudModal(true);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>Code Cloud</span>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                    {cloudSchoolCode || 'Principal'}
                  </span>
                </button>

                {/* Installer App */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowPwaModal(true);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Installer l'application</span>
                </button>
              </div>

              {/* Verrouiller */}
              {onLock && (
                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLock();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Verrouiller l'écran</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche plein écran sur Mobile */}
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
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMobileSearch(false);
              setSearch('');
              if (onSearchQuery) onSearchQuery('');
            }}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Modals Utiles */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
      <CloudSchoolSwitcherModal isOpen={showCloudModal} onClose={() => setShowCloudModal(false)} />
    </header>
  );
};
