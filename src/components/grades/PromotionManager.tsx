/**
 * SomaSikolo - Gestionnaire des Passages & Promotions d'Élèves
 * Évalue la moyenne générale par rapport à la note de passage de la classe
 * Promu(e) si Moyenne >= Note de Passage | Redoublant(e) si Moyenne < Note de Passage
 */

import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  GraduationCap, 
  Users, 
  Filter,
  Check,
  AlertCircle,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { SchoolClass, Student, EvaluationTerm } from '../../types';

interface PromotionManagerProps {
  selectedClassId: string;
  term: EvaluationTerm;
}

export const PromotionManager: React.FC<PromotionManagerProps> = ({
  selectedClassId,
  term
}) => {
  const { classes, students, generateReportCard, saveStudent } = useSchool();
  const [targetClassMap, setTargetClassMap] = useState<Record<string, string>>({});
  const [promotedToast, setPromotedToast] = useState<string | null>(null);

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  if (!currentClass) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium">
        Veuillez d'abord créer au moins une classe.
      </div>
    );
  }

  const isFirstCycle = currentClass.category === 'FONDAMENTAL_1';
  const maxScore = isFirstCycle ? 10 : 20;
  const classPassingGrade = currentClass.passingGrade ?? (isFirstCycle ? 5 : 10);

  // Find class students
  const classStudents = students.filter(s => s.classId === currentClass.id && s.status === 'ACTIF');

  // Next recommended class detection
  const findNextClass = (cls: SchoolClass): SchoolClass | undefined => {
    // Attempt to match level number + 1 or next level name
    const matchNum = cls.name.match(/\d+/);
    if (matchNum) {
      const currentNum = parseInt(matchNum[0], 10);
      const nextNum = currentNum + 1;
      return classes.find(c => c.name.includes(`${nextNum}`));
    }
    // Fallback to next class in list
    const currentIndex = classes.findIndex(c => c.id === cls.id);
    return classes[currentIndex + 1];
  };

  const defaultNextClass = findNextClass(currentClass);

  // Calculate promotion stats for all students in the class
  const studentResults = classStudents.map(student => {
    const reportCard = generateReportCard(student.id, term);
    const average = reportCard ? reportCard.generalAverage : 0;
    const isPassing = average >= classPassingGrade;
    const resultStatus: 'PROMU' | 'REDOUBLANT' = isPassing ? 'PROMU' : 'REDOUBLANT';

    return {
      student,
      reportCard,
      average,
      isPassing,
      resultStatus
    };
  });

  const promotedCount = studentResults.filter(r => r.isPassing).length;
  const retainedCount = studentResults.filter(r => !r.isPassing).length;

  const handlePromoteSingle = (student: Student, targetClassId: string) => {
    if (!targetClassId) return;
    const targetClass = classes.find(c => c.id === targetClassId);
    saveStudent({
      ...student,
      classId: targetClassId
    });
    setPromotedToast(`Élève ${student.firstName} ${student.lastName} promu(e) avec succès en ${targetClass?.name || 'classe supérieure'}.`);
    setTimeout(() => setPromotedToast(null), 3500);
  };

  const handlePromoteAllAdmitted = () => {
    const defaultTargetId = defaultNextClass?.id;
    if (!defaultTargetId) {
      alert("Veuillez d'abord sélectionner une classe de destination supérieure.");
      return;
    }

    const passingStudents = studentResults.filter(r => r.isPassing);
    if (passingStudents.length === 0) {
      alert("Aucun élève n'a atteint la moyenne de passage requise.");
      return;
    }

    passingStudents.forEach(r => {
      const specificTarget = targetClassMap[r.student.id] || defaultTargetId;
      saveStudent({
        ...r.student,
        classId: specificTarget
      });
    });

    const targetName = defaultNextClass?.name || 'classe supérieure';
    setPromotedToast(`🎉 Bravo ! ${passingStudents.length} élèves admis ont été promus en ${targetName}.`);
    setTimeout(() => setPromotedToast(null), 4000);
  };

  return (
    <div className="space-y-2">
      {/* Toast Notification */}
      {promotedToast && (
        <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{promotedToast}</span>
        </div>
      )}

      {/* Barre Unifiée Ultra-Compacte : Passations & Promotions */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Titre, Classe & Seuil */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
            <Award className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Promotions</span>
            <span className="text-slate-400 font-normal">({currentClass.name})</span>
          </div>

          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] rounded-md shrink-0">
            Seuil : {classPassingGrade.toFixed(2)} / {maxScore}
          </span>

          {/* Synthèse Métriques en ligne */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium pl-1 border-l border-slate-200 shrink-0">
            <span>Évalués : <strong className="text-slate-800 font-mono">{classStudents.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Promus : <strong className="text-emerald-700 font-mono">{promotedCount}</strong> <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded text-[10px]">{classStudents.length > 0 ? Math.round((promotedCount / classStudents.length) * 100) : 0}%</span></span>
            <span aria-hidden="true">·</span>
            <span>Redoublants : <strong className="text-rose-700 font-mono">{retainedCount}</strong></span>
          </div>
        </div>

        {/* Right: Action Promouvoir Tout */}
        <button
          type="button"
          onClick={handlePromoteAllAdmitted}
          disabled={promotedCount === 0}
          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Promouvoir Tout ({promotedCount} Admis)</span>
        </button>
      </div>

      {/* Promotion Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-blue-900" />
            <span>Décisions de Conseil — {currentClass.name}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Moyenne requise &ge; {classPassingGrade} / {maxScore}
          </span>
        </div>

        {classStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Aucun élève inscrit dans la classe {currentClass.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Élève & Matricule</th>
                  <th className="py-2 px-2 text-center">Moyenne</th>
                  <th className="py-2 px-2 text-center">Seuil</th>
                  <th className="py-2 px-2 text-center">Décision</th>
                  <th className="py-2 px-3">Classe Destination</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentResults.map(({ student, average, isPassing, resultStatus }, idx) => {
                  const targetClassId = targetClassMap[student.id] || defaultNextClass?.id || '';
                  return (
                    <tr key={student.id || `prom-${student.matricule || idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1.5 sm:py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            student.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block truncate">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {student.matricule}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-1.5 sm:py-2 px-2 text-center">
                        <span className={`text-xs font-bold font-mono ${
                          isPassing ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {average.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal"> / {maxScore}</span>
                      </td>

                      <td className="py-1.5 sm:py-2 px-2 text-center text-xs font-mono text-slate-500">
                        {classPassingGrade.toFixed(2)}
                      </td>

                      <td className="py-1.5 sm:py-2 px-2 text-center">
                        {isPassing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>PROMU(E)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md font-bold text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>REDOUBLANT</span>
                          </span>
                        )}
                      </td>

                      <td className="py-1.5 sm:py-2 px-3">
                        <select
                          value={targetClassId}
                          onChange={e => setTargetClassMap(prev => ({ ...prev, [student.id]: e.target.value }))}
                          className="w-full py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                        >
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.id === currentClass.id ? '(Maintenir)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-1.5 sm:py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePromoteSingle(student, targetClassId)}
                          disabled={!targetClassId || targetClassId === student.classId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Affecter</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
