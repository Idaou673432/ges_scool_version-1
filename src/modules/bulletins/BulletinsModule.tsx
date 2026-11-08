/**
 * SomaSikolo - Bulletins de Notes Officiels (Mali) Module
 * Saisie directe des notes dans le bulletin & Impression directe A4 / PDF
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText,
  Printer, 
  CheckCircle2, 
  Search, 
  BookOpen, 
  X, 
  FileSpreadsheet, 
  Edit3, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { ReportCard, StudentSubjectAverage, EvaluationGrade, EvaluationTerm } from '../../types';
import { PdfService } from '../../services/pdfService';
import { getMaliScoreAppreciation, getTermLabel, getMaliEvaluationTerms } from '../../constants/maliEducation';

export const BulletinsModule: React.FC = () => {
  const { students, classes, subjects, grades, saveGrade, generateReportCard, settings } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedTerm, setSelectedTerm] = useState<EvaluationTerm>('TRIMESTRE_1');
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studentSortMode, setStudentSortMode] = useState<'RANK' | 'ALPHA'>('RANK');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isPrintAllMode, setIsPrintAllMode] = useState<boolean>(false);
  const [teacherComments, setTeacherComments] = useState<Record<string, string>>({});
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchSubjectId, setBatchSubjectId] = useState<string>('');

  // Active class & active student list
  const currentClass = classes.find(c => c.id === selectedClassId);

  const totalClassStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');
  }, [students, selectedClassId]);

  const classStudents = useMemo(() => {
    const filtered = totalClassStudents.filter(s => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName =
          s.lastName.toLowerCase().includes(q) ||
          s.firstName.toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q);
        if (!matchesName) return false;
      }
      return true;
    });

    if (studentSortMode === 'ALPHA') {
      return [...filtered].sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr'));
    }

    // Default: Tri du 1er au dernier selon le rang officiel et la moyenne
    return [...filtered].sort((a, b) => {
      const cardA = generateReportCard(a.id, selectedTerm);
      const cardB = generateReportCard(b.id, selectedTerm);
      const rankA = cardA ? cardA.rankInClass : 999;
      const rankB = cardB ? cardB.rankInClass : 999;
      if (rankA !== rankB) return rankA - rankB;
      const avgA = cardA ? cardA.generalAverage : 0;
      const avgB = cardB ? cardB.generalAverage : 0;
      return avgB - avgA;
    });
  }, [totalClassStudents, searchQuery, selectedTerm, generateReportCard, studentSortMode, grades]);

  // Ensure an active student is selected
  const activeStudent = useMemo(() => {
    return classStudents.find(s => s.id === activeStudentId) || classStudents[0] || null;
  }, [classStudents, activeStudentId]);

  // Track active student index for sequential grading (Élève précédent / Élève suivant)
  const activeStudentIndex = useMemo(() => {
    if (!activeStudent) return -1;
    return classStudents.findIndex(s => s.id === activeStudent.id);
  }, [classStudents, activeStudent]);

  const hasPrevStudent = activeStudentIndex > 0;
  const hasNextStudent = activeStudentIndex >= 0 && activeStudentIndex < classStudents.length - 1;

  const handlePrevStudent = () => {
    if (hasPrevStudent) {
      setActiveStudentId(classStudents[activeStudentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (hasNextStudent) {
      setActiveStudentId(classStudents[activeStudentIndex + 1].id);
    }
  };

  // Dynamic report card calculation for active student
  const activeReportCard: ReportCard | null = useMemo(() => {
    if (!activeStudent) return null;
    return generateReportCard(activeStudent.id, selectedTerm);
  }, [activeStudent, selectedTerm, generateReportCard, grades]);

  // All report cards for the class (used for bulk printing/download)
  // Strictement triés du 1er au dernier élève de la classe selon le rang officiel et la moyenne
  const allClassReportCards: ReportCard[] = useMemo(() => {
    const activeClassStudents = students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');
    const cards = activeClassStudents
      .map(s => generateReportCard(s.id, selectedTerm))
      .filter((r): r is ReportCard => r !== null);

    return cards.sort((a, b) => {
      if (a.rankInClass !== b.rankInClass) {
        return a.rankInClass - b.rankInClass;
      }
      return b.generalAverage - a.generalAverage;
    });
  }, [students, selectedClassId, selectedTerm, generateReportCard, grades]);

  // Direct grade update logic right inside bulletin
  const handleClassScoreChange = (subjectId: string, val: string) => {
    if (!activeStudent) return;
    const isFirstCycle = currentClass?.category === 'FONDAMENTAL_1';
    const maxScore = isFirstCycle ? 10 : 20;

    let scoreNum = parseFloat(val);
    if (isNaN(scoreNum)) scoreNum = 0;
    scoreNum = Math.min(maxScore, Math.max(0, scoreNum));

    const classGrades = grades.filter(
      g => g.studentId === activeStudent.id && g.subjectId === subjectId && g.term === selectedTerm && g.type !== 'COMPOSITION' && g.type !== 'EXAMEN'
    );

    const subjectObj = subjects.find(sub => sub.id === subjectId);
    const coef = subjectObj ? subjectObj.coefficient : 1;

    if (classGrades.length > 0) {
      saveGrade({
        ...classGrades[0],
        score: scoreNum,
        maxScore,
        coefficient: coef
      });
    } else {
      saveGrade({
        studentId: activeStudent.id,
        classId: activeStudent.classId,
        subjectId,
        term: selectedTerm,
        academicYear: settings.currentAcademicYear,
        type: 'DEVOIR',
        score: scoreNum,
        maxScore,
        coefficient: coef,
        date: new Date().toISOString().split('T')[0]
      });
    }

    setSavedNotice(`Note de classe enregistrée : ${scoreNum}/${maxScore}`);
    setTimeout(() => setSavedNotice(null), 1800);
  };

  const handleCompositionScoreChange = (subjectId: string, val: string) => {
    if (!activeStudent) return;
    const isFirstCycle = currentClass?.category === 'FONDAMENTAL_1';
    const maxCompScore = isFirstCycle ? 10 : 40;

    let scoreNum = parseFloat(val);
    if (isNaN(scoreNum)) scoreNum = 0;
    scoreNum = Math.min(maxCompScore, Math.max(0, scoreNum));

    const compGrades = grades.filter(
      g => g.studentId === activeStudent.id && g.subjectId === subjectId && g.term === selectedTerm && (g.type === 'COMPOSITION' || g.type === 'EXAMEN')
    );

    const subjectObj = subjects.find(sub => sub.id === subjectId);
    const coef = subjectObj ? subjectObj.coefficient : 1;

    if (compGrades.length > 0) {
      saveGrade({
        ...compGrades[0],
        score: scoreNum,
        maxScore: maxCompScore,
        coefficient: coef
      });
    } else {
      saveGrade({
        studentId: activeStudent.id,
        classId: activeStudent.classId,
        subjectId,
        term: selectedTerm,
        academicYear: settings.currentAcademicYear,
        type: 'COMPOSITION',
        score: scoreNum,
        maxScore: maxCompScore,
        coefficient: coef,
        date: new Date().toISOString().split('T')[0]
      });
    }

    setSavedNotice(`Note de composition enregistrée : ${scoreNum}/${maxCompScore}`);
    setTimeout(() => setSavedNotice(null), 1800);
  };

  // Direct comment update
  const handleCommentChange = (studentId: string, comment: string) => {
    const key = `${studentId}_${selectedTerm}`;
    setTeacherComments(prev => ({ ...prev, [key]: comment }));
  };

  const getCommentForStudent = (studentId: string): string => {
    const key = `${studentId}_${selectedTerm}`;
    if (teacherComments[key] !== undefined) return teacherComments[key];
    if (activeReportCard && activeReportCard.studentId === studentId) {
      return activeReportCard.principalTeacherComment;
    }
    return 'Travail satisfaisant, continuez les efforts.';
  };

  // Browser print handlers with Popup fallback & iFrame support
  const handlePrintSingle = () => {
    setIsPrintAllMode(false);
    setTimeout(() => {
      triggerPrint(false);
    }, 150);
  };

  const handlePrintClass = () => {
    setIsPrintAllMode(true);
    setTimeout(() => {
      triggerPrint(true);
    }, 250);
  };

  const triggerPrint = (isAll: boolean) => {
    const container = document.getElementById('printable-bulletins-container');
    
    // Try opening clean print window first to bypass iframe clipping
    if (container && container.innerHTML.trim().length > 0) {
      try {
        const printWin = window.open('', '_blank', 'width=950,height=1100');
        if (printWin) {
          printWin.document.write(`
            <!DOCTYPE html>
            <html lang="fr">
              <head>
                <meta charset="utf-8">
                <title>${isAll ? 'Bulletins_de_Classe' : 'Bulletin_de_Notes'}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  @page { size: A4 portrait; margin: 6mm; }
                  body { background: #ffffff !important; color: #0f172a !important; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 0; }
                  .page-break { page-break-after: always !important; break-after: page !important; }
                </style>
              </head>
              <body>
                <div>${container.innerHTML}</div>
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.focus();
                      window.print();
                    }, 400);
                  };
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
          setTimeout(() => setIsPrintAllMode(false), 1200);
          return;
        }
      } catch (e) {
        console.warn('Popup print window blocked, falling back to direct window.print()', e);
      }
    }

    // Direct window.print() fallback
    window.print();
    setTimeout(() => setIsPrintAllMode(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (activeReportCard) {
      PdfService.generateReportCardPdf(activeReportCard, settings);
    }
  };

  const handleDownloadAllClassPdfs = async () => {
    if (allClassReportCards.length === 0) return;
    await PdfService.generateClassReportCardsPdf(
      allClassReportCards,
      settings,
      currentClass?.name || 'Classe'
    );
  };

  // CSV Export for administrative records
  const handleExportClassCsv = () => {
    if (allClassReportCards.length === 0) return;
    const headers = [
      'Matricule',
      'Nom & Prénoms',
      'Classe',
      'Trimestre',
      'Moyenne Générale',
      'Total Coeffs',
      'Total Points',
      'Rang',
      'Mention / Décision'
    ];

    const rows = allClassReportCards.map(c => [
      `"${c.studentMatricule || ''}"`,
      `"${c.studentName.replace(/"/g, '""')}"`,
      `"${c.className}"`,
      `"${c.term}"`,
      c.generalAverage.toFixed(2),
      c.totalCoefficients,
      c.totalPoints.toFixed(2),
      c.rankInClass,
      `"${(c.directorDecision || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Recapitulatif_Notes_${(currentClass?.name || 'Classe').replace(/\s+/g, '_')}_${selectedTerm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Class Level Performance Summary Metrics
  const classStats = useMemo(() => {
    if (allClassReportCards.length === 0) {
      return { total: 0, passing: 0, failing: 0, passRate: 0, avg: 0, maxAvg: 0, minAvg: 0 };
    }
    const total = allClassReportCards.length;
    let passing = 0;
    let sumAvg = 0;
    let maxAvg = 0;
    let minAvg = 999;

    allClassReportCards.forEach(card => {
      const passThreshold = (card.maxScore || 20) === 10 ? 5 : 10;
      if (card.generalAverage >= passThreshold) passing++;
      sumAvg += card.generalAverage;
      if (card.generalAverage > maxAvg) maxAvg = card.generalAverage;
      if (card.generalAverage < minAvg) minAvg = card.generalAverage;
    });

    return {
      total,
      passing,
      failing: total - passing,
      passRate: Math.round((passing / total) * 100),
      avg: sumAvg / total,
      maxAvg,
      minAvg: minAvg === 999 ? 0 : minAvg
    };
  }, [allClassReportCards]);

  const COMMENT_PRESETS = [
    "Très bon travail. Élève sérieux, assidu et appliqué.",
    "Résultats satisfaisants. Poursuivez vos efforts.",
    "Résultats encourageants mais travail irrégulier.",
    "Des capacités non pleinement exploitées.",
    "Travail insuffisant. Des efforts soutenus sont requis."
  ];

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* ----------------- SCREEN ONLY HEADER & CONTROLS (ULTRA COMPACT) ----------------- */}
      <div className="no-print space-y-2">
        {/* Saved Toast Notification */}
        {savedNotice && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{savedNotice} — Re-calcul automatique effectué.</span>
          </div>
        )}

        {/* Single Unified Ultra-Compact Header & Action Bar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: Title + Class & Period dropdowns + Inline Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <FileText className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Bulletins</span>
            </div>

            {/* Classe selector */}
            <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-2 py-1 transition-colors shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classe</span>
              <select
                value={selectedClassId}
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  setActiveStudentId('');
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentCount || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Période selector */}
            <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-2 py-1 transition-colors shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Période</span>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value as EvaluationTerm)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
              >
                <optgroup label="Évaluations Mensuelles">
                  {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                    .filter(t => t.category === 'EVALUATION_MENSUELLE')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </optgroup>
                <optgroup label="Trimestres">
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

            {/* Inline Stats (Compact) */}
            {classStats.total > 0 && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-[11px] text-slate-500 font-medium shrink-0">
                <span><strong className="text-slate-800">{classStats.total}</strong> élèves</span>
                <span className="text-slate-300">·</span>
                <span>Admis : <strong className="text-emerald-700">{classStats.passRate}%</strong></span>
                <span className="text-slate-300">·</span>
                <span>Moy : <strong className="text-slate-800 font-mono">{classStats.avg.toFixed(2)}/20</strong></span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowBatchModal(true);
                if (!batchSubjectId && subjects.length > 0) {
                  const classSubj = subjects.filter(s => !currentClass || s.classCategory === currentClass.category);
                  if (classSubj.length > 0) setBatchSubjectId(classSubj[0].id);
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Saisir rapidement les notes pour toute la classe"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Saisie</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSingle}
              disabled={!activeReportCard}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Imprimer le bulletin de l'élève affiché"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handlePrintClass}
              disabled={allClassReportCards.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Imprimer tous les bulletins de la classe"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Tout imprimer ({allClassReportCards.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportClassCsv}
              disabled={allClassReportCards.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Exporter les résultats en Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>

        {/* Main Interactive Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
          {/* Left: Student List Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-700 truncate">
                Élèves de la classe ({classStudents.length})
              </h2>
              <button
                type="button"
                onClick={() => setStudentSortMode(prev => prev === 'RANK' ? 'ALPHA' : 'RANK')}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Changer l'ordre de tri"
              >
                {studentSortMode === 'RANK' ? 'Tri : 1er au dernier' : 'Tri : A à Z'}
              </button>
            </div>

            {/* Quick Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou matricule..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Student list */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {classStudents.map(std => {
                const isSelected = activeStudent?.id === std.id;
                const card = generateReportCard(std.id, selectedTerm);
                const avg = card ? card.generalAverage : 0;
                const rank = card ? card.rankInClass : null;
                const cardMax = card?.maxScore || 20;
                const passThreshold = cardMax === 10 ? 5 : 10;

                return (
                  <button
                    key={std.id}
                    onClick={() => setActiveStudentId(std.id)}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-2xs font-bold'
                        : 'bg-slate-50/80 text-slate-800 border-slate-200/70 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Clean rank badge */}
                      <div className="shrink-0">
                        {rank === 1 ? (
                          <span className={`inline-flex items-center justify-center min-w-[24px] px-1 py-0.2 rounded font-bold text-[9px] ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            1er
                          </span>
                        ) : rank === 2 ? (
                          <span className={`inline-flex items-center justify-center min-w-[24px] px-1 py-0.2 rounded font-bold text-[9px] ${
                            isSelected ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-800 border border-slate-300'
                          }`}>
                            2e
                          </span>
                        ) : rank === 3 ? (
                          <span className={`inline-flex items-center justify-center min-w-[24px] px-1 py-0.2 rounded font-bold text-[9px] ${
                            isSelected ? 'bg-amber-800 text-amber-100' : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}>
                            3e
                          </span>
                        ) : rank !== null ? (
                          <span className={`inline-flex items-center justify-center min-w-[24px] px-1 py-0.2 rounded font-semibold text-[9px] ${
                            isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {rank}e
                          </span>
                        ) : null}
                      </div>

                      {std.photoUrl ? (
                        <img
                          src={std.photoUrl}
                          alt={std.firstName}
                          className="w-6 h-6 rounded-md object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-md font-bold flex items-center justify-center text-[9px] shrink-0 ${
                            isSelected ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-xs leading-tight">{std.lastName} {std.firstName}</p>
                        <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'} font-mono leading-tight`}>
                          {std.matricule}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-1.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                        isSelected ? 'bg-white/20 text-white' : avg >= passThreshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {avg.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}

              {classStudents.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xs text-slate-400 italic">Aucun élève trouvé pour cette recherche.</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-semibold text-slate-700 underline hover:text-slate-900 cursor-pointer"
                    >
                      Effacer la recherche
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive Bulletin Card View & Direct Grade Inputs */}
          <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-2xs">
            {!activeReportCard || !activeStudent ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12 space-y-2">
                <FileText className="w-10 h-10 text-slate-300 stroke-1" />
                <p className="font-medium">Sélectionnez un élève dans la liste à gauche pour saisir ses notes et afficher son bulletin.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Barre Unifiée Ultra-Compacte : Navigation & En-tête de Bulletin */}
                <div className="bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-800 shadow-2xs space-y-1.5 text-xs">
                  {/* Ligne 1 : Stepper Navigation + Identité Élève + Moyenne & Rang */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Stepper rapide */}
                      <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700/80 shrink-0">
                        <button
                          type="button"
                          onClick={handlePrevStudent}
                          disabled={!hasPrevStudent}
                          className="p-1 rounded-md hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                          title="Élève précédent"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-slate-300 px-1.5">
                          {activeStudentIndex + 1}/{classStudents.length}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextStudent}
                          disabled={!hasNextStudent}
                          className="p-1 rounded-md hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                          title="Élève suivant"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Identité Élève */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <h2 className="font-bold text-white text-xs sm:text-sm tracking-wide truncate">
                            {activeReportCard.studentName}
                          </h2>
                          <span className="text-[10px] text-amber-300 font-mono shrink-0">
                            ({activeReportCard.className})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                          Matricule : {activeReportCard.studentMatricule || '---'}
                        </span>
                      </div>
                    </div>

                    {/* Moyenne & Rang */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-sm sm:text-base font-bold font-mono text-amber-300">
                            {activeReportCard.generalAverage.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">/ {activeReportCard.maxScore || 20}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 block leading-tight">
                          Rang : {activeReportCard.rankInClass}{activeReportCard.rankInClass === 1 ? 'er' : 'e'} / {activeReportCard.totalClassStudents}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ligne 2 : Ruban de Métriques & Formule en 1 ligne */}
                  <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Points : <strong className="text-white font-mono">{activeReportCard.totalPoints.toFixed(2)}</strong></span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>Coefs : <strong className="text-white font-mono">{activeReportCard.totalCoefficients}</strong></span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>Moy. Classe : <strong className="text-white font-mono">{activeReportCard.classOverallAverage.toFixed(2)}</strong></span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>Mention : <strong className="text-emerald-400">{activeReportCard.directorDecision}</strong></span>
                    </div>

                    <span className="text-[9px] text-slate-400 italic">
                      {activeReportCard.maxScore === 10
                        ? 'Formule : (N.Classe + Compos) / 2'
                        : 'Formule : (N.Classe + Compos) / 3'}
                    </span>
                  </div>
                </div>

                {/* Interactive Grade Table with Direct Input */}
                <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 font-bold text-[10px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Matières</th>
                          <th className="py-3 px-2 text-center w-32">
                            N.Classe /{activeReportCard.maxScore === 10 ? 10 : 20}
                          </th>
                          <th className="py-3 px-2 text-center w-32">
                            Compos /{activeReportCard.maxScore === 10 ? 10 : 40}
                          </th>
                          <th className="py-3 px-2 text-center w-28">Moyenne /{activeReportCard.maxScore}</th>
                          <th className="py-3 px-2 text-center w-16">Coeff.</th>
                          <th className="py-3 px-2 text-center w-24">Moy. Coeff</th>
                          <th className="py-3 px-4">Appréciations</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-bold text-slate-800 divide-y divide-slate-100 bg-white">
                        {activeReportCard.subjectAverages.map((s) => {
                          const sMaxScore = s.maxScore || activeReportCard.maxScore || 20;
                          const { appreciation, badgeColor } = getMaliScoreAppreciation(s.finalScore, sMaxScore);
                          const classScoreVal = s.classScore !== undefined ? s.classScore : s.finalScore;
                          const compScoreVal = s.compositionScore !== undefined ? s.compositionScore : (activeReportCard.maxScore === 10 ? s.finalScore : s.finalScore * 2);

                          return (
                            <tr key={s.subjectId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-black text-slate-900">{s.subjectName}</p>
                                <p className="text-[10px] font-mono text-slate-400">{s.subjectCode}</p>
                              </td>

                              {/* Direct Note de classe input */}
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={activeReportCard.maxScore === 10 ? 10 : 20}
                                  value={classScoreVal.toString()}
                                  onChange={e => handleClassScoreChange(s.subjectId, e.target.value)}
                                  className="w-20 py-1 px-2 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-lg outline-none transition-all"
                                  title="Note de classe / devoirs"
                                />
                              </td>

                              {/* Direct Note de composition input */}
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={activeReportCard.maxScore === 10 ? 10 : 40}
                                  value={compScoreVal.toString()}
                                  onChange={e => handleCompositionScoreChange(s.subjectId, e.target.value)}
                                  className="w-20 py-1 px-2 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-lg outline-none transition-all"
                                  title="Note de composition"
                                />
                              </td>

                              {/* Calculated Moyenne Matière */}
                              <td className="py-2 px-2 text-center">
                                <span className="font-mono font-bold text-xs text-slate-900">
                                  {s.finalScore.toFixed(2)}
                                </span>
                              </td>

                              <td className="py-2.5 px-2 text-center font-semibold text-slate-600">
                                {s.coefficient}
                              </td>

                              <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                                {s.weightedScore.toFixed(2)}
                              </td>

                              <td className="py-2.5 px-4">
                                <span className="text-xs font-medium text-slate-700">
                                  {appreciation}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                {/* Editable Teacher Observation & Conseil de Classe */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Appréciation générale du Conseil de Classe
                  </label>

                  <textarea
                    rows={2}
                    value={getCommentForStudent(activeStudent.id)}
                    onChange={e => handleCommentChange(activeStudent.id, e.target.value)}
                    placeholder="Saisissez l'observation du conseil..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
                  />

                  {/* Preset Quick suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="text-[11px] text-slate-400 font-medium">Suggestions :</span>
                    {COMMENT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCommentChange(activeStudent.id, preset)}
                        className="text-[11px] px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                      >
                        {preset.split('.')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- SAISIE PAR ÉLÈVE AVEC TOUTES LES MATIÈRES AFFICHÉES VERTICALEMENT ----------------- */}
      {showBatchModal && activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide">Saisie des Notes par Élève</h2>
                  <p className="text-[10px] text-slate-400">
                    {currentClass?.name || 'Classe'} • {getTermLabel(selectedTerm, settings.evaluationMonths)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
              {/* Student Selector & Navigation (Par Personne) */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                    Élève :
                  </span>
                  <select
                    value={activeStudent.id}
                    onChange={e => setActiveStudentId(e.target.value)}
                    className="py-1 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-slate-800 cursor-pointer flex-1 max-w-sm truncate"
                  >
                    {classStudents.map((std, idx) => (
                      <option key={std.id} value={std.id}>
                        {idx + 1}. {std.lastName.toUpperCase()} {std.firstName} ({std.matricule})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrevStudent}
                      disabled={!hasPrevStudent}
                      className={`p-1 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                        hasPrevStudent 
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                          : 'opacity-40 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Précédent</span>
                    </button>

                    <span className="text-[11px] font-mono font-bold text-slate-500 px-1">
                      {activeStudentIndex + 1} / {classStudents.length}
                    </span>

                    <button
                      type="button"
                      onClick={handleNextStudent}
                      disabled={!hasNextStudent}
                      className={`p-1 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                        hasNextStudent 
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                          : 'opacity-40 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <span className="hidden sm:inline">Suivant</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Live Student Performance */}
                {activeReportCard && (
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 text-[11px]">
                    <span className="text-slate-500">Moyenne :</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {activeReportCard.generalAverage.toFixed(2)} / {activeReportCard.maxScore || 20}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-600">
                      Rang : <strong>{activeReportCard.rankInClass}e</strong> / {allClassReportCards.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Table Vertical des Matières pour cet Élève */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-[10px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Matière du Programme (Vertical)</th>
                      <th className="py-2 px-2 text-center w-20">Coef</th>
                      <th className="py-2 px-2 text-center w-28">
                        N.Classe /{(currentClass?.category === 'FONDAMENTAL_1') ? 10 : 20}
                      </th>
                      <th className="py-2 px-2 text-center w-28">
                        Compos /{(currentClass?.category === 'FONDAMENTAL_1') ? 10 : 40}
                      </th>
                      <th className="py-2 px-2 text-center w-24">Moyenne</th>
                      <th className="py-2 px-3 text-center">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium text-slate-800 divide-y divide-slate-100 bg-white">
                    {subjects
                      .filter(s => !currentClass || s.classCategory === currentClass.category)
                      .map((sub, idx) => {
                        const subjAvg = activeReportCard?.subjectAverages.find(sa => sa.subjectId === sub.id);
                        const isFirstCycle = currentClass?.category === 'FONDAMENTAL_1';
                        const maxScore = isFirstCycle ? 10 : 20;
                        const maxComp = isFirstCycle ? 10 : 40;

                        const classScoreVal = subjAvg?.classScore !== undefined ? subjAvg.classScore : (subjAvg?.finalScore || 0);
                        const compScoreVal = subjAvg?.compositionScore !== undefined ? subjAvg.compositionScore : (maxScore === 10 ? (subjAvg?.finalScore || 0) : ((subjAvg?.finalScore || 0) * 2));
                        const finalVal = subjAvg?.finalScore || 0;
                        const { appreciation, badgeColor } = getMaliScoreAppreciation(finalVal, maxScore);

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 text-xs">{sub.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1">({sub.code})</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                Coef {sub.coefficient}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-center">
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={maxScore}
                                value={classScoreVal || ''}
                                placeholder="0.00"
                                onChange={e => handleClassScoreChange(sub.id, e.target.value)}
                                className="w-20 py-1 px-1.5 text-center font-mono font-bold text-xs text-amber-950 bg-amber-50 border border-amber-300 focus:border-amber-600 focus:bg-white rounded-lg outline-none transition-all shadow-2xs"
                              />
                            </td>
                            <td className="py-1 px-2 text-center">
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={maxComp}
                                value={compScoreVal || ''}
                                placeholder="0.00"
                                onChange={e => handleCompositionScoreChange(sub.id, e.target.value)}
                                className="w-20 py-1 px-1.5 text-center font-mono font-bold text-xs text-purple-950 bg-purple-50 border border-purple-300 focus:border-purple-600 focus:bg-white rounded-lg outline-none transition-all shadow-2xs"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-blue-900 bg-blue-50/50">
                              {finalVal.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${badgeColor}`}>
                                {appreciation}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>

                  {/* Footer Total */}
                  {activeReportCard && (
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                      <tr>
                        <td colSpan={2} className="py-2 px-3 uppercase text-[10px] text-slate-600">
                          Bilan Général de l'Élève
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {activeReportCard.totalCoefficients} Coefs
                        </td>
                        <td colSpan={2} className="py-2 px-2 text-center font-mono text-slate-700">
                          Total Points : {activeReportCard.totalPoints.toFixed(2)} pts
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-sm text-blue-900 bg-blue-100/70">
                          {activeReportCard.generalAverage.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-bold text-slate-800">
                            {activeReportCard.directorDecision}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="text-[11px] text-slate-500 italic">
                Saisie directe des notes : les moyennes et rangs sont recalculés automatiquement.
              </p>
              <div className="flex items-center gap-2">
                {hasNextStudent && (
                  <button
                    type="button"
                    onClick={handleNextStudent}
                    className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <span>Élève Suivant</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- OFFICIAL PRINTABLE DOCUMENT (1 BULLETIN PER STUDENT - PORTRAIT A4) ----------------- */}
      <div className="print-only" id="printable-bulletins-container">
        {isPrintAllMode ? (
          /* Bulk print all class bulletins: strictly ordered 1er to last, 1 student per page, zero repetition */
          <div>
            {allClassReportCards.map((rc, idx) => (
              <div
                key={rc.studentId}
                className={`w-[190mm] h-[270mm] max-h-[275mm] mx-auto p-1 bg-white flex flex-col justify-between ${
                  idx < allClassReportCards.length - 1 ? 'page-break' : ''
                }`}
              >
                <PrintableBulletin
                  report={rc}
                  settings={settings}
                  comment={getCommentForStudent(rc.studentId)}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Single printable bulletin: exactly 1 student, 1 page, zero repetition */
          activeReportCard && (
            <div className="w-[190mm] h-[270mm] max-h-[275mm] mx-auto p-1 bg-white flex flex-col justify-between">
              <PrintableBulletin
                report={activeReportCard}
                settings={settings}
                comment={getCommentForStudent(activeReportCard.studentId)}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PRINTABLE BULLETIN COMPONENT (EXACT FORMAT MATCHING OFFICIAL MALI BULLETIN) */
/* -------------------------------------------------------------------------- */

interface PrintableBulletinProps {
  report: ReportCard;
  settings: any;
  comment: string;
}

const PrintableBulletin: React.FC<PrintableBulletinProps> = ({ report, settings, comment }) => {
  const termFormatted = getTermLabel(report.term, settings?.evaluationMonths);
  const maxScore = report.maxScore || 20;

  return (
    <div className="w-full bg-white text-slate-900 font-sans text-[9px] leading-tight p-3 border-2 border-slate-900 flex flex-col justify-between h-full box-border">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="text-center space-y-1 border-b-2 border-slate-900 pb-2">
        <p className="font-bold uppercase text-[9.5px] tracking-tight">
          {settings.academyName || "ACADEMIE D'ENSEIGNEMENT BAMAKO RIVE DROITE"} {settings.capName ? `CAP DE ${settings.capName}` : "CAP DE FALADIE"} {settings.schoolName || "ECOLE PRIVEE LE BIRGO NIAMAKORO"}
        </p>
        <p className="font-bold text-[9px] text-slate-700">
          TEL: {settings.phone || '76041281 / 75167282'}
        </p>
        <h1 className="font-black text-sm uppercase tracking-widest mt-1 underline">
          BULLETIN DE NOTES
        </h1>
      </div>

      {/* 2. TOP 3-BOX GRID */}
      <div className="grid grid-cols-12 gap-1.5 my-1.5 text-[9px]">
        {/* Left Box */}
        <div className="col-span-5 border border-slate-900 p-2 flex flex-col justify-center space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">ELEVE :</span>
            <span className="font-black uppercase text-[10.5px] text-slate-900 truncate">{report.studentName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">N° Mle :</span>
            <span className="font-mono font-bold text-slate-900">{report.studentMatricule || '---'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">CLASSE :</span>
            <span className="font-black text-slate-900 uppercase">{report.className}</span>
          </div>
        </div>

        {/* Center Box: Large Class Badge */}
        <div className="col-span-3 border border-slate-900 p-1.5 flex items-center justify-center text-center bg-slate-50 relative overflow-hidden">
          <div className="border border-slate-300 p-1.5 w-full h-full flex items-center justify-center">
            <span className="font-black text-lg uppercase tracking-tight text-slate-900">{report.className}</span>
          </div>
        </div>

        {/* Right Box */}
        <div className="col-span-4 border border-slate-900 p-2 flex flex-col justify-center space-y-1 text-right">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700">Année scolaire :</span>
            <span className="font-bold text-slate-900">{report.academicYear}</span>
          </div>
          <div className="font-black uppercase text-blue-950 text-[10px] text-center border-y border-slate-300 py-0.5 my-0.5">
            {termFormatted}
          </div>
          <div className="flex justify-between items-center text-[8.5px]">
            <span className="font-bold text-slate-700">Effectif Classe :</span>
            <span className="font-black text-slate-900">{report.totalClassStudents} élèves</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN GRADES TABLE */}
      <div className="flex-1 my-1">
        <table className="w-full border-collapse border border-slate-900 text-center text-[8.5px]">
          <thead>
            <tr className="bg-slate-100 font-black text-[8px] uppercase tracking-tight text-slate-900 border-b border-slate-900">
              <th className="border-r border-slate-900 p-1 text-left w-[32%]">MATIERES</th>
              <th className="border-r border-slate-900 p-1 w-[8%]">COEF</th>
              <th className="border-r border-slate-900 p-1 w-[15%]">
                {maxScore === 10 ? 'N.CLASSE /10' : 'NOTES CLASSE /20'}
              </th>
              <th className="border-r border-slate-900 p-1 w-[15%]">
                {maxScore === 10 ? 'COMPOS /10' : 'NOTE COMP /40'}
              </th>
              <th className="border-r border-slate-900 p-1 w-[10%]">MOY GEN</th>
              <th className="border-r border-slate-900 p-1 w-[10%]">NOTES COEF</th>
              <th className="p-1 text-left w-[10%]">APPRECIATIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 font-semibold text-slate-900">
            {report.subjectAverages.map((sub) => {
              const classVal = sub.classScore !== undefined ? sub.classScore : sub.finalScore;
              const compVal = sub.compositionScore !== undefined ? sub.compositionScore : (maxScore === 10 ? sub.finalScore : sub.finalScore * 2);
              const { appreciation } = getMaliScoreAppreciation(sub.finalScore, maxScore);

              return (
                <tr key={sub.subjectId} className="h-5">
                  <td className="border-r border-slate-900 px-1.5 py-1 text-left font-bold uppercase truncate max-w-[130px]">
                    {sub.subjectName}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-1 font-bold">
                    {sub.coefficient}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-1 font-mono">
                    {classVal.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-1 font-mono">
                    {compVal.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-1 font-mono font-black">
                    {sub.finalScore.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-1 font-mono font-bold">
                    {sub.weightedScore.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-1.5 py-1 text-left text-[8px] font-bold uppercase truncate">
                    {sub.appreciation || appreciation.toUpperCase()}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL COEFFICIENTS ROW */}
            <tr className="border-t border-slate-900 font-black h-5">
              <td className="border-r border-slate-900 px-1.5 py-1 text-left uppercase text-[8px]">
                TOTAL DES COEFFICIENTS
              </td>
              <td className="border-r border-slate-900 px-1 py-1 font-black text-center">
                {report.totalCoefficients}
              </td>
              <td className="border-r border-slate-900" colSpan={5}></td>
            </tr>

            {/* TOTAL NOTES COEFFICIEES ROW */}
            <tr className="border-t border-slate-900 font-black h-5">
              <td className="border-r border-slate-900 px-1.5 py-1 text-left uppercase text-[8px]" colSpan={5}>
                TOTAL DES NOTES COEFFICIEES
              </td>
              <td className="border-r border-slate-900 px-1 py-1 font-mono font-black text-center">
                {report.totalPoints.toFixed(2).replace('.', ',')}
              </td>
              <td className="px-1 py-1"></td>
            </tr>

            {/* MOYENNE & RANG ROW */}
            <tr className="border-t-2 border-slate-900 font-black bg-slate-50 h-7">
              <td className="border-r border-slate-900 px-2 py-1.5 text-left uppercase" colSpan={3}>
                MOYENNE DE L'ELEVE : <span className="font-mono text-[11px] ml-1">{report.generalAverage.toFixed(2).replace('.', ',')}</span>
              </td>
              <td className="border-r border-slate-900 px-2 py-1.5 text-center uppercase" colSpan={4}>
                RANG : <span className="font-mono text-[11px] ml-1">{report.rankInClass} / {report.totalClassStudents}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM APPRECIATION & SIGNATURE BLOCK */}
      <div className="border border-slate-900 p-2.5 space-y-1.5 my-1 text-[8.5px]">
        <div className="flex items-baseline justify-between border-b border-dashed border-slate-400 pb-1">
          <span className="font-bold text-slate-800 uppercase">Appréciation du Directeur :</span>
          <span className="font-black text-[9.5px] uppercase tracking-wider text-slate-900">
            {comment || (report.generalAverage >= 14 ? 'BIEN - FELICITATIONS' : report.generalAverage >= 10 ? 'PASSABLE - SATISFAISANT' : report.generalAverage >= 8 ? 'INSUFFISANT' : 'MEDIOCRE')}
          </span>
        </div>

        <div className="flex justify-between items-end pt-1 font-bold">
          <div>
            <span>{settings.city || 'Bamako'} le </span>
            <span className="font-mono">..../..../{new Date().getFullYear()}</span>
          </div>
          <div className="text-right pr-3 relative">
            <span className="uppercase text-[9px] font-black block">Le Directeur</span>
            {settings.stampUrl ? (
              <img src={settings.stampUrl} alt="Cachet et Signature" className="h-10 max-w-[90px] object-contain ml-auto my-0.5" />
            ) : (
              <div className="h-7"></div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
