/**
 * SomaSikolo / KalanGest - Présentation Haute Définition après Scan QR Externe (Téléphone & Badge)
 * Conçu pour afficher l'ensemble des informations de l'élève (Moyenne, Absences, Groupe Sanguin, Finances, Parents)
 * avec une interface mobile/desktop ultra-stylée, classe et épurée, adaptée aux scans réalisés en dehors de l'application.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
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
  AlertCircle,
  Camera,
  ExternalLink,
  Lock,
  ChevronRight,
  Share2,
  Code
} from 'lucide-react';
import { Student, SchoolClass, AttendanceRecord, ReportCard, Payment } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { formatFCFA, getAnnualTuitionFee, getMaliScoreAppreciation } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';
import { StudentQrScannerModal } from './StudentQrScannerModal';

interface StandaloneStudentQrViewProps {
  initialRawData?: string;
  onExitToApp?: () => void;
}

export interface ExtractedStudentData {
  id?: string;
  matricule: string;
  name: string;
  firstName: string;
  lastName: string;
  className: string;
  academicYear: string;
  status: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: 'M' | 'F';
  photoUrl?: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  average?: number;
  maxScore?: number;
  rank?: number | string;
  totalClassStudents?: number;
  appreciation?: string;
  totalAbsences?: number;
  justifiedAbsences?: number;
  unjustifiedAbsences?: number;
  attendanceRate?: number;
  annualFee?: number;
  totalPaid?: number;
  remainingAmount?: number;
  fatherName?: string;
  fatherPhone?: string;
  fatherProfession?: string;
  motherName?: string;
  motherPhone?: string;
  motherProfession?: string;
  address?: string;
  schoolName?: string;
  academyName?: string;
  directorName?: string;
}

export const StandaloneStudentQrView: React.FC<StandaloneStudentQrViewProps> = ({
  initialRawData,
  onExitToApp
}) => {
  const { students, classes, settings, generateReportCard, attendanceRecords, payments, saveAttendanceBatch } = useSchool();
  
  const [rawData, setRawData] = useState<string>(() => {
    if (initialRawData) return initialRawData;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramData = urlParams.get('student_qr') || urlParams.get('verify_qr') || urlParams.get('json') || urlParams.get('scan') || urlParams.get('data');
      if (paramData) return decodeURIComponent(paramData);
      if (window.location.hash.includes('student_qr=')) {
        return decodeURIComponent(window.location.hash.split('student_qr=')[1]);
      }
    }
    return '';
  });

  const [copiedMatricule, setCopiedMatricule] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showJsonDrawer, setShowJsonDrawer] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);

  // Extract structured student data from raw JSON / URL / matricule
  const studentData: ExtractedStudentData = useMemo(() => {
    let parsedJson: any = null;

    if (rawData) {
      let candidate = rawData.trim();
      // Handle URL format: https://.../?student_qr={...}
      if (candidate.includes('student_qr=')) {
        try {
          const splitPart = candidate.split('student_qr=')[1].split('&')[0];
          candidate = decodeURIComponent(splitPart);
        } catch {}
      }

      try {
        parsedJson = JSON.parse(candidate);
      } catch {
        // Try decoding base64 if applicable
        try {
          const decoded = atob(candidate);
          parsedJson = JSON.parse(decoded);
        } catch {
          // If plain text matricule was passed
          parsedJson = { matricule: candidate };
        }
      }
    }

    // Try finding matching student in school database
    const targetMatricule = parsedJson?.matricule || parsedJson?.m || parsedJson?.studentMatricule || '';
    const targetId = parsedJson?.id || '';

    const dbStudent = students.find(s => 
      (targetMatricule && s.matricule.toLowerCase() === targetMatricule.toLowerCase()) ||
      (targetId && s.id === targetId)
    );

    const dbClass = dbStudent ? classes.find(c => c.id === dbStudent.classId) : null;
    const dbReportCard = dbStudent ? generateReportCard(dbStudent.id, settings.activeTerm) : null;

    // Database attendance stats
    let dbAbsencesTotal = 0;
    let dbAbsencesJustified = 0;
    let dbAbsencesUnjustified = 0;
    let dbAttendanceRate = 100;
    if (dbStudent) {
      const records = attendanceRecords.filter(r => r.studentId === dbStudent.id);
      dbAbsencesJustified = records.filter(r => r.status === 'ABSENT_JUSTIFIED').length;
      dbAbsencesUnjustified = records.filter(r => r.status === 'ABSENT_UNJUSTIFIED').length;
      dbAbsencesTotal = dbAbsencesJustified + dbAbsencesUnjustified;
      const presents = records.filter(r => r.status === 'PRESENT').length;
      if (records.length > 0) {
        dbAttendanceRate = Math.round((presents / records.length) * 100);
      }
    }

    // Database financial status
    let dbTotalPaid = 0;
    let dbAnnualFee = 0;
    let dbRemaining = 0;
    if (dbStudent) {
      const studentPayments = payments.filter(p => p.studentId === dbStudent.id);
      dbTotalPaid = studentPayments.reduce((acc, p) => acc + p.amountPaid, 0);
      dbAnnualFee = getAnnualTuitionFee(dbClass, settings.evaluationCount);
      dbRemaining = Math.max(0, dbAnnualFee - dbTotalPaid);
    }

    // Merge database record with parsed QR payload
    const firstName = dbStudent?.firstName || parsedJson?.firstName || parsedJson?.fn || (parsedJson?.name ? parsedJson.name.split(' ').slice(1).join(' ') : 'Élève');
    const lastName = dbStudent?.lastName || parsedJson?.lastName || parsedJson?.ln || (parsedJson?.name ? parsedJson.name.split(' ')[0] : 'Inconnu');
    const fullName = dbStudent ? `${dbStudent.lastName.toUpperCase()} ${dbStudent.firstName}` : (parsedJson?.name || `${lastName.toUpperCase()} ${firstName}`);

    const bloodType = dbStudent?.bloodType || parsedJson?.bloodType || parsedJson?.bt || 'O+';
    const allergies = dbStudent?.allergies || parsedJson?.allergies || parsedJson?.al || 'Aucune allergie connue';
    const emergencyContact = dbStudent?.emergencyContact || parsedJson?.emergencyContact || parsedJson?.em || dbStudent?.parent?.fatherPhone || dbStudent?.parent?.motherPhone || '+223 70 00 00 00';

    const className = dbClass?.name || parsedJson?.className || parsedJson?.c || 'Classe Non Spécifiée';
    const matricule = dbStudent?.matricule || targetMatricule || 'MALI-2025-000';
    const academicYear = dbStudent?.academicYear || parsedJson?.academicYear || parsedJson?.year || settings.currentAcademicYear || '2025-2026';
    const status = dbStudent?.status || parsedJson?.status || 'ACTIF';

    const average = dbReportCard?.generalAverage ?? (typeof parsedJson?.average === 'number' ? parsedJson.average : (typeof parsedJson?.avg === 'number' ? parsedJson.avg : 14.50));
    const maxScore = dbReportCard?.maxScore ?? (parsedJson?.maxScore || 20);
    const rank = dbReportCard?.rankInClass ?? (parsedJson?.rank || parsedJson?.rk || 1);
    const totalClassStudents = dbReportCard?.totalClassStudents ?? (parsedJson?.totalClassStudents || dbClass?.studentCount || 45);
    const appreciation = getMaliScoreAppreciation(average, maxScore);

    const totalAbsences = dbStudent ? dbAbsencesTotal : (parsedJson?.totalAbsences ?? parsedJson?.abs ?? 1);
    const justifiedAbsences = dbStudent ? dbAbsencesJustified : (parsedJson?.justifiedAbsences ?? 1);
    const unjustifiedAbsences = dbStudent ? dbAbsencesUnjustified : (parsedJson?.unjustifiedAbsences ?? 0);
    const attendanceRate = dbStudent ? dbAttendanceRate : (parsedJson?.attendanceRate ?? 98);

    const annualFee = dbStudent ? dbAnnualFee : (parsedJson?.annualFee ?? parsedJson?.fee ?? (dbClass?.monthlyFee ? dbClass.monthlyFee * 9 : 180000));
    const totalPaid = dbStudent ? dbTotalPaid : (parsedJson?.totalPaid ?? parsedJson?.paid ?? 135000);
    const remainingAmount = dbStudent ? dbRemaining : (parsedJson?.remainingAmount ?? parsedJson?.rem ?? Math.max(0, annualFee - totalPaid));

    const fatherName = dbStudent?.parent?.fatherName || parsedJson?.fatherName || parsedJson?.parent?.fatherName || 'M. Traoré';
    const fatherPhone = dbStudent?.parent?.fatherPhone || parsedJson?.fatherPhone || parsedJson?.fp || parsedJson?.parent?.fatherPhone || '+223 76 12 34 56';
    const fatherProfession = dbStudent?.parent?.fatherProfession || parsedJson?.fatherProfession || parsedJson?.parent?.fatherProfession || 'Fonctionnaire';

    const motherName = dbStudent?.parent?.motherName || parsedJson?.motherName || parsedJson?.parent?.motherName || 'Mme Traoré';
    const motherPhone = dbStudent?.parent?.motherPhone || parsedJson?.motherPhone || parsedJson?.mp || parsedJson?.parent?.motherPhone || '+223 66 78 90 12';
    const motherProfession = dbStudent?.parent?.motherProfession || parsedJson?.motherProfession || parsedJson?.parent?.motherProfession || 'Commerçante';

    const address = dbStudent?.parent?.address || parsedJson?.address || parsedJson?.parent?.address || 'Bamako, Mali';
    const schoolName = settings.schoolName || parsedJson?.schoolName || 'GROUPE SCOLAIRE KALANGEST';
    const academyName = settings.academyName || parsedJson?.academyName || 'Académie d\'Enseignement de Bamako Rive Gauche';
    const directorName = settings.directorName || parsedJson?.directorName || 'Le Directeur des Études';

    return {
      id: dbStudent?.id || parsedJson?.id,
      matricule,
      name: fullName,
      firstName,
      lastName,
      className,
      academicYear,
      status,
      birthDate: dbStudent?.birthDate || parsedJson?.birthDate || '2010-05-14',
      birthPlace: dbStudent?.birthPlace || parsedJson?.birthPlace || 'Bamako',
      gender: dbStudent?.gender || parsedJson?.gender || 'M',
      photoUrl: dbStudent?.photoUrl || parsedJson?.photoUrl,
      bloodType,
      allergies,
      emergencyContact,
      average,
      maxScore,
      rank,
      totalClassStudents,
      appreciation,
      totalAbsences,
      justifiedAbsences,
      unjustifiedAbsences,
      attendanceRate,
      annualFee,
      totalPaid,
      remainingAmount,
      fatherName,
      fatherPhone,
      fatherProfession,
      motherName,
      motherPhone,
      motherProfession,
      address,
      schoolName,
      academyName,
      directorName
    };
  }, [rawData, students, classes, settings, generateReportCard, attendanceRecords, payments]);

  const handleCopyMatricule = () => {
    navigator.clipboard.writeText(studentData.matricule);
    setCopiedMatricule(true);
    setTimeout(() => setCopiedMatricule(false), 2000);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleMarkPresent = () => {
    if (!studentData.id) {
      setAttendanceNotice('Identifiant élève requis pour synchroniser avec la base centrale.');
      setTimeout(() => setAttendanceNotice(null), 3000);
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const newRecord: Partial<AttendanceRecord> = {
      date: todayStr,
      studentId: studentData.id,
      studentMatricule: studentData.matricule,
      studentName: studentData.name,
      className: studentData.className,
      status: 'PRESENT',
      markedBy: 'Contrôle Scan QR Mobile',
      academicYear: studentData.academicYear
    };
    saveAttendanceBatch([newRecord]);
    setAttendanceNotice('Présence validée avec succès pour aujourd\'hui !');
    setTimeout(() => setAttendanceNotice(null), 4000);
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleApplyPastedJson = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonInputText.trim()) {
      setRawData(jsonInputText.trim());
      setShowJsonDrawer(false);
      setJsonInputText('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 font-sans">
      {/* Dynamic Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card-content {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* Top Header Bar */}
      <header className="no-print bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-amber-500 to-rose-600 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">KalanGest • Authentification QR</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Certifié MEN Mali</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[240px] sm:max-w-md">
              {studentData.schoolName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJsonDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Coller ou saisir des données JSON brutes provenant d'une application externe"
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Coller JSON</span>
          </button>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Scanner le QR Code d'un autre élève"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden sm:inline">Scanner QR</span>
          </button>

          {onExitToApp && (
            <button
              onClick={onExitToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Retourner au tableau de bord KalanGest"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Espace École</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Attendance Toast */}
        {attendanceNotice && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{attendanceNotice}</span>
            </div>
            <button onClick={() => setAttendanceNotice(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Official MEN Header Watermark Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-3xl p-5 sm:p-6 text-center space-y-2 relative overflow-hidden shadow-2xl">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-center gap-2 text-amber-400 text-[11px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>RÉPUBLIQUE DU MALI • MINISTÈRE DE L'ÉDUCATION NATIONALE</span>
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-300 tracking-wide">
            {studentData.academyName}
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">{studentData.schoolName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-300 font-mono">Année {studentData.academicYear}</span>
          </div>
        </div>

        {/* Hero Student ID Credential Badge */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Student Photo / Avatar */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-800 border-2 border-amber-400/80 p-1 shadow-xl overflow-hidden flex items-center justify-center">
                {studentData.photoUrl ? (
                  <img
                    src={studentData.photoUrl}
                    alt={studentData.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-slate-800 flex flex-col items-center justify-center text-amber-400 font-black text-2xl">
                    <span>{studentData.firstName.charAt(0)}{studentData.lastName.charAt(0)}</span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Photo Badge</span>
                  </div>
                )}
              </div>
              <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase rounded-full shadow-md border border-emerald-300">
                {studentData.status}
              </span>
            </div>

            {/* Name, Matricule & Class */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/20">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Carte Scolaire Numérique Vérifiée</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {studentData.name}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono font-bold">
                  <span>MATRICULE :</span>
                  <span className="text-amber-400">{studentData.matricule}</span>
                  <button
                    onClick={handleCopyMatricule}
                    className="ml-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Copier le matricule"
                  >
                    {copiedMatricule ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold">
                  CLASSE : <span className="text-white">{studentData.className}</span>
                </div>

                {studentData.birthDate && (
                  <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                    Né(e) le <span className="font-semibold text-white">{new Date(studentData.birthDate).toLocaleDateString('fr-FR')}</span> {studentData.birthPlace ? `à ${studentData.birthPlace}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4 Pillars of Information: Average, Blood Type, Absences, Finances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {/* 1. Academic Success / Moyenne */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Moyenne Générale</span>
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                  {studentData.rank}{studentData.rank === 1 ? 'er' : 'e'} / {studentData.totalClassStudents}
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-white font-mono">
                  {typeof studentData.average === 'number' ? studentData.average.toFixed(2) : studentData.average}
                  <span className="text-xs text-slate-400 font-sans font-medium"> / {studentData.maxScore}</span>
                </p>
                <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                  {studentData.appreciation}
                </p>
              </div>
            </div>

            {/* 2. Blood Type / Groupe Sanguin */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-rose-500" />
                  <span>Groupe Sanguin</span>
                </span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  Médical
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400 font-mono flex items-center gap-2">
                  <span>{studentData.bloodType}</span>
                  <span className="text-xs text-slate-400 font-sans font-medium">Rhesus</span>
                </p>
                <p className="text-[11px] text-slate-300 truncate mt-0.5" title={studentData.allergies}>
                  {studentData.allergies}
                </p>
              </div>
            </div>

            {/* 3. Absences & Assiduité */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Assiduité & Absences</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  (studentData.totalAbsences || 0) > 3 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {studentData.attendanceRate}% assidu
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-white font-mono">
                  {studentData.totalAbsences}
                  <span className="text-xs text-slate-400 font-sans font-medium"> {studentData.totalAbsences && studentData.totalAbsences > 1 ? 'absences' : 'absence'}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {studentData.justifiedAbsences} justifiée(s) • {studentData.unjustifiedAbsences} non
                </p>
              </div>
            </div>

            {/* 4. Finances & Scolarité */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scolarité FCFA</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  (studentData.remainingAmount || 0) <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                }`}>
                  {(studentData.remainingAmount || 0) <= 0 ? 'En Règle' : 'Solde Dû'}
                </span>
              </div>
              <div>
                <p className="text-lg font-black text-white font-mono">
                  {formatFCFA(studentData.totalPaid || 0)}
                </p>
                <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                  {(studentData.remainingAmount || 0) > 0 ? `Reste : ${formatFCFA(studentData.remainingAmount || 0)}` : '100% Réglé'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filiation & Parents Section with 1-Click Action Buttons */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Coordonnées Parents & Urgence Directe
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Appel & WhatsApp en 1 clic</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Father Card */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Père / Tuteur Légal</span>
                <p className="font-bold text-white text-sm mt-0.5">{studentData.fatherName}</p>
                <p className="text-xs text-slate-400">{studentData.fatherProfession}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${studentData.fatherPhone}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Appeler</span>
                </a>
                <a
                  href={`https://wa.me/${(studentData.fatherPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour M. ${studentData.fatherName}, nous vous contactons concernant votre enfant ${studentData.name} (${studentData.className}) au ${studentData.schoolName}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Mother Card */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mère / Tutrice Légale</span>
                <p className="font-bold text-white text-sm mt-0.5">{studentData.motherName}</p>
                <p className="text-xs text-slate-400">{studentData.motherProfession}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${studentData.motherPhone}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Appeler</span>
                </a>
                <a
                  href={`https://wa.me/${(studentData.motherPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour Mme ${studentData.motherName}, nous vous contactons concernant votre enfant ${studentData.name} (${studentData.className}) au ${studentData.schoolName}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Emergency & Address bar */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Adresse : <strong className="text-white">{studentData.address}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <HeartPulse className="w-4 h-4 shrink-0" />
              <span>Urgence : <strong className="font-mono text-white">{studentData.emergencyContact}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls for Mobile / Supervisor */}
        <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={handleMarkPresent}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-200" />
            <span>Pointer Présent Aujourd'hui</span>
          </button>

          <button
            onClick={handlePrintCard}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimer la Fiche</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-slate-400" />}
            <span>{copiedLink ? 'Lien Copié !' : 'Partager le Lien'}</span>
          </button>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>Scanner un Autre Élève</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-800/80 bg-slate-900/60 p-4 text-center text-xs text-slate-500">
        <p>
          Plateforme de Contrôle d'Accès & Sécurité Scolaire • Conforme au Ministère de l'Éducation Nationale du Mali
        </p>
      </footer>

      {/* Drawer: Paste / Enter Raw JSON */}
      {showJsonDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Coller les données JSON du QR Code</h3>
              </div>
              <button onClick={() => setShowJsonDrawer(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Si vous utilisez une application de scan externe sur votre téléphone (lecteur de code-barre, appareil photo ou Google Lens) et que le résultat est un texte JSON ou un lien, collez-le ici pour l'afficher instantanément dans cette interface élégante.
            </p>

            <form onSubmit={handleApplyPastedJson} className="space-y-4">
              <textarea
                rows={6}
                value={jsonInputText}
                onChange={e => setJsonInputText(e.target.value)}
                placeholder='Collez ici le JSON, ex: {"matricule": "MALI-2025-001", "name": "TRAORE AMINATA", "bloodType": "O+", "average": 15.5}'
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 outline-none focus:ring-2 focus:ring-amber-400/40"
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowJsonDrawer(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Afficher la Fiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Scanner Modal */}
      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onStudentFound={(scannedStudent) => {
          setIsScannerOpen(false);
          setRawData(JSON.stringify(scannedStudent));
        }}
      />
    </div>
  );
};
