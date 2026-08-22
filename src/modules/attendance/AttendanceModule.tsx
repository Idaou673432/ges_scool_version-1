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
  Trash2
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { AttendanceStatus, AttendanceRecord, Student } from '../../types';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';

export const AttendanceModule: React.FC = () => {
  const { students, classes, attendanceRecords, saveAttendanceBatch, deleteAllAttendanceRecords, settings } = useSchool();
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

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
    <div className="space-y-6">
      {/* Module Header & Action Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-900 rounded-2xl">
              <CalendarCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                Suivi des Présences & Assiduité
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Saisie quotidienne des appels, contrôle des absents, relances WhatsApp & registre trimestriel
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {attendanceRecords.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer Tout ({attendanceRecords.length})</span>
            </button>
          )}

          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('CALL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CALL'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckSquareIcon className="w-4 h-4" />
              <span>Appel Quotidien</span>
            </button>
            <button
              onClick={() => setActiveTab('REGISTER')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Registre & Rapports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              1. Sélectionner la Classe *
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.level}) — {cls.academicYear}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-900" />
              <span>2. Date de l'Appel *</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              3. Enseignant / Agent Responsable
            </label>
            <input
              type="text"
              value={markedByTeacher}
              onChange={e => setMarkedByTeacher(e.target.value)}
              placeholder="Nom du professeur ou surveillant"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              4. Rechercher un Élève
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nom, prénom ou matricule..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS BANNER NOTIFICATION */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">
              Les présences quotidiennes pour la classe {currentClass?.name} ont été enregistrées avec succès dans la base de données local storage & SQLite !
            </span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
            Sauvegardé
          </span>
        </div>
      )}

      {/* TAB 1: APPPEL QUOTIDIEN */}
      {activeTab === 'CALL' && (
        <div className="space-y-6">
          {/* Daily Quick Stats Card Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Effectif Total</div>
              <div className="text-xl font-black text-slate-900 mt-1">{dailyStats.total} élève(s)</div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Présents</span>
              </div>
              <div className="text-xl font-black text-emerald-900 mt-1">{dailyStats.presents}</div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>En Retard</span>
              </div>
              <div className="text-xl font-black text-amber-900 mt-1">{dailyStats.lates}</div>
            </div>

            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Abs. Justifiés</span>
              </div>
              <div className="text-xl font-black text-indigo-900 mt-1">{dailyStats.absJustified}</div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-widest text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Abs. Injustifiés</span>
              </div>
              <div className="text-xl font-black text-rose-900 mt-1">{dailyStats.absUnjustified}</div>
            </div>

            <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-200">Taux du Jour</div>
              <div className="text-xl font-black mt-1">{dailyStats.rate}%</div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tout Marquer Présent</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDailyPdf}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Imprimer Feuille d'Appel (PDF)</span>
              </button>

              <button
                onClick={handleSaveCall}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-blue-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer l'Appel</span>
              </button>
            </div>
          </div>

          {/* Student List for Attendance Marking */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <User className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                <p className="text-sm font-bold">Aucun élève trouvé dans cette classe pour ces critères.</p>
                <p className="text-xs text-slate-400">Veuillez sélectionner une autre classe ou vérifier la liste des élèves inscrit(e)s.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const state = callState[student.id] || { status: 'PRESENT', reason: '', lateMinutes: 0 };
                  const isAbsent = state.status === 'ABSENT_UNJUSTIFIED' || state.status === 'ABSENT_JUSTIFIED';

                  return (
                    <div
                      key={student.id}
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
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
                      <div className="flex items-center gap-3.5 min-w-[240px]">
                        <span className="text-xs font-black text-slate-400 w-6 shrink-0">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0 overflow-hidden">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{student.firstName[0]}{student.lastName[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                            <span>{student.lastName.toUpperCase()} {student.firstName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {student.gender === 'F' ? 'Fille' : 'Garçon'}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Matricule: {student.matricule}</span>
                            <span>•</span>
                            <span>Parent: {getStudentParentPhone(student) || 'Non renseigné'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Attendance Status Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* PRESENT */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'PRESENT')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
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
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'LATE'
                              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
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
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'ABSENT_JUSTIFIED'
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
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
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            state.status === 'ABSENT_UNJUSTIFIED'
                              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
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
        <div className="space-y-6">
          {/* Register Action Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Registre Cumulé d'Assiduité — Classe {currentClass?.name}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Statistiques cumulées des absences, retards et taux de présence pour chaque élève
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-slate-300"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exporter Registre CSV</span>
              </button>

              <button
                onClick={handleExportDailyPdf}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-900/20"
              >
                <Printer className="w-4 h-4" />
                <span>Rapport PDF de Classe</span>
              </button>
            </div>
          </div>

          {/* Table of Cumulative Attendance */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                    <th className="p-4 rounded-tl-3xl">N°</th>
                    <th className="p-4">Élève</th>
                    <th className="p-4 text-center">Jours Marqués</th>
                    <th className="p-4 text-center">Présences</th>
                    <th className="p-4 text-center">Retards (Min)</th>
                    <th className="p-4 text-center">Abs. Justifiées</th>
                    <th className="p-4 text-center">Abs. Injustifiées</th>
                    <th className="p-4 text-center">Taux d'Assiduité</th>
                    <th className="p-4 text-right rounded-tr-3xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {registerSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Aucune donnée de présence enregistrée pour cette classe.
                      </td>
                    </tr>
                  ) : (
                    registerSummary.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-black text-slate-400">#{String(idx + 1).padStart(2, '0')}</td>
                        <td className="p-4">
                          <div className="font-black text-slate-900 text-sm">
                            {item.student.lastName.toUpperCase()} {item.student.firstName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            Matricule: {item.student.matricule}
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700">{item.totalDays} jour(s)</td>
                        <td className="p-4 text-center font-bold text-emerald-600">{item.presents}</td>
                        <td className="p-4 text-center font-bold text-amber-600">{item.lates}</td>
                        <td className="p-4 text-center font-bold text-indigo-600">{item.absJustified}</td>
                        <td className="p-4 text-center font-black text-rose-600">{item.absUnjustified}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${
                              item.rate >= 90
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.rate >= 75
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {item.rate}% {item.rate < 75 ? '⚠️ Alerte' : ''}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedStudentForHistory(item.student)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
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
