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
import { StudentQrScannerModal } from './components/qr/StudentQrScannerModal';
import { StudentQrProfileModal } from './components/qr/StudentQrProfileModal';
import { StandaloneStudentQrView } from './components/qr/StandaloneStudentQrView';
import { Student } from './types';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isGlobalQrScannerOpen, setIsGlobalQrScannerOpen] = useState(false);
  const [globalScannedStudent, setGlobalScannedStudent] = useState<Student | null>(null);
  
  // External scan detection (phone camera / browser opened outside the application)
  const [externalQrData, setExternalQrData] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramData = urlParams.get('student_qr') || urlParams.get('verify_qr') || urlParams.get('json') || urlParams.get('scan') || urlParams.get('data');
      if (paramData) return decodeURIComponent(paramData);
      if (window.location.hash.includes('student_qr=')) {
        return decodeURIComponent(window.location.hash.split('student_qr=')[1]);
      }
      if (urlParams.has('qr_view')) {
        return '';
      }
    }
    return null;
  });

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

  // If opened via external phone camera scan (QR code outside the application),
  // render the dedicated high-definition student presentation view directly!
  if (externalQrData !== null) {
    return (
      <StandaloneStudentQrView
        initialRawData={externalQrData}
        onExitToApp={() => {
          if (typeof window !== 'undefined' && window.history) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setExternalQrData(null);
        }}
      />
    );
  }

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
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
          onOpenQrScanner={() => setIsGlobalQrScannerOpen(true)}
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
          onOpenQrScanner={() => setIsGlobalQrScannerOpen(true)}
        />
      </div>

      {/* Global Student QR Scanner Modal */}
      <StudentQrScannerModal
        isOpen={isGlobalQrScannerOpen}
        onClose={() => setIsGlobalQrScannerOpen(false)}
        onStudentFound={(student) => {
          setIsGlobalQrScannerOpen(false);
          setGlobalScannedStudent(student);
        }}
      />

      {/* Global Student QR Profile Detailed Dossier Modal */}
      {globalScannedStudent && (
        <StudentQrProfileModal
          student={globalScannedStudent}
          isOpen={Boolean(globalScannedStudent)}
          onClose={() => setGlobalScannedStudent(null)}
          onScanAnother={() => {
            setGlobalScannedStudent(null);
            setIsGlobalQrScannerOpen(true);
          }}
          onNavigateToBulletin={() => {
            setActiveTab('bulletins');
          }}
          onNavigateToPayments={() => {
            setActiveTab('payments');
          }}
        />
      )}
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
