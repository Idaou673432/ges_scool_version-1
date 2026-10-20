/**
 * SomaSikolo - Tableau de Bord Principal
 * Interface simple, claire et professionnelle pour la gestion scolaire au Mali
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useSchool } from '../../contexts/SchoolContext';
import { formatFCFA, getMaliScoreAppreciation } from '../../constants/maliEducation';
import { NavTab } from '../../components/layout/Sidebar';
import { PdfService } from '../../services/pdfService';
import { AcademicSuccessCharts } from '../../components/dashboard/AcademicSuccessCharts';
import { ScanHistoryPanel } from '../../components/dashboard/ScanHistoryPanel';
import { ScanHistoryService } from '../../services/scanHistoryService';
import { StudentQrProfileModal } from '../../components/qr/StudentQrProfileModal';
import { Student, SchoolEnabledFeatures } from '../../types';

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
  const { stats, students, classes, payments, settings, generateReportCard, isFeatureEnabled } = useSchool();
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
      FONDAMENTAL_1: { name: '1er Cycle (1ère à 6ème)', color: '#059669' },
      FONDAMENTAL_2: { name: '2ème Cycle (7ème à 9ème DEF)', color: '#0284c7' },
      LYCEE: { name: 'Lycée Général (BAC)', color: '#1e3a8a' },
      TECHNIQUE: { name: 'Enseignement Technique', color: '#4f46e5' },
      PROFESSIONNEL: { name: 'Formation Professionnelle (CAP/BT)', color: '#d97706' },
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
      {/* En-tête principal simple et fonctionnel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {settings.schoolName || 'Établissement'} • Année scolaire {settings.currentAcademicYear} {settings.academyName ? `• ${settings.academyName}` : ''}
          </p>
        </div>

        {/* Barre d'actions rapides avec libellés clairs */}
        <div className="flex flex-wrap items-center gap-2">
          {isFeatureEnabled('students') && (
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Inscrire un élève
            </button>
          )}

          {isFeatureEnabled('payments') && (
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Encaisser paiement
            </button>
          )}

          {isFeatureEnabled('qrScanner') && onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Scanner un QR code
            </button>
          )}

          {isFeatureEnabled('qrScanner') && (
            <button
              type="button"
              onClick={() => setIsScanHistoryDrawerOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Historique des scans ({historyCount})
            </button>
          )}

          {isFeatureEnabled('attendance') && (
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Présences
            </button>
          )}

          {isFeatureEnabled('bulletins') && (
            <button
              type="button"
              onClick={() => onNavigate('bulletins')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Bulletins
            </button>
          )}

          <button
            type="button"
            onClick={() => PdfService.generateMenOfficialReportPdf(stats, students, classes, settings)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            title="Générer le rapport officiel pour l'académie"
          >
            Rapport MEN
          </button>
        </div>
      </div>

      {/* 4 Chiffres Clés : Simples, Nets et Lisibles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Élèves inscrits */}
        {isFeatureEnabled('students') && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Effectif des élèves</p>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {stats.totalStudents}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {maleCount} garçons • {femaleCount} filles
            </p>
          </div>
        )}

        {/* Classes et Enseignants */}
        {isFeatureEnabled('classes') && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Classes & Personnel</p>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {classes.length} <span className="text-sm font-normal text-slate-500">classes</span>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {stats.totalTeachers} enseignants actifs
            </p>
          </div>
        )}

        {/* Paiements Encaissés */}
        {isFeatureEnabled('payments') && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Paiements encaissés</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 font-mono">
              {(stats.totalRevenueFCFA).toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Recettes scolaires enregistrées
            </p>
          </div>
        )}

        {/* Moyenne de l'établissement */}
        {isFeatureEnabled('grades') && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Moyenne de l'établissement</p>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {schoolAverage} <span className="text-sm font-normal text-slate-500">/ 20</span>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {getMaliScoreAppreciation(parseFloat(schoolAverage), 20).appreciation} • {settings.activeTerm?.replace('_', ' ') || 'Trimestre 1'}
            </p>
          </div>
        )}
      </div>

      {/* Section Historique des scans récents */}
      {isFeatureEnabled('qrScanner') && (
        <section id="section-scan-history">
          <ScanHistoryPanel 
            onViewStudentProfile={handleSelectStudent}
            onOpenQrScanner={onOpenQrScanner}
            onNavigateToCards={() => onNavigate('cards')}
          />
        </section>
      )}

      {/* Module des statistiques académiques */}
      {isFeatureEnabled('grades') && (
        <AcademicSuccessCharts onNavigateToGrades={() => onNavigate('grades')} />
      )}

      {/* Finances et Répartition des élèves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graphique de trésorerie mensuelle */}
        {isFeatureEnabled('payments') ? (
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Suivi financier mensuel
                </h2>
                <p className="text-xs text-slate-500">Comparaison des recettes encaissées et des dépenses en FCFA</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-slate-900 inline-block" />
                  Recettes
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                  Dépenses
                </span>
              </div>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    formatter={(val: any) => [`${formatFCFA(Number(val))}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="Recettes" fill="#0f172a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Depenses" fill="#059669" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {/* Cycles et caisse */}
        <div className={`${isFeatureEnabled('payments') ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-4`}>
          {isFeatureEnabled('payments') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Caisse de l'école</h3>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {(stats.totalRevenueFCFA).toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Exercice {settings.currentAcademicYear}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Répartition par cycle</h3>
              <span className="text-xs text-slate-600 font-semibold">{activeStudents.length} élèves</span>
            </div>
            <div className="space-y-2 text-xs">
              {cycleData.map((item) => (
                <div key={item.name} className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 font-mono">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des paiements prioritaires en attente */}
      {isFeatureEnabled('payments') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paiements en attente de solde
              </h2>
              <p className="text-xs text-slate-500">Élèves ayant un solde de scolarité restant à régler</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Voir tous les paiements
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-5 py-3">N° Reçu</th>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Montant payé</th>
                  <th className="px-4 py-3">Reste à payer</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                      Tous les élèves sont à jour de leurs règlements.
                    </td>
                  </tr>
                ) : (
                  pendingList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-800">{p.receiptNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{p.studentName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{p.studentMatricule}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.className}</td>
                      <td className="px-4 py-3 font-mono text-emerald-700 font-medium">{formatFCFA(p.amountPaid)}</td>
                      <td className="px-4 py-3 font-mono text-rose-600 font-bold">{formatFCFA(p.remainingAmount)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('payments')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium rounded-md transition-colors cursor-pointer border border-emerald-200"
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
      )}

      {/* Volet Latéral Coulissant 'Historique des Scans' */}
      {isScanHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-xl flex flex-col">
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

      {/* Modal fiche élève si déclenchée localement */}
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
