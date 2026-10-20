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
  const [activeDashboardTab, setActiveDashboardTab] = useState<'OVERVIEW' | 'ACADEMIC' | 'SCANS'>('OVERVIEW');
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Entête Épuré de l'Accueil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <School className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {settings.schoolName || 'Tableau de bord'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Année scolaire {settings.currentAcademicYear} {settings.academyName ? `· ${settings.academyName}` : ''} {settings.capName ? `· ${settings.capName}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Actions Rapides Essentielles */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {isFeatureEnabled('students') && (
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Inscrire Élève</span>
            </button>
          )}

          {isFeatureEnabled('payments') && (
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Encaisser</span>
            </button>
          )}

          {isFeatureEnabled('qrScanner') && onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Scanner QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => PdfService.generateMenOfficialReportPdf(stats, students, classes, settings)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Générer le rapport officiel pour le Ministère de l'Éducation Nationale"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Rapport MEN</span>
          </button>
        </div>
      </div>

      {/* 2. Les 4 Chiffres Clés de l'Établissement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Effectif Global */}
        {isFeatureEnabled('students') && (
          <div 
            onClick={() => onNavigate('students')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Effectif Total</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2">
              {stats.totalStudents} <span className="text-xs font-normal text-slate-400">élèves</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {maleCount} garçons · {femaleCount} filles
            </p>
          </div>
        )}

        {/* Classes & Enseignants */}
        {isFeatureEnabled('classes') && (
          <div 
            onClick={() => onNavigate('classes')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Classes & Personnel</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                <School className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2">
              {classes.length} <span className="text-xs font-normal text-slate-400">salles de classe</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {stats.totalTeachers} enseignants en activité
            </p>
          </div>
        )}

        {/* Recettes de Caisse */}
        {isFeatureEnabled('payments') && (
          <div 
            onClick={() => onNavigate('payments')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Recettes Encaissées</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2">
              {formatFCFA(stats.totalRevenueFCFA)}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Total scolarités de l'exercice
            </p>
          </div>
        )}

        {/* Moyenne Établissement */}
        {isFeatureEnabled('grades') && (
          <div 
            onClick={() => onNavigate('grades')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Moyenne Générale</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-2">
              {schoolAverage} <span className="text-xs font-normal text-slate-400">/ 20</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {getMaliScoreAppreciation(parseFloat(schoolAverage), 20).appreciation} · {settings.activeTerm?.replace('_', ' ') || 'Trimestre 1'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Sélecteur de Vue de l'Accueil (Vue Générale / Résultats Académiques / Historique Scans) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveDashboardTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeDashboardTab === 'OVERVIEW'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Vue Générale</span>
          </button>

          {isFeatureEnabled('grades') && (
            <button
              onClick={() => setActiveDashboardTab('ACADEMIC')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeDashboardTab === 'ACADEMIC'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Résultats & Réussite</span>
            </button>
          )}

          {isFeatureEnabled('qrScanner') && (
            <button
              onClick={() => setActiveDashboardTab('SCANS')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeDashboardTab === 'SCANS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Historique Scans QR ({historyCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* VUE 1 : VUE GÉNÉRALE & GESTION COURANTE */}
      {activeDashboardTab === 'OVERVIEW' && (
        <div className="space-y-6">
          
          {/* Cartes d'Accès Rapide aux Modules Clés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isFeatureEnabled('students') && (
              <button
                onClick={() => onNavigate('students')}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Gestion des Élèves</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Inscriptions, fiches & dossiers</p>
                </div>
              </button>
            )}

            {isFeatureEnabled('payments') && (
              <button
                onClick={() => onNavigate('payments')}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Caisse & Règlements</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Reçus, scolarités & dépenses</p>
                </div>
              </button>
            )}

            {isFeatureEnabled('bulletins') && (
              <button
                onClick={() => onNavigate('bulletins')}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Bulletins de Notes</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Génération PDF & classement</p>
                </div>
              </button>
            )}

            {isFeatureEnabled('cards') && (
              <button
                onClick={() => onNavigate('cards')}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-900 flex items-center justify-center mb-2">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Cartes d'Élèves QR</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Badges officiels sécurisés</p>
                </div>
              </button>
            )}
          </div>

          {/* Grille 2 Colonnes : Trésorerie & Cycles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Graphique de Trésorerie Mensuelle */}
            {isFeatureEnabled('payments') && (
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Suivi Financier Mensuel (FCFA)</h2>
                    <p className="text-xs text-slate-500">Recettes scolaires encaissées vs dépenses courantes</p>
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
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Paiements de Scolarité en Attente</h2>
                  <p className="text-xs text-slate-500">Élèves ayant un solde de mensualités restant à régler</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('payments')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Voir la Caisse
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Élève & Matricule</th>
                      <th className="py-3 px-4">Classe</th>
                      <th className="py-3 px-4 text-right">Montant Payé</th>
                      <th className="py-3 px-4 text-right">Reste à Régler</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          Tous les élèves sont à jour de leurs règlements de scolarité.
                        </td>
                      </tr>
                    ) : (
                      pendingPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{p.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {p.className}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700 tabular-nums">
                            {formatFCFA(p.amountPaid)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 tabular-nums">
                            {formatFCFA(p.remainingAmount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => onNavigate('payments')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
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

      {/* VUE 3 : HISTORIQUE DES SCANS QR */}
      {activeDashboardTab === 'SCANS' && isFeatureEnabled('qrScanner') && (
        <ScanHistoryPanel 
          onViewStudentProfile={handleSelectStudent}
          onOpenQrScanner={onOpenQrScanner}
          onNavigateToCards={() => onNavigate('cards')}
        />
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
