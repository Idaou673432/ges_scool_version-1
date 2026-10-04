/**
 * SomaSikolo - Saisie des Notes & Évaluations Module
 */

import React, { useState } from 'react';
import { ClipboardList, Save, CheckCircle2, Award, Edit3, Trash2, User as UserIcon, Plus, History } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { EvaluationType, EvaluationGrade, EvaluationTerm } from '../../types';
import { getMaliScoreAppreciation, getMaliEvaluationTerms, getTermLabel } from '../../constants/maliEducation';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { PromotionManager } from '../../components/grades/PromotionManager';

export const GradesModule: React.FC = () => {
  const { classes, subjects, students, grades, saveGrade, deleteGrade, deleteAllGrades, settings } = useSchool();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
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

  const currentClassStudents = students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');

  // Grades for selected class & subject
  const currentGradesList = grades.filter(
    g => g.classId === selectedClassId && g.subjectId === selectedSubjectId && g.term === term
  );

  const handleScoreChange = (studentId: string, val: string) => {
    const scoreNum = Math.min(currentMaxScore, Math.max(0, parseFloat(val) || 0));
    setScoresMap(prev => ({ ...prev, [studentId]: scoreNum }));
  };

  const handleSaveAllGrades = () => {
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
          coefficient: evaluationType === 'COMPOSITION' ? 2 : 1
        });
      }
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-slate-900" />
            <span>Saisie, Modification & Suppression des Notes</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Grille de saisie par classe • Photos d'élèves • Barème MEN Mali (sur 10 ou sur 20)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {grades.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer Tout ({grades.length})</span>
            </button>
          )}

          {/* Segmented Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('BATCH')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'BATCH' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Saisie Rapide</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique ({currentGradesList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PROMOTION')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'PROMOTION' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Promotions</span>
            </button>
          </div>

          {activeTab === 'BATCH' && (
            <button
              type="button"
              onClick={handleSaveAllGrades}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-300" />
              <span>Enregistrer Tout</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Opération effectuée avec succès dans la base de données.</span>
        </div>
      )}

      {/* Control Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Classe *</label>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              isFirstCycle ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
            }`}>
              {isFirstCycle ? 'Sur 10' : 'Sur 20'}
            </span>
          </div>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full mt-1.5 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition-all"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Matière *</label>
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="w-full mt-1.5 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition-all"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} (Coef {s.coefficient})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Type d'Évaluation *</label>
          <select
            value={evaluationType}
            onChange={e => setEvaluationType(e.target.value as EvaluationType)}
            className="w-full mt-1.5 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition-all"
          >
            <option value="INTERROGATION">Interro Écrite / Orale</option>
            <option value="DEVOIR">Devoir de Classe</option>
            <option value="COMPOSITION">Composition Trimestrielle</option>
            <option value="EXAMEN">Examen Blanc (DEF/BAC)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Période / Évaluation *</label>
          <select
            value={term}
            onChange={e => setTerm(e.target.value as EvaluationTerm)}
            className="w-full mt-1.5 py-2 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition-all"
          >
            <optgroup label="Évaluations Mensuelles (Devoirs)">
              {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                .filter(t => t.category === 'EVALUATION_MENSUELLE')
                .map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
            </optgroup>
            <optgroup label="Trimestres (Compositions)">
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
        </div>
      </div>

      {/* Info Banner for Evaluation / Trimestre Logic */}
      <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex items-center gap-3 text-xs text-slate-700 font-medium">
        <span className="font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] uppercase shrink-0">Note</span>
        <span className="leading-relaxed">
          {(() => {
            const count = settings.evaluationCount || 9;
            const perTrim = Math.max(1, Math.ceil(count / 3));
            if (term.startsWith('EVALUATION_')) {
              const num = parseInt(term.replace('EVALUATION_', '')) || 1;
              const trimNum = Math.min(3, Math.ceil(num / perTrim));
              const devNum = num - (trimNum - 1) * perTrim;
              return `Devoir N°${devNum}/${perTrim} du ${trimNum === 1 ? '1er' : `${trimNum}ème`} Trimestre. Calculé automatiquement pour la note de classe.`;
            }
            if (term.startsWith('TRIMESTRE_')) {
              const trimNum = term.replace('TRIMESTRE_', '');
              return `Composition du ${trimNum === '1' ? '1er' : `${trimNum}ème`} Trimestre combinée à la moyenne des devoirs pour le bulletin officiel.`;
            }
            return 'Sélectionnez une période pour effectuer la saisie des notes.';
          })()}
        </span>
      </div>

      {activeTab === 'PROMOTION' ? (
        <PromotionManager selectedClassId={selectedClassId} term={term} />
      ) : activeTab === 'BATCH' ? (
        /* Grade Entry Table with Student Photo */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/75 font-bold text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Photo</th>
                <th className="py-3 px-4">Matricule</th>
                <th className="py-3 px-4">Élève</th>
                <th className="py-3 px-4">Sexe</th>
                <th className="py-3 px-4 w-40">Note sur {currentMaxScore}</th>
                <th className="py-3 px-6">Appréciation</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {currentClassStudents.map((std) => {
                const currentScore = scoresMap[std.id] ?? (isFirstCycle ? 6 : 12);
                const { appreciation, badgeColor } = getMaliScoreAppreciation(currentScore, currentMaxScore);

                return (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6">
                      {std.photoUrl ? (
                        <img
                          src={std.photoUrl}
                          alt={std.firstName}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-200">
                          {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{std.matricule}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {std.lastName.toUpperCase()} {std.firstName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{std.gender}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max={currentMaxScore}
                        value={scoresMap[std.id] ?? ''}
                        placeholder={isFirstCycle ? "6" : "12"}
                        onChange={e => handleScoreChange(std.id, e.target.value)}
                        className="w-24 py-1.5 px-3 font-mono font-bold text-sm bg-slate-50 border border-slate-200/90 rounded-xl text-center text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                      />
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${badgeColor}`}>
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

