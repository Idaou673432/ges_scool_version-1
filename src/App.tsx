/**
 * SomaSikolo / KalanGest - Main Application Entry Point
 * Système de Gestion Scolaire Professionnel pour les Établissements du Mali
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LockScreen } from './components/auth/LockScreen';

import { DashboardModule } from './modules/dashboard/DashboardModule';
import { StudentsModule } from './modules/students/StudentsModule';
import { ClassesModule } from './modules/classes/ClassesModule';
import { SubjectsModule } from './modules/subjects/SubjectsModule';
import { TeachersModule } from './modules/teachers/TeachersModule';
import { GradesModule } from './modules/grades/GradesModule';
import { AttendanceModule } from './modules/attendance/AttendanceModule';
import { BulletinsModule } from './modules/bulletins/BulletinsModule';
import { CardsModule } from './modules/cards/CardsModule';
import { PaymentsModule } from './modules/payments/PaymentsModule';
import { SettingsModule } from './modules/settings/SettingsModule';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  
  // Persisted desktop sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kalangest_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('somasikolo_unlocked') === 'true';
  });

  useEffect(() => {
    try {
      localStorage.setItem('kalangest_sidebar_collapsed', String(isSidebarCollapsed));
    } catch (e) {
      console.warn('Could not save sidebar preference in localStorage', e);
    }
  }, [isSidebarCollapsed]);

  const handleLockApp = () => {
    sessionStorage.removeItem('somasikolo_unlocked');
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation (Desktop Collapsible + Mobile Slide-In Drawer) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          onLock={handleLockApp}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-24 lg:pb-6 custom-scrollbar">
          {activeTab === 'dashboard' && <DashboardModule onNavigate={setActiveTab} />}
          {activeTab === 'students' && <StudentsModule />}
          {activeTab === 'classes' && <ClassesModule />}
          {activeTab === 'subjects' && <SubjectsModule />}
          {activeTab === 'teachers' && <TeachersModule />}
          {activeTab === 'grades' && <GradesModule />}
          {activeTab === 'attendance' && <AttendanceModule />}
          {activeTab === 'bulletins' && <BulletinsModule />}
          {activeTab === 'cards' && <CardsModule />}
          {activeTab === 'payments' && <PaymentsModule />}
          {activeTab === 'settings' && <SettingsModule />}
          {activeTab === 'backup' && <SettingsModule />}
        </main>

        {/* Mobile Quick Bottom Navigation Bar */}
        <MobileBottomNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          onOpenFullMenu={() => setIsMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <AppContent />
      </SchoolProvider>
    </AuthProvider>
  );
}
