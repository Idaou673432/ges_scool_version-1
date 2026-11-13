/**
 * SomaSikolo - Saisie des Notes & Évaluations Module
 * Mode par Élève : Liste verticale de toutes les matières avec saisie directe des notes
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  Save, 
  CheckCircle2, 
  Award, 
  Edit3, 
  Trash2, 
  Plus, 
  History, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  User,
  Users,
  Search,
  Check,
  Percent,
  Calculator,
  X
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { EvaluationType, EvaluationGrade, EvaluationTerm, Student } from '../../types';
import { getMaliScoreAppreciation, getMaliEvaluationTerms, getFilteredEvaluationTerms, getTermLabel } from '../../constants/maliEducation';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { PromotionManager } from '../../components/grades/PromotionManager';

export const GradesModule: React.FC = () => {
  const { classes, subjects, students, grades, saveGrade, deleteGrade, deleteAllGrades, settings } = useSchool();
  const { hasPermission } = useAuth();
  const canEditGrades = hasPermission('grades:entry');
  const canBulkDeleteGrades = hasPermission('classes:manage');
  
  // Classes filtrées selon le type d'établissement configuré
  const availableClasses = useMemo(() => {
    if (settings.schoolCategory === 'ECOLE_FONDAMENTALE') {
      return classes.filter(c => c.category === 'FONDAMENTAL_1' || c.category === 'FONDAMENTAL_2');
    }
    if (settings.schoolCategory === 'LYCEE') {
      return classes.filter(c => c.category === 'LYCEE');
    }
    if (settings.schoolCategory === 'PROFESSIONNEL') {
      return classes.filter(c => c.category === 'TECHNIQUE_BT' || c.category === 'PROFESSIONNEL_CAP');
    }
    return classes;
  }, [classes, settings.schoolCategory]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => availableClasses[0]?.id || classes[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('COMPOSITION');
  const [term, setTerm] = useState<EvaluationTerm>('EVALUATION_1');
  const [activeTab, setActiveTab] = useState<'BATCH' | 'HISTORY' | 'PROMOTION'>('BATCH');
  const [entryMode, setEntryMode] = useState<'BY_STUDENT' | 'BY_SUBJECT'>('BY_STUDENT');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedBatchStudentIds, setSelectedBatchStudentIds] = useState<string[]>([]);
  const [batchOnlySelected, setBatchOnlySelected] = useState<boolean>(false);
  const [batchScoresMap, setBatchScoresMap] = useState<Record<string, number>>({});
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Synchronisation de la classe sélectionnée si la liste disponible change
  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses, selectedClassId]);

  // Map des notes de l'élève par matière: { [subjectId]: scoreNumber }
  const [scoresMap, setScoresMap] = useState<Record<string, number>>({});
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Modal for Edit Grade in History
  const [editingGrade, setEditingGrade] = useState<EvaluationGrade | null>(null);
  const [deletingGradeId, setDeletingGradeId] = useState<string | null>(null);

  const selectedClassObj = availableClasses.find(c => c.id === selectedClassId) || classes.find(c => c.id === selectedClassId);

  // Périodes strictement filtrées : si Fondamental, masquer Trimestres et Semestres des autres niveaux
  const filteredTerms = useMemo(() => {
    return getFilteredEvaluationTerms(
      selectedClassObj?.category,
      settings.schoolCategory,
      settings.evaluationMonths,
      settings.evaluationCount
    );
  }, [selectedClassObj?.category, settings.schoolCategory, settings.evaluationMonths, settings.evaluationCount]);

  // Si le niveau est Fondamental, basculer automatiquement hors de Trimestre/Semestre
  useEffect(() => {
    const isFondamental = 
      selectedClassObj?.category === 'FONDAMENTAL_1' || 
      selectedClassObj?.category === 'FONDAMENTAL_2' || 
      settings.schoolCategory === 'ECOLE_FONDAMENTALE';

    if (isFondamental) {
      if (term.startsWith('TRIMESTRE_') || term.startsWith('SEMESTRE_')) {
        setTerm('EVALUATION_1');
      }
    } else if (selectedClassObj?.category === 'LYCEE' || settings.schoolCategory === 'LYCEE') {
      if (!term.startsWith('TRIMESTRE_')) {
        setTerm('TRIMESTRE_1');
      }
    } else if (selectedClassObj?.category === 'TECHNIQUE_BT' || selectedClassObj?.category === 'PROFESSIONNEL_CAP' || settings.schoolCategory === 'PROFESSIONNEL') {
      if (!term.startsWith('SEMESTRE_')) {
        setTerm('SEMESTRE_1');
      }
    }
  }, [selectedClassObj?.category, settings.schoolCategory, term]);
  const isFirstCycle = selectedClassObj?.category === 'FONDAMENTAL_1';
  const currentMaxScore = isFirstCycle ? 10 : 20;

  // Matières assignées à la classe sélectionnée (affichées verticalement)
  const classSubjects = useMemo(() => {
    if (!selectedClassObj) return subjects;
    if (selectedClassObj.subjectIds && selectedClassObj.subjectIds.length > 0) {
      return subjects.filter(s => selectedClassObj.subjectIds!.includes(s.id));
    }
    const filtered = subjects.filter(s => s.classCategory === selectedClassObj.category);
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, selectedClassObj]);

  useEffect(() => {
    if (classSubjects.length > 0 && !classSubjects.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubjectId]);

  // Élèves actifs de la classe
  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');
  }, [students, selectedClassId]);

  // Élèves filtrés par la recherche rapide
  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return currentClassStudents;
    return currentClassStudents.filter(s => 
      s.lastName.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.matricule.toLowerCase().includes(q)
    );
  }, [currentClassStudents, studentSearch]);

  // Sélection automatique du premier élève si aucun sélectionné ou si la classe change
  useEffect(() => {
    if (currentClassStudents.length > 0) {
      const exists = currentClassStudents.some(s => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(currentClassStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [currentClassStudents, selectedStudentId]);

  // Élève actuellement sélectionné
  const currentStudent: Student | undefined = useMemo(() => {
    return currentClassStudents.find(s => s.id === selectedStudentId) || currentClassStudents[0];
  }, [currentClassStudents, selectedStudentId]);

  const currentStudentIndex = useMemo(() => {
    if (!currentStudent) return -1;
    return currentClassStudents.findIndex(s => s.id === currentStudent.id);
  }, [currentClassStudents, currentStudent]);

  const hasPrevStudent = currentStudentIndex > 0;
  const hasNextStudent = currentStudentIndex >= 0 && currentStudentIndex < currentClassStudents.length - 1;

  // Pré-chargement automatique des notes existantes de CET ÉLÈVE pour TOUTES LES MATIÈRES (verticalement)
  useEffect(() => {
    if (!currentStudent) {
      setScoresMap({});
      return;
    }

    const loadedScores: Record<string, number> = {};
    classSubjects.forEach(sub => {
      const existing = grades.find(
        g => g.studentId === currentStudent.id &&
             g.classId === selectedClassId &&
             g.subjectId === sub.id &&
             g.term === term &&
             g.type === evaluationType
      );
      if (existing) {
        loadedScores[sub.id] = existing.score;
      }
    });
    setScoresMap(loadedScores);
  }, [currentStudent, selectedClassId, term, evaluationType, classSubjects, grades]);

  // Pré-chargement des notes existantes pour le mode Sélection d'Élèves (Par Matière)
  useEffect(() => {
    if (!selectedSubjectId) {
      setBatchScoresMap({});
      return;
    }
    const loaded: Record<string, number> = {};
    currentClassStudents.forEach(std => {
      const existing = grades.find(
        g => g.studentId === std.id &&
             g.classId === selectedClassId &&
             g.subjectId === selectedSubjectId &&
             g.term === term &&
             g.type === evaluationType
      );
      if (existing) {
        loaded[std.id] = existing.score;
      }
    });
    setBatchScoresMap(loaded);
  }, [currentClassStudents, selectedClassId, selectedSubjectId, term, evaluationType, grades]);

  // Réinitialiser la sélection quand la classe change
  useEffect(() => {
    setSelectedBatchStudentIds([]);
    setBatchOnlySelected(false);
  }, [selectedClassId]);

  // Saisie directe d'une note pour une matière (mode par élève)
  const handleScoreChange = (subjectId: string, val: string) => {
    if (!canEditGrades) return;
    if (val === '') {
      setScoresMap(prev => {
        const copy = { ...prev };
        delete copy[subjectId];
        return copy;
      });
      return;
    }
    const parsed = parseFloat(val);
    const scoreNum = Math.min(currentMaxScore, Math.max(0, isNaN(parsed) ? 0 : parsed));
    setScoresMap(prev => ({ ...prev, [subjectId]: scoreNum }));
  };

  // Saisie directe d'une note pour un élève (mode sélection d'élèves par matière)
  const handleBatchStudentScoreChange = (studentId: string, val: string) => {
    if (!canEditGrades) return;
    if (val === '') {
      setBatchScoresMap(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
      return;
    }
    const parsed = parseFloat(val);
    const scoreNum = Math.min(currentMaxScore, Math.max(0, isNaN(parsed) ? 0 : parsed));
    setBatchScoresMap(prev => ({ ...prev, [studentId]: scoreNum }));
    if (!selectedBatchStudentIds.includes(studentId)) {
      setSelectedBatchStudentIds(prev => [...prev, studentId]);
    }
  };

  const toggleSelectBatchStudent = (studentId: string) => {
    setSelectedBatchStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Enregistrement des notes de cet élève (et suppression des notes vidées)
  const handleSaveStudentGrades = (moveToNext = false) => {
    if (!canEditGrades || !currentStudent) return;

    let savedCount = 0;
    classSubjects.forEach(sub => {
      const score = scoresMap[sub.id];
      const existing = grades.find(
        g => g.studentId === currentStudent.id &&
             g.classId === selectedClassId &&
             g.subjectId === sub.id &&
             g.term === term &&
             g.type === evaluationType
      );
      if (score !== undefined) {
        saveGrade({
          ...(existing || {}),
          studentId: currentStudent.id,
          classId: selectedClassId,
          subjectId: sub.id,
          term,
          academicYear: settings.currentAcademicYear,
          type: evaluationType,
          score,
          maxScore: currentMaxScore,
          coefficient: (selectedClassObj?.customCoefficients && selectedClassObj.customCoefficients[sub.id] !== undefined)
            ? selectedClassObj.customCoefficients[sub.id]
            : (sub.coefficient || (evaluationType === 'COMPOSITION' ? 2 : 1)),
          date: new Date().toISOString().split('T')[0]
        });
        savedCount++;
      } else if (existing) {
        deleteGrade(existing.id);
      }
    });

    const studentName = `${currentStudent.lastName.toUpperCase()} ${currentStudent.firstName}`;
    setSavedSuccess(`Notes enregistrées pour ${studentName} (${savedCount}/${classSubjects.length} matières).`);
    setTimeout(() => setSavedSuccess(null), 3000);

    if (moveToNext && hasNextStudent) {
      setSelectedStudentId(currentClassStudents[currentStudentIndex + 1].id);
    }
  };

  // Enregistrement des notes uniquement pour les élèves sélectionnés (mode par matière)
  const handleSaveSelectedStudentsBatch = () => {
    if (!canEditGrades || !selectedSubjectId) return;
    const targetSub = classSubjects.find(s => s.id === selectedSubjectId);
    if (!targetSub) return;

    const targetIds = selectedBatchStudentIds.length > 0
      ? selectedBatchStudentIds
      : Object.keys(batchScoresMap);

    if (targetIds.length === 0) {
      setSavedSuccess('Sélectionnez au moins un élève et saisissez sa note.');
      setTimeout(() => setSavedSuccess(null), 2500);
      return;
    }

    let savedCount = 0;
    const coef = (selectedClassObj?.customCoefficients && selectedClassObj.customCoefficients[targetSub.id] !== undefined)
      ? selectedClassObj.customCoefficients[targetSub.id]
      : (targetSub.coefficient || (evaluationType === 'COMPOSITION' ? 2 : 1));

    targetIds.forEach(stdId => {
      const score = batchScoresMap[stdId];
      const existing = grades.find(
        g => g.studentId === stdId &&
             g.classId === selectedClassId &&
             g.subjectId === targetSub.id &&
             g.term === term &&
             g.type === evaluationType
      );
      if (score !== undefined) {
        saveGrade({
          ...(existing || {}),
          studentId: stdId,
          classId: selectedClassId,
          subjectId: targetSub.id,
          term,
          academicYear: settings.currentAcademicYear,
          type: evaluationType,
          score,
          maxScore: currentMaxScore,
          coefficient: coef,
          date: new Date().toISOString().split('T')[0]
        });
        savedCount++;
      } else if (existing) {
        deleteGrade(existing.id);
      }
    });

    setSavedSuccess(`${savedCount} note(s) enregistrée(s) en ${targetSub.name} pour les élèves sélectionnés.`);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handlePrevStudent = () => {
    if (hasPrevStudent) {
      setSelectedStudentId(currentClassStudents[currentStudentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (hasNextStudent) {
      setSelectedStudentId(currentClassStudents[currentStudentIndex + 1].id);
    }
  };

  // Calcul statistique en temps réel pour l'élève en cours de saisie
  const studentMetrics = useMemo(() => {
    let totalPoints = 0;
    let totalCoeffs = 0;
    let enteredCount = 0;

    classSubjects.forEach(sub => {
      const score = scoresMap[sub.id];
      const coef = (selectedClassObj?.customCoefficients && selectedClassObj.customCoefficients[sub.id] !== undefined)
        ? selectedClassObj.customCoefficients[sub.id]
        : (sub.coefficient || 1);
      if (score !== undefined) {
        enteredCount++;
        totalPoints += score * coef;
        totalCoeffs += coef;
      }
    });

    const average = totalCoeffs > 0 ? (totalPoints / totalCoeffs) : 0;
    const { appreciation, badgeColor } = getMaliScoreAppreciation(average, currentMaxScore);

    return {
      enteredCount,
      totalSubjects: classSubjects.length,
      totalPoints,
      totalCoeffs,
      average,
      appreciation,
      badgeColor
    };
  }, [classSubjects, scoresMap, currentMaxScore]);

  // Liste des notes dans l'onglet Historique
  const currentGradesList = useMemo(() => {
    return grades.filter(
      g => g.classId === selectedClassId && g.term === term && (!currentStudent || g.studentId === currentStudent.id)
    );
  }, [grades, selectedClassId, term, currentStudent]);

  const handleUpdateSingleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;
    saveGrade(editingGrade);
    setEditingGrade(null);
    setSavedSuccess("Note modifiée avec succès.");
    setTimeout(() => setSavedSuccess(null), 2500);
  };

  const handleDeleteGradeConfirm = (id: string) => {
    deleteGrade(id);
    setDeletingGradeId(null);
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* ----------------- BARRE D'ACTION & SÉLECTEURS UNIFIÉE ULTRA-COMPACTE ----------------- */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Title + Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <ClipboardList className="w-4 h-4 text-slate-900 shrink-0" />
              <span className="font-bold">Saisie des Notes</span>
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
                <User className="w-3.5 h-3.5 text-blue-900" />
                <span>Saisie par Élève</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span>Historique ({currentGradesList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PROMOTION')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'PROMOTION' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Promotions</span>
              </button>
            </div>

            {/* Filtres : Classe, Type, Période */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              {/* Classe */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-400">Classe</span>
                <select
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    setStudentSearch('');
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
                >
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.studentCount || 0})</option>
                  ))}
                </select>
              </div>

              {/* Type d'évaluation */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-400">Type</span>
                <select
                  value={evaluationType}
                  onChange={e => setEvaluationType(e.target.value as EvaluationType)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[120px]"
                >
                  <option value="COMPOSITION">Composition</option>
                  <option value="DEVOIR">Devoir Mensuel</option>
                  <option value="INTERROGATION">Interrogation</option>
                  <option value="EXAMEN">Examen Blanc</option>
                </select>
              </div>

              {/* Période (Strictement filtrée : masque les Trimestres et Semestres pour le Fondamental) */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-400">Période</span>
                <select
                  value={term}
                  onChange={e => setTerm(e.target.value as EvaluationTerm)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
                >
                  {filteredTerms.monthlyTerms.length > 0 && (
                    <optgroup label="Évaluations Mensuelles (Fondamental)">
                      {filteredTerms.monthlyTerms.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {filteredTerms.trimesterTerms.length > 0 && (
                    <optgroup label="Trimestres (Lycée)">
                      {filteredTerms.trimesterTerms.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {filteredTerms.semesterTerms.length > 0 && (
                    <optgroup label="Semestres (Technique / Professionnel)">
                      {filteredTerms.semesterTerms.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <span className="text-[11px] font-mono font-semibold text-slate-500 whitespace-nowrap hidden xl:inline">
                Barème : note sur {currentMaxScore}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab === 'BATCH' && canEditGrades && entryMode === 'BY_STUDENT' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveStudentGrades(false)}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enregistrer</span>
                </button>

                {hasNextStudent && (
                  <button
                    type="button"
                    onClick={() => handleSaveStudentGrades(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
                    title="Enregistrer les notes de cet élève et passer automatiquement à l'élève suivant"
                  >
                    <span>Enregistrer & Suivant</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}

            {activeTab === 'BATCH' && canEditGrades && entryMode === 'BY_SUBJECT' && (
              <button
                type="button"
                onClick={handleSaveSelectedStudentsBatch}
                className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>Enregistrer la sélection ({selectedBatchStudentIds.length})</span>
              </button>
            )}

            {canBulkDeleteGrades && grades.length > 0 && (
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

      {/* Message de succès */}
      {savedSuccess && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* ----------------- CONTENU PRINCIPAL ----------------- */}
      {activeTab === 'PROMOTION' ? (
        <PromotionManager selectedClassId={selectedClassId} term={term} />
      ) : activeTab === 'BATCH' ? (
        /* ================= SAISIE DES NOTES : PAR ÉLÈVE OU SÉLECTION D'ÉLÈVES PAR MATIÈRE ================= */
        <div className="space-y-2">
          {/* Barre de mode de saisie + recherche/sélection d'élèves */}
          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEntryMode('BY_STUDENT')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    entryMode === 'BY_STUDENT' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-900" />
                  <span>Par Élève (Toutes matières)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('BY_SUBJECT')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    entryMode === 'BY_SUBJECT' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Sélectionner des Élèves (Par Matière)</span>
                </button>
              </div>
            </div>

            {entryMode === 'BY_STUDENT' && currentStudent && (
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Moyenne :</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {studentMetrics.enteredCount > 0 ? studentMetrics.average.toFixed(2) : '—'} / {currentMaxScore}
                  </span>
                </div>
                <span className="text-slate-300">•</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${studentMetrics.enteredCount > 0 ? studentMetrics.badgeColor : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {studentMetrics.enteredCount > 0 ? studentMetrics.appreciation : 'Aucune note'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-600">
                  {studentMetrics.enteredCount}/{studentMetrics.totalSubjects} matières
                </span>
              </div>
            )}
          </div>

          {entryMode === 'BY_STUDENT' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
              {/* Colonne gauche : Recherche & Liste cliquable des élèves */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-900" />
                    <span>Choisir un élève ({filteredStudents.length}/{currentClassStudents.length})</span>
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Rechercher nom, prénom ou matricule..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-500 focus:bg-white"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredStudents.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400 italic">
                      Aucun élève ne correspond à cette recherche.
                    </p>
                  ) : (
                    filteredStudents.map((std, idx) => {
                      const isSelected = currentStudent?.id === std.id;
                      const studentGradesCount = classSubjects.filter(sub =>
                        grades.some(g => g.studentId === std.id && g.classId === selectedClassId && g.subjectId === sub.id && g.term === term && g.type === evaluationType)
                      ).length;

                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => setSelectedStudentId(std.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-900 text-white border-blue-900 font-bold shadow-2xs'
                              : 'bg-slate-50/80 text-slate-800 border-slate-200/70 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate">
                              {idx + 1}. {std.lastName.toUpperCase()} {std.firstName}
                            </p>
                            <p className={`text-[10px] font-mono ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                              {std.matricule}
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : studentGradesCount > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200/70 text-slate-500'
                          }`}>
                            {studentGradesCount}/{classSubjects.length}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Colonne droite : Tableau vertical des matières de l'élève sélectionné */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {currentStudent ? (
                  <>
                    <div className="bg-slate-900 text-white px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        {currentStudent.photoUrl ? (
                          <img
                            src={currentStudent.photoUrl}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-white/10 text-amber-300 font-bold flex items-center justify-center text-xs border border-white/10 shrink-0">
                            {currentStudent.firstName[0]}{currentStudent.lastName[0]}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {currentStudent.lastName.toUpperCase()} {currentStudent.firstName}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px] ml-2">
                            Matricule: {currentStudent.matricule} • {selectedClassObj?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={handlePrevStudent}
                          disabled={!hasPrevStudent}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white cursor-pointer"
                          title="Élève précédent"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-slate-300 px-1">
                          {currentStudentIndex >= 0 ? `${currentStudentIndex + 1}/${currentClassStudents.length}` : '0/0'}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextStudent}
                          disabled={!hasNextStudent}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white cursor-pointer"
                          title="Élève suivant"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-400/30 ml-1">
                          {evaluationType}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="py-2 px-3 sm:px-4">Matières du Programme</th>
                            <th className="py-2 px-2.5 text-center w-24">Coefficient</th>
                            <th className="py-2 px-3 text-center w-44">
                              Note Directe (sur {currentMaxScore})
                            </th>
                            <th className="py-2 px-3 text-center w-28">Points Coeff.</th>
                            <th className="py-2 px-3 text-left">Appréciation</th>
                            <th className="py-2 px-3 text-center w-24">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {classSubjects.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                                Aucune matière configurée pour cette classe. Ajoutez des matières dans le module Matières.
                              </td>
                            </tr>
                          ) : (
                            classSubjects.map((sub, index) => {
                              const score = scoresMap[sub.id];
                              const hasScore = score !== undefined && !isNaN(score);
                              const coef = (selectedClassObj?.customCoefficients && selectedClassObj.customCoefficients[sub.id] !== undefined)
                                ? selectedClassObj.customCoefficients[sub.id]
                                : (sub.coefficient || 1);
                              const points = hasScore ? (score * coef) : 0;
                              const { appreciation, badgeColor } = hasScore
                                ? getMaliScoreAppreciation(score, currentMaxScore)
                                : { appreciation: 'En attente de note', badgeColor: 'bg-slate-100 text-slate-400 border-slate-200' };

                              return (
                                <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2 px-3 sm:px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {index + 1}
                                      </span>
                                      <div>
                                        <div className="font-bold text-slate-900 text-xs">{sub.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">Code: {sub.code}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">
                                      Coef {coef}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={currentMaxScore}
                                        placeholder="—"
                                        disabled={!canEditGrades}
                                        value={hasScore ? score : ''}
                                        onChange={e => handleScoreChange(sub.id, e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            handleSaveStudentGrades(false);
                                          }
                                        }}
                                        className="w-24 text-center py-1 px-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-900 focus:ring-1 focus:ring-blue-900 disabled:opacity-60 disabled:cursor-not-allowed outline-none transition-all shadow-2xs placeholder:text-slate-300"
                                      />
                                      <span className="text-[11px] font-mono text-slate-400">/ {currentMaxScore}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-xs text-slate-800">
                                    {hasScore ? points.toFixed(2) : '—'}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                                      {appreciation}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {hasScore ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <Check className="w-3 h-3" />
                                        <span>Saisie</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Vide</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {classSubjects.length > 0 && (
                          <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-200 text-xs">
                            <tr>
                              <td className="py-2.5 px-3 sm:px-4 text-slate-900 uppercase text-[11px]">
                                Totaux & Moyenne Provisoire
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-900">
                                {studentMetrics.totalCoeffs} Coeffs
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {studentMetrics.enteredCount} / {studentMetrics.totalSubjects} notées
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-blue-900 text-xs">
                                {studentMetrics.totalPoints.toFixed(2)} pts
                              </td>
                              <td colSpan={2} className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600">Moyenne :</span>
                                  <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                                    {studentMetrics.enteredCount > 0 ? studentMetrics.average.toFixed(2) : '—'} / {currentMaxScore}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400 font-medium text-xs">
                    Aucun élève trouvé dans cette classe.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= SÉLECTION D'ÉLÈVES PAR MATIÈRE ================= */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Matière</span>
                    <select
                      value={selectedSubjectId}
                      onChange={e => setSelectedSubjectId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer max-w-[220px]"
                    >
                      {classSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} (Coef {sub.coefficient})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Rechercher un élève à noter..."
                      className="w-full pl-8 pr-7 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-700"
                    />
                    {studentSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchStudentIds(filteredStudents.map(s => s.id))}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBatchStudentIds([]);
                      setBatchOnlySelected(false);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Tout décocher
                  </button>
                  {selectedBatchStudentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBatchOnlySelected(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                        batchOnlySelected
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      Uniquement sélectionnés ({selectedBatchStudentIds.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">Choix</th>
                      <th className="py-2 px-3">Élève & Matricule</th>
                      <th className="py-2 px-3 text-center w-48">Note / {currentMaxScore}</th>
                      <th className="py-2 px-3">Appréciation</th>
                      <th className="py-2 px-3 text-center w-28">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStudents
                      .filter(std => !batchOnlySelected || selectedBatchStudentIds.includes(std.id))
                      .map((std, idx) => {
                        const isChecked = selectedBatchStudentIds.includes(std.id);
                        const score = batchScoresMap[std.id];
                        const hasScore = score !== undefined && !isNaN(score);
                        const { appreciation, badgeColor } = hasScore
                          ? getMaliScoreAppreciation(score, currentMaxScore)
                          : { appreciation: 'En attente de note', badgeColor: 'bg-slate-100 text-slate-400 border-slate-200' };

                        return (
                          <tr
                            key={std.id}
                            className={`transition-colors ${isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectBatchStudent(std.id)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-900 cursor-pointer"
                              />
                            </td>
                            <td
                              className="py-2 px-3 cursor-pointer"
                              onClick={() => toggleSelectBatchStudent(std.id)}
                            >
                              <div className="font-bold text-slate-900">
                                {idx + 1}. {std.lastName.toUpperCase()} {std.firstName}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{std.matricule}</div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={currentMaxScore}
                                  placeholder="—"
                                  disabled={!canEditGrades}
                                  value={hasScore ? score : ''}
                                  onChange={e => handleBatchStudentScoreChange(std.id, e.target.value)}
                                  className="w-24 text-center py-1 px-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-900 focus:ring-1 focus:ring-blue-900 disabled:opacity-60 disabled:cursor-not-allowed outline-none placeholder:text-slate-300"
                                />
                                <span className="text-[11px] font-mono text-slate-400">/ {currentMaxScore}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                                {appreciation}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {hasScore ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  <span>Saisie</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Vide</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= ONGLET HISTORIQUE DES NOTES ================= */
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-bold text-slate-800">
              Historique des notes ({currentGradesList.length}) • {selectedClassObj?.name}
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/75 font-bold text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Élève & Matricule</th>
                <th className="py-2.5 px-3">Matière</th>
                <th className="py-2.5 px-2.5 text-center">Type</th>
                <th className="py-2.5 px-3 text-center">Note / Barème</th>
                <th className="py-2.5 px-3">Appréciation</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
              {currentGradesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Aucune note enregistrée pour ces critères.
                  </td>
                </tr>
              ) : (
                currentGradesList.map((g) => {
                  const std = students.find(s => s.id === g.studentId);
                  const sub = subjects.find(s => s.id === g.subjectId);
                  const gMaxScore = g.maxScore || currentMaxScore;
                  const { appreciation, badgeColor } = getMaliScoreAppreciation(g.score, gMaxScore);

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-4 font-bold text-slate-900">
                        {std ? `${std.lastName.toUpperCase()} ${std.firstName}` : 'Inconnu'}
                        <span className="block text-[10px] font-mono font-normal text-slate-400">
                          {std?.matricule}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {sub?.name || 'Matière'}
                        <span className="text-[10px] text-slate-400 ml-1">
                          (Coef {g.coefficient})
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                        {g.type}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-xs text-slate-900">
                        {g.score.toFixed(2)} / {gMaxScore}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                          {appreciation}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                        {new Date(g.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {canEditGrades && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingGrade(g)}
                              className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Modifier cette note"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingGradeId(g.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Supprimer cette note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
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
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-xl border border-slate-200/80 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Modifier la Note</h2>

            <form onSubmit={handleUpdateSingleGrade} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type d'Évaluation</label>
                <select
                  value={editingGrade.type}
                  onChange={e => setEditingGrade({ ...editingGrade, type: e.target.value as EvaluationType })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
                >
                  <option value="COMPOSITION">Composition</option>
                  <option value="DEVOIR">Devoir</option>
                  <option value="INTERROGATION">Interrogation</option>
                  <option value="EXAMEN">Examen Blanc</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Commentaire / Observation</label>
                <input
                  type="text"
                  value={editingGrade.comment || ''}
                  onChange={e => setEditingGrade({ ...editingGrade, comment: e.target.value })}
                  placeholder="Ex: Travail soigné, très bon travail"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-800 focus:bg-white"
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
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200/80 space-y-4 text-center">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Supprimer cette note ?</h2>
              <p className="text-xs text-slate-500 mt-1">Cette note sera retirée du calcul du bulletin trimestriel de l'élève.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGradeId(null)}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGradeConfirm(deletingGradeId)}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-2xs transition-all"
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
