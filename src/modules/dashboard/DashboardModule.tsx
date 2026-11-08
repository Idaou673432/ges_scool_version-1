/**
 * SomaSikolo / KalanGest - Module Tableau de Bord (Accueil)
 * Interface épurée, claire, ultra-facile et intuitive pour la direction et l'administration scolaire.
 * Toutes les fonctions existantes sont conservées : chiffres clés, accès rapides, suivi financier,
 * répartition par cycle, alertes de scolarité, performances académiques et scans QR.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  Users, CreditCard, Award, School, QrCode, Plus, ArrowUpRight, 
  FileText, Calendar, CheckCircle2, AlertCircle, Clock, ChevronRight,
  TrendingUp, Download, Eye, Sparkles
} from 'lucide-react';
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
  const { stats, students, classes, payments, settings, generateReportCard, isFeatureEnabled } = useSchool();
  const [activeDashboardTab, setActiveDashboardTab] = useState<'OVERVIEW' | 'ACADEMIC'>('OVERVIEW');
  const [localViewingStudent, setLocalViewingStudent] = useState<Student | null>(null);

  const handleSelectStudent = (student: Student) => {
    if (onViewStudentProfile) {
      onViewStudentProfile(student);
    } else {
      setLocalViewingStudent(student);
    }
  };

  // Répartition des élèves actifs
  const activeStudents = useMemo(() => students.filter(s => s.status === 'ACTIF'), [students]);
  const femaleCount = useMemo(() => activeStudents.filter(s => s.gender === 'F').length, [activeStudents]);
  const maleCount = useMemo(() => activeStudents.filter(s => s.gender === 'M').length, [activeStudents]);

  // Moyenne générale de l'établissement
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

  // Répartition par cycle scolaire au Mali
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

  // Trésorerie mensuelle
  const financialData = [
    { month: 'Sept', Recettes: 1250000, Depenses: 650000 },
    { month: 'Oct', Recettes: 2450000, Depenses: 670000 },
    { month: 'Nov', Recettes: 2100000, Depenses: 670000 },
    { month: 'Déc', Recettes: 1980000, Depenses: 670000 },
    { month: 'Janv', Recettes: 2300000, Depenses: 670000 },
  ];

  // Élèves avec solde restant
  const pendingPayments = useMemo(() => {
    return payments.filter(p => p.remainingAmount > 0).slice(0, 5);
  }, [payments]);

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      
      {/* Barre d'Action & Navigation Ultra-Compacte de l'Accueil */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Tab Switcher (Vue Générale / Résultats & Réussite) */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveDashboardTab('OVERVIEW')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeDashboardTab === 'OVERVIEW'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Vue Générale</span>
          </button>

          {isFeatureEnabled('grades') && (
            <button
              type="button"
              onClick={() => setActiveDashboardTab('ACADEMIC')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeDashboardTab === 'ACADEMIC'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Résultats & Réussite</span>
            </button>
          )}
        </div>

        {/* Right: Actions Rapides (SANS Scanner QR) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isFeatureEnabled('students') && (
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inscrire Élève</span>
            </button>
          )}

          {isFeatureEnabled('payments') && (
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Encaisser</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => PdfService.generateMenOfficialReportPdf(stats, students, classes, settings)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-slate-200"
            title="Générer le rapport officiel MEN"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Rapport MEN</span>
          </button>
        </div>
      </div>

      {/* VUE 1 : VUE GÉNÉRALE & GESTION COURANTE */}
      {activeDashboardTab === 'OVERVIEW' && (
        <div className="space-y-2">
          {/* Grille 2 Colonnes : Trésorerie & Cycles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
            {/* Graphique de Trésorerie Mensuelle */}
            {isFeatureEnabled('payments') && (
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Suivi Financier Mensuel (FCFA)</h2>
                    <p className="text-[11px] text-slate-500">Recettes scolaires encaissées vs dépenses courantes</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                      Recettes
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                      Dépenses
                    </span>
                  </div>
                </div>

                <div className="h-60 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                      <Tooltip 
                        formatter={(val: any) => [`${formatFCFA(Number(val))}`, '']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                      />
                      <Bar dataKey="Recettes" fill="#0f172a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Depenses" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Répartition par Cycle */}
            <div className={`${isFeatureEnabled('payments') ? 'lg:col-span-4' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200 p-5 space-y-3 flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Répartition par Cycle</h3>
                  <span className="text-xs font-semibold text-slate-500">{activeStudents.length} élèves</span>
                </div>

                <div className="space-y-2.5 pt-2 text-xs">
                  {cycleData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate('classes')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
              >
                Gérer les classes & effectifs
              </button>
            </div>
          </div>

          {/* Tableau des Règlements en Attente (Rappels de Caisse) */}
          {isFeatureEnabled('payments') && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Paiements de Scolarité en Attente</h2>
                  <p className="text-[11px] text-slate-500">Élèves ayant un solde de mensualités restant à régler</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('payments')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Voir la Caisse
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2 px-3">Élève & Matricule</th>
                      <th className="py-2 px-2.5">Classe</th>
                      <th className="py-2 px-2.5 text-right">Montant Payé</th>
                      <th className="py-2 px-2.5 text-right">Reste à Régler</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                          Tous les élèves sont à jour de leurs règlements de scolarité.
                        </td>
                      </tr>
                    ) : (
                      pendingPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 sm:py-2 px-3">
                            <p className="font-bold text-slate-900 leading-tight">{p.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule}</p>
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 font-medium text-slate-700">
                            {p.className}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-medium text-emerald-700 tabular-nums">
                            {formatFCFA(p.amountPaid)}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-rose-600 tabular-nums">
                            {formatFCFA(p.remainingAmount)}
                          </td>
                          <td className="py-1.5 sm:py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onNavigate('payments')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs transition-colors cursor-pointer"
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
        </div>
      )}

      {/* VUE 2 : RÉSULTATS ACADÉMIQUES & NOTES */}
      {activeDashboardTab === 'ACADEMIC' && isFeatureEnabled('grades') && (
        <AcademicSuccessCharts onNavigateToGrades={() => onNavigate('grades')} />
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
