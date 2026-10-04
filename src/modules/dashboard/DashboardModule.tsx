/**
 * SomaSikolo - Dashboard Executive Overview Module
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  UserPlus, 
  FileCheck, 
  Receipt, 
  QrCode, 
  Calendar,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Printer,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  History,
  X,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useSchool } from '../../contexts/SchoolContext';
import { formatFCFA, getMaliScoreAppreciation } from '../../constants/maliEducation';
import { NavTab } from '../../components/layout/Sidebar';
import { PdfService } from '../../services/pdfService';
import { AcademicSuccessCharts } from '../../components/dashboard/AcademicSuccessCharts';
import { ScanHistoryPanel } from '../../components/dashboard/ScanHistoryPanel';
import { ScanHistoryService } from '../../services/scanHistoryService';
import { StudentQrProfileModal } from '../../components/qr/StudentQrProfileModal';
import { Student } from '../../types';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQrScanner?: () => void;
  onViewStudentProfile?: (student: Student) => void;
}

export const DashboardModule: React.FC<DashboardProps> = ({ 
  onNavigate,
  onOpenQrScanner,
  onViewStudentProfile
}) => {
  const { stats, students, classes, payments, settings, generateReportCard } = useSchool();
  const [isScanHistoryDrawerOpen, setIsScanHistoryDrawerOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [localViewingStudent, setLocalViewingStudent] = useState<Student | null>(null);

  useEffect(() => {
    setHistoryCount(ScanHistoryService.getHistory().length);
    const unsubscribe = ScanHistoryService.subscribe((updated) => {
      setHistoryCount(updated.length);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectStudent = (student: Student) => {
    if (onViewStudentProfile) {
      onViewStudentProfile(student);
    } else {
      setLocalViewingStudent(student);
    }
  };

  // Active students breakdown
  const activeStudents = useMemo(() => students.filter(s => s.status === 'ACTIF'), [students]);
  const femaleCount = useMemo(() => activeStudents.filter(s => s.gender === 'F').length, [activeStudents]);
  const maleCount = useMemo(() => activeStudents.filter(s => s.gender === 'M').length, [activeStudents]);

  // Overall school average computed dynamically from active report cards
  const schoolAverage = useMemo(() => {
    let sum = 0;
    let counted = 0;
    activeStudents.forEach(s => {
      const rep = generateReportCard(s.id, settings.activeTerm);
      if (rep && rep.generalAverage > 0) {
        sum += rep.generalAverage;
        counted++;
      }
    });
    return counted > 0 ? (sum / counted).toFixed(2) : '14.50';
  }, [activeStudents, generateReportCard, settings.activeTerm]);

  // Cycle distribution computed live from classes and students
  const cycleData = useMemo(() => {
    const cycleLabels: Record<string, { name: string; color: string }> = {
      FONDAMENTAL_1: { name: '1er Cycle (1è-6è)', color: '#059669' },
      FONDAMENTAL_2: { name: '2è Cycle (7è-9è DEF)', color: '#0d9488' },
      LYCEE: { name: 'Lycée Général (BAC)', color: '#1e3a8a' },
      TECHNIQUE: { name: 'Enseignement Technique', color: '#4f46e5' },
      PROFESSIONNEL: { name: 'Formation Pro (CAP/BT)', color: '#d97706' },
    };

    const countMap: Record<string, number> = {};
    activeStudents.forEach(s => {
      const cls = classes.find(c => c.id === s.classId);
      if (cls) {
        countMap[cls.category] = (countMap[cls.category] || 0) + 1;
      }
    });

    return Object.entries(cycleLabels).map(([cat, info]) => ({
      name: info.name,
      value: countMap[cat] || 0,
      color: info.color
    })).filter(item => item.value > 0);
  }, [activeStudents, classes]);

  // Monthly financial receipts vs expenses
  const financialData = [
    { month: 'Sept', Recettes: 1250000, Depenses: 650000 },
    { month: 'Oct', Recettes: 2450000, Depenses: 670000 },
    { month: 'Nov', Recettes: 2100000, Depenses: 670000 },
    { month: 'Déc', Recettes: 1980000, Depenses: 670000 },
    { month: 'Janv', Recettes: 2300000, Depenses: 670000 },
  ];

  const pendingList = useMemo(() => {
    return payments.filter(p => p.remainingAmount > 0).slice(0, 6);
  }, [payments]);

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Welcome & Actions Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Système Scolaire Officiel • MEN Mali</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-500 font-mono">Année {settings.currentAcademicYear}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tableau de Bord Administratif
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {settings.schoolName} — {settings.academyName || 'Académie'} • {settings.capName || 'CAP'}
          </p>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => PdfService.generateMenOfficialReportPdf(stats, students, classes, settings)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer border border-amber-400/50"
            title="Générer le Rapport Statistique Officiel pour l'Académie"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Rapport MEN</span>
          </button>

          {onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              title="Scanner le QR Code d'un élève (Caméra)"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-300" />
              <span>Scanner QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsScanHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100/90 text-amber-950 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer border border-amber-200/80"
            title="Consulter les 10 derniers profils d'élèves scannés"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Historique Scans</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              {historyCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-300" />
            <span>Inscrire Élève</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Encaisser</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-slate-200/80"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>Présences</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('bulletins')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-slate-200/80"
          >
            <FileCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Bulletins</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Effectif Total</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {stats.totalStudents}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{femaleCount} filles</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700">{maleCount} garçons</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-emerald-700 font-medium">Inscrits</span>
            </div>
          </div>
        </div>

        {/* Classes & Teachers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pédagogie</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {stats.totalClasses}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{classes.length} divisions</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700">{stats.totalTeachers} enseignants</span>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recettes Encaissées</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                {(stats.totalRevenueFCFA / 1000000).toFixed(2)}M
              </span>
              <span className="text-xs font-bold text-slate-500">FCFA</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">{(stats.totalRevenueFCFA).toLocaleString()} FCFA</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-400">Scolarité</span>
            </div>
          </div>
        </div>

        {/* Institution General Average */}
        <div className="bg-slate-900 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Moyenne Générale</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums text-white">
                {schoolAverage}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 20</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-semibold text-emerald-300">
                {getMaliScoreAppreciation(parseFloat(schoolAverage), 20).appreciation}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">{settings.activeTerm?.replace('_', ' ') || 'Trimestre 1'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Volet Historique des Scans QR (10 derniers profils scannés) */}
      <section id="section-scan-history" className="scroll-mt-6">
        <ScanHistoryPanel 
          onViewStudentProfile={handleSelectStudent}
          onOpenQrScanner={onOpenQrScanner}
          onNavigateToCards={() => onNavigate('cards')}
        />
      </section>

      {/* Academic Success Visualization Module */}
      <AcademicSuccessCharts onNavigateToGrades={() => onNavigate('grades')} />

      {/* Charts & Treasury Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Évolution Financière Mensuelle
              </h2>
              <p className="text-xs text-slate-500">Recettes Encaissées vs Charges Fixes (FCFA)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 inline-block" />
                <span>Recettes</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
                <span>Charges</span>
              </div>
            </div>
          </div>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: '600', fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: '600', fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`${formatFCFA(Number(val))}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Recettes" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Depenses" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Treasury & Cycle Distribution */}
        <div className="lg:col-span-4 space-y-5">
          {/* Treasury Balance Tile */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Solde Caisse Réel</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-black tracking-tight font-mono tabular-nums text-white">
              {(stats.totalRevenueFCFA).toLocaleString()} <span className="text-sm font-semibold text-slate-400">FCFA</span>
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Exercice Comptable</span>
              <span className="font-semibold text-white">{settings.currentAcademicYear}</span>
            </div>
          </div>

          {/* Educational Cycles Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cycles Éducatifs</h3>
              <span className="text-[11px] text-slate-400 font-mono font-semibold">{activeStudents.length} élèves</span>
            </div>
            <div className="space-y-2.5 text-xs">
              {cycleData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {item.value} élève(s)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Arrears & Unpaid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Relances Scolarités Dues
            </h2>
            <p className="text-xs text-slate-500">Paiements partiels et arriérés prioritaires en FCFA</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Gestion Comptable Complète
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">N° Reçu</th>
                <th className="px-4 py-3">Élève & Matricule</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Versé</th>
                <th className="px-4 py-3">Reste Dû</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 text-slate-700 font-medium">
              {pendingList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                    Tous les élèves sont à jour de leurs cotisations scolaires.
                  </td>
                </tr>
              ) : (
                pendingList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono font-bold text-slate-800">{p.receiptNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{p.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.className}</td>
                    <td className="px-4 py-3 font-mono text-emerald-700 font-semibold">{formatFCFA(p.amountPaid)}</td>
                    <td className="px-4 py-3 font-mono text-rose-600 font-bold">{formatFCFA(p.remainingAmount)}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate('payments')}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg transition-all cursor-pointer border border-emerald-200"
                      >
                        Encaisser
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer: Volet Latéral 'Historique des Scans' */}
      {isScanHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <ScanHistoryPanel 
              isDrawer
              className="rounded-none border-0 h-full"
              onCloseDrawer={() => setIsScanHistoryDrawerOpen(false)}
              onViewStudentProfile={(student) => {
                setIsScanHistoryDrawerOpen(false);
                handleSelectStudent(student);
              }}
              onOpenQrScanner={() => {
                setIsScanHistoryDrawerOpen(false);
                if (onOpenQrScanner) onOpenQrScanner();
              }}
              onNavigateToCards={(student) => {
                setIsScanHistoryDrawerOpen(false);
                onNavigate('cards');
              }}
            />
          </div>
        </div>
      )}

      {/* Local fallback profile modal if not handled by root App */}
      {localViewingStudent && !onViewStudentProfile && (
        <StudentQrProfileModal 
          student={localViewingStudent}
          isOpen={Boolean(localViewingStudent)}
          onClose={() => setLocalViewingStudent(null)}
          onNavigateToBulletin={() => {
            setLocalViewingStudent(null);
            onNavigate('bulletins');
          }}
          onNavigateToPayments={() => {
            setLocalViewingStudent(null);
            onNavigate('payments');
          }}
        />
      )}
    </div>
  );
};
