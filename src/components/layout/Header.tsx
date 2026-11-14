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
  ChevronDown,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';

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
  const { settings, payments, isFeatureEnabled } = useSchool();
  const { currentUser, hasPermission } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  const canViewPayments = hasPermission('payments:view') && isFeatureEnabled('payments');
  const pendingPayments = canViewPayments ? payments.filter(p => p.remainingAmount > 0) : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onSearchQuery) onSearchQuery(e.target.value);
  };

  return (
    <header className="no-print h-10 sm:h-11 bg-white border-b border-slate-200/90 px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-20">
      
      {/* 1. GAUCHE : Menu + Nom Établissement (Compact & Net) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Toggle Mobile */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Ouvrir le menu"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Toggle Desktop Sidebar (Icone seule, ultra-propre) */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title={isSidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          aria-label={isSidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Nom Établissement & Année */}
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
            {settings.schoolName || 'KalanGest'}
          </span>
          {settings.currentAcademicYear && (
            <span className="hidden md:inline text-[10px] font-semibold text-slate-400 font-mono">
              ({settings.currentAcademicYear})
            </span>
          )}
        </div>
      </div>

      {/* 2. CENTRE : Recherche Simple Ultra-Compacte */}
      <div className="hidden md:flex items-center relative w-56 lg:w-72 mx-2">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Rechercher élève, classe..."
          className="w-full pl-8 pr-7 py-1 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-slate-400 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition-colors h-7"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              if (onSearchQuery) onSearchQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 3. DROITE : Barre de Contrôles Fusionnée & Compacte */}
      <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-lg border border-slate-200/80">
        
        {/* Loupe recherche sur Mobile */}
        <button
          type="button"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
          title="Rechercher"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Notifications (Cloche avec pastille rouge si alertes) */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md relative transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {pendingPayments.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-1 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
              <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase text-[10px]">
                  {canViewPayments ? 'Alertes de Scolarité' : 'Notifications'}
                </span>
                {canViewPayments && (
                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                    {pendingPayments.length} retard(s)
                  </span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {canViewPayments && pendingPayments.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-2.5 hover:bg-slate-50 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {p.studentName} ({p.className})
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        Reste : <strong className="text-rose-600 font-mono">{p.remainingAmount.toLocaleString()} FCFA</strong>
                      </p>
                    </div>
                  </div>
                ))}

                <div className="p-2.5 hover:bg-slate-50 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-xs">Synchronisation Active</p>
                    <p className="text-slate-500 text-[10px]">Données sécurisées en direct sur le Cloud.</p>
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
            className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            title="Verrouiller l'application (Code PIN)"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Menu Utilisateur / Profil fusionné dans le même bloc de contrôle */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 px-1.5 py-0.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
            title="Options du compte"
          >
            <div className="w-5 h-5 rounded-full bg-blue-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              {currentUser?.fullName?.charAt(0) || 'A'}
            </div>
            <span className="hidden sm:inline font-semibold text-xs text-slate-800 max-w-[80px] truncate">
              {currentUser?.fullName?.split(' ')[0] || 'Admin'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Menu Déroulant */}
          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs">
              {/* Entête utilisateur */}
              <div className="px-2.5 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}
                </p>
              </div>

              {/* Options secondaires */}
              <div className="py-1 space-y-0.5">
                {/* Verrouiller / Changer d'utilisateur (pour tous les rôles) */}
                {onLock && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLock();
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-rose-50 text-rose-700 flex items-center gap-2 transition-colors cursor-pointer font-semibold"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Déconnexion / Changer de session</span>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche sur Mobile */}
      {showMobileSearch && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 px-3 py-1.5 shadow-md z-30 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={handleSearchChange}
              placeholder="Rechercher élève, classe..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none h-7"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMobileSearch(false);
              setSearch('');
              if (onSearchQuery) onSearchQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </header>
  );
};
