/**
 * SomaSikolo - Saisie des Notes & Évaluations Module
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Save, CheckCircle2, Award, Edit3, Trash2, User as UserIcon, Plus, History, BookOpen, ChevronRight } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { EvaluationType, EvaluationGrade, EvaluationTerm } from '../../types';
import { getMaliScoreAppreciation, getMaliEvaluationTerms, getTermLabel } from '../../constants/maliEducation';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { PromotionManager } from '../../components/grades/PromotionManager';

export const GradesModule: React.FC = () => {
  const { classes, subjects, students, grades, saveGrade, deleteGrade, deleteAllGrades, settings } = useSchool();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('COMPOSITION');
  const [term, setTerm] = useState<EvaluationTerm>('EVALUATION_1');
  const [activeTab, setActiveTab] = useState<'BATCH' | 'HISTORY' | 'PROMOTION'>('BATCH');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Input scores state
  const [scoresMap, setScoresMap] = useState<Record<string, number>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal for Edit Grade
  const [editingGrade, setEditingGrade] = useState<EvaluationGrade | null>(null);
  const [deletingGradeId, setDeletingGradeId] = useState<string | null>(null);

  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  const isFirstCycle = selectedClassObj?.category === 'FONDAMENTAL_1';
  const currentMaxScore = isFirstCycle ? 10 : 20;

  // Filtrage 100% AUTOMATIQUE des matières assignées à la classe sélectionnée
  const classSubjects = useMemo(() => {
    if (!selectedClassObj) return subjects;
    const filtered = subjects.filter(s => s.classCategory === selectedClassObj.category);
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, selectedClassObj]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => classSubjects[0]?.id || subjects[0]?.id || '');

  // Synchronisation automatique de la matière dès que la classe change
  useEffect(() => {
    if (classSubjects.length > 0) {
      const exists = classSubjects.some(s => s.id === selectedSubjectId);
      if (!exists) {
        setSelectedSubjectId(classSubjects[0].id);
      }
    }
  }, [classSubjects, selectedSubjectId]);

  const currentSubjectObj = classSubjects.find(s => s.id === selectedSubjectId) || classSubjects[0];
  const currentClassStudents = students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');

  // Pré-chargement automatique des notes existantes dans la base pour cette classe, matière et période
  useEffect(() => {
    const loadedScores: Record<string, number> = {};
    currentClassStudents.forEach(std => {
      const existing = grades.find(
        g => g.studentId === std.id &&
             g.classId === selectedClassId &&
             g.subjectId === selectedSubjectId &&
             g.term === term &&
             g.type === evaluationType
      );
      if (existing) {
        loadedScores[std.id] = existing.score;
      }
    });
    setScoresMap(loadedScores);
  }, [selectedClassId, selectedSubjectId, term, evaluationType, grades]);

  // Grades for selected class & subject
  const currentGradesList = grades.filter(
    g => g.classId === selectedClassId && g.subjectId === selectedSubjectId && g.term === term
  );

  const handleScoreChange = (studentId: string, val: string) => {
    if (val === '') {
      setScoresMap(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
      return;
    }
    const scoreNum = Math.min(currentMaxScore, Math.max(0, parseFloat(val) || 0));
    setScoresMap(prev => ({ ...prev, [studentId]: scoreNum }));
  };

  const handleSaveAllGrades = (moveToNextSubject = false) => {
    currentClassStudents.forEach(std => {
      const score = scoresMap[std.id];
      if (score !== undefined) {
        saveGrade({
          studentId: std.id,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          term,
          academicYear: settings.currentAcademicYear,
          type: evaluationType,
          score,
          maxScore: currentMaxScore,
          coefficient: currentSubjectObj?.coefficient || (evaluationType === 'COMPOSITION' ? 2 : 1)
        });
      }
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    if (moveToNextSubject && classSubjects.length > 1) {
      const currentIdx = classSubjects.findIndex(s => s.id === selectedSubjectId);
      const nextIdx = (currentIdx + 1) % classSubjects.length;
      setSelectedSubjectId(classSubjects[nextIdx].id);
    }
  };

  const handleUpdateSingleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;
    saveGrade(editingGrade);
    setEditingGrade(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDeleteGradeConfirm = (id: string) => {
    deleteGrade(id);
    setDeletingGradeId(null);
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* Barre d'Action & Filtres Unifiée Ultra-Compacte */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Title + Tabs */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <ClipboardList className="w-4 h-4 text-slate-900 shrink-0" />
              <span className="hidden sm:inline font-bold">Notes</span>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('BATCH')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'BATCH' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Saisie</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historique ({currentGradesList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PROMOTION')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'PROMOTION' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Promotions</span>
              </button>
            </div>

            {/* Sélecteurs Classe, Matière, Type, Période intégrés */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              {/* Classe */}
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer max-w-[130px]"
                title="Sélectionner la classe"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Matière (filtrée automatiquement selon la classe) */}
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer max-w-[170px]"
                title="Matière sélectionnée"
              >
                {classSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Coef {s.coefficient})</option>
                ))}
              </select>

              {/* Type */}
              <select
                value={evaluationType}
                onChange={e => setEvaluationType(e.target.value as EvaluationType)}
                className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer max-w-[110px]"
                title="Type d'évaluation"
              >
                <option value="INTERROGATION">Interro</option>
                <option value="DEVOIR">Devoir</option>
                <option value="COMPOSITION">Composition</option>
                <option value="EXAMEN">Examen Blanc</option>
              </select>

              {/* Période */}
              <select
                value={term}
                onChange={e => setTerm(e.target.value as EvaluationTerm)}
                className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer max-w-[160px]"
                title="Période"
              >
                <optgroup label="Devoirs">
                  {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                    .filter(t => t.category === 'EVALUATION_MENSUELLE')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </optgroup>
                <optgroup label="Compositions">
                  {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                    .filter(t => t.category === 'TRIMESTRE')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </optgroup>
                <optgroup label="Semestres">
                  {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                    .filter(t => t.category === 'SEMESTRE')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </optgroup>
              </select>

              <span className="text-[11px] font-mono font-semibold text-slate-500 whitespace-nowrap hidden lg:inline">
                (sur {currentMaxScore})
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab === 'BATCH' && (
              <button
                type="button"
                onClick={() => handleSaveAllGrades(false)}
                className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-slate-300" />
                <span>Enregistrer</span>
              </button>
            )}

            {grades.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition-all cursor-pointer"
                title="Supprimer toutes les notes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supprimer ({grades.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ruban des Matières Automatique & 100% Lisible */}
      {(activeTab === 'BATCH' || activeTab === 'HISTORY') && (
        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 overflow-x-auto text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-900" />
            <span>Matières ({classSubjects.length}) :</span>
          </div>
          {classSubjects.map((sub) => {
            const isSelected = sub.id === selectedSubjectId;
            const enteredCount = currentClassStudents.filter(std =>
              grades.some(g => g.studentId === std.id && g.classId === selectedClassId && g.subjectId === sub.id && g.term === term && g.type === evaluationType)
            ).length;
            const isComplete = currentClassStudents.length > 0 && enteredCount === currentClassStudents.length;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-blue-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
                title={`Matière : ${sub.name} (Coefficient ${sub.coefficient})`}
              >
                <span>{sub.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  isSelected ? 'bg-blue-800 text-blue-200 font-bold' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  Coef {sub.coefficient}
                </span>
                {enteredCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                    isComplete
                      ? isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                      : isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {enteredCount}/{currentClassStudents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {savedSuccess && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Notes enregistrées avec succès dans la base de données.</span>
        </div>
      )}

      {activeTab === 'PROMOTION' ? (
        <PromotionManager selectedClassId={selectedClassId} term={term} />
      ) : activeTab === 'BATCH' ? (
        /* Saisie Épurée, Rapide et Lisible */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 uppercase text-[11px]">
                {currentSubjectObj?.name}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200">
                Coefficient {currentSubjectObj?.coefficient || 1}
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-600 text-xs hidden sm:inline">
                {selectedClassObj?.name} • Barème : note sur {currentMaxScore}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {classSubjects.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSaveAllGrades(true)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Enregistrer cette matière et passer automatiquement à la matière suivante"
                >
                  <span>Enregistrer & Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-1.5 px-3">Élève & Matricule</th>
                <th className="py-1.5 px-3 w-40 text-center">Note sur {currentMaxScore}</th>
                <th className="py-1.5 px-3">Appréciation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentClassStudents.map((std) => {
                const currentScore = scoresMap[std.id];
                const hasScore = currentScore !== undefined;
                const { appreciation } = hasScore 
                  ? getMaliScoreAppreciation(currentScore, currentMaxScore)
                  : { appreciation: 'En attente de note' };

                return (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2">
                        {std.photoUrl ? (
                          <img
                            src={std.photoUrl}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                            {std.firstName[0]}{std.lastName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">
                            {std.lastName.toUpperCase()} {std.firstName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {std.matricule}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max={currentMaxScore}
                        value={hasScore ? currentScore : ''}
                        placeholder={isFirstCycle ? "Ex: 7" : "Ex: 14"}
                        onChange={e => handleScoreChange(std.id, e.target.value)}
                        className={`w-24 py-1 px-2 text-center font-mono font-bold text-xs border rounded-lg outline-none transition-colors ${
                          hasScore 
                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-black' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={`text-xs ${hasScore ? 'font-semibold text-slate-800' : 'text-slate-400 italic text-[11px]'}`}>
                        {appreciation}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* History & Individual Grade Management Table */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/75 font-bold text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Élève & Photo</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Note / Barème</th>
                <th className="py-4 px-4">Appréciation</th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-50">
              {currentGradesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Aucune note enregistrée pour cette classe, matière et période.
                  </td>
                </tr>
              ) : (
                currentGradesList.map((g) => {
                  const std = students.find(s => s.id === g.studentId);
                  const gMaxScore = g.maxScore || currentMaxScore;
                  const { appreciation, badgeColor } = getMaliScoreAppreciation(g.score, gMaxScore);

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          {std?.photoUrl ? (
                            <img
                              src={std.photoUrl}
                              alt={std?.firstName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-200">
                              {std ? `${std.firstName.charAt(0)}${std.lastName.charAt(0)}` : 'E'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{std ? `${std.lastName.toUpperCase()} ${std.firstName}` : 'Inconnu'}</p>
                            <p className="text-[10px] font-mono text-slate-400">{std?.matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 text-xs">
                        {g.type}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                        {g.score.toFixed(2)} / {gMaxScore}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${badgeColor}`}>
                          {appreciation}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                        {new Date(g.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingGrade(g)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            title="Modifier cette note"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingGradeId(g.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            title="Supprimer cette note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Edit Grade */}
      {editingGrade && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-xl border border-slate-200/80 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Modifier la Note</h2>

            <form onSubmit={handleUpdateSingleGrade} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Note sur {editingGrade.maxScore || currentMaxScore} *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max={editingGrade.maxScore || currentMaxScore}
                  required
                  value={editingGrade.score}
                  onChange={e => setEditingGrade({ ...editingGrade, score: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-base font-mono font-bold text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Type d'Évaluation</label>
                <select
                  value={editingGrade.type}
                  onChange={e => setEditingGrade({ ...editingGrade, type: e.target.value as EvaluationType })}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
                >
                  <option value="INTERROGATION">Interrogation</option>
                  <option value="DEVOIR">Devoir</option>
                  <option value="COMPOSITION">Composition</option>
                  <option value="EXAMEN">Examen Blanc</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Commentaire / Observation</label>
                <input
                  type="text"
                  value={editingGrade.comment || ''}
                  onChange={e => setEditingGrade({ ...editingGrade, comment: e.target.value })}
                  placeholder="Ex: Travail soigné, très bon devoir"
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Grade Confirmation */}
      {deletingGradeId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-xl border border-slate-200/80 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Supprimer cette note ?</h2>
              <p className="text-xs text-slate-500 mt-1">Cette note sera retirée du calcul du bulletin trimestriel de l'élève.</p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGradeId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGradeConfirm(deletingGradeId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-2xs transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllGrades}
        title="Supprimer Toutes les Notes"
        itemCount={grades.length}
        description="Attention ! Cette action supprimera définitivement TOUTES les notes enregistrées dans le système."
      />
    </div>
  );
};

