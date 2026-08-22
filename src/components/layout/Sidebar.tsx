/**
 * SomaSikolo - Sidebar Navigation Component
 * Aesthetic: Modern Notion / Linear / Stripe Dashboard Layout
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
  ShieldCheck, 
  Building2,
  HeartHandshake,
  FileSpreadsheet,
  CalendarCheck,
  Download
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

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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

  return (
    <aside className="no-print w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 select-none shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
      {/* Brand Header */}
      <div className="p-6 pb-6 flex items-center gap-3">
        {settings.logoUrl ? (
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white p-0.5 shadow-sm shrink-0 flex items-center justify-center">
            <img src={settings.logoUrl} alt="Logo Établissement" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-black text-2xl tracking-tighter text-blue-950 uppercase truncate">
            KalanGest
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
            Mali • {settings.schoolName}
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar py-2">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Navigation Principale
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {isActive ? (
                <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              ) : (
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="truncate tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active User Footer & RBAC Switcher */}
      <div className="p-3 mx-4 mb-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-blue-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
            {currentUser?.fullName.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-black text-slate-900 truncate">
              {currentUser?.fullName}
            </span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate">
              {AuthService.getRoleLabel(currentUser?.role || 'ADMIN')}
            </span>
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span className="uppercase tracking-widest text-[9px]">Test Rôle:</span>
          <select
            value={currentUser?.role}
            onChange={(e) => switchRoleSimulated(e.target.value as any)}
            className="bg-white text-slate-800 text-[10px] font-bold rounded-lg px-2 py-0.5 border border-slate-200 outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="ADMIN">Admin</option>
            <option value="DIRECTEUR">Directeur</option>
            <option value="SECRETAIRE">Secrétaire</option>
            <option value="COMPTABLE">Comptable</option>
            <option value="ENSEIGNANT">Enseignant</option>
            <option value="LECTURE_SEULE">Lecture Seule</option>
          </select>
        </div>
      </div>
      {/* PWA Install Modal */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
    </aside>
  );
};
