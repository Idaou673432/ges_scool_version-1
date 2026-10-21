/**
 * SomaSikolo / KalanGest - Fiche Statistique Officielle MEN / CAP Mali
 * Génère le tableau officiel de scolarisation exigé par les CAP et le Ministère de l'Éducation Nationale.
 * Ventilation matricielle : Tranches d'âge scolaires x Sexe (F/M/T) x Statut (Passants/Redoublants).
 * 1-clic pour imprimer en PDF Officiel Landscape ou exporter CSV.
 */

import React, { useMemo } from 'react';
import { 
  Building2, 
  Printer, 
  Download, 
  X, 
  Users, 
  FileSpreadsheet, 
  CheckCircle2, 
  Award,
  Sparkles
} from 'lucide-react';
import { Student, SchoolClass, SchoolSettings } from '../../types';
import { PdfService } from '../../services/pdfService';

interface MenOfficialStatsModalProps {
  students: Student[];
  classes: SchoolClass[];
  settings: SchoolSettings;
  onClose: () => void;
}

export const MenOfficialStatsModal: React.FC<MenOfficialStatsModalProps> = ({
  students,
  classes,
  settings,
  onClose
}) => {
  const currentYear = useMemo(() => {
    const parts = (settings.currentAcademicYear || '2025-2026').split('-');
    return parseInt(parts[0], 10) || new Date().getFullYear();
  }, [settings.currentAcademicYear]);

  // Calcul matriciel par classe et tranches d'âge
  const matrixData = useMemo(() => {
    return classes.map(cls => {
      const classStudents = students.filter(s => s.classId === cls.id && s.status === 'ACTIF');
      
      const counts = {
        className: cls.name,
        levelCategory: cls.category,
        under10: { F: 0, M: 0, T: 0 },
        age10_11: { F: 0, M: 0, T: 0 },
        age12_13: { F: 0, M: 0, T: 0 },
        age14_15: { F: 0, M: 0, T: 0 },
        age16Plus: { F: 0, M: 0, T: 0 },
        total: { F: 0, M: 0, T: 0 },
        redoublants: { F: 0, M: 0, T: 0 }
      };

      classStudents.forEach(st => {
        const birthYear = st.birthDate ? parseInt(st.birthDate.slice(0, 4), 10) : (currentYear - 12);
        const age = Math.max(5, currentYear - birthYear);
        const isF = st.gender === 'F';
        const isRedoublant = (st.observations && st.observations.toLowerCase().includes('redoubl')) || false;

        // Total
        counts.total.T += 1;
        if (isF) counts.total.F += 1;
        else counts.total.M += 1;

        // Redoublants
        if (isRedoublant) {
          counts.redoublants.T += 1;
          if (isF) counts.redoublants.F += 1;
          else counts.redoublants.M += 1;
        }

        // Tranches d'âge
        if (age < 10) {
          counts.under10.T += 1;
          if (isF) counts.under10.F += 1;
          else counts.under10.M += 1;
        } else if (age <= 11) {
          counts.age10_11.T += 1;
          if (isF) counts.age10_11.F += 1;
          else counts.age10_11.M += 1;
        } else if (age <= 13) {
          counts.age12_13.T += 1;
          if (isF) counts.age12_13.F += 1;
          else counts.age12_13.M += 1;
        } else if (age <= 15) {
          counts.age14_15.T += 1;
          if (isF) counts.age14_15.F += 1;
          else counts.age14_15.M += 1;
        } else {
          counts.age16Plus.T += 1;
          if (isF) counts.age16Plus.F += 1;
          else counts.age16Plus.M += 1;
        }
      });

      return counts;
    });
  }, [classes, students, currentYear]);

  // Totaux généraux de l'établissement
  const totals = useMemo(() => {
    let totalStudents = 0;
    let totalGirls = 0;
    let totalBoys = 0;
    let totalRedoublants = 0;

    matrixData.forEach(row => {
      totalStudents += row.total.T;
      totalGirls += row.total.F;
      totalBoys += row.total.M;
      totalRedoublants += row.redoublants.T;
    });

    const femaleRate = totalStudents > 0 ? ((totalGirls / totalStudents) * 100).toFixed(1) : '0.0';
    const genderParityIndex = totalBoys > 0 ? (totalGirls / totalBoys).toFixed(2) : '1.00';

    return {
      totalStudents,
      totalGirls,
      totalBoys,
      totalRedoublants,
      femaleRate,
      genderParityIndex
    };
  }, [matrixData]);

  const handlePrintPdf = () => {
    PdfService.generateMenOfficialTablePdf(matrixData, totals, settings);
  };

  const handleExportCsv = () => {
    const headers = [
      'Classe',
      'Moins 10ans F', 'Moins 10ans G', 'Moins 10ans T',
      '10-11ans F', '10-11ans G', '10-11ans T',
      '12-13ans F', '12-13ans G', '12-13ans T',
      '14-15ans F', '14-15ans G', '14-15ans T',
      '16ans+ F', '16ans+ G', '16ans+ T',
      'Total Filles', 'Total Garcons', 'Total General',
      'Redoublants F', 'Redoublants G', 'Total Redoublants'
    ];

    const rows = matrixData.map(r => [
      `"${r.className}"`,
      r.under10.F, r.under10.M, r.under10.T,
      r.age10_11.F, r.age10_11.M, r.age10_11.T,
      r.age12_13.F, r.age12_13.M, r.age12_13.T,
      r.age14_15.F, r.age14_15.M, r.age14_15.T,
      r.age16Plus.F, r.age16Plus.M, r.age16Plus.T,
      r.total.F, r.total.M, r.total.T,
      r.redoublants.F, r.redoublants.M, r.redoublants.T
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Statistiques_MEN_CAP_${settings.currentAcademicYear || '2025'}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden my-4 relative">
        
        {/* En-tête Officiel République du Mali */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ministère de l'Éducation Nationale (Mali)
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                  Fiche Statistique Officielle MEN / CAP
                </h2>
                <p className="text-xs text-slate-300">
                  {settings.academyName || 'Académie de Bamako'} · {settings.capName ? `CAP de ${settings.capName}` : 'CAP'} · Année {settings.currentAcademicYear}
                </p>
              </div>
            </div>

            {/* Boutons d'Action Rapide */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer Fiche Officielle (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                title="Exporter les données en CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export Excel/CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Indicateurs Clés Nationaux */}
        <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              Effectif Total Élèves
            </span>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {totals.totalStudents}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {classes.length} classes déclarées
            </p>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-0.5">
              Filles Scolarisées
            </span>
            <p className="text-2xl font-black text-emerald-800 font-mono">
              {totals.totalGirls}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-bold">
              {totals.femaleRate}% de l'effectif
            </p>
          </div>

          <div className="bg-white border border-blue-200 rounded-2xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-blue-700 block mb-0.5">
              Garçons Scolarisés
            </span>
            <p className="text-2xl font-black text-blue-800 font-mono">
              {totals.totalBoys}
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5 font-bold">
              {((totals.totalBoys / (totals.totalStudents || 1)) * 100).toFixed(1)}% de l'effectif
            </p>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-700 block mb-0.5">
              Indice Parité Genre (IPG)
            </span>
            <p className="text-2xl font-black text-amber-800 font-mono">
              {totals.genderParityIndex}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {totals.totalRedoublants} redoublant(s)
            </p>
          </div>

        </div>

        {/* Tableau Matriciel MEN Mali */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[700px] border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px]">
                  <th className="p-3 border-r border-slate-800" rowSpan={2}>Classe</th>
                  <th className="p-2 text-center border-r border-slate-800" colSpan={3}>&lt; 10 Ans</th>
                  <th className="p-2 text-center border-r border-slate-800" colSpan={3}>10 - 11 Ans</th>
                  <th className="p-2 text-center border-r border-slate-800" colSpan={3}>12 - 13 Ans</th>
                  <th className="p-2 text-center border-r border-slate-800" colSpan={3}>14 - 15 Ans</th>
                  <th className="p-2 text-center border-r border-slate-800" colSpan={3}>16+ Ans</th>
                  <th className="p-2 text-center border-r border-slate-800 bg-emerald-950" colSpan={3}>Total Général</th>
                  <th className="p-2 text-center bg-rose-950" colSpan={3}>Redoublants</th>
                </tr>
                <tr className="bg-slate-800 text-[10px] text-slate-300 font-semibold border-b border-slate-700 text-center">
                  {/* < 10 */}
                  <th className="p-1.5">F</th><th className="p-1.5">G</th><th className="p-1.5 border-r border-slate-700 font-bold text-white">T</th>
                  {/* 10-11 */}
                  <th className="p-1.5">F</th><th className="p-1.5">G</th><th className="p-1.5 border-r border-slate-700 font-bold text-white">T</th>
                  {/* 12-13 */}
                  <th className="p-1.5">F</th><th className="p-1.5">G</th><th className="p-1.5 border-r border-slate-700 font-bold text-white">T</th>
                  {/* 14-15 */}
                  <th className="p-1.5">F</th><th className="p-1.5">G</th><th className="p-1.5 border-r border-slate-700 font-bold text-white">T</th>
                  {/* 16+ */}
                  <th className="p-1.5">F</th><th className="p-1.5">G</th><th className="p-1.5 border-r border-slate-700 font-bold text-white">T</th>
                  {/* Total */}
                  <th className="p-1.5 bg-emerald-900 text-white">F</th><th className="p-1.5 bg-emerald-900 text-white">G</th><th className="p-1.5 bg-emerald-900 text-white font-black border-r border-slate-700">T</th>
                  {/* Redoublants */}
                  <th className="p-1.5 bg-rose-900 text-white">F</th><th className="p-1.5 bg-rose-900 text-white">G</th><th className="p-1.5 bg-rose-900 text-white font-black">T</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrixData.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                      {row.className}
                    </td>

                    {/* < 10 */}
                    <td className="p-2 text-center text-slate-600">{row.under10.F}</td>
                    <td className="p-2 text-center text-slate-600">{row.under10.M}</td>
                    <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-50">{row.under10.T}</td>

                    {/* 10-11 */}
                    <td className="p-2 text-center text-slate-600">{row.age10_11.F}</td>
                    <td className="p-2 text-center text-slate-600">{row.age10_11.M}</td>
                    <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-50">{row.age10_11.T}</td>

                    {/* 12-13 */}
                    <td className="p-2 text-center text-slate-600">{row.age12_13.F}</td>
                    <td className="p-2 text-center text-slate-600">{row.age12_13.M}</td>
                    <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-50">{row.age12_13.T}</td>

                    {/* 14-15 */}
                    <td className="p-2 text-center text-slate-600">{row.age14_15.F}</td>
                    <td className="p-2 text-center text-slate-600">{row.age14_15.M}</td>
                    <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-50">{row.age14_15.T}</td>

                    {/* 16+ */}
                    <td className="p-2 text-center text-slate-600">{row.age16Plus.F}</td>
                    <td className="p-2 text-center text-slate-600">{row.age16Plus.M}</td>
                    <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-50">{row.age16Plus.T}</td>

                    {/* Total */}
                    <td className="p-2 text-center font-bold text-emerald-800 bg-emerald-50/50">{row.total.F}</td>
                    <td className="p-2 text-center font-bold text-blue-800 bg-blue-50/50">{row.total.M}</td>
                    <td className="p-2 text-center font-black text-slate-950 bg-slate-100 border-r border-slate-200">{row.total.T}</td>

                    {/* Redoublants */}
                    <td className="p-2 text-center text-rose-800 bg-rose-50/40">{row.redoublants.F}</td>
                    <td className="p-2 text-center text-rose-800 bg-rose-50/40">{row.redoublants.M}</td>
                    <td className="p-2 text-center font-bold text-rose-900 bg-rose-50/70">{row.redoublants.T}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td className="p-3 border-r border-slate-800">TOTAL ÉTABLISSEMENT</td>
                  <td colSpan={15} className="p-2 text-center text-slate-400 font-normal border-r border-slate-800 text-[11px]">
                    Ventilation conforme aux normes statistiques du MEN
                  </td>
                  <td className="p-2 text-center text-emerald-300 font-bold">{totals.totalGirls}</td>
                  <td className="p-2 text-center text-blue-300 font-bold">{totals.totalBoys}</td>
                  <td className="p-2 text-center font-black text-white bg-slate-800 border-r border-slate-800">{totals.totalStudents}</td>
                  <td colSpan={2} className="p-2 text-center text-slate-400">Total Redoubl.</td>
                  <td className="p-2 text-center font-bold text-rose-300">{totals.totalRedoublants}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 text-center sm:text-left">
            Document officiel conforme aux directives de la DNEF (Direction Nationale de l'Enseignement Fondamental).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
