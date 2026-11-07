/**
 * SomaSikolo - Module de Suivi des Présences Quotidiennes & Registre d'Assiduité
 * Conforme aux normes de gestion des établissements scolaires du Mali.
 */

import React, { useState, useMemo } from 'react';
import { 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Printer, 
  Save, 
  Send, 
  CheckCheck, 
  FileSpreadsheet, 
  User, 
  Filter, 
  FileText, 
  Award,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Calendar as CalendarIcon,
  Trash2,
  Camera,
  QrCode
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { AttendanceStatus, AttendanceRecord, Student } from '../../types';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { StudentQrScannerModal } from '../../components/qr/StudentQrScannerModal';
import { StudentQrProfileModal } from '../../components/qr/StudentQrProfileModal';
import { offlineScanQueueService } from '../../services/offlineScanQueue';

export const AttendanceModule: React.FC = () => {
  const { students, classes, attendanceRecords, saveAttendanceBatch, deleteAllAttendanceRecords, settings } = useSchool();
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Active Tab: 'CALL' = Saisie de l'Appel | 'REGISTER' = Registre & Rapports
  const [activeTab, setActiveTab] = useState<'CALL' | 'REGISTER'>('CALL');

  // Filters for Daily Call
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [markedByTeacher, setMarkedByTeacher] = useState<string>('Surveillant Général / Ens. Titulaire');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local state for daily call before saving
  const [callState, setCallState] = useState<{
    [studentId: string]: {
      status: AttendanceStatus;
      reason: string;
      lateMinutes: number;
    }
  }>({});

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // Class Students
  const classStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId && s.status === 'ACTIF');
  }, [students, selectedClassId]);

  // Selected Class Object
  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Initialize or load existing records for selected date and class
  React.useEffect(() => {
    const initialState: { [studentId: string]: { status: AttendanceStatus; reason: string; lateMinutes: number } } = {};
    
    classStudents.forEach(student => {
      const existing = attendanceRecords.find(r => r.studentId === student.id && r.date === selectedDate);
      if (existing) {
        initialState[student.id] = {
          status: existing.status,
          reason: existing.reason || '',
          lateMinutes: existing.lateMinutes || 15
        };
      } else {
        initialState[student.id] = {
          status: 'PRESENT',
          reason: '',
          lateMinutes: 0
        };
      }
    });

    setCallState(initialState);
  }, [selectedClassId, selectedDate, classStudents, attendanceRecords]);

  // Handle individual status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setCallState(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        lateMinutes: status === 'LATE' ? (prev[studentId]?.lateMinutes || 15) : 0
      }
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setCallState(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason
      }
    }));
  };

  const handleLateMinutesChange = (studentId: string, minutes: number) => {
    setCallState(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        lateMinutes: minutes
      }
    }));
  };

  // Mark all students present
  const handleMarkAllPresent = () => {
    const updated = { ...callState };
    classStudents.forEach(student => {
      updated[student.id] = {
        status: 'PRESENT',
        reason: '',
        lateMinutes: 0
      };
    });
    setCallState(updated);
  };

  // Save Attendance Call Batch
  const handleSaveCall = () => {
    const recordsToSave: Partial<AttendanceRecord>[] = classStudents.map(student => {
      const state = callState[student.id] || { status: 'PRESENT', reason: '', lateMinutes: 0 };
      return {
        date: selectedDate,
        studentId: student.id,
        studentMatricule: student.matricule,
        studentName: `${student.lastName} ${student.firstName}`,
        classId: selectedClassId,
        className: currentClass?.name || '',
        status: state.status,
        reason: state.reason,
        lateMinutes: state.lateMinutes,
        markedBy: markedByTeacher,
        academicYear: settings.currentAcademicYear || '2025-2026'
      };
    });

    saveAttendanceBatch(recordsToSave);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Daily Statistics for selected class & date
  const dailyStats = useMemo(() => {
    let presents = 0;
    let lates = 0;
    let absJustified = 0;
    let absUnjustified = 0;

    classStudents.forEach(s => {
      const st = callState[s.id]?.status || 'PRESENT';
      if (st === 'PRESENT') presents++;
      else if (st === 'LATE') lates++;
      else if (st === 'ABSENT_JUSTIFIED') absJustified++;
      else if (st === 'ABSENT_UNJUSTIFIED') absUnjustified++;
    });

    const total = classStudents.length;
    const rate = total > 0 ? Math.round(((presents + lates) / total) * 100) : 100;

    return { total, presents, lates, absJustified, absUnjustified, rate };
  }, [classStudents, callState]);

  // Filtered Students for Daily Call search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => {
      const full = `${s.firstName} ${s.lastName} ${s.matricule}`.toLowerCase();
      return full.includes(searchQuery.toLowerCase());
    });
  }, [classStudents, searchQuery]);

  // Export Daily Call PDF
  const handleExportDailyPdf = () => {
    const currentRecords: AttendanceRecord[] = classStudents.map(student => {
      const st = callState[student.id] || { status: 'PRESENT', reason: '', lateMinutes: 0 };
      return {
        id: `temp-${student.id}`,
        date: selectedDate,
        studentId: student.id,
        studentMatricule: student.matricule,
        studentName: `${student.lastName} ${student.firstName}`,
        classId: selectedClassId,
        className: currentClass?.name || '',
        status: st.status,
        reason: st.reason,
        lateMinutes: st.lateMinutes,
        markedBy: markedByTeacher,
        academicYear: settings.currentAcademicYear || '2025-2026'
      };
    });

    const formattedDate = new Date(selectedDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    PdfService.generateAttendanceReportPdf(
      currentClass?.name || 'Classe',
      `Fiche d'Appel du ${formattedDate}`,
      currentRecords,
      classStudents,
      settings
    );
  };

  // Helper to get parent phone number
  const getStudentParentPhone = (student: Student): string => {
    if (!student.parent) return '';
    return student.parent.fatherPhone || student.parent.motherPhone || student.parent.guardianPhone || '';
  };

  // WhatsApp helper to alert absent student's parent
  const sendWhatsAppAlert = (student: Student, status: AttendanceStatus, reason?: string) => {
    const parentPhone = getStudentParentPhone(student);
    if (!parentPhone) return;
    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('223') ? cleanPhone : `223${cleanPhone}`;
    const dateFormatted = new Date(selectedDate).toLocaleDateString('fr-FR');
    
    let statusText = "ABSENT(E)";
    if (status === 'LATE') statusText = "EN RETARD";
    if (status === 'ABSENT_JUSTIFIED') statusText = "ABSENT(E) (Justifié)";

    const message = `*AVIS D'ASSIDUITÉ - ${settings.schoolName.toUpperCase()}*\n\n` +
      `Cher Tuteur / Parent de *${student.firstName} ${student.lastName}* (Matricule: ${student.matricule}),\n\n` +
      `Nous vous informons que votre enfant a été noté(e) *${statusText}* le *${dateFormatted}* en classe de *${currentClass?.name}*.\n` +
      (reason ? `Motif renseigné : ${reason}\n` : '') +
      `\nPour toute justification ou information, veuillez contacter le surveillant au *${settings.phone}*.\n\n` +
      `*Direction de l'Établissement*`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
  };

  // Overall Attendance Summary per Student for Register Tab
  const registerSummary = useMemo(() => {
    return classStudents.map(student => {
      const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
      const totalDays = studentRecords.length;
      const presents = studentRecords.filter(r => r.status === 'PRESENT').length;
      const lates = studentRecords.filter(r => r.status === 'LATE').length;
      const absJustified = studentRecords.filter(r => r.status === 'ABSENT_JUSTIFIED').length;
      const absUnjustified = studentRecords.filter(r => r.status === 'ABSENT_UNJUSTIFIED').length;

      const rate = totalDays > 0 ? Math.round(((presents + lates) / totalDays) * 100) : 100;

      return {
        student,
        totalDays,
        presents,
        lates,
        absJustified,
        absUnjustified,
        rate
      };
    });
  }, [classStudents, attendanceRecords]);

  // Export Cumulative Register CSV
  const handleExportCSV = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Classe', 'Total Jours', 'Présences', 'Retards', 'Absences Justifiées', 'Absences Non Justifiées', 'Taux Assiduité %'];
    const rows = registerSummary.map(item => [
      item.student.matricule,
      item.student.lastName,
      item.student.firstName,
      currentClass?.name || '',
      item.totalDays,
      item.presents,
      item.lates,
      item.absJustified,
      item.absUnjustified,
      `${item.rate}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Registre_Assiduite_${currentClass?.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* Barre d'Action & Contrôles Unifiée Ultra-Compacte */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Titre + Onglets + Sélecteurs Classe & Date */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <CalendarCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline font-bold">Présences</span>
            </div>

            {/* Switcher Appel / Registre */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('CALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'CALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Appel
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REGISTER')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'REGISTER'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Registre</span>
              </button>
            </div>

            {/* Classe select */}
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-slate-400 cursor-pointer max-w-[150px] shrink-0"
              title="Sélectionner la classe"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            {/* Date input */}
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-slate-400 cursor-pointer shrink-0"
              title="Date de l'appel"
            />

            {/* Inlined Search */}
            <div className="relative flex-1 min-w-[140px] max-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher élève..."
                className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              title="Scanner le QR Code"
            >
              <Camera className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Scanner</span>
            </button>

            {activeTab === 'CALL' && (
              <>
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-all cursor-pointer"
                  title="Marquer tous les élèves de la classe présents"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tous Présents</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDailyPdf}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                  title="Imprimer la feuille d'appel PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleSaveCall}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </>
            )}

            {attendanceRecords.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Vider toutes les présences"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Micro-synthèse d'assiduité sur une ligne discrète */}
        {activeTab === 'CALL' && (
          <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span>Effectif : <strong className="text-slate-900 font-mono">{dailyStats.total}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Présents : <strong className="text-emerald-700 font-mono">{dailyStats.presents}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Retards : <strong className="text-amber-700 font-mono">{dailyStats.lates}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Absences : <strong className="text-rose-700 font-mono">{dailyStats.absJustified + dailyStats.absUnjustified}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Assiduité : <strong className="text-blue-900 font-mono">{dailyStats.rate}%</strong></span>
          </div>
        )}
      </div>

      {/* SUCCESS BANNER NOTIFICATION */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-emerald-900 text-xs font-bold animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Présences enregistrées avec succès pour la classe {currentClass?.name}.</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
            Sauvegardé
          </span>
        </div>
      )}

      {/* TAB 1: APPPEL QUOTIDIEN */}
      {activeTab === 'CALL' && (
        <div className="space-y-2">
          {/* Student List for Attendance Marking */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <User className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                <p className="text-xs font-bold">Aucun élève trouvé dans cette classe pour ces critères.</p>
                <p className="text-[11px] text-slate-400">Veuillez sélectionner une autre classe ou vérifier la liste des élèves inscrit(e)s.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const state = callState[student.id] || { status: 'PRESENT', reason: '', lateMinutes: 0 };
                  const isAbsent = state.status === 'ABSENT_UNJUSTIFIED' || state.status === 'ABSENT_JUSTIFIED';

                  return (
                    <div
                      key={student.id}
                      className={`p-2 sm:p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 transition-all ${
                        state.status === 'PRESENT'
                          ? 'hover:bg-slate-50/80'
                          : state.status === 'LATE'
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : state.status === 'ABSENT_JUSTIFIED'
                          ? 'bg-indigo-50/30 hover:bg-indigo-50/50'
                          : 'bg-rose-50/30 hover:bg-rose-50/50'
                      }`}
                    >
                      {/* Left: Student Identity */}
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <span className="text-[11px] font-black text-slate-400 w-5 shrink-0">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0 overflow-hidden">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{student.firstName[0]}{student.lastName[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                            <span>{student.lastName.toUpperCase()} {student.firstName}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {student.gender === 'F' ? 'Fille' : 'Garçon'}
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>Mat: {student.matricule}</span>
                            <span>•</span>
                            <span>Tél: {getStudentParentPhone(student) || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Attendance Status Buttons */}
                      <div className="flex flex-wrap items-center gap-1">
                        {/* PRESENT */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'PRESENT')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Présent</span>
                        </button>

                        {/* LATE */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'LATE')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'LATE'
                              ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>En Retard</span>
                        </button>

                        {/* ABSENT JUSTIFIED */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'ABSENT_JUSTIFIED')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'ABSENT_JUSTIFIED'
                              ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Abs. Justifié</span>
                        </button>

                        {/* ABSENT UNJUSTIFIED */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'ABSENT_UNJUSTIFIED')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'ABSENT_UNJUSTIFIED'
                              ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent (Injustifié)</span>
                        </button>
                      </div>

                      {/* Right: Reason input & WhatsApp Parent Relance */}
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {state.status === 'LATE' && (
                          <div className="flex items-center gap-1 bg-amber-100/80 px-2 py-1 rounded-xl text-amber-900 text-xs font-bold">
                            <span>Retard:</span>
                            <input
                              type="number"
                              min="5"
                              max="120"
                              step="5"
                              value={state.lateMinutes || 15}
                              onChange={e => handleLateMinutesChange(student.id, parseInt(e.target.value) || 15)}
                              className="w-12 bg-white px-1.5 py-0.5 rounded border border-amber-300 text-center font-bold text-xs"
                            />
                            <span>min</span>
                          </div>
                        )}

                        <input
                          type="text"
                          value={state.reason}
                          onChange={e => handleReasonChange(student.id, e.target.value)}
                          placeholder={isAbsent ? "Motif de l'absence..." : "Commentaire / Note..."}
                          className="flex-1 md:w-48 p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-900"
                        />

                        {isAbsent && getStudentParentPhone(student) && (
                          <button
                            type="button"
                            onClick={() => sendWhatsAppAlert(student, state.status, state.reason)}
                            title="Avertir le parent sur WhatsApp"
                            className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRE & RAPPORTS D'ASSIDUITÉ */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-2">
          {/* Register Action Bar */}
          <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Registre Cumulé d'Assiduité — Classe {currentClass?.name}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Statistiques cumulées des absences, retards et taux de présence par élève
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-slate-200"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportDailyPdf}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Rapport PDF</span>
              </button>
            </div>
          </div>

          {/* Table of Cumulative Attendance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2 px-2.5">N°</th>
                    <th className="py-2 px-3">Élève</th>
                    <th className="py-2 px-2.5 text-center">Jours</th>
                    <th className="py-2 px-2.5 text-center">Présences</th>
                    <th className="py-2 px-2.5 text-center">Retards</th>
                    <th className="py-2 px-2.5 text-center">Abs. Just.</th>
                    <th className="py-2 px-2.5 text-center">Abs. Injust.</th>
                    <th className="py-2 px-2.5 text-center">Taux Assiduité</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {registerSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Aucune donnée de présence enregistrée pour cette classe.
                      </td>
                    </tr>
                  ) : (
                    registerSummary.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 sm:py-2 px-2.5 font-bold text-slate-400">#{String(idx + 1).padStart(2, '0')}</td>
                        <td className="py-1.5 sm:py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">
                            {item.student.lastName.toUpperCase()} {item.student.firstName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.student.matricule}
                          </div>
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-center font-bold text-slate-700">{item.totalDays}j</td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-center font-bold text-emerald-600">{item.presents}</td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-center font-bold text-amber-600">{item.lates}</td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-center font-bold text-indigo-600">{item.absJustified}</td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-center font-bold text-rose-600">{item.absUnjustified}</td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              item.rate >= 90
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.rate >= 75
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {item.rate}% {item.rate < 75 ? '⚠️' : ''}
                          </span>
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 text-right">
                          <button
                            onClick={() => setSelectedStudentForHistory(item.student)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-900" />
                            <span>Historique</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT INDIVIDUAL ATTENDANCE HISTORY MODAL */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  Fiche Individuelle d'Assiduité
                </span>
                <h3 className="text-lg font-black tracking-tight">
                  {selectedStudentForHistory.firstName} {selectedStudentForHistory.lastName.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Matricule: {selectedStudentForHistory.matricule} • Classe: {currentClass?.name}
                </p>
              </div>

              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Attendance History Records */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                Historique des enregistrements
              </div>

              {attendanceRecords.filter(r => r.studentId === selectedStudentForHistory.id).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  Aucune absence ni retard enregistré pour cet élève.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {attendanceRecords
                    .filter(r => r.studentId === selectedStudentForHistory.id)
                    .map(rec => (
                      <div key={rec.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="font-bold text-slate-800">
                          {new Date(rec.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'LATE'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'ABSENT_JUSTIFIED'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status === 'PRESENT' ? 'Présent' :
                             rec.status === 'LATE' ? `Retard (${rec.lateMinutes || 15}m)` :
                             rec.status === 'ABSENT_JUSTIFIED' ? 'Absent Justifié' : 'Absent Injustifié'}
                          </span>
                        </div>

                        <div className="text-slate-500 italic text-right max-w-xs truncate">
                          {rec.reason || 'Aucun motif'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete All Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllAttendanceRecords}
        title="Supprimer Toutes les Fiches de Présence"
        itemCount={attendanceRecords.length}
        description="Attention ! Cette action supprimera définitivement TOUTES les fiches de présence et le registre d'assiduité."
      />

      {/* QR Scanner Modal */}
      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onStudentFound={(student) => {
          setIsScannerOpen(false);
          // Mark as present in the current call state
          handleStatusChange(student.id, 'PRESENT');
          // If offline, queue for persistent background sync
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const cls = classes.find(c => c.id === student.classId);
            offlineScanQueueService.enqueueAttendanceScan(
              student,
              cls?.name,
              selectedDate,
              'PRESENT',
              'CAMERA'
            );
          }
          setSelectedStudentForProfile(student);
        }}
      />

      {/* Student QR Profile Detailed Dossier Modal */}
      {selectedStudentForProfile && (
        <StudentQrProfileModal
          student={selectedStudentForProfile}
          isOpen={Boolean(selectedStudentForProfile)}
          onClose={() => setSelectedStudentForProfile(null)}
          onScanAnother={() => {
            setSelectedStudentForProfile(null);
            setIsScannerOpen(true);
          }}
        />
      )}
    </div>
  );
};

// Helper Icon component
function CheckSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 11 2 2 4-4"/>
      <rect width="18" height="18" x="3" y="3" rx="2"/>
    </svg>
  );
}
