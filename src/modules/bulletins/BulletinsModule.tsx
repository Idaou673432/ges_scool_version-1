/**
 * SomaSikolo - Bulletins de Notes Officiels (Mali) Module
 * Saisie directe des notes dans le bulletin & Impression directe A4 / PDF
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Eye, 
  Award, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  Save, 
  BookOpen, 
  Users, 
  TrendingUp, 
  UserCheck, 
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  X,
  Filter,
  FileSpreadsheet,
  Edit3
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
  const [scoreFilter, setScoreFilter] = useState<'ALL' | 'PASSING' | 'FAILING'>('ALL');
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
    return totalClassStudents.filter(s => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName =
          s.lastName.toLowerCase().includes(q) ||
          s.firstName.toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      // Score status filter
      if (scoreFilter !== 'ALL') {
        const card = generateReportCard(s.id, selectedTerm);
        if (card) {
          const passThreshold = card.maxScore === 10 ? 5 : 10;
          if (scoreFilter === 'PASSING' && card.generalAverage < passThreshold) return false;
          if (scoreFilter === 'FAILING' && card.generalAverage >= passThreshold) return false;
        }
      }

      return true;
    });
  }, [totalClassStudents, searchQuery, scoreFilter, selectedTerm, generateReportCard]);

  // Ensure an active student is selected
  const activeStudent = useMemo(() => {
    return classStudents.find(s => s.id === activeStudentId) || classStudents[0] || null;
  }, [classStudents, activeStudentId]);

  // Dynamic report card calculation for active student
  const activeReportCard: ReportCard | null = useMemo(() => {
    if (!activeStudent) return null;
    return generateReportCard(activeStudent.id, selectedTerm);
  }, [activeStudent, selectedTerm, generateReportCard, grades]);

  // All report cards for the class (used for bulk printing/download)
  const allClassReportCards: ReportCard[] = useMemo(() => {
    const activeClassStudents = students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');
    return activeClassStudents
      .map(s => generateReportCard(s.id, selectedTerm))
      .filter((r): r is ReportCard => r !== null);
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

    setSavedNotice(`Note de classe mise à jour : ${scoreNum}/${maxScore}`);
    setTimeout(() => setSavedNotice(null), 2000);
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

    setSavedNotice(`Note de composition mise à jour : ${scoreNum}/${maxCompScore}`);
    setTimeout(() => setSavedNotice(null), 2000);
  };

  const handleDirectGradeChange = (subjectId: string, val: string) => {
    if (!activeStudent) return;
    const isFirstCycle = currentClass?.category === 'FONDAMENTAL_1';
    const maxScore = isFirstCycle ? 10 : 20;

    let scoreNum = parseFloat(val);
    if (isNaN(scoreNum)) scoreNum = 0;
    scoreNum = Math.min(maxScore, Math.max(0, scoreNum));

    const subjectObj = subjects.find(sub => sub.id === subjectId);
    const coef = subjectObj ? subjectObj.coefficient : 1;

    const classGrades = grades.filter(
      g => g.studentId === activeStudent.id && g.subjectId === subjectId && g.term === selectedTerm && g.type !== 'COMPOSITION' && g.type !== 'EXAMEN'
    );
    const existingClassScore = classGrades.length > 0 ? classGrades[0].score : scoreNum;

    const maxCompScore = isFirstCycle ? 10 : 40;
    let neededCompScore = isFirstCycle ? ((scoreNum * 2) - existingClassScore) : ((scoreNum * 3) - existingClassScore);
    neededCompScore = Math.min(maxCompScore, Math.max(0, neededCompScore));

    const compGrades = grades.filter(
      g => g.studentId === activeStudent.id && g.subjectId === subjectId && g.term === selectedTerm && (g.type === 'COMPOSITION' || g.type === 'EXAMEN')
    );

    if (compGrades.length > 0) {
      saveGrade({
        ...compGrades[0],
        score: neededCompScore,
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
        score: neededCompScore,
        maxScore: maxCompScore,
        coefficient: coef,
        date: new Date().toISOString().split('T')[0]
      });
    }

    setSavedNotice(`Note générale mise à jour : ${scoreNum}/${maxScore}`);
    setTimeout(() => setSavedNotice(null), 2000);
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
                  @page { size: A4 landscape; margin: 4mm; }
                  body { background: #ffffff !important; color: #0f172a !important; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 4mm; }
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
    <div className="space-y-8 pb-12">
      {/* ----------------- SCREEN ONLY HEADER & CONTROLS ----------------- */}
      <div className="no-print space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>Saisie Directe & Impression Officielle MEN Mali</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-900 shrink-0" />
              <span>Bulletins de Notes Trimestriels</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-1">
              Modifiez les notes directement dans la grille ci-dessous • Calcul automatique des moyennes & rangs • Impression A4
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setShowBatchModal(true);
                if (!batchSubjectId && subjects.length > 0) {
                  const classSubj = subjects.filter(s => !currentClass || s.classCategory === currentClass.category);
                  if (classSubj.length > 0) setBatchSubjectId(classSubj[0].id);
                }
              }}
              className="flex items-center gap-2 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer border border-amber-500/30"
              title="Saisir directement les notes de classe et de composition pour tous les élèves de la classe"
            >
              <Edit3 className="w-4 h-4 text-amber-200" />
              <span>Saisie Rapide Classe</span>
            </button>

            <button
              onClick={handlePrintSingle}
              disabled={!activeReportCard}
              className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
              title="Imprimer ce bulletin directement sur imprimante A4"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={handlePrintClass}
              disabled={allClassReportCards.length === 0}
              className="flex items-center gap-2 px-5 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
              title="Imprimer tous les bulletins de la classe"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer Classe ({allClassReportCards.length})</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={!activeReportCard}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-emerald-900/20 transition-all cursor-pointer border border-emerald-500/30"
              title="Exporter le bulletin actif au format PDF officiel"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Exporter en PDF</span>
            </button>

            <button
              onClick={handleDownloadAllClassPdfs}
              disabled={allClassReportCards.length === 0}
              className="flex items-center gap-2 px-5 py-3.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
              title="Exporter tous les bulletins de la classe en 1 seul fichier PDF multi-pages"
            >
              <Download className="w-4 h-4 text-blue-300" />
              <span>Exporter Classe (PDF)</span>
            </button>

            <button
              onClick={handleExportClassCsv}
              disabled={allClassReportCards.length === 0}
              className="flex items-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-widest rounded-full border border-slate-200 transition-all cursor-pointer"
              title="Exporter le récapitulatif des résultats en fichier CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Saved Toast Notification */}
        {savedNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{savedNotice} — Re-calcul automatique effectué.</span>
          </div>
        )}

        {/* Class, Term and Quick Search Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="sm:col-span-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-900" />
              <span>1. Filtrer par Classe *</span>
            </label>
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setActiveStudentId('');
              }}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount || 0} élèves)
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-900" />
              <span>2. Période / Évaluation *</span>
            </label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value as EvaluationTerm)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            >
              <optgroup label="Évaluations Mensuelles (1er Cycle & Devoirs)">
                {getMaliEvaluationTerms(settings.evaluationMonths, settings.evaluationCount)
                  .filter(t => t.category === 'EVALUATION_MENSUELLE')
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
              </optgroup>
              <optgroup label="Trimestres (2ème Cycle & Lycée)">
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

          <div className="sm:col-span-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-900" />
              <span>3. Recherche Rapide Élève</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nom, prénom, matricule..."
                className="w-full pl-9 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              onClick={handleDownloadAllClassPdfs}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
              title="Télécharger tous les PDF de la classe sélectionnée"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>PDF Classe</span>
            </button>
          </div>
        </div>

        {/* Class Performance Summary Banner */}
        {classStats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-[2rem] shadow-md border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block">Taux d'Admission</span>
                <p className="text-xl font-black text-emerald-400 font-mono">
                  {classStats.passRate}% <span className="text-[10px] text-white/70 font-sans font-bold">({classStats.passing}/{classStats.total})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block">Moyenne de Classe</span>
                <p className="text-xl font-black text-blue-300 font-mono">
                  {classStats.avg.toFixed(2)} <span className="text-[10px] text-white/70 font-sans">/20</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block">Plus Forte Moyenne</span>
                <p className="text-xl font-black text-amber-400 font-mono">
                  {classStats.maxAvg.toFixed(2)} <span className="text-[10px] text-white/70 font-sans">/20</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block">Plus Faible Moyenne</span>
                <p className="text-xl font-black text-rose-300 font-mono">
                  {classStats.minAvg.toFixed(2)} <span className="text-[10px] text-white/70 font-sans">/20</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Interactive Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Student List Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-900" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Élèves ({classStudents.length}/{totalClassStudents.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {currentClass?.name}
              </span>
            </div>

            {/* Quick Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher nom, prénom..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 pb-1">
              <button
                onClick={() => setScoreFilter('ALL')}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  scoreFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tous ({totalClassStudents.length})
              </button>
              <button
                onClick={() => setScoreFilter('PASSING')}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  scoreFilter === 'PASSING'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Admis
              </button>
              <button
                onClick={() => setScoreFilter('FAILING')}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  scoreFilter === 'FAILING'
                    ? 'bg-rose-800 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                En difficulté
              </button>
            </div>

            {/* Student list */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {classStudents.map(std => {
                const isSelected = activeStudent?.id === std.id;
                const card = generateReportCard(std.id, selectedTerm);
                const avg = card ? card.generalAverage : 0;
                const rank = card ? card.rankInClass : '-';
                const cardMax = card?.maxScore || 20;
                const passThreshold = cardMax === 10 ? 5 : 10;

                return (
                  <button
                    key={std.id}
                    onClick={() => setActiveStudentId(std.id)}
                    className={`w-full text-left p-3.5 rounded-2xl text-xs transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-md font-black'
                        : 'bg-slate-50 text-slate-800 border-slate-100 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {std.photoUrl ? (
                        <img
                          src={std.photoUrl}
                          alt={std.firstName}
                          className="w-9 h-9 rounded-full object-cover border-2 border-white/20 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${
                            isSelected ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate uppercase text-xs">{std.lastName} {std.firstName}</p>
                        <p className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-slate-400'} font-mono`}>
                          {std.matricule}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                        isSelected ? 'bg-white/20 text-white' : avg >= passThreshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {avg.toFixed(2)} / {cardMax}
                      </span>
                      <p className={`text-[9px] font-bold ${isSelected ? 'text-blue-200' : 'text-slate-400'} mt-0.5`}>
                        {rank}{rank === 1 ? 'er' : 'e'} rang
                      </p>
                    </div>
                  </button>
                );
              })}

              {classStudents.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xs text-slate-400 italic">Aucun élève ne correspond aux filtres.</p>
                  {(searchQuery || scoreFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setScoreFilter('ALL');
                      }}
                      className="text-[10px] font-black uppercase text-blue-900 underline hover:text-blue-950"
                    >
                      Réinitialiser la recherche
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive Bulletin Card View & Direct Grade Inputs */}
          <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
            {!activeReportCard || !activeStudent ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-20 space-y-3">
                <FileText className="w-16 h-16 text-slate-300 stroke-1" />
                <p className="font-bold">Sélectionnez un élève dans la liste à gauche pour saisir ses notes et afficher son bulletin.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bulletin Header Badge */}
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
                      RÉPUBLIQUE DU MALI • MEN
                    </span>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                      {activeReportCard.studentName}
                    </h2>
                    <p className="text-xs text-slate-300 font-mono font-bold">
                      MLE: {activeReportCard.studentMatricule} • Classe: {activeReportCard.className}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    <div className="text-left sm:text-right bg-white/10 p-4 rounded-2xl border border-white/10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-200 block">
                        Moyenne Générale
                      </span>
                      <span className="text-3xl font-black text-amber-300">
                        {activeReportCard.generalAverage.toFixed(2)}
                        <span className="text-xs text-white/60"> / {activeReportCard.maxScore || 20}</span>
                      </span>
                      <p className="text-[10px] font-bold text-emerald-300 mt-0.5">
                        Rang: {activeReportCard.rankInClass}e sur {activeReportCard.totalClassStudents} élèves
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadPdf}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border border-emerald-400/40 w-full sm:w-auto"
                      title="Enregistrer et télécharger le bulletin au format PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>Exporter en PDF</span>
                    </button>
                  </div>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Points</span>
                    <p className="font-mono font-black text-slate-900 text-sm">{activeReportCard.totalPoints.toFixed(2)} pts</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Coefs</span>
                    <p className="font-mono font-black text-slate-900 text-sm">{activeReportCard.totalCoefficients}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Moyenne Classe</span>
                    <p className="font-mono font-black text-blue-900 text-sm">{activeReportCard.classOverallAverage.toFixed(2)} / {activeReportCard.maxScore || 20}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Mention / Décision</span>
                    <p className="font-black text-emerald-700 text-xs truncate mt-0.5">{activeReportCard.directorDecision}</p>
                  </div>
                </div>

                {/* Interactive Grade Table with Direct Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-900" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        {activeReportCard.maxScore === 10 ? 'Notes des Matières (1er Cycle Fondamental — sur 10)' : 'Notes des Matières (Format Officiel IFP / Lycée / 2nd Cycle)'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 italic">
                      {activeReportCard.maxScore === 10
                        ? 'Calcul automatique : Moy.G = (N.Classe + Compos) / 2'
                        : 'Calcul automatique : Moy.G = (N.Classe + Compos) / 3'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Matières</th>
                          <th className="py-3 px-2 text-center w-28">
                            N.Classe /{activeReportCard.maxScore === 10 ? 10 : 20}
                          </th>
                          <th className="py-3 px-2 text-center w-28">
                            Compos /{activeReportCard.maxScore === 10 ? 10 : 40}
                          </th>
                          <th className="py-3 px-2 text-center font-bold">Moy.G /{activeReportCard.maxScore}</th>
                          <th className="py-3 px-2 text-center">Coeff.</th>
                          <th className="py-3 px-2 text-center">Moy. Coeff</th>
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
                            <tr key={s.subjectId} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-black text-slate-900">{s.subjectName}</p>
                                <p className="text-[10px] font-mono text-slate-400">{s.subjectCode}</p>
                              </td>

                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={activeReportCard.maxScore === 10 ? 10 : 20}
                                  value={classScoreVal.toString()}
                                  onChange={e => handleClassScoreChange(s.subjectId, e.target.value)}
                                  className="w-20 py-1.5 px-2 text-center font-mono font-black text-xs text-amber-950 bg-amber-50/80 border-2 border-amber-200 focus:border-amber-600 focus:bg-white rounded-xl outline-none shadow-xs transition-all"
                                  title="Saisir directement la note de classe / devoirs"
                                />
                              </td>

                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={activeReportCard.maxScore === 10 ? 10 : 40}
                                  value={compScoreVal.toString()}
                                  onChange={e => handleCompositionScoreChange(s.subjectId, e.target.value)}
                                  className="w-20 py-1.5 px-2 text-center font-mono font-black text-xs text-purple-950 bg-purple-50/80 border-2 border-purple-200 focus:border-purple-600 focus:bg-white rounded-xl outline-none shadow-xs transition-all"
                                  title="Saisir directement la note de composition"
                                />
                              </td>

                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={sMaxScore}
                                  value={s.finalScore.toString()}
                                  onChange={e => handleDirectGradeChange(s.subjectId, e.target.value)}
                                  className="w-20 py-1.5 px-2 text-center font-mono font-black text-sm text-blue-950 bg-blue-50/80 border-2 border-blue-200 focus:border-blue-900 focus:bg-white rounded-xl outline-none shadow-xs transition-all"
                                />
                              </td>

                              <td className="py-3 px-2 text-center font-black text-slate-700">
                                {s.coefficient}
                              </td>

                              <td className="py-3 px-2 text-center font-mono font-black text-slate-900">
                                {s.weightedScore.toFixed(2)}
                              </td>

                              <td className="py-3 px-4">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
                                  {appreciation}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Editable Teacher Observation & Conseil de Classe */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      Appréciation Générale du Conseil de Classe & Directeur
                    </label>
                    <span className="text-[9px] font-bold text-slate-400">Suggestions rapides en 1 clic :</span>
                  </div>

                  <textarea
                    rows={2}
                    value={getCommentForStudent(activeStudent.id)}
                    onChange={e => handleCommentChange(activeStudent.id, e.target.value)}
                    placeholder="Saisissez ici l'observation finale..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                  />

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COMMENT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCommentChange(activeStudent.id, preset)}
                        className="text-[10px] font-bold px-3 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-200 rounded-full transition-all cursor-pointer shadow-2xs"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- SAISIE RAPIDE PAR CLASSE MODAL ----------------- */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl">
                  <Edit3 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wide">Saisie Rapide des Notes de Classe</h2>
                  <p className="text-xs text-slate-400 font-bold">
                    {currentClass?.name || 'Classe'} • {getTermLabel(selectedTerm, settings.evaluationMonths)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Subject Selector */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="w-full sm:w-auto flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                    Sélectionner la Matière à Renseigner
                  </label>
                  <select
                    value={batchSubjectId}
                    onChange={e => setBatchSubjectId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {subjects
                      .filter(s => !currentClass || s.classCategory === currentClass.category)
                      .map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code}) — Coef {sub.coefficient}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="text-xs font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shrink-0">
                  <span>Barème : </span>
                  <span className="text-amber-700 font-black">N.Classe /{(currentClass?.category === 'FONDAMENTAL_1') ? 10 : 20}</span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span className="text-purple-700 font-black">Compos /{(currentClass?.category === 'FONDAMENTAL_1') ? 10 : 40}</span>
                </div>
              </div>

              {/* Students Grid Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Élève</th>
                      <th className="py-3 px-2 text-center w-32">
                        N.Classe /{(currentClass?.category === 'FONDAMENTAL_1') ? 10 : 20}
                      </th>
                      <th className="py-3 px-2 text-center w-32">
                        Compos /{(currentClass?.category === 'FONDAMENTAL_1') ? 10 : 40}
                      </th>
                      <th className="py-3 px-2 text-center w-28">Moy.G</th>
                      <th className="py-3 px-4 text-center">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold text-slate-800 divide-y divide-slate-100 bg-white">
                    {totalClassStudents.map((std, idx) => {
                      const card = generateReportCard(std.id, selectedTerm);
                      const subjAvg = card?.subjectAverages.find(sa => sa.subjectId === batchSubjectId);
                      const classScoreVal = subjAvg?.classScore !== undefined ? subjAvg.classScore : (subjAvg?.finalScore || 0);
                      const maxScore = card?.maxScore || 20;
                      const compScoreVal = subjAvg?.compositionScore !== undefined ? subjAvg.compositionScore : (maxScore === 10 ? (subjAvg?.finalScore || 0) : ((subjAvg?.finalScore || 0) * 2));
                      const finalVal = subjAvg?.finalScore || 0;
                      const { appreciation, badgeColor } = getMaliScoreAppreciation(finalVal, maxScore);

                      return (
                        <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <p className="font-black text-slate-900">{std.lastName} {std.firstName}</p>
                            <p className="text-[10px] font-mono text-slate-400">{std.matricule}</p>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={maxScore === 10 ? 10 : 20}
                              value={classScoreVal}
                              onChange={e => {
                                const isFirstCycle = currentClass?.category === 'FONDAMENTAL_1';
                                const maxVal = isFirstCycle ? 10 : 20;
                                let num = parseFloat(e.target.value);
                                if (isNaN(num)) num = 0;
                                num = Math.min(maxVal, Math.max(0, num));

                                const classGrades = grades.filter(
                                  g => g.studentId === std.id && g.subjectId === batchSubjectId && g.term === selectedTerm && g.type !== 'COMPOSITION' && g.type !== 'EXAMEN'
                                );
                                const subObj = subjects.find(s => s.id === batchSubjectId);
                                const coef = subObj?.coefficient || 1;

                                if (classGrades.length > 0) {
                                  saveGrade({ ...classGrades[0], score: num, maxScore: maxVal, coefficient: coef });
                                } else {
                                  saveGrade({
                                    studentId: std.id,
                                    classId: std.classId,
                                    subjectId: batchSubjectId,
                                    term: selectedTerm,
                                    academicYear: settings.currentAcademicYear,
                                    type: 'DEVOIR',
                                    score: num,
                                    maxScore: maxVal,
                                    coefficient: coef,
                                    date: new Date().toISOString().split('T')[0]
                                  });
                                }
                              }}
                              className="w-24 py-1.5 px-2 text-center font-mono font-black text-xs text-amber-950 bg-amber-50 border-2 border-amber-200 focus:border-amber-600 focus:bg-white rounded-xl outline-none transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={maxScore === 10 ? 10 : 40}
                              value={compScoreVal}
                              onChange={e => {
                                const isFirstCycle = currentClass?.category === 'FONDAMENTAL_1';
                                const maxCompVal = isFirstCycle ? 10 : 40;
                                let num = parseFloat(e.target.value);
                                if (isNaN(num)) num = 0;
                                num = Math.min(maxCompVal, Math.max(0, num));

                                const compGrades = grades.filter(
                                  g => g.studentId === std.id && g.subjectId === batchSubjectId && g.term === selectedTerm && (g.type === 'COMPOSITION' || g.type === 'EXAMEN')
                                );
                                const subObj = subjects.find(s => s.id === batchSubjectId);
                                const coef = subObj?.coefficient || 1;

                                if (compGrades.length > 0) {
                                  saveGrade({ ...compGrades[0], score: num, maxScore: maxCompVal, coefficient: coef });
                                } else {
                                  saveGrade({
                                    studentId: std.id,
                                    classId: std.classId,
                                    subjectId: batchSubjectId,
                                    term: selectedTerm,
                                    academicYear: settings.currentAcademicYear,
                                    type: 'COMPOSITION',
                                    score: num,
                                    maxScore: maxCompVal,
                                    coefficient: coef,
                                    date: new Date().toISOString().split('T')[0]
                                  });
                                }
                              }}
                              className="w-24 py-1.5 px-2 text-center font-mono font-black text-xs text-purple-950 bg-purple-50 border-2 border-purple-200 focus:border-purple-600 focus:bg-white rounded-xl outline-none transition-all"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-black text-blue-900 bg-blue-50/50 rounded-xl">
                            {finalVal.toFixed(2)} / {maxScore}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${badgeColor}`}>
                              {appreciation}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 italic">
                Enregistrement automatique au fur et à mesure de la saisie.
              </p>
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- OFFICIAL PRINTABLE DOCUMENT (PRINT ONLY: 2 BULLETINS PER A4 LANDSCAPE PAGE) ----------------- */}
      <div className="print-only" id="printable-bulletins-container">
        {isPrintAllMode ? (
          /* Bulk print all class bulletins: paired 2-by-2 side-by-side */
          <div>
            {chunkArray(allClassReportCards, 2).map((pair, idx, arr) => (
              <div
                key={idx}
                className={`w-[287mm] h-[200mm] mx-auto grid grid-cols-2 gap-3 items-start p-1 bg-white ${
                  idx < arr.length - 1 ? 'page-break' : ''
                }`}
              >
                <PrintableBulletin
                  report={pair[0]}
                  settings={settings}
                  comment={getCommentForStudent(pair[0].studentId)}
                />
                <PrintableBulletin
                  report={pair[1] || pair[0]}
                  settings={settings}
                  comment={getCommentForStudent((pair[1] || pair[0]).studentId)}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Single printable bulletin: 2 identical copies side-by-side on 1 A4 Landscape page */
          activeReportCard && (
            <div className="w-[287mm] h-[200mm] mx-auto grid grid-cols-2 gap-3 items-start p-1 bg-white">
              <PrintableBulletin
                report={activeReportCard}
                settings={settings}
                comment={getCommentForStudent(activeReportCard.studentId)}
              />
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

/* Helper function to group array into pairs */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

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
    <div className="w-full bg-white text-slate-900 font-sans text-[8.5px] leading-tight p-2 border border-slate-900 flex flex-col justify-between h-[195mm] box-border">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="text-center space-y-0.5 border-b border-slate-900 pb-1.5">
        <p className="font-bold uppercase text-[9px] tracking-tight">
          {settings.academyName || "ACADEMIE D'ENSEIGNEMENT BAMAKO RIVE DROITE"} {settings.capName ? `CAP DE ${settings.capName}` : "CAP DE FALADIE"} {settings.schoolName || "ECOLE PRIVEE LE BIRGO NIAMAKORO"}
        </p>
        <p className="font-bold text-[8.5px]">
          TEL: {settings.phone || '76041281 / 75167282'}
        </p>
        <h1 className="font-black text-xs uppercase tracking-widest mt-1 underline">
          BULLETIN DE NOTES
        </h1>
      </div>

      {/* 2. TOP 3-BOX GRID */}
      <div className="grid grid-cols-12 gap-1 my-1 text-[8.5px]">
        {/* Left Box */}
        <div className="col-span-5 border border-slate-900 p-1.5 flex flex-col justify-center space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-700">ELEVE :</span>
            <span className="font-black uppercase text-[9.5px] text-slate-900 truncate">{report.studentName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-700">N° Mle :</span>
            <span className="font-mono font-bold text-slate-900">{report.studentMatricule || '---'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-700">CLASSE :</span>
            <span className="font-black text-slate-900 uppercase">{report.className}</span>
          </div>
        </div>

        {/* Center Box: Large Class Badge */}
        <div className="col-span-3 border border-slate-900 p-1 flex items-center justify-center text-center bg-slate-50 relative overflow-hidden">
          <div className="border border-slate-300 p-1 w-full h-full flex items-center justify-center">
            <span className="font-black text-base uppercase tracking-tight text-slate-900">{report.className}</span>
          </div>
        </div>

        {/* Right Box */}
        <div className="col-span-4 border border-slate-900 p-1.5 flex flex-col justify-center space-y-0.5 text-right">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700">Année scolaire :</span>
            <span className="font-bold text-slate-900">{report.academicYear}</span>
          </div>
          <div className="font-black uppercase text-blue-950 text-[9px] text-center border-y border-slate-300 py-0.5 my-0.5">
            {termFormatted}
          </div>
          <div className="flex justify-between items-center text-[8px]">
            <span className="font-bold text-slate-700">Effectif de la Classe :</span>
            <span className="font-black text-slate-900">{report.totalClassStudents}</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN GRADES TABLE */}
      <div className="flex-1 my-0.5">
        <table className="w-full border-collapse border border-slate-900 text-center text-[8px]">
          <thead>
            <tr className="bg-slate-100 font-black text-[7.5px] uppercase tracking-tight text-slate-900 border-b border-slate-900">
              <th className="border-r border-slate-900 p-0.5 text-left w-[32%]">MATIERES</th>
              <th className="border-r border-slate-900 p-0.5 w-[8%]">COEF</th>
              <th className="border-r border-slate-900 p-0.5 w-[14%]">NOTES DE CLASSE SUR 20</th>
              <th className="border-r border-slate-900 p-0.5 w-[14%]">NOTE DE COMP SUR 40</th>
              <th className="border-r border-slate-900 p-0.5 w-[10%]">MOY GEN</th>
              <th className="border-r border-slate-900 p-0.5 w-[10%]">NOTES COEF</th>
              <th className="p-0.5 text-left w-[12%]">APPRECIATIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 font-semibold text-slate-900">
            {report.subjectAverages.map((sub) => {
              const classVal = sub.classScore !== undefined ? sub.classScore : sub.finalScore;
              const compVal = sub.compositionScore !== undefined ? sub.compositionScore : (maxScore === 10 ? sub.finalScore : sub.finalScore * 2);
              const { appreciation } = getMaliScoreAppreciation(sub.finalScore, maxScore);

              return (
                <tr key={sub.subjectId} className="h-4">
                  <td className="border-r border-slate-900 px-1 py-0.5 text-left font-bold uppercase truncate max-w-[105px]">
                    {sub.subjectName}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-0.5 font-bold">
                    {sub.coefficient}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-0.5 font-mono">
                    {classVal.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-0.5 font-mono">
                    {compVal.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-0.5 font-mono font-black">
                    {sub.finalScore.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="border-r border-slate-900 px-1 py-0.5 font-mono font-bold">
                    {sub.weightedScore.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-1 py-0.5 text-left text-[7.5px] font-bold uppercase truncate">
                    {sub.appreciation || appreciation.toUpperCase()}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL COEFFICIENTS ROW */}
            <tr className="border-t border-slate-900 font-black">
              <td className="border-r border-slate-900 px-1 py-0.5 text-left uppercase text-[7.5px]">
                TOTAL DES COEFFICIENTS
              </td>
              <td className="border-r border-slate-900 px-1 py-0.5 font-black text-center">
                {report.totalCoefficients}
              </td>
              <td className="border-r border-slate-900" colSpan={5}></td>
            </tr>

            {/* TOTAL NOTES COEFFICIEES ROW */}
            <tr className="border-t border-slate-900 font-black">
              <td className="border-r border-slate-900 px-1 py-0.5 text-left uppercase text-[7.5px]" colSpan={5}>
                TOTAL DES NOTES COEFFICIEES
              </td>
              <td className="border-r border-slate-900 px-1 py-0.5 font-mono font-black text-center">
                {report.totalPoints.toFixed(2).replace('.', ',')}
              </td>
              <td className="px-1 py-0.5"></td>
            </tr>

            {/* MOYENNE & RANG ROW */}
            <tr className="border-t-2 border-slate-900 font-black bg-slate-50">
              <td className="border-r border-slate-900 px-1 py-1 text-left uppercase" colSpan={3}>
                MOYENNE DE L'ELEVE : <span className="font-mono text-[9.5px] ml-1">{report.generalAverage.toFixed(2).replace('.', ',')}</span>
              </td>
              <td className="border-r border-slate-900 px-1 py-1 text-center uppercase" colSpan={4}>
                RANG : <span className="font-mono text-[9.5px] ml-1">{report.rankInClass} / {report.totalClassStudents}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM APPRECIATION & SIGNATURE BLOCK */}
      <div className="border border-slate-900 p-1.5 space-y-1 my-0.5 text-[8px]">
        <div className="flex items-baseline justify-between border-b border-dashed border-slate-400 pb-0.5">
          <span className="font-bold text-slate-800 uppercase">Appréciation du Directeur :</span>
          <span className="font-black text-[9px] uppercase tracking-wider text-slate-900">
            {comment || (report.generalAverage >= 14 ? 'BIEN - FELICITATIONS' : report.generalAverage >= 10 ? 'PASSABLE - SATISFAISANT' : report.generalAverage >= 8 ? 'INSUFFISANT' : 'MEDIOCRE')}
          </span>
        </div>

        <div className="flex justify-between items-end pt-0.5 font-bold">
          <div>
            <span>{settings.city || 'Bamako'} le </span>
            <span className="font-mono">..../..../{new Date().getFullYear()}</span>
          </div>
          <div className="text-right pr-2 relative">
            <span className="uppercase text-[8.5px] font-black block">Le Directeur</span>
            {settings.stampUrl ? (
              <img src={settings.stampUrl} alt="Cachet et Signature" className="h-8 max-w-[80px] object-contain ml-auto my-0.5" />
            ) : (
              <div className="h-5"></div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
