/**
 * SomaSikolo / KalanGest - Sidebar Navigation Component
 * Aesthetic: Modern Dashboard Layout with Responsive Mobile Drawer and Desktop Collapsible View
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  ClipboardList, 
  FileText, 
  CreditCard, 
  QrCode, 
  Settings, 
  Building2,
  CalendarCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { AuthService } from '../../services/authService';
import { PwaInstallModal } from '../common/PwaInstallModal';

export type NavTab = 
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'subjects'
  | 'teachers'
  | 'grades'
  | 'attendance'
  | 'bulletins'
  | 'cards'
  | 'payments'
  | 'settings'
  | 'backup';

export interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { currentUser, switchRoleSimulated } = useAuth();
  const { settings } = useSchool();
  const [showPwaModal, setShowPwaModal] = useState(false);

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Tableau de bord', icon: LayoutDashboard, perm: 'dashboard:view' },
    { id: 'students' as NavTab, label: 'Gestion Élèves', icon: Users, perm: 'students:view' },
    { id: 'classes' as NavTab, label: 'Classes & Niveaux', icon: GraduationCap, perm: 'classes:view' },
    { id: 'subjects' as NavTab, label: 'Matières & Coefs', icon: BookOpen, perm: 'subjects:view' },
    { id: 'teachers' as NavTab, label: 'Corps Enseignant', icon: Briefcase, perm: 'teachers:view' },
    { id: 'grades' as NavTab, label: 'Notes & Évaluations', icon: ClipboardList, perm: 'grades:view' },
    { id: 'attendance' as NavTab, label: 'Suivi Présences', icon: CalendarCheck, perm: 'students:view' },
    { id: 'bulletins' as NavTab, label: 'Bulletins Officiels', icon: FileText, perm: 'bulletins:generate' },
    { id: 'cards' as NavTab, label: 'Cartes Scolaires QR', icon: QrCode, perm: 'cards:generate' },
    { id: 'payments' as NavTab, label: 'Comptabilité FCFA', icon: CreditCard, perm: 'payments:view' },
    { id: 'settings' as NavTab, label: 'Fiche Établissement', icon: Settings, perm: 'settings:view' },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR ASIDE ELEMENT */}
      <aside 
        className={`no-print bg-white border-r border-slate-200 flex flex-col h-screen select-none shadow-[4px_0_24px_rgba(0,0,0,0.03)] z-50 transition-all duration-300 ease-in-out
          /* Mobile Drawer Position */
          fixed lg:static top-0 bottom-0 left-0
          ${isMobileOpen ? 'translate-x-0 w-80 max-w-[85vw]' : '-translate-x-full lg:translate-x-0'}
          /* Desktop Width (Expanded vs Collapsed) */
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Brand Header */}
        <div className={`p-4 sm:p-5 flex items-center border-b border-slate-100 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {settings.logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white p-0.5 shadow-xs shrink-0 flex items-center justify-center">
                <img src={settings.logoUrl} alt="Logo Établissement" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            
            {/* Title & Subtitle (hidden when collapsed on desktop) */}
            <div className={`flex flex-col min-w-0 ${isCollapsed ? 'lg:hidden' : 'flex-1'}`}>
              <span className="font-black text-xl tracking-tighter text-blue-950 uppercase truncate">
                KalanGest
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                Mali • {settings.schoolName}
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl lg:hidden transition-colors cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse/Expand Toggle on Desktop */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex items-center justify-center p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-all cursor-pointer ${
              isCollapsed ? 'mt-2' : ''
            }`}
            title={isCollapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale pour plus d'espace"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-blue-900" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar py-3">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Navigation Principale
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCollapsed 
                      ? 'justify-center p-3' 
                      : 'gap-3 px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 border border-blue-200/80 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-900' : 'text-slate-400 group-hover:text-slate-700'}`} />
                    {isActive && isCollapsed && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                    )}
                  </div>

                  {/* Label (hidden in collapsed desktop mode) */}
                  <span className={`truncate tracking-tight ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                    {item.label}
                  </span>

                  {/* Active dot indicator when expanded */}
                  {isActive && !isCollapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Desktop Mode */}
                {isCollapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap items-center gap-1.5 pointer-events-none animate-in fade-in duration-150">
                    <span>{item.label}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Section: Active User Footer & Role Switcher */}
        <div className={`p-3 border-t border-slate-100 bg-slate-50/80 ${isCollapsed ? 'lg:p-2' : 'm-3 rounded-2xl border border-slate-200/80'}`}>
          {isCollapsed ? (
            /* Collapsed Desktop View for User Profile */
            <div className="hidden lg:flex flex-col items-center gap-2 py-1">
              <div 
                className="w-10 h-10 rounded-full bg-blue-900 text-white font-black text-xs flex items-center justify-center shadow-sm cursor-pointer"
                title={`${currentUser?.fullName} (${AuthService.getRoleLabel(currentUser?.role || 'ADMIN')})`}
              >
                {currentUser?.fullName.charAt(0)}
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Agrandir le menu pour accéder aux options"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded View for User Profile */
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {currentUser?.fullName.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-black text-slate-900 truncate">
                    {currentUser?.fullName}
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest truncate">
                    {AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}
                  </span>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span className="uppercase tracking-widest text-[9px] flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span>Rôle Test:</span>
                </span>
                <select
                  value={currentUser?.role}
                  onChange={(e) => switchRoleSimulated(e.target.value as any)}
                  className="bg-white text-slate-800 text-[10px] font-bold rounded-lg px-2 py-1 border border-slate-200 outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="DIRECTEUR">Directeur</option>
                  <option value="SECRETAIRE">Secrétaire</option>
                  <option value="COMPTABLE">Comptable</option>
                  <option value="ENSEIGNANT">Enseignant</option>
                  <option value="LECTURE_SEULE">Lecture Seule</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* PWA Install Modal */}
        <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
      </aside>
    </>
  );
};
