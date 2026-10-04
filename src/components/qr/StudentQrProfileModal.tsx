/**
 * SomaSikolo / KalanGest - Fiche Numérique Complète de l'Élève après Scan QR
 * Affiche l'ensemble des informations de l'élève (Moyenne, Absences, Groupe Sanguin, Finances, Parents)
 * avec une interface épurée, moderne et intuitive.
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Droplet, 
  Award, 
  Calendar, 
  Clock, 
  Phone, 
  MapPin, 
  AlertTriangle, 
  Wallet, 
  UserCheck, 
  BookOpen, 
  Printer, 
  MessageCircle, 
  QrCode, 
  RefreshCw, 
  Copy, 
  Check, 
  TrendingUp, 
  HeartPulse, 
  User, 
  FileText,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Student, SchoolClass, AttendanceRecord, ReportCard, Payment } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { formatFCFA, getAnnualTuitionFee, getMaliScoreAppreciation } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';

interface StudentQrProfileModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onScanAnother?: () => void;
  onNavigateToBulletin?: (student: Student) => void;
  onNavigateToPayments?: (student: Student) => void;
}

export const StudentQrProfileModal: React.FC<StudentQrProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onScanAnother,
  onNavigateToBulletin,
  onNavigateToPayments
}) => {
  const { classes, subjects, grades, attendanceRecords, payments, generateReportCard, settings, saveAttendanceBatch } = useSchool();
  const [copiedMatricule, setCopiedMatricule] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);

  // Student class
  const studentClass = useMemo(() => {
    return classes.find(c => c.id === student.classId);
  }, [classes, student.classId]);

  // Student report card & live academic average
  const reportCard: ReportCard | null = useMemo(() => {
    return generateReportCard(student.id, settings.activeTerm);
  }, [generateReportCard, student.id, settings.activeTerm, grades]);

  // Attendance statistics
  const studentAttendance = useMemo(() => {
    const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
    const presents = studentRecords.filter(r => r.status === 'PRESENT').length;
    const absencesJustified = studentRecords.filter(r => r.status === 'ABSENT_JUSTIFIED').length;
    const absencesUnjustified = studentRecords.filter(r => r.status === 'ABSENT_UNJUSTIFIED').length;
    const lates = studentRecords.filter(r => r.status === 'LATE').length;
    const totalDays = studentRecords.length;
    const attendanceRate = totalDays > 0 ? Math.round((presents / totalDays) * 100) : 100;

    // Check today's status
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = studentRecords.find(r => r.date === todayStr);

    return {
      presents,
      absencesJustified,
      absencesUnjustified,
      totalAbsences: absencesJustified + absencesUnjustified,
      lates,
      attendanceRate,
      todayRecord,
      recentRecords: studentRecords.slice(-4).reverse()
    };
  }, [attendanceRecords, student.id]);

  // Financial status
  const financialStatus = useMemo(() => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const totalPaid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const annualFee = getAnnualTuitionFee(studentClass, settings.evaluationCount);
    const remaining = Math.max(0, annualFee - totalPaid);
    const percentPaid = annualFee > 0 ? Math.min(100, Math.round((totalPaid / annualFee) * 100)) : 100;
    const isUpToDate = remaining <= 0;
    const isCriticalUnpaid = totalPaid === 0 && annualFee > 0;

    return {
      totalPaid,
      annualFee,
      remaining,
      percentPaid,
      isUpToDate,
      isCriticalUnpaid,
      paymentsCount: studentPayments.length
    };
  }, [payments, student.id, studentClass, settings.evaluationCount]);

  if (!isOpen) return null;

  const handleCopyMatricule = () => {
    navigator.clipboard.writeText(student.matricule);
    setCopiedMatricule(true);
    setTimeout(() => setCopiedMatricule(false), 2000);
  };

  const handleMarkPresentToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newRecord: Partial<AttendanceRecord> = {
      date: todayStr,
      studentId: student.id,
      studentMatricule: student.matricule,
      studentName: `${student.lastName.toUpperCase()} ${student.firstName}`,
      classId: student.classId,
      className: studentClass?.name || 'Classe non assignée',
      status: 'PRESENT',
      markedBy: settings.directorName || 'Contrôle QR',
      academicYear: settings.currentAcademicYear
    };
    saveAttendanceBatch([newRecord]);
    setAttendanceNotice('Présence enregistrée avec succès pour aujourd\'hui !');
    setTimeout(() => setAttendanceNotice(null), 3000);
  };

  const handlePrintCard = () => {
    PdfService.generateStudentCardsBatchPdf([student], classes, settings);
  };

  const bloodGroup = student.bloodType || null;
  const isNegativeRh = bloodGroup ? bloodGroup.includes('-') : false;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Top Header Verification Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  QR Code Vérifié avec Succès
                </span>
                <span className="text-[10px] text-white/60 font-mono">
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                {settings.schoolName || 'Établissement Scolaire'} • Année {settings.currentAcademicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onScanAnother && (
              <button
                type="button"
                onClick={onScanAnother}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/15"
                title="Scanner un autre QR code"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300" />
                <span>Re-scanner</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Attendance Notification Toast */}
          {attendanceNotice && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-black animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{attendanceNotice}</span>
            </div>
          )}

          {/* Student Hero Identity Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Student Photo / Avatar */}
            <div className="relative shrink-0">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.firstName}
                  className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-gradient-to-br from-blue-900 to-slate-900 text-white flex flex-col items-center justify-center font-black shadow-md border-2 border-white">
                  <span className="text-2xl uppercase tracking-wider">
                    {student.firstName[0]}{student.lastName[0]}
                  </span>
                  <span className="text-[9px] text-white/60 uppercase mt-1">Photo Officielle</span>
                </div>
              )}
              <span className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs ${
                student.status === 'ACTIF' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
              }`}>
                {student.status}
              </span>
            </div>

            {/* Name, Matricule & Class Info */}
            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight leading-tight">
                  {student.lastName} {student.firstName}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1 text-xs text-slate-500 font-bold">
                  <span className="text-blue-950 font-black">
                    {studentClass?.name || 'Classe non assignée'}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>{student.gender === 'M' ? 'Garçon / Masculin' : 'Fille / Féminin'}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>Né(e) le {new Date(student.birthDate).toLocaleDateString('fr-FR')} ({student.birthPlace || 'Mali'})</span>
                </div>
              </div>

              {/* Matricule Badge with Copy */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-black text-blue-950 shadow-2xs">
                  <QrCode className="w-3.5 h-3.5 text-blue-900" />
                  <span>Matricule : {student.matricule}</span>
                  <button
                    type="button"
                    onClick={handleCopyMatricule}
                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Copier le matricule"
                  >
                    {copiedMatricule ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cycle : {studentClass?.category?.replace('_', ' ') || 'Fondamental'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CRITICAL VITALS: BLOOD TYPE & EMERGENCY MEDICAL INFO */}
          <div className="bg-gradient-to-br from-rose-50 via-white to-amber-50 border border-rose-200/90 rounded-[2rem] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-950">
                  Données Médicales & Urgence Sanitaire
                </h3>
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                Vérification d'Identité Médicale
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Blood Type Card */}
              <div className="bg-white p-4 rounded-2xl border border-rose-200 flex items-center gap-4 shadow-2xs">
                <div className={`w-14 h-14 rounded-2xl ${bloodGroup ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'} flex flex-col items-center justify-center font-black shadow-md shrink-0`}>
                  <Droplet className={`w-5 h-5 ${bloodGroup ? 'text-rose-200' : 'text-slate-400'} fill-current mb-0.5`} />
                  <span className="text-base leading-none font-mono font-black">{bloodGroup || '—'}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Groupe Sanguin
                  </p>
                  <p className="text-base font-black text-rose-950 font-mono mt-0.5">
                    {bloodGroup ? `${bloodGroup} ${isNegativeRh ? '(Rhésus Négatif)' : '(Rhésus Positif)'}` : 'Non renseigné (Optionnel)'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {bloodGroup ? 'Carte donneur / groupe certifié' : 'Information non communiquée'}
                  </p>
                </div>
              </div>

              {/* Allergies / Medical Notes */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Allergies & Précautions
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-1 leading-relaxed">
                    {student.allergies || 'Aucune allergie ni contre-indication signalée.'}
                  </p>
                </div>
                {student.observations && (
                  <p className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-100 pt-1.5 truncate">
                    Obs: {student.observations}
                  </p>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Contact d'Urgence Immédiat
                  </p>
                  <p className="text-xs font-black text-slate-900 mt-1 truncate">
                    {student.emergencyContact || student.parent.fatherPhone || student.parent.motherPhone || 'Non renseigné'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Parent : {student.parent.fatherName || student.parent.motherName || 'Tuteur légal'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {(student.parent.fatherPhone || student.parent.motherPhone) && (
                    <>
                      <a
                        href={`tel:${student.parent.fatherPhone || student.parent.motherPhone}`}
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        <Phone className="w-3 h-3 text-blue-800" />
                        <span>Appeler</span>
                      </a>
                      <a
                        href={`https://wa.me/${(student.parent.fatherPhone || student.parent.motherPhone || '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-700" />
                        <span>WhatsApp</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMNS: ACADEMIC GRADES & ATTENDANCE / ABSENCES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Academic Performance (Moyenne Générale & Rang) */}
            <div className="bg-white border border-slate-200/90 rounded-[2rem] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Rendement Académique & Moyenne
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {settings.activeTerm?.replace('_', ' ') || 'Trimestre 1'}
                  </span>
                </div>

                {reportCard ? (
                  <div className="space-y-4 pt-3">
                    {/* Big Average Display */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Moyenne Générale Actuelle
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={`text-3xl font-black font-mono ${
                            reportCard.generalAverage >= 10 ? 'text-blue-950' : 'text-rose-700'
                          }`}>
                            {reportCard.generalAverage.toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            / {reportCard.maxScore || 20}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                          Rang dans la classe
                        </span>
                        <span className="text-xl font-black text-amber-600 font-mono">
                          {reportCard.rankInClass}
                          <span className="text-xs font-bold text-slate-500">
                            e / {reportCard.totalClassStudents}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Malian Official Mention / Appreciation */}
                    <div className="text-xs">
                      <div className="flex items-center justify-between text-slate-600 font-bold mb-1">
                        <span>Mention Officielle :</span>
                        <strong className="text-slate-900">
                          {getMaliScoreAppreciation(reportCard.generalAverage, reportCard.maxScore || 20).appreciation}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Points Totaux : <strong>{reportCard.totalPoints.toFixed(1)} pts</strong></span>
                        <span>Coefficients : <strong>{reportCard.totalCoefficients}</strong></span>
                        <span>Moyenne Classe : <strong>{reportCard.classOverallAverage.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    {/* Top Subject Averages Mini Breakdown */}
                    {reportCard.subjectAverages && reportCard.subjectAverages.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Notes par Discipline Principale
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {reportCard.subjectAverages.slice(0, 4).map(sub => (
                            <div key={sub.subjectId} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-700 truncate pr-2">{sub.subjectCode || sub.subjectName}</span>
                              <span className="font-mono font-black text-blue-950 shrink-0">
                                {sub.finalScore.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs font-bold space-y-1">
                    <p>Aucune note enregistrée pour cet élève ce trimestre.</p>
                    <p className="text-[11px] text-slate-400 font-normal">Saisissez les devoirs ou compositions dans le module Bulletins.</p>
                  </div>
                )}
              </div>

              {onNavigateToBulletin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToBulletin(student);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                  <span>Consulter le Bulletin Complet</span>
                </button>
              )}
            </div>

            {/* 2. Attendance & Absences (Assiduité & Ponctualité) */}
            <div className="bg-white border border-slate-200/90 rounded-[2rem] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-900" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Assiduité, Absences & Ponctualité
                    </h3>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    studentAttendance.attendanceRate >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {studentAttendance.attendanceRate}% Présence
                  </span>
                </div>

                <div className="space-y-4 pt-3">
                  {/* Grid KPI Attendance */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-emerald-700 block">Présences</span>
                      <span className="text-xl font-black font-mono text-emerald-950 mt-0.5 block">
                        {studentAttendance.presents}
                      </span>
                    </div>

                    <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-rose-700 block">Absences</span>
                      <span className="text-xl font-black font-mono text-rose-950 mt-0.5 block">
                        {studentAttendance.totalAbsences}
                      </span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-amber-700 block">Retards</span>
                      <span className="text-xl font-black font-mono text-amber-950 mt-0.5 block">
                        {studentAttendance.lates}
                      </span>
                    </div>
                  </div>

                  {/* Absences Breakdown Details */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-bold">
                      <span>Absences Justifiées :</span>
                      <span className="font-mono text-slate-900">{studentAttendance.absencesJustified}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-bold">
                      <span>Absences Injustifiées :</span>
                      <span className="font-mono text-rose-700 font-black">{studentAttendance.absencesUnjustified}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-bold">
                      <span>Statut du Jour ({new Date().toLocaleDateString('fr-FR')}) :</span>
                      <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-md ${
                        studentAttendance.todayRecord?.status === 'PRESENT'
                          ? 'bg-emerald-200 text-emerald-950'
                          : studentAttendance.todayRecord?.status === 'LATE'
                          ? 'bg-amber-200 text-amber-950'
                          : studentAttendance.todayRecord
                          ? 'bg-rose-200 text-rose-950'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {studentAttendance.todayRecord ? studentAttendance.todayRecord.status : 'Non pointé'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Express Button: Mark Present Right Now */}
              <button
                type="button"
                onClick={handleMarkPresentToday}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pointer Présent Immédiatement (Ce Jour)</span>
              </button>
            </div>
          </div>

          {/* FINANCIAL STATUS & TUITION CARD */}
          <div className="bg-white border border-slate-200/90 rounded-[2rem] p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Situation Financière & Frais Scolaires
                </h3>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                financialStatus.isUpToDate
                  ? 'bg-emerald-100 text-emerald-800'
                  : financialStatus.isCriticalUnpaid
                  ? 'bg-rose-100 text-rose-800 animate-pulse'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {financialStatus.isUpToDate ? '✅ À Jour (100%)' : financialStatus.isCriticalUnpaid ? '🚨 0 FCFA Versé (Retard)' : `⏳ Solde Dû (${financialStatus.percentPaid}%)`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Scolarité Annuelle</span>
                <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">
                  {formatFCFA(financialStatus.annualFee)}
                </span>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-black uppercase text-emerald-700 block">Total Déjà Réglé</span>
                <span className="text-base font-black font-mono text-emerald-900 mt-0.5 block">
                  {formatFCFA(financialStatus.totalPaid)}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                financialStatus.remaining > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-100'
              }`}>
                <span className={`text-[10px] font-black uppercase block ${
                  financialStatus.remaining > 0 ? 'text-rose-700' : 'text-slate-400'
                }`}>
                  Solde Restant Dû
                </span>
                <span className={`text-base font-black font-mono mt-0.5 block ${
                  financialStatus.remaining > 0 ? 'text-rose-700' : 'text-slate-500'
                }`}>
                  {formatFCFA(financialStatus.remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* PARENTAL & RESIDENTIAL INFO */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-900" />
              <span>Filiation Parentale & Coordonnées de Résidence</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Père de l'Élève</span>
                <p className="font-bold text-slate-900">{student.parent.fatherName || 'Non renseigné'}</p>
                {student.parent.fatherProfession && (
                  <p className="text-slate-500 text-[11px]">Profession: {student.parent.fatherProfession}</p>
                )}
                {student.parent.fatherPhone && (
                  <p className="text-blue-900 font-mono font-bold pt-1">
                    📞 <a href={`tel:${student.parent.fatherPhone}`} className="hover:underline">{student.parent.fatherPhone}</a>
                  </p>
                )}
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Mère de l'Élève</span>
                <p className="font-bold text-slate-900">{student.parent.motherName || 'Non renseigné'}</p>
                {student.parent.motherProfession && (
                  <p className="text-slate-500 text-[11px]">Profession: {student.parent.motherProfession}</p>
                )}
                {student.parent.motherPhone && (
                  <p className="text-blue-900 font-mono font-bold pt-1">
                    📞 <a href={`tel:${student.parent.motherPhone}`} className="hover:underline">{student.parent.motherPhone}</a>
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 pt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Adresse de résidence : <strong className="text-slate-800">{student.address || 'Bamako, Mali'}</strong></span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintCard}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimer Carte</span>
            </button>

            {onNavigateToPayments && financialStatus.remaining > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToPayments(student);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Encaisser Solde</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onScanAnother && (
              <button
                type="button"
                onClick={onScanAnother}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300" />
                <span>Scanner un Autre Élève</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
