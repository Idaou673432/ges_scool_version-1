/**
 * SomaSikolo - Main Application Entry Point
 * Système de Gestion Scolaire Professionnel pour les Établissements du Mali
 */

import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
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
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('somasikolo_unlocked') === 'true';
  });

  const handleLockApp = () => {
    sessionStorage.removeItem('somasikolo_unlocked');
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onLock={handleLockApp} />

        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
