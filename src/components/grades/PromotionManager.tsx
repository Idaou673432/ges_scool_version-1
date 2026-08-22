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
    <div className="space-y-6">
      {/* Toast Notification */}
      {promotedToast && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-lg shadow-emerald-500/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{promotedToast}</span>
        </div>
      )}

      {/* Class Threshold & Overview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/30 text-amber-300 font-black text-[10px] uppercase tracking-widest rounded-full">
              Seuil d'Admission : {classPassingGrade.toFixed(2)} / {maxScore}
            </span>
            <span className="text-xs font-bold text-slate-300">
              Classe de départ : <strong className="text-white">{currentClass.name}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mt-3 flex items-center gap-3">
            <Award className="w-7 h-7 text-amber-400" />
            <span>Passations & Promotions Générales</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Si la moyenne générale de l'élève est supérieure ou égale à <strong className="text-amber-300">{classPassingGrade} / {maxScore}</strong>, l'élève est déclaré <strong className="text-emerald-400">PROMU(E)</strong>. Sinon, il est déclaré <strong className="text-rose-400">REDOUBLANT(E)</strong>.
          </p>
        </div>

        {/* Global Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={handlePromoteAllAdmitted}
            disabled={promotedCount === 0}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Promouvoir Tout ({promotedCount} Admis)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Élèves Évalués</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{classStudents.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-900 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Promus (Moy. &ge; {classPassingGrade})</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {promotedCount} <span className="text-xs font-bold text-slate-400">({classStudents.length > 0 ? Math.round((promotedCount / classStudents.length) * 100) : 0}%)</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Redoublants (Moy. &lt; {classPassingGrade})</span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {retainedCount} <span className="text-xs font-bold text-slate-400">({classStudents.length > 0 ? Math.round((retainedCount / classStudents.length) * 100) : 0}%)</span>
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Promotion Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-900" />
            <span>Liste des Élèves de {currentClass.name} - Décisions de Conseil</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">
            Seuil de passage fixe : {classPassingGrade} / {maxScore}
          </span>
        </div>

        {classStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Aucun élève inscrit dans la classe {currentClass.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-200">
                <tr>
                  <th className="p-4 pl-6">Élève & Matricule</th>
                  <th className="p-4 text-center">Moyenne Générale</th>
                  <th className="p-4 text-center">Note de Passage</th>
                  <th className="p-4 text-center">Décision d'Admission</th>
                  <th className="p-4">Classe de Destination</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentResults.map(({ student, average, isPassing, resultStatus }, idx) => {
                  const targetClassId = targetClassMap[student.id] || defaultNextClass?.id || '';
                  return (
                    <tr key={student.id || `prom-${student.matricule || idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${
                            student.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 text-sm block">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {student.matricule}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`text-base font-black ${
                          isPassing ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {average.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block">/ {maxScore}</span>
                      </td>

                      <td className="p-4 text-center font-bold text-slate-500">
                        {classPassingGrade.toFixed(2)} / {maxScore}
                      </td>

                      <td className="p-4 text-center">
                        {isPassing ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-black text-[10px] uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>PROMU(E)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-black text-[10px] uppercase tracking-wider">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>REDOUBLANT(E)</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <select
                          value={targetClassId}
                          onChange={e => setTargetClassMap(prev => ({ ...prev, [student.id]: e.target.value }))}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                        >
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.id === currentClass.id ? '(Maintenir / Redoublement)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 text-right pr-6">
                        <button
                          onClick={() => handlePromoteSingle(student, targetClassId)}
                          disabled={!targetClassId || targetClassId === student.classId}
                          className="flex items-center gap-1.5 ml-auto px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-30 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <span>Promouvoir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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
