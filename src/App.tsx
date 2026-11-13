/**
 * SomaSikolo / KalanGest - Main Application Entry Point
 * Système de Gestion Scolaire Professionnel pour les Établissements du Mali
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LockScreen } from './components/auth/LockScreen';

import { DashboardModule } from './modules/dashboard/DashboardModule';
import { InscriptionModule } from './modules/students/InscriptionModule';
import { StudentsModule } from './modules/students/StudentsModule';
import { ClassesModule } from './modules/classes/ClassesModule';
import { SubjectsModule } from './modules/subjects/SubjectsModule';
import { TeachersModule } from './modules/teachers/TeachersModule';
import { GradesModule } from './modules/grades/GradesModule';
import { AttendanceModule } from './modules/attendance/AttendanceModule';
import { ExamScheduleModule } from './modules/examSchedule/ExamScheduleModule';
import { BulletinsModule } from './modules/bulletins/BulletinsModule';
import { CardsModule } from './modules/cards/CardsModule';
import { PaymentsModule } from './modules/payments/PaymentsModule';
import { CashierModule } from './modules/cashier/CashierModule';
import { SettingsModule } from './modules/settings/SettingsModule';
import { StudentQrScannerModal } from './components/qr/StudentQrScannerModal';
import { StudentQrProfileModal } from './components/qr/StudentQrProfileModal';
import { StandaloneStudentQrView } from './components/qr/StandaloneStudentQrView';
import { ReceiptVerificationModal } from './components/receipts/ReceiptVerificationModal';
import { Student, Payment } from './types';
import { useSchool } from './contexts/SchoolContext';
import { ScanHistoryService } from './services/scanHistoryService';
import { SchoolEnabledFeatures } from './types';
import { OfflineScanBanner } from './components/common/OfflineScanBanner';
import { secureLocalStorage, secureSessionStorage } from './services/secureStorage';

export function AppContent() {
  const { classes, isFeatureEnabled, payments, settings, students } = useSchool();
  const { currentUser, canAccessTab } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  useEffect(() => {
    const tabFeatureMap: Record<string, keyof SchoolEnabledFeatures | null> = {
      inscription: 'students',
      students: 'students',
      classes: 'classes',
      subjects: 'subjects',
      teachers: 'teachers',
      grades: 'grades',
      attendance: 'attendance',
      examSchedule: 'examSchedule',
      bulletins: 'bulletins',
      cards: 'cards',
      payments: 'payments',
      cashier: 'payments'
    };
    const reqFeature = tabFeatureMap[activeTab];
    if ((reqFeature && !isFeatureEnabled(reqFeature)) || (currentUser && !canAccessTab(activeTab))) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isFeatureEnabled, currentUser, canAccessTab]);
  const [isGlobalQrScannerOpen, setIsGlobalQrScannerOpen] = useState(false);
  const [globalScannedStudent, setGlobalScannedStudent] = useState<Student | null>(null);
  
  // External scan detection (phone camera / browser opened outside the application)
  const [externalQrData, setExternalQrData] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isQrRoute =
        urlParams.has('verify_student') ||
        urlParams.has('student_id') ||
        urlParams.has('student_qr') ||
        urlParams.has('verify_qr') ||
        urlParams.has('json') ||
        urlParams.has('scan') ||
        urlParams.has('data') ||
        urlParams.has('qr') ||
        urlParams.has('student') ||
        urlParams.has('m') ||
        urlParams.has('matricule') ||
        urlParams.has('d') ||
        urlParams.has('qr_view') ||
        urlParams.has('scan_mode') ||
        urlParams.has('verify') ||
        urlParams.has('carte') ||
        window.location.hash.includes('student') ||
        window.location.hash.includes('verify') ||
        window.location.hash.includes('qr=') ||
        window.location.hash.includes('m=');

      if (isQrRoute) {
        // Return full search query or hash so StandaloneStudentQrView can parse all student fields
        return window.location.search || window.location.hash || '';
      }
    }
    return null;
  });

  // Persisted desktop sidebar collapsed state (default: true for icon-only mode to save horizontal space)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = secureLocalStorage.getItem('kalangest_sidebar_collapsed');
      if (stored !== null) {
        return stored === 'true';
      }
      return true; // Mode icônes uniquement par défaut sur bureau pour un espace maximal
    } catch {
      return true;
    }
  });

  // Mobile drawer open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return secureSessionStorage.getItem('somasikolo_unlocked') === 'true';
  });

  useEffect(() => {
    try {
      secureLocalStorage.setItem('kalangest_sidebar_collapsed', String(isSidebarCollapsed));
    } catch (e) {
      console.warn('Could not save sidebar preference in secure storage', e);
    }
  }, [isSidebarCollapsed]);

  const handleLockApp = () => {
    secureSessionStorage.removeItem('somasikolo_unlocked');
    setIsUnlocked(false);
  };

  // Detection scan de reçu anti-fraude (par caméra externe ou lien direct)
  const [externalReceiptNumber, setExternalReceiptNumber] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('verify_receipt') || urlParams.get('receipt') || null;
    }
    return null;
  });

  const verifiedReceiptPayment = useMemo(() => {
    if (!externalReceiptNumber) return null;
    const match = payments.find(p => p.receiptNumber.toUpperCase() === externalReceiptNumber.toUpperCase() || p.id === externalReceiptNumber);
    if (match) return match;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const matricule = urlParams?.get('mat') || 'MLE-OFFICIEL';
    const std = students.find(s => s.matricule.toUpperCase() === matricule.toUpperCase());
    const amount = Number(urlParams?.get('m')) || 25000;
    return {
      id: 'verify-' + externalReceiptNumber,
      receiptNumber: externalReceiptNumber,
      studentId: std?.id || '',
      studentMatricule: matricule,
      studentName: std ? `${std.lastName.toUpperCase()} ${std.firstName}` : (urlParams?.get('name') || 'Élève Enregistré'),
      className: std ? (classes.find(c => c.id === std.classId)?.name || 'Classe Enregistrée') : 'Classe Enregistrée',
      category: 'MENSUALITE',
      amountPaid: amount,
      expectedAmount: amount,
      remainingAmount: 0,
      paymentDate: new Date().toISOString(),
      method: 'ESPECES',
      cashierName: 'Caisse Principale',
      academicYear: settings.currentAcademicYear
    } as Payment;
  }, [externalReceiptNumber, payments, students, classes, settings.currentAcademicYear]);

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

  // If opened via receipt verification QR Code scan
  if (externalReceiptNumber !== null && verifiedReceiptPayment) {
    return (
      <ReceiptVerificationModal
        payment={verifiedReceiptPayment}
        settings={settings}
        onClose={() => {
          if (typeof window !== 'undefined' && window.history) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setExternalReceiptNumber(null);
        }}
      />
    );
  }

  if (!isUnlocked) {
    return (
      <LockScreen 
        onUnlock={() => setIsUnlocked(true)} 
        onOpenQrScanner={() => setExternalQrData('')} 
      />
    );
  }

  return (
    <div className="flex h-dvh w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
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

        {/* Global Offline Status & Scan Queue Synchronization Banner */}
        <OfflineScanBanner />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 lg:p-4 pb-20 lg:pb-4 custom-scrollbar">
          {activeTab === 'dashboard' && canAccessTab('dashboard') && (
            <DashboardModule 
              onNavigate={setActiveTab} 
              onOpenQrScanner={() => setIsGlobalQrScannerOpen(true)}
              onViewStudentProfile={(student) => setGlobalScannedStudent(student)}
            />
          )}
          {activeTab === 'inscription' && canAccessTab('inscription') && (
            <InscriptionModule onNavigateToStudents={() => setActiveTab('students')} />
          )}
          {activeTab === 'students' && canAccessTab('students') && <StudentsModule />}
          {activeTab === 'classes' && canAccessTab('classes') && <ClassesModule />}
          {activeTab === 'subjects' && canAccessTab('subjects') && <SubjectsModule />}
          {activeTab === 'teachers' && canAccessTab('teachers') && <TeachersModule />}
          {activeTab === 'grades' && canAccessTab('grades') && <GradesModule />}
          {activeTab === 'attendance' && canAccessTab('attendance') && <AttendanceModule />}
          {activeTab === 'examSchedule' && canAccessTab('examSchedule') && <ExamScheduleModule />}
          {activeTab === 'bulletins' && canAccessTab('bulletins') && <BulletinsModule />}
          {activeTab === 'cards' && canAccessTab('cards') && <CardsModule />}
          {activeTab === 'payments' && canAccessTab('payments') && <PaymentsModule />}
          {activeTab === 'cashier' && canAccessTab('cashier') && <CashierModule />}
          {activeTab === 'modules' && canAccessTab('modules') && <SettingsModule initialTab="FEATURES" />}
          {activeTab === 'settings' && canAccessTab('settings') && <SettingsModule initialTab="INFO" />}
          {activeTab === 'backup' && canAccessTab('backup') && <SettingsModule initialTab="INFO" />}
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
          const cls = classes.find(c => c.id === student.classId);
          ScanHistoryService.recordScan(student, cls?.name);
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
          onNavigateToBulletin={canAccessTab('bulletins') ? () => {
            setActiveTab('bulletins');
          } : undefined}
          onNavigateToPayments={canAccessTab('payments') ? () => {
            setActiveTab('payments');
          } : undefined}
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
