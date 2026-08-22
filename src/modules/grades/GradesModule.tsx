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
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-blue-900" />
            <span>Saisie, Modification & Suppression des Notes</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Grille de saisie avec photos des élèves • Historique & Édition individuelle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {grades.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer Tout ({grades.length})</span>
            </button>
          )}
          <div className="flex bg-slate-100 p-1.5 rounded-full text-xs font-black uppercase tracking-widest flex-wrap">
            <button
              onClick={() => setActiveTab('BATCH')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'BATCH' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Saisie Rapide</span>
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'HISTORY' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Notes Enregistrées ({currentGradesList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PROMOTION')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'PROMOTION' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Passages & Promotions</span>
            </button>
          </div>

          {activeTab === 'BATCH' && (
            <button
              onClick={handleSaveAllGrades}
              className="flex items-center gap-2 px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer Tout</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Opération effectuée avec succès dans la base de données.</span>
        </div>
      )}

      {/* Control Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe *</label>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
              isFirstCycle ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300'
            }`}>
              {isFirstCycle ? '1er Cycle (Sur 10)' : '2ème Cycle / Lycée (Sur 20)'}
            </span>
          </div>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matière *</label>
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} (Coef {s.coefficient})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type d'Évaluation *</label>
          <select
            value={evaluationType}
            onChange={e => setEvaluationType(e.target.value as EvaluationType)}
            className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
          >
            <option value="INTERROGATION">Interro Écrite / Orale</option>
            <option value="DEVOIR">Devoir de Classe</option>
            <option value="COMPOSITION">Composition Trimestrielle</option>
            <option value="EXAMEN">Examen Blanc (DEF/BAC)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Période / Évaluation *</label>
          <select
            value={term}
            onChange={e => setTerm(e.target.value as EvaluationTerm)}
            className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
          >
            <optgroup label="Évaluations Mensuelles (1er & 2ème Cycle / Devoirs)">
              {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                .filter(t => t.category === 'EVALUATION_MENSUELLE')
                .map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
            </optgroup>
            <optgroup label="Trimestres (2ème Cycle & Lycée / Compositions)">
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
      <div className="bg-blue-50/80 border border-blue-200/60 p-4 rounded-2xl flex items-center gap-3 text-xs text-blue-900 font-medium">
        <span className="font-black bg-blue-900 text-white px-2.5 py-1 rounded-lg text-[10px] uppercase shrink-0">Information</span>
        <span>
          {(() => {
            const count = settings.evaluationCount || 9;
            const perTrim = Math.max(1, Math.ceil(count / 3));
            if (term.startsWith('EVALUATION_')) {
              const num = parseInt(term.replace('EVALUATION_', '')) || 1;
              const trimNum = Math.min(3, Math.ceil(num / perTrim));
              const devNum = num - (trimNum - 1) * perTrim;
              return `Note enregistrée pour le Devoir N°${devNum}/${perTrim} du ${trimNum === 1 ? '1er' : `${trimNum}ème`} Trimestre. Cette note entrera automatiquement dans la Note de Classe du ${trimNum === 1 ? '1er' : `${trimNum}ème`} Trimestre pour les bulletins du 2ème Cycle & Lycée.`;
            }
            if (term.startsWith('TRIMESTRE_')) {
              const trimNum = term.replace('TRIMESTRE_', '');
              const startDev = (parseInt(trimNum) - 1) * perTrim + 1;
              const endDev = Math.min(parseInt(trimNum) * perTrim, count);
              return `Composition du ${trimNum === '1' ? '1er' : `${trimNum}ème`} Trimestre. Pour le calcul du bulletin trimestriel, le système combinera automatiquement la moyenne des devoirs (Évaluation N°${startDev} à N°${endDev}) avec la note de cette composition.`;
            }
            return 'Sélectionnez une période pour effectuer la saisie des notes.';
          })()}
        </span>
      </div>

      {activeTab === 'PROMOTION' ? (
        <PromotionManager selectedClassId={selectedClassId} term={term} />
      ) : activeTab === 'BATCH' ? (
        /* Grade Entry Table with Student Photo */
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-50">
              <tr>
                <th className="py-4 px-8">Photo</th>
                <th className="py-4 px-4">Matricule</th>
                <th className="py-4 px-4">Élève</th>
                <th className="py-4 px-4">Sexe</th>
                <th className="py-4 px-4 w-44">Note sur {currentMaxScore}</th>
                <th className="py-4 px-8">Appréciation Automatique</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-50">
              {currentClassStudents.map((std) => {
                const currentScore = scoresMap[std.id] ?? (isFirstCycle ? 6 : 12);
                const { appreciation, badgeColor } = getMaliScoreAppreciation(currentScore, currentMaxScore);

                return (
                  <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-8">
                      {std.photoUrl ? (
                        <img
                          src={std.photoUrl}
                          alt={std.firstName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-900 shadow-xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-xs border border-blue-200">
                          {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono font-black text-blue-900">{std.matricule}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {std.lastName.toUpperCase()} {std.firstName}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-500">{std.gender}</td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max={currentMaxScore}
                        value={scoresMap[std.id] ?? ''}
                        placeholder={isFirstCycle ? "6" : "12"}
                        onChange={e => handleScoreChange(std.id, e.target.value)}
                        className="w-28 py-2 px-3 font-mono font-black text-sm bg-slate-50 border border-slate-200 rounded-full text-center text-blue-900 outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </td>
                    <td className="py-4 px-8">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
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
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-50">
              <tr>
                <th className="py-4 px-8">Élève & Photo</th>
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
                    <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          {std?.photoUrl ? (
                            <img
                              src={std.photoUrl}
                              alt={std?.firstName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-900 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-xs border border-blue-200">
                              {std ? `${std.firstName.charAt(0)}${std.lastName.charAt(0)}` : 'E'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{std ? `${std.lastName.toUpperCase()} ${std.firstName}` : 'Inconnu'}</p>
                            <p className="text-[10px] font-mono text-slate-400">{std?.matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-black text-blue-900 uppercase text-[10px]">
                        {g.type}
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-base text-blue-900">
                        {g.score.toFixed(2)} / {gMaxScore}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
                          {appreciation}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400 text-xs">
                        {new Date(g.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-4 px-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingGrade(g)}
                            className="p-2 text-slate-500 hover:text-blue-900 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                            title="Modifier cette note"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingGradeId(g.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6">
            <h2 className="text-xl font-black text-slate-900 uppercase">Modifier la Note</h2>

            <form onSubmit={handleUpdateSingleGrade} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-base font-mono font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type d'Évaluation</label>
                <select
                  value={editingGrade.type}
                  onChange={e => setEditingGrade({ ...editingGrade, type: e.target.value as EvaluationType })}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="INTERROGATION">Interrogation</option>
                  <option value="DEVOIR">Devoir</option>
                  <option value="COMPOSITION">Composition</option>
                  <option value="EXAMEN">Examen Blanc</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Commentaire / Observation</label>
                <input
                  type="text"
                  value={editingGrade.comment || ''}
                  onChange={e => setEditingGrade({ ...editingGrade, comment: e.target.value })}
                  placeholder="Ex: Travail soigné, très bon devoir"
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">Supprimer cette Note ?</h2>
              <p className="text-xs text-slate-500 mt-2 font-semibold">
                Cette action est irréversible et supprimera la note sélectionnée.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingGradeId(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteGradeConfirm(deletingGradeId)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
              >
                Confirmer Suppression
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

