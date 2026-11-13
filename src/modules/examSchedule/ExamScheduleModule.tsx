/**
 * SomaSikolo - Module de Gestion & Génération des Plannings d'Examens & Compositions
 * Permet de créer, générer automatiquement en 1 clic et imprimer les emplois du temps officiels d'épreuves.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, Plus, Printer, Download, Sparkles, Clock, MapPin, 
  UserCheck, BookOpen, AlertCircle, Trash2, Edit3, CheckCircle2, 
  X, Filter, Eye, ChevronRight, Layers, GraduationCap, FileText
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { ExamSession, ExamSlot, SchoolClass, Subject, Teacher, ExamTermType } from '../../types';
import { ExamScheduleService } from '../../services/examScheduleService';
import { PdfService } from '../../services/pdfService';

export const ExamScheduleModule: React.FC = () => {
  const { classes, subjects, teachers, settings } = useSchool();

  // Sessions & Slots state
  const [sessions, setSessions] = useState<ExamSession[]>(() => ExamScheduleService.getSessions(settings.currentAcademicYear));
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => sessions[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || '');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Slots rechargés dès que la session change
  const [slots, setSlots] = useState<ExamSlot[]>(() => 
    selectedSessionId ? ExamScheduleService.getSlotsForSession(selectedSessionId) : []
  );

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || sessions[0];
  }, [sessions, selectedSessionId]);

  const activeClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  // Filtrer les créneaux pour la session et la classe active
  const currentClassSlots = useMemo(() => {
    if (!activeSession || !activeClass) return [];
    return slots
      .filter(s => s.sessionId === activeSession.id && s.classId === activeClass.id)
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [slots, activeSession, activeClass]);

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotEditing, setSlotEditing] = useState<ExamSlot | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<ExamSlot | null>(null);

  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [autoGenStartDate, setAutoGenStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [autoGenDaysCount, setAutoGenDaysCount] = useState<number>(3);
  const [autoGenExamsPerDay, setAutoGenExamsPerDay] = useState<number>(2);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionEditing, setSessionEditing] = useState<ExamSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ExamSession | null>(null);

  // Formulaire d'ajout/édition d'épreuve
  const [slotForm, setSlotForm] = useState<{
    subjectId: string;
    subjectName: string;
    coefficient: number;
    date: string;
    startTime: string;
    endTime: string;
    classroom: string;
    supervisorTeacherId: string;
    supervisorName: string;
    supervisorTeacherId2: string;
    supervisorName2: string;
    notes: string;
  }>({
    subjectId: '',
    subjectName: '',
    coefficient: 1,
    date: new Date().toISOString().slice(0, 10),
    startTime: '08:00',
    endTime: '10:00',
    classroom: activeClass?.classroom || 'Salle 01',
    supervisorTeacherId: '',
    supervisorName: '',
    supervisorTeacherId2: '',
    supervisorName2: '',
    notes: ''
  });

  // Formulaire de session
  const [sessionForm, setSessionForm] = useState<{
    title: string;
    term: ExamTermType;
    startDate: string;
    endDate: string;
    status: 'BROUILLON' | 'PUBLIE' | 'TERMINE';
    generalInstructions: string;
  }>({
    title: '',
    term: 'TRIMESTRE_1',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: 'PUBLIE',
    generalInstructions: '1. Présence obligatoire 15 minutes avant l\'épreuve.\n2. Carte d\'identité scolaire obligatoire.\n3. Téléphones strictement interdits.'
  });

  // Recharger les créneaux quand la session change
  const reloadSlots = () => {
    if (selectedSessionId) {
      setSlots(ExamScheduleService.getSlotsForSession(selectedSessionId));
    }
  };

  useEffect(() => {
    reloadSlots();
  }, [selectedSessionId]);

  // Matières de la classe sélectionnée
  const classSubjects = useMemo(() => {
    if (!activeClass) return subjects;
    const match = subjects.filter(s => !s.classCategory || s.classCategory === activeClass.category);
    return match.length > 0 ? match : subjects;
  }, [subjects, activeClass]);

  // Ouverture modal d'ajout d'épreuve
  const handleOpenAddSlot = () => {
    if (!activeClass || !activeSession) return;
    const firstSub = classSubjects[0];
    const firstTeacher = teachers[0];

    setSlotEditing(null);
    setSlotForm({
      subjectId: firstSub?.id || '',
      subjectName: firstSub?.name || 'Matière',
      coefficient: firstSub?.coefficient || 1,
      date: activeSession.startDate || new Date().toISOString().slice(0, 10),
      startTime: '08:00',
      endTime: '10:00',
      classroom: activeClass.classroom || 'Salle 01',
      supervisorTeacherId: firstTeacher?.id || '',
      supervisorName: firstTeacher?.fullName || 'Surveillant Titulaire',
      supervisorTeacherId2: '',
      supervisorName2: '',
      notes: ''
    });
    setIsSlotModalOpen(true);
  };

  // Ouverture modal édition créneau
  const handleOpenEditSlot = (slot: ExamSlot) => {
    setSlotEditing(slot);
    setSlotForm({
      subjectId: slot.subjectId,
      subjectName: slot.subjectName,
      coefficient: slot.coefficient,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      classroom: slot.classroom || activeClass?.classroom || 'Salle 01',
      supervisorTeacherId: slot.supervisorTeacherId || '',
      supervisorName: slot.supervisorName || '',
      supervisorTeacherId2: slot.supervisorTeacherId2 || '',
      supervisorName2: slot.supervisorName2 || '',
      notes: slot.notes || ''
    });
    setIsSlotModalOpen(true);
  };

  // Soumission créneau
  const handleSaveSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !activeClass) return;

    ExamScheduleService.saveSlot({
      id: slotEditing?.id,
      sessionId: activeSession.id,
      classId: activeClass.id,
      className: activeClass.name,
      subjectId: slotForm.subjectId,
      subjectName: slotForm.subjectName,
      coefficient: Number(slotForm.coefficient) || 1,
      date: slotForm.date,
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
      classroom: slotForm.classroom,
      supervisorTeacherId: slotForm.supervisorTeacherId,
      supervisorName: slotForm.supervisorName,
      supervisorTeacherId2: slotForm.supervisorTeacherId2,
      supervisorName2: slotForm.supervisorName2,
      notes: slotForm.notes
    });

    reloadSlots();
    setIsSlotModalOpen(false);
    setToastMessage(`Épreuve de ${slotForm.subjectName} enregistrée.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Confirmation suppression créneau
  const handleConfirmDeleteSlot = () => {
    if (slotToDelete) {
      ExamScheduleService.deleteSlot(slotToDelete.id);
      reloadSlots();
      setToastMessage('Épreuve supprimée du planning.');
      setSlotToDelete(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Lancement de la génération automatique
  const handleRunAutoGenerate = () => {
    if (!activeClass || !activeSession) return;

    ExamScheduleService.autoGenerateClassSchedule({
      sessionId: activeSession.id,
      cls: activeClass,
      subjects,
      teachers,
      startDate: autoGenStartDate,
      daysCount: autoGenDaysCount,
      examsPerDay: autoGenExamsPerDay
    });

    reloadSlots();
    setIsAutoGenerateModalOpen(false);
    setToastMessage(`Planning généré automatiquement pour la classe de ${activeClass.name} !`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Gestion des sessions
  const handleOpenAddSession = () => {
    setSessionEditing(null);
    setSessionForm({
      title: `Compositions ${settings.currentAcademicYear || '2026-2027'}`,
      term: 'TRIMESTRE_1',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      status: 'PUBLIE',
      generalInstructions: '1. Présence obligatoire 15 minutes avant l\'épreuve.\n2. Carte d\'identité scolaire obligatoire.\n3. Téléphones strictement interdits.'
    });
    setIsSessionModalOpen(true);
  };

  const handleSaveSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = ExamScheduleService.saveSession({
      id: sessionEditing?.id,
      title: sessionForm.title,
      term: sessionForm.term,
      startDate: sessionForm.startDate,
      endDate: sessionForm.endDate,
      status: sessionForm.status,
      generalInstructions: sessionForm.generalInstructions,
      academicYear: settings.currentAcademicYear || '2026-2027'
    });

    const updatedSessions = ExamScheduleService.getSessions(settings.currentAcademicYear);
    setSessions(updatedSessions);
    setSelectedSessionId(saved.id);
    setIsSessionModalOpen(false);
    setToastMessage(`Session "${saved.title}" enregistrée.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmDeleteSession = () => {
    if (sessionToDelete) {
      ExamScheduleService.deleteSession(sessionToDelete.id);
      const updated = ExamScheduleService.getSessions();
      setSessions(updated);
      setSelectedSessionId(updated[0]?.id || '');
      setSessionToDelete(null);
      setToastMessage('Session d\'examens supprimée.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Impression PDF Officiel
  const handleExportPdf = () => {
    if (!activeSession || !activeClass) return;
    PdfService.generateExamSchedulePdf(activeSession, activeClass, currentClassSlots, settings);
  };

  // Impression Navigateur
  const handlePrintWindow = () => {
    window.print();
  };

  // Regroupement par jour pour la vue Grille
  const slotsByDate = useMemo(() => {
    const map = new Map<string, ExamSlot[]>();
    currentClassSlots.forEach(s => {
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [currentClassSlots]);

  // Total des heures planifiées
  const totalDurationMinutes = useMemo(() => {
    return currentClassSlots.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }, [currentClassSlots]);

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-6">
      {/* 1. BARRE D'ACTION UNIFIÉE ULTRA-COMPACTE */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Gauche : Titre + Sélecteur Session + Sélecteur Classe */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <CalendarDays className="w-4 h-4 text-blue-900 shrink-0" />
              <span>Plannings Examens</span>
            </div>

            {/* Sélecteur Session */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-400">Session :</span>
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                className="py-1 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({ExamScheduleService.getTermLabel(s.term).split('(')[0].trim()})
                  </option>
                ))}
              </select>
            </div>

            {/* Sélecteur Classe */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-400">Classe :</span>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="py-1 px-2 bg-blue-50/70 hover:bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-950 outline-none cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Vue Grille / Liste */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grille
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tableau
              </button>
            </div>
          </div>

          {/* Droite : Boutons d'actions */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAutoGenerateModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Génère automatiquement la répartition harmonieuse de toutes les matières pour cette classe"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Générer Auto (1-Clic)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddSlot}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Épreuve</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Télécharger l'emploi du temps officiel au format PDF A4 Paysage"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>PDF A4</span>
            </button>

            <button
              type="button"
              onClick={handlePrintWindow}
              className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              title="Imprimer directement le calendrier d'examens"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddSession}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Créer une nouvelle session d'examen"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Micro-Synthèse en 1 ligne discrète */}
        <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
          <span>Classe : <strong className="text-slate-900">{activeClass?.name}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Épreuves planifiées : <strong className="text-slate-900 font-bold">{currentClassSlots.length}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Volume horaire total : <strong className="text-blue-900 font-bold">{Math.floor(totalDurationMinutes / 60)}h{totalDurationMinutes % 60 > 0 ? `${totalDurationMinutes % 60}min` : '00'}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Période : <strong className="text-slate-800">{activeSession?.title}</strong></span>
          {activeSession?.status && (
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              activeSession.status === 'PUBLIE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
            }`}>
              {activeSession.status === 'PUBLIE' ? '✓ Publié' : 'Brouillon'}
            </span>
          )}
        </div>
      </div>

      {/* Message Toast */}
      {toastMessage && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. CONTENU PRINCIPAL : VUE GRILLE OU TABLEAU */}
      {currentClassSlots.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto border border-amber-200">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">
              Aucune épreuve planifiée pour {activeClass?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Utilisez les boutons « Générer Auto (1-Clic) » ou « + Épreuve » dans la barre ci-dessus pour planifier les épreuves.
            </p>
          </div>
        </div>
      ) : viewMode === 'GRID' ? (
        /* VUE GRILLE HORAIRE JOURNALIÈRE */
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {slotsByDate.map(([dateStr, daySlots]) => {
              const dateObj = new Date(dateStr);
              const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
              const dayName = isNaN(dateObj.getTime()) ? 'Jour' : dayNames[dateObj.getDay()];
              const formattedDate = dateStr.split('-').reverse().join('/');

              return (
                <div key={dateStr} className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs flex flex-col">
                  {/* Entête du jour */}
                  <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-xs uppercase">{dayName} {formattedDate}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold text-amber-300">
                      {daySlots.length} épreuve(s)
                    </span>
                  </div>

                  {/* Liste des épreuves du jour */}
                  <div className="p-2 space-y-2 flex-1 divide-y divide-slate-100">
                    {daySlots.map(slot => (
                      <div key={slot.id} className="pt-2 first:pt-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Coeff: {slot.coefficient}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs mt-1">
                              {slot.subjectName}
                            </h4>
                          </div>

                          {/* Actions rapides */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSlot(slot)}
                              className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Modifier ce créneau"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSlotToDelete(slot)}
                              className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Supprimer cette épreuve"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Détails salle & surveillant */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-0.5">
                          <div className="flex items-center gap-1 truncate" title={`Salle: ${slot.classroom}`}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{slot.classroom || 'Salle 01'}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate" title={`Surveillant: ${slot.supervisorName}`}>
                            <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate font-semibold text-slate-700">{slot.supervisorName || 'Surveillant'}</span>
                          </div>
                        </div>

                        {slot.notes && (
                          <div className="text-[9px] text-amber-800 bg-amber-50/60 p-1 rounded border border-amber-200/60 leading-tight">
                            ℹ️ {slot.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VUE TABLEAU OFFICIEL */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-2.5">Horaires</th>
                  <th className="py-2 px-2">Durée</th>
                  <th className="py-2 px-3">Matière / Épreuve</th>
                  <th className="py-2 px-2 text-center">Coeff</th>
                  <th className="py-2 px-2.5">Salle</th>
                  <th className="py-2 px-3">Surveillant(s)</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentClassSlots.map(slot => (
                  <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {slot.date.split('-').reverse().join('/')}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-blue-900">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    <td className="py-2 px-2 text-slate-600 font-medium">
                      {Math.floor(slot.durationMinutes / 60)}h{slot.durationMinutes % 60 > 0 ? slot.durationMinutes % 60 : '00'}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {slot.subjectName}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-amber-700 font-mono">
                      ×{slot.coefficient}
                    </td>
                    <td className="py-2 px-2.5 text-slate-700">
                      {slot.classroom || 'Salle 01'}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      <p className="font-semibold text-slate-900">{slot.supervisorName || 'Surveillant'}</p>
                      {slot.supervisorName2 && (
                        <p className="text-[10px] text-slate-400">Adjoint : {slot.supervisorName2}</p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSlot(slot)}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlotToDelete(slot)}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MODAL : AJOUT / MODIFICATION D'UNE ÉPREUVE */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {slotEditing ? 'Modifier l\'Épreuve' : 'Planifier une Épreuve'}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Classe : {activeClass?.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlotSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Matière / Épreuve *</label>
                <select
                  required
                  value={slotForm.subjectId}
                  onChange={e => {
                    const sub = classSubjects.find(s => s.id === e.target.value);
                    setSlotForm(prev => ({
                      ...prev,
                      subjectId: e.target.value,
                      subjectName: sub?.name || prev.subjectName,
                      coefficient: sub?.coefficient || prev.coefficient
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-slate-400 cursor-pointer"
                >
                  {classSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} (Coeff: {sub.coefficient || 1})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date de l'épreuve *</label>
                  <input
                    type="date"
                    required
                    value={slotForm.date}
                    onChange={e => setSlotForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-slate-400 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Coefficient *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={slotForm.coefficient}
                    onChange={e => setSlotForm(prev => ({ ...prev, coefficient: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Heure de début *</label>
                  <input
                    type="time"
                    required
                    value={slotForm.startTime}
                    onChange={e => setSlotForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-blue-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Heure de fin *</label>
                  <input
                    type="time"
                    required
                    value={slotForm.endTime}
                    onChange={e => setSlotForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-blue-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Salle d'examen</label>
                  <input
                    type="text"
                    placeholder="Ex: Salle 01, Bâtiment A"
                    value={slotForm.classroom}
                    onChange={e => setSlotForm(prev => ({ ...prev, classroom: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Surveillant Titulaire</label>
                  <select
                    value={slotForm.supervisorTeacherId}
                    onChange={e => {
                      const t = teachers.find(teach => teach.id === e.target.value);
                      setSlotForm(prev => ({
                        ...prev,
                        supervisorTeacherId: e.target.value,
                        supervisorName: t?.fullName || ''
                      }));
                    }}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="">-- Choisir un surveillant --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Consignes / Matériel autorisé (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Règle graduée autorisée, calculatrice interdite"
                  value={slotForm.notes}
                  onChange={e => setSlotForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer"
                >
                  {slotEditing ? 'Mettre à jour' : 'Enregistrer l\'épreuve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL : GÉNÉRATEUR AUTOMATIQUE EN 1 CLIC */}
      {isAutoGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Générateur Automatique de Planning
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Pour la classe de {activeClass?.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-950">
              <span className="font-bold flex items-center gap-1 text-amber-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                Répartition Intelligente & Équilibrée :
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Le système va prendre les <strong>{classSubjects.length} matières</strong> de la classe, 
                les classer par coefficients officiels, et répartir les créneaux par demi-journées 
                (matin 08h-10h et 10h30-12h30) en alternant matières scientifiques et littéraires.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date de début des compositions *</label>
                <input
                  type="date"
                  required
                  value={autoGenStartDate}
                  onChange={e => setAutoGenStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-slate-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nombre de jours d'examen</label>
                  <select
                    value={autoGenDaysCount}
                    onChange={e => setAutoGenDaysCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={2}>2 Jours</option>
                    <option value={3}>3 Jours (Standard)</option>
                    <option value={4}>4 Jours</option>
                    <option value={5}>5 Jours (Complet)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Épreuves par jour</label>
                  <select
                    value={autoGenExamsPerDay}
                    onChange={e => setAutoGenExamsPerDay(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={2}>2 épreuves / jour (Matinée)</option>
                    <option value={3}>3 épreuves / jour (Matin & Soir)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAutoGenerateModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRunAutoGenerate}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Lancer la Génération</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL : CRÉATION / ÉDITION DE SESSION */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  {sessionEditing ? 'Modifier la Session' : 'Nouvelle Session de Composition'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSessionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Titre de la session *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compositions du 1er Trimestre 2026-2027"
                  value={sessionForm.title}
                  onChange={e => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type d'examen *</label>
                  <select
                    value={sessionForm.term}
                    onChange={e => setSessionForm(prev => ({ ...prev, term: e.target.value as ExamTermType }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none cursor-pointer font-semibold"
                  >
                    <option value="TRIMESTRE_1">1ère Composition (T1)</option>
                    <option value="TRIMESTRE_2">2ème Composition (T2)</option>
                    <option value="TRIMESTRE_3">3ème Composition (T3)</option>
                    <option value="DEF_BLANC">Examen Blanc DEF</option>
                    <option value="BAC_BLANC">Examen Blanc BAC</option>
                    <option value="BT_BLANC">Examen Blanc BT</option>
                    <option value="DEVOIR_SURVEILLE">Devoir Surveillé Commun</option>
                    <option value="AUTRE">Autre Session</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Statut *</label>
                  <select
                    value={sessionForm.status}
                    onChange={e => setSessionForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none cursor-pointer font-semibold"
                  >
                    <option value="PUBLIE">Publié (Actif)</option>
                    <option value="BROUILLON">Brouillon en cours</option>
                    <option value="TERMINE">Session Terminée</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date début</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.startDate}
                    onChange={e => setSessionForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date fin</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.endDate}
                    onChange={e => setSessionForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Consignes générales aux candidats</label>
                <textarea
                  rows={3}
                  value={sessionForm.generalInstructions}
                  onChange={e => setSessionForm(prev => ({ ...prev, generalInstructions: e.target.value }))}
                  placeholder="Consignes officielles..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer"
                >
                  {sessionEditing ? 'Mettre à jour' : 'Créer la Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL : SUPPRESSION D'ÉPREUVE */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-xl border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Supprimer cette épreuve ?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Voulez-vous retirer l'épreuve de <strong className="text-slate-800">{slotToDelete.subjectName}</strong> ({slotToDelete.date}) du planning ?
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSlot}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
