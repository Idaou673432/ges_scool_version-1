/**
 * SomaSikolo - Visualisation des Statistiques de Réussite Scolaire
 * Graphiques du Taux de Réussite par Classe, Répartition des Mentions et Équité Genre
 */

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  ReferenceLine
} from 'recharts';
import { 
  Award, 
  TrendingUp, 
  GraduationCap, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  Percent,
  ChevronRight
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { EvaluationTerm, SchoolClass } from '../../types';
import { getTermLabel, getMaliEvaluationTerms } from '../../constants/maliEducation';

interface AcademicSuccessChartsProps {
  onNavigateToGrades?: () => void;
}

export const AcademicSuccessCharts: React.FC<AcademicSuccessChartsProps> = ({ onNavigateToGrades }) => {
  const { classes, students, grades, generateReportCard, settings } = useSchool();
  const [selectedTerm, setSelectedTerm] = useState<EvaluationTerm>('EVALUATION_1');

  // Compute stats per class for the selected term
  const classStats = classes.map((cls) => {
    const isFirstCycle = cls.category === 'FONDAMENTAL_1';
    const passingGrade = cls.passingGrade ?? (isFirstCycle ? 5 : 10);
    const maxScore = isFirstCycle ? 10 : 20;

    const classStudents = students.filter(s => s.classId === cls.id && s.status === 'ACTIF');
    const totalCount = classStudents.length;

    let totalAvgSum = 0;
    let passCount = 0;
    let failCount = 0;

    let femaleTotal = 0;
    let femalePass = 0;
    let maleTotal = 0;
    let malePass = 0;

    classStudents.forEach(student => {
      const report = generateReportCard(student.id, selectedTerm);
      const avg = report ? report.generalAverage : 0;
      totalAvgSum += avg;

      const passed = avg >= passingGrade;
      if (passed) {
        passCount++;
      } else {
        failCount++;
      }

      if (student.gender === 'F') {
        femaleTotal++;
        if (passed) femalePass++;
      } else {
        maleTotal++;
        if (passed) malePass++;
      }
    });

    const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;
    const femalePassRate = femaleTotal > 0 ? Math.round((femalePass / femaleTotal) * 100) : 0;
    const malePassRate = maleTotal > 0 ? Math.round((malePass / maleTotal) * 100) : 0;
    const classAvg = totalCount > 0 ? parseFloat((totalAvgSum / totalCount).toFixed(2)) : 0;

    return {
      classId: cls.id,
      className: cls.name,
      category: cls.category,
      passingGrade,
      maxScore,
      totalCount,
      passCount,
      failCount,
      passRate,
      femalePassRate,
      malePassRate,
      classAvg
    };
  });

  // Global aggregate metrics
  const totalStudentsEvaluated = classStats.reduce((acc, c) => acc + c.totalCount, 0);
  const totalPassCount = classStats.reduce((acc, c) => acc + c.passCount, 0);
  const totalFailCount = classStats.reduce((acc, c) => acc + c.failCount, 0);
  const overallPassRate = totalStudentsEvaluated > 0 ? Math.round((totalPassCount / totalStudentsEvaluated) * 100) : 0;

  // Best performing class
  const bestClass = [...classStats].sort((a, b) => b.passRate - a.passRate)[0];

  // Mentions / Grade Ranges breakdown data
  let rangeExcellent = 0; // >= 16/20 or >= 8/10
  let rangeGood = 0;      // 14-15.9/20 or 7-7.9/10
  let rangeFair = 0;      // 10-13.9/20 or 5-6.9/10
  let rangePoor = 0;      // < 10/20 or < 5/10

  students.forEach(s => {
    if (s.status !== 'ACTIF') return;
    const cls = classes.find(c => c.id === s.classId);
    const isFirstCycle = cls?.category === 'FONDAMENTAL_1';
    const report = generateReportCard(s.id, selectedTerm);
    const avg = report ? report.generalAverage : 0;

    if (isFirstCycle) {
      if (avg >= 8) rangeExcellent++;
      else if (avg >= 7) rangeGood++;
      else if (avg >= 5) rangeFair++;
      else rangePoor++;
    } else {
      if (avg >= 16) rangeExcellent++;
      else if (avg >= 14) rangeGood++;
      else if (avg >= 10) rangeFair++;
      else rangePoor++;
    }
  });

  const mentionDistributionData = [
    { name: 'Excellente (Très Bien / Bien)', value: rangeExcellent, color: '#10b981' },
    { name: 'Assez Bien', value: rangeGood, color: '#0284c7' },
    { name: 'Passable', value: rangeFair, color: '#f59e0b' },
    { name: 'Insuffisant (Avertissement)', value: rangePoor, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
      {/* Module Title & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-blue-900" />
            <span>Statistiques Académiques & Performance</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            Visualisation des Taux de Réussite
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Analyse comparative du taux d'admission par classe et répartition des mentions scolaires
          </p>
        </div>

        {/* Term Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1">Évaluation :</span>
          {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
            .filter(t => t.category === 'TRIMESTRE' || ['EVALUATION_1', 'EVALUATION_2', 'EVALUATION_3'].includes(t.id))
            .map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTerm(t.id as EvaluationTerm)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedTerm === t.id 
                    ? 'bg-blue-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {t.shortLabel}
              </button>
            ))}
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Global Pass Rate */}
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-3xl text-white shadow-lg shadow-blue-900/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Taux de Réussite Global</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black tracking-tight">{overallPassRate}%</span>
              <span className="text-xs font-bold text-emerald-400">Admis</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-[10px] font-bold text-blue-200">
            <span>{totalPassCount} admis</span>
            <span>{totalFailCount} redoublants</span>
          </div>
        </div>

        {/* Total Evaluated */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Élèves Évalués</span>
            <p className="text-3xl font-black text-slate-900 mt-2">{totalStudentsEvaluated}</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Inscrits en classe active</span>
          </div>
        </div>

        {/* Top Performing Class */}
        <div className="bg-emerald-50/70 p-6 rounded-3xl border border-emerald-100 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Meilleure Classe</span>
            <p className="text-xl font-black text-emerald-950 mt-1 line-clamp-1">
              {bestClass ? bestClass.className : 'N/A'}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-black text-emerald-700">
            <span>Taux d'admission :</span>
            <span className="text-base font-black">{bestClass ? bestClass.passRate : 0}%</span>
          </div>
        </div>

        {/* Actions button */}
        <div className="bg-amber-50/70 p-6 rounded-3xl border border-amber-200 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Gestion des Notes</span>
            <p className="text-xs font-bold text-amber-900 mt-1">Saisir ou ajuster les moyennes de passage par classe</p>
          </div>
          {onNavigateToGrades && (
            <button
              onClick={onNavigateToGrades}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <span>Accéder aux Passations</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Bar Chart: Taux de Réussite Par Classe (%) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-900" />
            <span>Taux de Réussite par Classe (% d'élèves ayant la moyenne de passage)</span>
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Seuil minimal : Note de passage propre à chaque classe
          </span>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classStats} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="className" 
                tick={{ fontSize: 11, fontWeight: '700', fill: '#475569' }} 
                interval={0} 
                angle={-15} 
                textAnchor="end" 
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fontWeight: '700', fill: '#64748b' }} 
                unit="%" 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl text-xs space-y-2 border border-slate-700 min-w-[200px]">
                        <p className="font-black text-sm text-amber-400 border-b border-slate-700 pb-1.5 uppercase">
                          {data.className}
                        </p>
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-300">Taux de Réussite :</span>
                          <span className="text-emerald-400 font-black">{data.passRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Admis :</span>
                          <span className="font-bold text-white">{data.passCount} / {data.totalCount} élèves</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Redoublants :</span>
                          <span className="font-bold text-rose-400">{data.failCount} élèves</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                          <span className="text-slate-400">Note de passage :</span>
                          <span className="font-bold text-amber-300">{data.passingGrade}/{data.maxScore}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Moyenne Classe :</span>
                          <span className="font-bold text-blue-300">{data.classAvg}/{data.maxScore}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="4 4" label={{ value: 'Seuil 50%', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
              <Bar dataKey="passRate" radius={[8, 8, 0, 0]}>
                {classStats.map((entry, index) => {
                  let fillColor = '#10b981'; // Green for >= 75%
                  if (entry.passRate < 50) fillColor = '#f43f5e'; // Red for < 50%
                  else if (entry.passRate < 75) fillColor = '#0284c7'; // Blue for 50-74%
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Two Secondary Charts: Gender Equity + Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
        {/* Gender Pass Rates Comparison */}
        <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80 space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Taux de Réussite par Genre (Équité Filles / Garçons)</span>
            </h4>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Comparatif du pourcentage de réussite entre les filles et les garçons
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classStats} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="className" tick={{ fontSize: 10, fontWeight: '700' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="femalePassRate" name="Taux Filles (%)" fill="#ec4899" radius={[4, 4, 0, 0]} />
                <Bar dataKey="malePassRate" name="Taux Garçons (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Range Distribution (Pie Chart) */}
        <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80 space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Répartition des Mentions & Niveaux de Moyennes</span>
            </h4>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Distribution des résultats globaux de l'établissement
            </p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {mentionDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mentionDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {mentionDistributionData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} élève(s)`, 'Effectif']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs font-semibold">
                Aucune note saisie pour ce trimestre.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table by Class */}
      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4">
          Détail par Classe — Effectifs & Décisions
        </h4>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-500 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 pl-4">Classe</th>
                <th className="p-3 text-center">Cycle</th>
                <th className="p-3 text-center">Note de Passage</th>
                <th className="p-3 text-center">Effectif Évalué</th>
                <th className="p-3 text-center">Admis (Promus)</th>
                <th className="p-3 text-center">Redoublants</th>
                <th className="p-3 text-center">Taux de Réussite</th>
                <th className="p-3 text-center">Moyenne Classe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {classStats.map((c) => (
                <tr key={c.classId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 pl-4 font-black text-slate-900">{c.className}</td>
                  <td className="p-3 text-center text-[10px] font-bold text-slate-500">{c.category.replace('_', ' ')}</td>
                  <td className="p-3 text-center font-bold text-amber-700">{c.passingGrade} / {c.maxScore}</td>
                  <td className="p-3 text-center font-bold text-slate-800">{c.totalCount}</td>
                  <td className="p-3 text-center font-black text-emerald-600">{c.passCount}</td>
                  <td className="p-3 text-center font-black text-rose-600">{c.failCount}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                      c.passRate >= 75 ? 'bg-emerald-100 text-emerald-800' :
                      c.passRate >= 50 ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {c.passRate}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-black text-blue-900">{c.classAvg} / {c.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
