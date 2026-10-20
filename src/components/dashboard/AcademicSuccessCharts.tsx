/**
 * SomaSikolo - Visualisation des Statistiques de Réussite Scolaire
 * Interface simple, claire et lisible sans fioritures
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
import { useSchool } from '../../contexts/SchoolContext';
import { EvaluationTerm } from '../../types';
import { getMaliEvaluationTerms } from '../../constants/maliEducation';

interface AcademicSuccessChartsProps {
  onNavigateToGrades?: () => void;
}

export const AcademicSuccessCharts: React.FC<AcademicSuccessChartsProps> = ({ onNavigateToGrades }) => {
  const { classes, students, generateReportCard, settings } = useSchool();
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

  // Overall statistics
  const totalStudentsEvaluated = classStats.reduce((acc, c) => acc + c.totalCount, 0);
  const totalPassCount = classStats.reduce((acc, c) => acc + c.passCount, 0);
  const totalFailCount = classStats.reduce((acc, c) => acc + c.failCount, 0);
  const overallPassRate = totalStudentsEvaluated > 0 
    ? Math.round((totalPassCount / totalStudentsEvaluated) * 100) 
    : 0;

  // Grade distributions (Mentions)
  let rangeExcellent = 0;
  let rangeGood = 0;
  let rangeFair = 0;
  let rangePoor = 0;

  students.filter(s => s.status === 'ACTIF').forEach(student => {
    const report = generateReportCard(student.id, selectedTerm);
    if (!report || report.generalAverage === 0) return;
    const avg = report.generalAverage;
    const cls = classes.find(c => c.id === student.classId);
    const isFirstCycle = cls?.category === 'FONDAMENTAL_1';

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
    { name: 'Très Bien / Bien', value: rangeExcellent, color: '#16a34a' },
    { name: 'Assez Bien', value: rangeGood, color: '#2563eb' },
    { name: 'Passable', value: rangeFair, color: '#d97706' },
    { name: 'Insuffisant', value: rangePoor, color: '#dc2626' }
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* En-tête du module & Sélecteur de période */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Taux de réussite et résultats par classe
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pourcentage d'élèves ayant atteint la moyenne de passage pour la période sélectionnée
          </p>
        </div>

        {/* Sélecteur de période épuré */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg shrink-0 flex-wrap">
          <span className="text-xs font-semibold text-slate-600 px-2">Période :</span>
          {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
            .filter(t => t.category === 'TRIMESTRE' || ['EVALUATION_1', 'EVALUATION_2', 'EVALUATION_3'].includes(t.id))
            .map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTerm(t.id as EvaluationTerm)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTerm === t.id 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.shortLabel}
              </button>
            ))}
        </div>
      </div>

      {/* 4 Indicateurs Clairs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Taux de réussite global</span>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{overallPassRate}%</p>
          <p className="text-xs text-slate-500 mt-1">{totalPassCount} admis sur {totalStudentsEvaluated} élèves</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Élèves évalués</span>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{totalStudentsEvaluated}</p>
          <p className="text-xs text-slate-500 mt-1">Élèves inscrits actifs</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Élèves en difficulté</span>
          <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">{totalFailCount}</p>
          <p className="text-xs text-slate-500 mt-1">Moyenne inférieure au seuil</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Gestion des notes</span>
            <p className="text-xs text-slate-600 mt-1">Saisie des notes et calcul des moyennes</p>
          </div>
          {onNavigateToGrades && (
            <button
              type="button"
              onClick={onNavigateToGrades}
              className="mt-3 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer text-center"
            >
              Consulter les notes
            </button>
          )}
        </div>
      </div>

      {/* Graphique principal : Taux de Réussite Par Classe */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Taux de réussite par classe (%)
          </h3>
          <span className="text-xs text-slate-500">
            Ligne pointillée : seuil à 50%
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classStats} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="className" 
                tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} 
                interval={0} 
                angle={-15} 
                textAnchor="end" 
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                unit="%" 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg text-xs space-y-1 shadow-lg">
                        <p className="font-bold text-sm text-amber-300 pb-1 border-b border-slate-700">
                          {data.className}
                        </p>
                        <p className="flex justify-between gap-4">
                          <span>Taux de réussite :</span>
                          <span className="font-bold text-emerald-400">{data.passRate}%</span>
                        </p>
                        <p className="flex justify-between gap-4">
                          <span>Admis :</span>
                          <span>{data.passCount} / {data.totalCount} élèves</span>
                        </p>
                        <p className="flex justify-between gap-4">
                          <span>Moyenne classe :</span>
                          <span className="font-bold">{data.classAvg} / {data.maxScore}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar dataKey="passRate" radius={[4, 4, 0, 0]}>
                {classStats.map((entry, index) => {
                  let fillColor = '#16a34a'; // Vert pour >= 75%
                  if (entry.passRate < 50) fillColor = '#dc2626'; // Rouge pour < 50%
                  else if (entry.passRate < 75) fillColor = '#2563eb'; // Bleu pour 50-74%
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deux Graphiques Secondaires : Équité Genre & Mentions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
        {/* Comparatif Filles / Garçons */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Réussite comparée : Filles et Garçons
            </h4>
            <p className="text-xs text-slate-500">
              Pourcentage d'admission par genre dans chaque classe
            </p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classStats} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="className" tick={{ fontSize: 10, fontWeight: '600' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="femalePassRate" name="Filles (%)" fill="#db2777" radius={[3, 3, 0, 0]} />
                <Bar dataKey="malePassRate" name="Garçons (%)" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition des Mentions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Répartition des mentions scolaires
            </h4>
            <p className="text-xs text-slate-500">
              Niveau global des notes obtenues par les élèves
            </p>
          </div>

          <div className="h-56 flex items-center justify-center">
            {mentionDistributionData.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune donnée disponible pour cette période</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mentionDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {mentionDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} élève(s)`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
