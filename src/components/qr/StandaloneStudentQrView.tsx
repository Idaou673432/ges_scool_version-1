/**
 * SomaSikolo / KalanGest - Présentation Haute Définition après Scan QR Externe (Téléphone & Badge)
 * Conçu pour afficher l'ensemble des informations de l'élève (Moyenne, Absences, Groupe Sanguin, Finances, Parents)
 * avec une interface mobile/desktop ultra-stylée, classe et épurée, adaptée aux scans réalisés en dehors de l'application.
 * 
 * NOUVEAU : Mode d'Aperçu 'ID Card' Plastique Professionnel (Style Carte PVC / Badge Scolaire ISO-7810 CR80)
 * avec photo HD de l'élève, nom officiel, QR Code haute définition, puce sans-contact, fente tour de cou,
 * retournement interactif 3D Recto / Verso, et impression calibrée pour cartes plastiques ou attestation A4.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
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
  Code,
  Sparkles,
  CheckCircle2,
  Eye,
  SlidersHorizontal,
  CreditCard,
  Layers,
  RotateCw,
  Wifi,
  Sparkle
} from 'lucide-react';
import { Student, AttendanceRecord } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { formatFCFA, getAnnualTuitionFee, getMaliScoreAppreciation } from '../../constants/maliEducation';
import { StudentQrScannerModal } from './StudentQrScannerModal';

interface StandaloneStudentQrViewProps {
  initialRawData?: string;
  onExitToApp?: () => void;
}

export type PresentationTheme = 'MALI_GOLD' | 'ROYAL_AZUR' | 'EMERALD_PRESTIGE' | 'OBSIDIAN_LUXURY';

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
  gender?: 'M' | 'F' | string;
  photoUrl?: string;
  bloodType?: string;
  allergies?: string;
  emergencyContact?: string;
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
  scanTimestamp?: string;
}

export const StandaloneStudentQrView: React.FC<StandaloneStudentQrViewProps> = ({
  initialRawData,
  onExitToApp
}) => {
  const { students, classes, settings, generateReportCard, attendanceRecords, payments, saveAttendanceBatch } = useSchool();
  
  // Theme state: allows switching the luxury style on screen
  const [activeTheme, setActiveTheme] = useState<PresentationTheme>('MALI_GOLD');

  // Display Mode: 'ID_CARD' (Professional Plastic Card Preview) vs 'DOSSIER' (Full 4-pillars dossier)
  const [viewMode, setViewMode] = useState<'ID_CARD' | 'DOSSIER'>('ID_CARD');

  // Plastic Card Flip state: 'RECTO' (Front) or 'VERSO' (Back)
  const [cardSide, setCardSide] = useState<'RECTO' | 'VERSO'>('RECTO');

  // Print Format selection: 'BADGE_PVC' (Plastic Badge front & back) or 'ATTESTATION_A4' (Full A4 Certificate)
  const [printFormat, setPrintFormat] = useState<'BADGE_PVC' | 'ATTESTATION_A4'>('BADGE_PVC');

  const [rawData, setRawData] = useState<string>(() => {
    if (initialRawData) return initialRawData;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramData = 
        urlParams.get('student_qr') || 
        urlParams.get('verify_qr') || 
        urlParams.get('json') || 
        urlParams.get('scan') || 
        urlParams.get('data') || 
        urlParams.get('qr') || 
        urlParams.get('student') || 
        urlParams.get('m') || 
        urlParams.get('matricule') || 
        urlParams.get('d');

      if (paramData) return decodeURIComponent(paramData);
      if (window.location.hash.includes('student_qr=')) {
        return decodeURIComponent(window.location.hash.split('student_qr=')[1]);
      }
      if (window.location.hash.includes('data=')) {
        return decodeURIComponent(window.location.hash.split('data=')[1]);
      }
      if (window.location.hash.includes('json=')) {
        return decodeURIComponent(window.location.hash.split('json=')[1]);
      }
    }
    return '';
  });

  // Auto-print toggle & configuration (persisted in localStorage, enabled by default)
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autoprint') === '0' || urlParams.get('print') === '0') {
        return false;
      }
      try {
        const saved = localStorage.getItem('kalangest_qr_autoprint');
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return true; // Default auto-print enabled
  });

  const [copiedMatricule, setCopiedMatricule] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showJsonDrawer, setShowJsonDrawer] = useState(false);
  const [showRawInspector, setShowRawInspector] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);
  const [isPresentMarkedToday, setIsPresentMarkedToday] = useState(false);
  const [printableQrCodeUrl, setPrintableQrCodeUrl] = useState<string>('');
  const [isAutoPrintingNotice, setIsAutoPrintingNotice] = useState(false);

  // Keep track of the last printed matricule to prevent repeated print popups on the same record
  const lastAutoPrintedMatriculeRef = useRef<string | null>(null);
  const autoPrintTimerRef = useRef<any>(null);

  // Save autoPrint preference in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kalangest_qr_autoprint', String(autoPrintEnabled));
    } catch {}
  }, [autoPrintEnabled]);

  // Play pleasant synthetic audio chime on success / scan
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  };

  // Robustly extract student data from raw JSON / URL / matricule / text
  const { studentData, isRealDataLoaded } = useMemo(() => {
    let parsedJson: any = null;
    let dataDetected = false;

    if (rawData && rawData.trim().length > 0) {
      let candidate = rawData.trim();
      
      // Handle URL format: https://.../?student_qr={...}
      if (candidate.includes('student_qr=') || candidate.includes('verify_qr=') || candidate.includes('data=')) {
        try {
          const matched = candidate.match(/(?:student_qr|verify_qr|data|json)=([^&]+)/);
          if (matched && matched[1]) {
            candidate = decodeURIComponent(matched[1]);
          }
        } catch {}
      }

      // Try 1: standard JSON parse
      try {
        parsedJson = JSON.parse(candidate);
        dataDetected = true;
      } catch {
        // Try 2: base64 decoding then JSON parse
        try {
          const decoded = atob(candidate);
          parsedJson = JSON.parse(decoded);
          dataDetected = true;
        } catch {
          // Try 3: URL-decoded once more
          try {
            const doubleDecoded = decodeURIComponent(candidate);
            parsedJson = JSON.parse(doubleDecoded);
            dataDetected = true;
          } catch {
            // Try 4: Plain text / matricule passed
            if (candidate.length > 2) {
              parsedJson = { matricule: candidate };
              dataDetected = true;
            }
          }
        }
      }
    }

    // Try finding matching student in school database
    const targetMatricule = 
      parsedJson?.matricule || 
      parsedJson?.m || 
      parsedJson?.mat || 
      parsedJson?.studentMatricule || 
      parsedJson?.num_matricule || 
      parsedJson?.code || 
      '';

    const targetId = parsedJson?.id || '';

    const dbStudent = students.find(s => 
      (targetMatricule && s.matricule.toLowerCase() === targetMatricule.toLowerCase()) ||
      (targetId && s.id === targetId) ||
      (targetMatricule && s.matricule.toLowerCase().includes(targetMatricule.toLowerCase()))
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

    // Field resolvers strictly using actual DB data or scanned JSON data (NO INVENTED DATA)
    const firstName = 
      dbStudent?.firstName || 
      parsedJson?.firstName || 
      parsedJson?.fn || 
      parsedJson?.prenom || 
      (parsedJson?.name ? parsedJson.name.split(' ').slice(1).join(' ') : (dataDetected ? 'Élève' : ''));

    const lastName = 
      dbStudent?.lastName || 
      parsedJson?.lastName || 
      parsedJson?.ln || 
      parsedJson?.nom || 
      (parsedJson?.name ? parsedJson.name.split(' ')[0] : (dataDetected ? 'Scanné' : ''));

    const fullName = dbStudent 
      ? `${dbStudent.lastName.toUpperCase()} ${dbStudent.firstName}` 
      : (parsedJson?.name || (lastName || firstName ? `${lastName.toUpperCase()} ${firstName}`.trim() : 'Élève Scanné'));

    const bloodType = 
      dbStudent?.bloodType || 
      parsedJson?.bloodType || 
      parsedJson?.bt || 
      parsedJson?.groupeSanguin || 
      parsedJson?.blood || 
      '';

    const allergies = 
      dbStudent?.allergies || 
      parsedJson?.allergies || 
      parsedJson?.al || 
      parsedJson?.medical || 
      '';

    const emergencyContact = 
      dbStudent?.emergencyContact || 
      parsedJson?.emergencyContact || 
      parsedJson?.em || 
      dbStudent?.parent?.fatherPhone || 
      dbStudent?.parent?.motherPhone || 
      parsedJson?.fatherPhone || 
      parsedJson?.fp || 
      '';

    const className = 
      dbClass?.name || 
      parsedJson?.className || 
      parsedJson?.c || 
      parsedJson?.classe || 
      parsedJson?.class || 
      'Classe non assignée';

    const matricule = 
      dbStudent?.matricule || 
      targetMatricule || 
      'NON RENSEIGNÉ';

    const academicYear = 
      dbStudent?.academicYear || 
      parsedJson?.academicYear || 
      parsedJson?.year || 
      parsedJson?.annee || 
      settings.currentAcademicYear || 
      '2025-2026';

    const status = 
      dbStudent?.status || 
      parsedJson?.status || 
      parsedJson?.statut || 
      'INSCRIT';

    // Academic average and rank: only if real evaluations exist in DB or in JSON
    let averageVal: number | undefined = undefined;
    let rankVal: number | string | undefined = undefined;
    let maxScoreVal: number = 20;
    let totalStudentsVal: number | undefined = undefined;

    if (dbReportCard && typeof dbReportCard.generalAverage === 'number' && !isNaN(dbReportCard.generalAverage)) {
      averageVal = dbReportCard.generalAverage;
      rankVal = dbReportCard.rankInClass;
      maxScoreVal = dbReportCard.maxScore || 20;
      totalStudentsVal = dbReportCard.totalClassStudents || dbClass?.studentCount;
    } else if (typeof parsedJson?.average === 'number') {
      averageVal = parsedJson.average;
      rankVal = parsedJson.rank ?? parsedJson.rk ?? parsedJson.rang;
      maxScoreVal = parsedJson.maxScore || 20;
      totalStudentsVal = parsedJson.totalClassStudents;
    } else if (typeof parsedJson?.avg === 'number') {
      averageVal = parsedJson.avg;
      rankVal = parsedJson.rank ?? parsedJson.rk ?? parsedJson.rang;
      maxScoreVal = parsedJson.maxScore || 20;
    } else if (typeof parsedJson?.moyenne === 'number') {
      averageVal = parsedJson.moyenne;
      rankVal = parsedJson.rank ?? parsedJson.rk ?? parsedJson.rang;
      maxScoreVal = parsedJson.maxScore || 20;
    }

    const appreciationVal = typeof averageVal === 'number' 
      ? getMaliScoreAppreciation(averageVal, maxScoreVal).appreciation 
      : 'Non évalué';

    const totalAbsences = dbStudent 
      ? dbAbsencesTotal 
      : (typeof parsedJson?.totalAbsences === 'number' ? parsedJson.totalAbsences : (typeof parsedJson?.abs === 'number' ? parsedJson.abs : undefined));

    const justifiedAbsences = dbStudent 
      ? dbAbsencesJustified 
      : (typeof parsedJson?.justifiedAbsences === 'number' ? parsedJson.justifiedAbsences : undefined);

    const unjustifiedAbsences = dbStudent 
      ? dbAbsencesUnjustified 
      : (typeof parsedJson?.unjustifiedAbsences === 'number' ? parsedJson.unjustifiedAbsences : undefined);

    const attendanceRate = dbStudent 
      ? dbAttendanceRate 
      : (typeof parsedJson?.attendanceRate === 'number' ? parsedJson.attendanceRate : (typeof parsedJson?.tauxAssiduite === 'number' ? parsedJson.tauxAssiduite : undefined));

    const annualFee = dbStudent 
      ? (dbAnnualFee > 0 ? dbAnnualFee : undefined) 
      : (typeof parsedJson?.annualFee === 'number' ? parsedJson.annualFee : (typeof parsedJson?.scolarite === 'number' ? parsedJson.scolarite : undefined));

    const totalPaid = dbStudent 
      ? dbTotalPaid 
      : (typeof parsedJson?.totalPaid === 'number' ? parsedJson.totalPaid : (typeof parsedJson?.paye === 'number' ? parsedJson.paye : undefined));

    const remainingAmount = dbStudent 
      ? dbRemaining 
      : (typeof parsedJson?.remainingAmount === 'number' ? parsedJson.remainingAmount : (typeof parsedJson?.reste === 'number' ? parsedJson.reste : (annualFee !== undefined && totalPaid !== undefined ? Math.max(0, annualFee - totalPaid) : undefined)));

    const fatherName = 
      dbStudent?.parent?.fatherName || 
      parsedJson?.fatherName || 
      parsedJson?.parent?.fatherName || 
      parsedJson?.pere || 
      '';

    const fatherPhone = 
      dbStudent?.parent?.fatherPhone || 
      parsedJson?.fatherPhone || 
      parsedJson?.fp || 
      parsedJson?.parent?.fatherPhone || 
      parsedJson?.telPere || 
      '';

    const fatherProfession = 
      dbStudent?.parent?.fatherProfession || 
      parsedJson?.fatherProfession || 
      parsedJson?.parent?.fatherProfession || 
      '';

    const motherName = 
      dbStudent?.parent?.motherName || 
      parsedJson?.motherName || 
      parsedJson?.parent?.motherName || 
      parsedJson?.mere || 
      '';

    const motherPhone = 
      dbStudent?.parent?.motherPhone || 
      parsedJson?.motherPhone || 
      parsedJson?.mp || 
      parsedJson?.parent?.motherPhone || 
      parsedJson?.telMere || 
      '';

    const motherProfession = 
      dbStudent?.parent?.motherProfession || 
      parsedJson?.motherProfession || 
      parsedJson?.parent?.motherProfession || 
      '';

    const address = 
      dbStudent?.parent?.guardianAddress || 
      dbStudent?.address || 
      parsedJson?.address || 
      parsedJson?.parent?.address || 
      parsedJson?.adresse || 
      '';

    const schoolName = 
      settings.schoolName || 
      parsedJson?.schoolName || 
      parsedJson?.ecole || 
      'ÉTABLISSEMENT SCOLAIRE';

    const academyName = 
      settings.academyName || 
      parsedJson?.academyName || 
      parsedJson?.academie || 
      'Académie d\'Enseignement';

    const directorName = 
      settings.directorName || 
      parsedJson?.directorName || 
      'Direction de l\'Établissement';

    const now = new Date();
    const scanTimestamp = `${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const data: ExtractedStudentData = {
      id: dbStudent?.id || parsedJson?.id,
      matricule,
      name: fullName,
      firstName,
      lastName,
      className,
      academicYear,
      status,
      birthDate: dbStudent?.birthDate || parsedJson?.birthDate || '',
      birthPlace: dbStudent?.birthPlace || parsedJson?.birthPlace || '',
      gender: dbStudent?.gender || parsedJson?.gender || '',
      photoUrl: dbStudent?.photoUrl || parsedJson?.photoUrl,
      bloodType: bloodType || undefined,
      allergies: allergies || undefined,
      emergencyContact: emergencyContact || undefined,
      average: averageVal,
      maxScore: maxScoreVal,
      rank: rankVal,
      totalClassStudents: totalStudentsVal,
      appreciation: appreciationVal,
      totalAbsences,
      justifiedAbsences,
      unjustifiedAbsences,
      attendanceRate,
      annualFee,
      totalPaid,
      remainingAmount,
      fatherName: fatherName || undefined,
      fatherPhone: fatherPhone || undefined,
      fatherProfession: fatherProfession || undefined,
      motherName: motherName || undefined,
      motherPhone: motherPhone || undefined,
      motherProfession: motherProfession || undefined,
      address: address || undefined,
      schoolName,
      academyName,
      directorName,
      scanTimestamp
    };

    return {
      studentData: data,
      isRealDataLoaded: Boolean(rawData && rawData.trim().length > 0)
    };
  }, [rawData, students, classes, settings, generateReportCard, attendanceRecords, payments]);

  // Generate high-resolution scannable QR code for the plastic ID card & document
  useEffect(() => {
    if (studentData?.matricule) {
      const qrTarget = typeof window !== 'undefined' ? window.location.href : studentData.matricule;
      QRCode.toDataURL(qrTarget, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
        .then(url => setPrintableQrCodeUrl(url))
        .catch(() => {});
    }
  }, [studentData?.matricule]);

  // AUTOMATIC PRINT TRIGGER WHEN A QR CODE IS SCANNED
  useEffect(() => {
    if (autoPrintEnabled && isRealDataLoaded && studentData?.matricule) {
      // Check if we haven't already auto-printed for this exact matricule scan
      if (lastAutoPrintedMatriculeRef.current !== studentData.matricule) {
        lastAutoPrintedMatriculeRef.current = studentData.matricule;
        setIsAutoPrintingNotice(true);

        if (autoPrintTimerRef.current) {
          clearTimeout(autoPrintTimerRef.current);
        }

        // Wait a small rendering delay (650ms) to ensure the DOM, QR code image, and fonts are fully settled
        autoPrintTimerRef.current = setTimeout(() => {
          setIsAutoPrintingNotice(false);
          window.print();
        }, 650);
      }
    }

    return () => {
      if (autoPrintTimerRef.current) {
        clearTimeout(autoPrintTimerRef.current);
      }
    };
  }, [autoPrintEnabled, isRealDataLoaded, studentData?.matricule]);

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

  const handleShareMobile = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Fiche Élève - ${studentData.name}`,
          text: `Contrôle Scolaire KalanGest • Élève : ${studentData.name} (${studentData.className}) • Matricule : ${studentData.matricule} • Statut : ${studentData.status}`,
          url: window.location.href
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleMarkPresent = () => {
    playChime();
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (studentData.id) {
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
    }
    
    setIsPresentMarkedToday(true);
    setAttendanceNotice(`✓ Présence validée pour ${studentData.name} ce jour à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} !`);
    setTimeout(() => setAttendanceNotice(null), 5000);
  };

  const handlePrintBadgePvc = () => {
    setPrintFormat('BADGE_PVC');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAttestationA4 = () => {
    setPrintFormat('ATTESTATION_A4');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleApplyPastedJson = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonInputText.trim()) {
      lastAutoPrintedMatriculeRef.current = null; // Reset to allow auto-print for new paste
      setRawData(jsonInputText.trim());
      setShowJsonDrawer(false);
      setJsonInputText('');
      playChime();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setJsonInputText(text);
        }
      }
    } catch {}
  };

  // Luxury visual theme styling profiles for screen display
  const theme = {
    MALI_GOLD: {
      cardGradient: 'from-[#0d1527] via-[#090d16] to-[#141b2d]',
      borderStyle: 'border-2 border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.18)]',
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
      ringColor: 'border-amber-400',
      tagText: 'Or National Mali'
    },
    ROYAL_AZUR: {
      cardGradient: 'from-[#0b1c38] via-[#081226] to-[#122347]',
      borderStyle: 'border-2 border-sky-400/80 shadow-[0_0_35px_rgba(56,189,248,0.2)]',
      accentColor: 'text-sky-300',
      badgeBg: 'bg-sky-400/10 text-sky-200 border-sky-400/30',
      ringColor: 'border-sky-400',
      tagText: 'Azur Royal'
    },
    EMERALD_PRESTIGE: {
      cardGradient: 'from-[#06241a] via-[#041711] to-[#0c3325]',
      borderStyle: 'border-2 border-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.2)]',
      accentColor: 'text-emerald-300',
      badgeBg: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/30',
      ringColor: 'border-emerald-400',
      tagText: 'Émeraude Prestige'
    },
    OBSIDIAN_LUXURY: {
      cardGradient: 'from-[#17171c] via-[#0b0b0e] to-[#1c1c24]',
      borderStyle: 'border-2 border-amber-300/70 shadow-[0_0_40px_rgba(245,158,11,0.22)]',
      accentColor: 'text-amber-300',
      badgeBg: 'bg-white/10 text-amber-200 border-white/20',
      ringColor: 'border-amber-300',
      tagText: 'Obsidienne & Or'
    }
  }[activeTheme];

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 font-sans antialiased">
      {/* Dynamic Print Styles for Official Documents & Plastic Card Badge Output */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, footer, .screen-only-section {
            display: none !important;
          }
          .print-only-doc {
            display: ${printFormat === 'ATTESTATION_A4' ? 'block' : 'none'} !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-only-badge {
            display: ${printFormat === 'BADGE_PVC' ? 'block' : 'none'} !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
        }
        @media screen {
          .print-only-doc, .print-only-badge {
            display: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. PRINT-ONLY: FORMAT CARTE BADGE PLASTIQUE PVC (CR80 RECTO / VERSO)      */}
      {/* Calibré aux dimensions réelles des cartes PVC scolaires (85.6mm x 54mm)   */}
      {/* ========================================================================= */}
      <div className="print-only-badge p-4 max-w-4xl mx-auto">
        <div className="text-center mb-4 border-b border-slate-300 pb-2">
          <p className="text-[10pt] font-black uppercase tracking-wider text-slate-900">
            RÉPUBLIQUE DU MALI · {studentData.schoolName}
          </p>
          <p className="text-[8pt] text-slate-600">
            Carte Scolaire Officielle Plastifiée (Format Badge Standard CR80 - Recto / Verso)
          </p>
        </div>

        {/* 2-Card Layout on A4: Front and Back side-by-side ready to cut and laminate */}
        <div className="grid grid-cols-2 gap-8 justify-center items-center my-6">
          {/* PRINT RECTO */}
          <div className="w-[340px] h-[215px] border-2 border-slate-900 rounded-2xl p-3.5 flex flex-col justify-between relative bg-white overflow-hidden shadow-none mx-auto">
            {/* National ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              <div className="flex-1 bg-emerald-600" />
              <div className="flex-1 bg-amber-400" />
              <div className="flex-1 bg-rose-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[8pt]">
                  K
                </div>
                <div>
                  <p className="text-[8pt] font-black uppercase text-slate-950 truncate max-w-[190px]">
                    {studentData.schoolName}
                  </p>
                  <p className="text-[6.5pt] font-bold text-slate-500 uppercase">
                    CARTE SCOLAIRE · {studentData.academicYear}
                  </p>
                </div>
              </div>
              <span className="text-[6.5pt] font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                OFFICIEL
              </span>
            </div>

            {/* Body */}
            <div className="grid grid-cols-12 gap-2 items-center my-auto">
              <div className="col-span-4 flex flex-col items-center">
                <div className="w-18 h-22 rounded-lg border border-slate-400 bg-slate-100 overflow-hidden flex items-center justify-center">
                  {studentData.photoUrl ? (
                    <img src={studentData.photoUrl} alt={studentData.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-slate-400">{studentData.firstName.charAt(0)}{studentData.lastName.charAt(0)}</span>
                  )}
                </div>
              </div>

              <div className="col-span-5 space-y-0.5 text-[7.5pt]">
                <p className="text-[6pt] uppercase font-bold text-slate-400">ÉLÈVE</p>
                <p className="font-black uppercase text-slate-950 truncate text-[9pt] leading-tight">{studentData.lastName}</p>
                <p className="font-bold text-slate-800 truncate text-[8pt] leading-tight">{studentData.firstName}</p>
                <p className="text-[6.5pt] text-slate-600 font-bold mt-1">CLASSE : <span className="text-slate-950">{studentData.className}</span></p>
                <p className="text-[6.5pt] font-mono font-bold text-slate-900">MLE : {studentData.matricule}</p>
                <p className="text-[6.5pt] font-bold text-rose-700">GROUPE : {studentData.bloodType || 'Non renseigné'}</p>
              </div>

              <div className="col-span-3 flex flex-col items-center justify-center">
                {printableQrCodeUrl ? (
                  <img src={printableQrCodeUrl} alt="QR Code" className="w-16 h-16 border border-slate-300 p-0.5 rounded" />
                ) : (
                  <div className="w-16 h-16 border border-dashed border-slate-400 flex items-center justify-center text-[6pt]">QR</div>
                )}
                <span className="text-[5.5pt] font-mono font-bold text-slate-500 uppercase mt-0.5">Vérification</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[6pt] font-bold uppercase text-slate-600">
              <span>RÉPUBLIQUE DU MALI · MEN</span>
              <span>VAL: 31/07/{studentData.academicYear.split('-')[1] || '2026'}</span>
            </div>
          </div>

          {/* PRINT VERSO */}
          <div className="w-[340px] h-[215px] border-2 border-slate-900 rounded-2xl p-3.5 flex flex-col justify-between relative bg-white overflow-hidden shadow-none mx-auto">
            <div className="border-b border-slate-200 pb-1">
              <p className="text-[7pt] font-black uppercase text-slate-900">INSTRUCTIONS & CONTACTS D'URGENCE</p>
              <p className="text-[6pt] text-slate-600 leading-tight mt-0.5">
                Cette carte est strictement personnelle. Toute personne la retrouvant est priée de la retourner à l'établissement.
              </p>
            </div>

            <div className="space-y-1.5 my-auto text-[7pt]">
              <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                <p className="text-[6pt] uppercase font-bold text-slate-500">PARENTS / TUTEUR LÉGAL</p>
                <p className="font-bold text-slate-900 text-[7.5pt]">{studentData.fatherName || studentData.motherName || 'Non renseigné'}</p>
                <p className="font-mono text-slate-800 text-[7pt]">Tél: {studentData.fatherPhone || studentData.motherPhone || '—'}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-1.5 rounded flex justify-between items-center">
                <div>
                  <p className="text-[6pt] uppercase font-bold text-rose-700">DONNÉES MÉDICALES D'URGENCE</p>
                  <p className="text-[7pt] font-bold">Groupe : {studentData.bloodType || 'Non renseigné'} · {studentData.allergies || 'Aucune contre-indication signalée'}</p>
                </div>
                <p className="font-mono text-rose-700 font-bold text-[7pt]">{studentData.emergencyContact || '—'}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                <p className="text-[6pt] uppercase font-bold text-slate-500">ÉTABLISSEMENT SCOLAIRE</p>
                <p className="text-[6.5pt] text-slate-700 truncate">{studentData.schoolName} {studentData.address ? `· ${studentData.address}` : ''}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[6pt]">
              <div className="text-left">
                <p className="font-bold text-slate-600">Cachet Officiel</p>
                <div className="w-7 h-7 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[5pt] text-slate-400 mt-0.5">
                  SCEAU
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-600">Signature Direction</p>
                <p className="italic font-bold text-slate-900 mt-1 text-[7pt]">Le Directeur</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[7pt] text-slate-400 mt-4 border-t border-slate-200 pt-2">
          Lignes de découpe standard badge PVC (85.6mm × 53.98mm) · KalanGest Mali
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRINT-ONLY: ATTESTATION SCOLAIRE A4 COMPLÈTE (MINISTÈRE ÉDUCATION)     */}
      {/* ========================================================================= */}
      <div className="print-only-doc text-slate-900 bg-white p-2">
        {/* National Header */}
        <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
          <div className="text-left space-y-0.5 max-w-xs">
            <p className="text-[10pt] font-black uppercase tracking-wider text-slate-900">RÉPUBLIQUE DU MALI</p>
            <p className="text-[8pt] italic text-slate-600">Un Peuple - Un But - Une Foi</p>
            <p className="text-[8pt] font-bold text-slate-800 uppercase mt-1">MINISTÈRE DE L'ÉDUCATION NATIONALE</p>
            <p className="text-[7.5pt] text-slate-700">{studentData.academyName}</p>
            <p className="text-[7.5pt] font-semibold text-slate-700">CAP DE FALADIÉ / BAMAKO</p>
          </div>

          <div className="text-center flex-1 px-4">
            <h1 className="text-[14pt] font-black uppercase text-slate-950 tracking-tight">
              {studentData.schoolName}
            </h1>
            <p className="text-[8pt] text-slate-600 font-medium">
              Établissement d'Enseignement Général, Fondamental & Secondaire
            </p>
            <p className="text-[7.5pt] text-slate-500 font-mono mt-0.5">
              Tél: {studentData.emergencyContact} · Année Scolaire: {studentData.academicYear}
            </p>
          </div>

          <div className="text-right shrink-0">
            {printableQrCodeUrl ? (
              <img src={printableQrCodeUrl} alt="QR Code Vérification" className="w-20 h-20 border border-slate-300 p-1 rounded-md ml-auto" />
            ) : (
              <div className="w-20 h-20 border border-dashed border-slate-300 flex items-center justify-center text-[7pt] text-slate-400">
                QR CODE
              </div>
            )}
            <p className="text-[6.5pt] font-mono font-bold text-slate-500 mt-1 uppercase">Scan Vérifié</p>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="my-3 text-center bg-slate-100 border border-slate-300 py-1.5 px-4 rounded-lg flex items-center justify-between">
          <span className="text-[8pt] font-bold text-slate-600">FICHE D'AUTHENTIFICATION OFFICIELLE</span>
          <span className="text-[10pt] font-black uppercase tracking-wider text-slate-950">
            ATTESTATION D'IDENTITÉ SCOLAIRE DE L'ÉLÈVE
          </span>
          <span className="text-[8pt] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
            STATUT : {studentData.status}
          </span>
        </div>

        {/* Student Primary Identity Block (Photo + Information Grid) */}
        <div className="border border-slate-300 rounded-xl p-3 flex gap-4 items-center bg-slate-50/50 my-3">
          <div className="w-24 h-32 rounded-lg border-2 border-slate-400 bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {studentData.photoUrl ? (
              <img src={studentData.photoUrl} alt={studentData.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2 text-slate-500 font-bold text-[9pt]">
                <p className="text-xl font-black">{studentData.firstName.charAt(0)}{studentData.lastName.charAt(0)}</p>
                <p className="text-[7pt] uppercase mt-1">Photo Officielle</p>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5 text-[8.5pt]">
            <div className="border-b border-slate-200 pb-1 flex justify-between items-baseline">
              <div>
                <span className="text-[7pt] uppercase font-bold text-slate-500">Nom & Prénoms :</span>
                <p className="text-[12pt] font-black uppercase text-slate-950 leading-tight">
                  {studentData.name}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[7pt] uppercase font-bold text-slate-500">N° Matricule National :</span>
                <p className="text-[11pt] font-mono font-black text-blue-950">
                  {studentData.matricule}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-[7pt] uppercase font-bold text-slate-500">Classe Fréquentée :</span>
                <p className="font-bold text-slate-900">{studentData.className}</p>
              </div>
              <div>
                <span className="text-[7pt] uppercase font-bold text-slate-500">Date & Lieu de Naissance :</span>
                <p className="font-medium text-slate-900">
                  {studentData.birthDate ? new Date(studentData.birthDate).toLocaleDateString('fr-FR') : '---'} à {studentData.birthPlace || 'Bamako'}
                </p>
              </div>
              <div>
                <span className="text-[7pt] uppercase font-bold text-slate-500">Sexe / Genre :</span>
                <p className="font-bold text-slate-900">{studentData.gender === 'F' ? 'Féminin (F)' : 'Masculin (M)'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
              <div>
                <span className="text-[7pt] uppercase font-bold text-rose-700">Groupe Sanguin (Urgence) :</span>
                <p className="font-mono font-black text-rose-700 text-[10pt]">
                  {studentData.bloodType ? `${studentData.bloodType} (${studentData.bloodType.includes('-') ? 'Rhésus Négatif' : 'Rhésus Positif'})` : 'Non renseigné'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[7pt] uppercase font-bold text-slate-500">Allergies / Particularités Médicales :</span>
                <p className="font-medium text-slate-800 truncate">{studentData.allergies || 'Aucune contre-indication signalée'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Summary Table */}
        <div className="grid grid-cols-4 gap-2 text-center my-3">
          <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
            <span className="text-[7pt] font-bold text-slate-500 uppercase">Moyenne Générale</span>
            <p className="text-[13pt] font-mono font-black text-slate-950">
              {typeof studentData.average === 'number' ? `${studentData.average.toFixed(2)} / ${studentData.maxScore}` : '— / 20'}
            </p>
            <p className="text-[7pt] font-bold text-emerald-700 mt-0.5">{studentData.appreciation}</p>
          </div>

          <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
            <span className="text-[7pt] font-bold text-slate-500 uppercase">Rang en Classe</span>
            <p className="text-[13pt] font-mono font-black text-slate-950">
              {studentData.rank ? `${studentData.rank}${studentData.rank === 1 ? 'er' : 'e'}${studentData.totalClassStudents ? ` / ${studentData.totalClassStudents}` : ''}` : '—'}
            </p>
            <p className="text-[7pt] text-slate-500 mt-0.5">{studentData.totalClassStudents ? `Effectif: ${studentData.totalClassStudents}` : 'Effectif classe'}</p>
          </div>

          <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
            <span className="text-[7pt] font-bold text-slate-500 uppercase">Assiduité Scolaire</span>
            <p className="text-[13pt] font-mono font-black text-slate-950">
              {studentData.attendanceRate !== undefined ? `${studentData.attendanceRate}%` : '100%'}
            </p>
            <p className="text-[7pt] text-slate-500 mt-0.5">{studentData.totalAbsences !== undefined ? `${studentData.totalAbsences} absence(s)` : '0 absence'}</p>
          </div>

          <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
            <span className="text-[7pt] font-bold text-slate-500 uppercase">Frais de Scolarité</span>
            <p className="text-[10pt] font-mono font-black text-slate-950">
              {studentData.totalPaid !== undefined ? formatFCFA(studentData.totalPaid) : (studentData.annualFee !== undefined ? formatFCFA(studentData.annualFee) : 'Non renseigné')}
            </p>
            <p className="text-[7pt] font-bold text-slate-600 mt-0.5">
              {studentData.remainingAmount !== undefined ? ((studentData.remainingAmount || 0) <= 0 ? '✓ Soldé à 100%' : `Reste: ${formatFCFA(studentData.remainingAmount)}`) : 'Frais de scolarité'}
            </p>
          </div>
        </div>

        {/* Filiation & Parents */}
        <div className="border border-slate-300 rounded-lg p-2.5 my-3 text-[8pt]">
          <p className="font-bold text-[8pt] text-slate-900 uppercase border-b border-slate-200 pb-1 mb-1.5">
            Filiation, Parents & Contacts d'Urgence
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p><span className="font-bold text-slate-600">Père / Tuteur :</span> {studentData.fatherName ? `${studentData.fatherName} ${studentData.fatherProfession ? `(${studentData.fatherProfession})` : ''}` : 'Non renseigné'}</p>
              <p><span className="font-bold text-slate-600">Téléphone Père :</span> {studentData.fatherPhone || '—'}</p>
            </div>
            <div>
              <p><span className="font-bold text-slate-600">Mère / Tutrice :</span> {studentData.motherName ? `${studentData.motherName} ${studentData.motherProfession ? `(${studentData.motherProfession})` : ''}` : 'Non renseignée'}</p>
              <p><span className="font-bold text-slate-600">Téléphone Mère :</span> {studentData.motherPhone || '—'}</p>
            </div>
          </div>
          <div className="mt-1.5 pt-1 border-t border-slate-100 flex justify-between text-[7.5pt]">
            <p><span className="font-bold text-slate-600">Adresse de Résidence :</span> {studentData.address || 'Non renseignée'}</p>
            <p><span className="font-bold text-rose-700">Urgence Directe :</span> {studentData.emergencyContact || 'Non renseigné'}</p>
          </div>
        </div>

        {/* Legal Certification and Signatures */}
        <div className="mt-4 pt-2 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-[8pt]">
          <div>
            <p className="font-bold text-slate-800 uppercase">Le Surveillant Général / Titulaire</p>
            <p className="text-[7pt] text-slate-500 italic">Signature et mention "Vu"</p>
            <div className="h-16 border border-dashed border-slate-300 rounded mt-1 flex items-center justify-center text-[7pt] text-slate-400">
              Signature du Surveillant
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-800 uppercase">Le Chef d'Établissement / Directeur</p>
            <p className="text-[7pt] text-slate-500 italic">Cachet officiel et signature</p>
            <div className="h-16 border border-dashed border-slate-300 rounded mt-1 flex items-center justify-center text-[7pt] text-slate-400">
              Sceau & Signature Officiels
            </div>
          </div>
        </div>

        {/* Bottom Legal Footer */}
        <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[6.5pt] text-slate-500 flex justify-between">
          <span>Document officiel généré par le système KalanGest · République du Mali</span>
          <span>Délivré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</span>
          <span>Authentification sécurisée par QR Code</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN-ONLY VIP INTERACTIVE PRESENTATION (Dark luxury aesthetic)           */}
      {/* ========================================================================= */}
      <div className="screen-only-section flex flex-col flex-1">
        {/* Top National Ribbon */}
        <div className="h-1.5 w-full flex shrink-0">
          <div className="flex-1 bg-[#10b981]" />
          <div className="flex-1 bg-[#f59e0b]" />
          <div className="flex-1 bg-[#ef4444]" />
        </div>

        {/* Top Header Bar (Tactile, Compact, Classy) */}
        <header className="no-print bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-rose-600 p-[1.5px] shadow-lg shrink-0">
              <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                <QrCode className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                  KalanGest • Contrôle QR Mobile
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Certifié MEN Mali</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {studentData.schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-print toggle button */}
            <button
              onClick={() => {
                setAutoPrintEnabled(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                autoPrintEnabled
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={autoPrintEnabled ? 'Impression automatique activée lors de chaque scan' : 'Cliquer pour activer l\'impression automatique au scan'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Auto-Print :</span>
              <span className={autoPrintEnabled ? 'text-amber-400' : 'text-slate-500'}>
                {autoPrintEnabled ? 'OUI' : 'NON'}
              </span>
            </button>

            {/* Quick theme selector */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {(['MALI_GOLD', 'ROYAL_AZUR', 'EMERALD_PRESTIGE', 'OBSIDIAN_LUXURY'] as PresentationTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTheme(t)}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                    activeTheme === t ? 'scale-110 ring-2 ring-white/60' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: t === 'MALI_GOLD' ? '#fbbf24' : t === 'ROYAL_AZUR' ? '#38bdf8' : t === 'EMERALD_PRESTIGE' ? '#10b981' : '#a1a1aa'
                  }}
                  title={`Thème ${t}`}
                />
              ))}
            </div>

            <button
              onClick={() => setShowJsonDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Coller ou saisir le JSON provenant d'un scanner externe"
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Coller JSON</span>
            </button>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
              title="Scanner le QR Code d'un autre élève"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Scanner QR</span>
            </button>

            {onExitToApp && (
              <button
                onClick={onExitToApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
                title="Retourner au portail de l'école"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Espace École</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Auto-print triggering indicator */}
          {isAutoPrintingNotice && (
            <div className="p-3.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl animate-pulse">
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>Génération et ouverture automatique du document d'impression officiel en cours...</span>
              </div>
            </div>
          )}

          {/* Attendance Confirmation Animated Toast */}
          {attendanceNotice && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{attendanceNotice}</span>
              </div>
              <button onClick={() => setAttendanceNotice(null)} className="text-emerald-400 hover:text-white cursor-pointer px-2 py-1">
                ✕
              </button>
            </div>
          )}

          {/* MODE SWITCHER: 'ID CARD' (Plastic Badge Preview) VS 'DOSSIER' (Full Dossier) */}
          <div className="flex items-center justify-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-md mx-auto shadow-xl">
            <button
              type="button"
              onClick={() => setViewMode('ID_CARD')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                viewMode === 'ID_CARD'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Aperçu Carte Plastique (Badge)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DOSSIER')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                viewMode === 'DOSSIER'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Fiche Dossier & Piliers</span>
            </button>
          </div>

          {/* Scanner Launcher Panel if no QR code scanned yet */}
          {!isRealDataLoaded && (
            <div className="bg-gradient-to-br from-slate-900 via-[#0a0f1d] to-slate-900 border-2 border-amber-400/70 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                <QrCode className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                  Prêt pour le Scan du Badge Élève
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scannez le QR Code officiel sur la carte d'un élève avec l'appareil photo du téléphone, ou collez les données JSON pour afficher instantanément sa fiche authentifiée.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activer la Caméra pour Scanner</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowJsonDrawer(true)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-2xl border border-slate-700 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Code className="w-4 h-4" />
                  <span>Coller les Données JSON</span>
                </button>
              </div>

              {students.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Ou sélectionner un élève inscrit dans l'établissement :
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {students.slice(0, 4).map(std => (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => {
                          lastAutoPrintedMatriculeRef.current = null;
                          setRawData(JSON.stringify(std));
                          playChime();
                        }}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 cursor-pointer transition-colors"
                      >
                        {std.lastName} {std.firstName} ({std.matricule})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW MODE 1: VISUAL 'ID CARD' PLASTIC-CARD STYLE PREVIEW (PVC BADGE)       */}
          {/* ========================================================================= */}
          {viewMode === 'ID_CARD' ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Card Controls Bar: Flip card & Quick Print format selection */}
              <div className="flex items-center justify-between px-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCardSide(prev => prev === 'RECTO' ? 'VERSO' : 'RECTO')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold border border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Retourner la Carte ({cardSide === 'RECTO' ? 'Verso 🔄' : 'Recto 🔄'})</span>
                  </button>
                  <span className="text-slate-500 text-[11px] hidden sm:inline">
                    Face visible : <strong className="text-slate-300">{cardSide === 'RECTO' ? 'Recto (Identité & QR)' : 'Verso (Urgences & Contacts)'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintBadgePvc}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                    title="Imprimer directement ce badge au format carte plastique PVC"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer Badge PVC</span>
                  </button>
                </div>
              </div>

              {/* Realistic PVC Plastic ID Card Container with 3D Flip */}
              <div className="relative mx-auto max-w-[500px] w-full aspect-[1.58/1] min-h-[310px] [perspective:1000px] select-none">
                <div 
                  className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] rounded-[1.85rem] shadow-[0_20px_60px_rgba(0,0,0,0.7)] ${
                    cardSide === 'VERSO' ? '[transform:rotateY(180deg)]' : ''
                  }`}
                >
                  {/* RECTO (FRONT FACE) */}
                  <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[1.85rem] overflow-hidden p-5 flex flex-col justify-between border-2 ${theme.ringColor} bg-gradient-to-br ${theme.cardGradient} shadow-2xl`}>
                    {/* Simulated Lanyard Punch Slot */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-2.5 rounded-full bg-slate-950 border border-slate-700/80 shadow-inner z-10 flex items-center justify-center">
                      <div className="w-8 h-1 bg-slate-900 rounded-full" />
                    </div>

                    {/* Glossy Plastic Card Sheen Overlay */}
                    <div className="absolute -inset-full bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none transform -rotate-12" />

                    {/* Top National Colors Ribbon */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                      <div className="flex-1 bg-emerald-500" />
                      <div className="flex-1 bg-amber-400" />
                      <div className="flex-1 bg-rose-600" />
                    </div>

                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 font-bold text-xs shadow-xs">
                          <Building2 className="w-4 h-4 text-amber-300" />
                        </div>
                        <div>
                          <p className="text-[10.5px] font-black uppercase text-white tracking-wider truncate max-w-[240px]">
                            {studentData.schoolName}
                          </p>
                          <p className="text-[8px] font-semibold text-slate-400 uppercase">
                            RÉPUBLIQUE DU MALI · {studentData.academicYear}
                          </p>
                        </div>
                      </div>

                      {/* Contactless / NFC Wave icon & format badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] font-mono font-bold text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                          CR80 PVC
                        </span>
                        <Wifi className="w-4 h-4 text-amber-300 rotate-90" />
                      </div>
                    </div>

                    {/* Card Content Grid: Photo + Info + QR Code */}
                    <div className="grid grid-cols-12 gap-3.5 items-center my-auto py-1">
                      {/* Photo with frame */}
                      <div className="col-span-4 flex flex-col items-center">
                        <div className="w-24 h-28 sm:w-26 sm:h-30 rounded-2xl border-2 border-amber-400/80 p-0.5 bg-slate-900 overflow-hidden shadow-xl flex items-center justify-center relative">
                          {studentData.photoUrl ? (
                            <img src={studentData.photoUrl} alt={studentData.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-amber-400 font-black">
                              <span className="text-2xl">{studentData.firstName.charAt(0)}{studentData.lastName.charAt(0)}</span>
                              <span className="text-[7px] text-slate-400 uppercase mt-1 font-bold">Photo</span>
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[7px] font-black text-center uppercase py-0.5 shadow-xs">
                            {studentData.status}
                          </span>
                        </div>
                      </div>

                      {/* Student Details */}
                      <div className="col-span-5 space-y-1">
                        <div>
                          <p className="text-[7.5px] uppercase font-black text-slate-400 tracking-wider">ÉLÈVE</p>
                          <p className="text-sm font-black uppercase text-white truncate leading-tight">
                            {studentData.lastName}
                          </p>
                          <p className={`text-xs font-bold ${theme.accentColor} truncate leading-tight`}>
                            {studentData.firstName}
                          </p>
                        </div>

                        <div>
                          <p className="text-[7.5px] uppercase font-black text-slate-400 tracking-wider">CLASSE</p>
                          <p className="text-[11px] font-bold text-white truncate">
                            {studentData.className}
                          </p>
                        </div>

                        <div>
                          <p className="text-[7.5px] uppercase font-black text-slate-400 tracking-wider">MATRICULE</p>
                          <p className="text-xs font-mono font-black text-amber-300">
                            {studentData.matricule}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          {studentData.bloodType ? (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black font-mono bg-rose-600 text-white border border-rose-400/50 shadow-xs">
                              🩸 {studentData.bloodType}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-slate-400 bg-white/5 border border-white/10">
                              GS non précisé
                            </span>
                          )}
                          <span className="text-[8.5px] text-slate-300 font-bold">
                            {studentData.gender === 'F' ? 'Féminin' : (studentData.gender === 'M' ? 'Masculin' : '')}
                          </span>
                        </div>
                      </div>

                      {/* High-Resolution QR Code */}
                      <div className="col-span-3 flex flex-col items-center justify-center">
                        <div className="w-22 h-22 bg-white rounded-2xl p-1.5 shadow-2xl flex items-center justify-center border-2 border-white/80">
                          {printableQrCodeUrl ? (
                            <img src={printableQrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <QrCode className="w-12 h-12 text-slate-900" />
                          )}
                        </div>
                        <span className="text-[7.5px] font-mono font-black text-amber-300 uppercase mt-1 tracking-wider">
                          Scanner QR
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                      <span className="flex items-center gap-1 text-amber-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> CARTE SCOLAIRE OFFICIELLE
                      </span>
                      <span className="font-mono text-slate-300">
                        VALIDITÉ: 31/07/{studentData.academicYear.split('-')[1] || '2026'}
                      </span>
                    </div>
                  </div>

                  {/* VERSO (BACK FACE) */}
                  <div className={`absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[1.85rem] overflow-hidden p-5 flex flex-col justify-between border-2 ${theme.ringColor} bg-gradient-to-br ${theme.cardGradient} shadow-2xl`}>
                    {/* Simulated Lanyard Punch Slot */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-2.5 rounded-full bg-slate-950 border border-slate-700/80 shadow-inner z-10 flex items-center justify-center">
                      <div className="w-8 h-1 bg-slate-900 rounded-full" />
                    </div>

                    {/* Top Notice */}
                    <div className="border-b border-white/10 pb-1.5 pt-2.5">
                      <p className="text-[8.5px] font-black uppercase tracking-wider text-amber-300">
                        INSTRUCTIONS OFFICIELLES & CONTACTS D'URGENCE
                      </p>
                      <p className="text-[7.5pt] text-slate-300 leading-tight mt-0.5">
                        Cette carte est strictement personnelle. En cas de perte, prière de la retourner immédiatement à l'administration de l'établissement.
                      </p>
                    </div>

                    {/* Contacts Body */}
                    <div className="space-y-1.5 my-auto text-[8pt]">
                      <div className="bg-white/5 border border-white/10 p-2 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-[7.5px] uppercase font-bold text-amber-300">PARENTS / TUTEUR LÉGAL</p>
                          <p className="font-bold text-white text-[9.5px]">{studentData.fatherName || studentData.motherName || 'Non renseigné'}</p>
                        </div>
                        <p className="font-mono text-amber-300 text-[9.5px] font-bold">{studentData.fatherPhone || studentData.motherPhone || '—'}</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-2 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-[7.5px] uppercase font-bold text-rose-400">URGENCE MÉDICALE</p>
                          <p className="text-white text-[8.5px]">
                            Groupe : <strong className="text-amber-300 font-mono">{studentData.bloodType || 'Non renseigné'}</strong> · {studentData.allergies || 'Aucune contre-indication'}
                          </p>
                        </div>
                        <p className="font-mono text-rose-300 text-[9.5px] font-bold">{studentData.emergencyContact || '—'}</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-2 rounded-xl">
                        <p className="text-[7.5px] uppercase font-bold text-slate-400">ÉTABLISSEMENT SCOLAIRE</p>
                        <p className="text-white text-[8.5px] truncate">{studentData.schoolName} {studentData.address ? `· ${studentData.address}` : ''}</p>
                      </div>
                    </div>

                    {/* Signatures & Seal */}
                    <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-[7.5px] text-slate-400">
                      <div className="text-left">
                        <p className="font-bold">Sceau de l'École</p>
                        <div className="w-8 h-8 rounded-full border border-dashed border-white/40 flex items-center justify-center text-[6px] text-white/50 mt-0.5">
                          CACHET
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Signature Direction</p>
                        <p className="italic text-amber-300 font-black mt-2 text-[9px]">Le Directeur</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action Strip for the Card */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCardSide(prev => prev === 'RECTO' ? 'VERSO' : 'RECTO')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <RotateCw className="w-4 h-4 text-amber-400" />
                  <span>{cardSide === 'RECTO' ? 'Voir le Verso de la Carte' : 'Voir le Recto de la Carte'}</span>
                </button>

                <button
                  onClick={handlePrintBadgePvc}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Carte Plastique (Badge PVC)</span>
                </button>

                <button
                  onClick={handlePrintAttestationA4}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Imprimer l'Attestation A4</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW MODE 2: FULL EXECUTIVE 4-PILLARS DOSSIER VIEW                        */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Official Republic of Mali Watermark Seal */}
              <div className="bg-gradient-to-r from-[#0c1322] via-[#090d18] to-[#11192e] border border-slate-800/90 rounded-3xl p-5 text-center space-y-1.5 relative overflow-hidden shadow-xl">
                <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>RÉPUBLIQUE DU MALI • MINISTÈRE DE L'ÉDUCATION NATIONALE</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-300 tracking-wide">
                  {studentData.academyName}
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-white">{studentData.schoolName}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-300 font-mono">Année {studentData.academicYear}</span>
                </div>
              </div>

              {/* Luxury Credential Card */}
              <div className={`bg-gradient-to-br ${theme.cardGradient} ${theme.borderStyle} rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 transition-all duration-300`}>
                <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-64 h-64 opacity-5 pointer-events-none">
                  <QrCode className="w-full h-full text-white" />
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} flex items-center gap-1.5`}>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Carte Scolaire Numérique Vérifiée</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{studentData.scanTimestamp}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="relative shrink-0">
                    <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-2 ${theme.ringColor} p-1 shadow-2xl overflow-hidden flex items-center justify-center`}>
                      {studentData.photoUrl ? (
                        <img
                          src={studentData.photoUrl}
                          alt={studentData.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-slate-900/90 flex flex-col items-center justify-center text-amber-400 font-black text-2xl">
                          <span>{studentData.firstName.charAt(0)}{studentData.lastName.charAt(0)}</span>
                          <span className="text-[9px] uppercase tracking-widest text-slate-500 mt-1 font-bold">Photo Officielle</span>
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[9px] uppercase rounded-full shadow-lg border border-emerald-300">
                      {studentData.status}
                    </span>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2.5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Élève Régulier · {studentData.gender === 'F' ? 'Féminin' : 'Masculin'}
                      </p>
                      <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                        {studentData.lastName}
                      </h1>
                      <p className={`text-lg sm:text-xl font-bold ${theme.accentColor} -mt-0.5`}>
                        {studentData.firstName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-200 text-xs font-mono font-bold">
                        <span className="text-slate-400 text-[10px]">N° MLE :</span>
                        <span className="text-amber-400 tracking-wider">{studentData.matricule}</span>
                        <button
                          onClick={handleCopyMatricule}
                          className="ml-1 text-slate-400 hover:text-white cursor-pointer p-0.5"
                          title="Copier le matricule"
                        >
                          {copiedMatricule ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold">
                        CLASSE : <span className="text-white font-extrabold">{studentData.className}</span>
                      </div>

                      {studentData.birthDate && (
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-300 text-xs">
                          Né(e) le <span className="font-semibold text-white">{new Date(studentData.birthDate).toLocaleDateString('fr-FR')}</span> {studentData.birthPlace ? `à ${studentData.birthPlace}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                  <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>Moyenne Générale</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                        {studentData.rank ? `${studentData.rank}${studentData.rank === 1 ? 'er' : 'e'} / ${studentData.totalClassStudents || '-'}` : 'Classe'}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white font-mono tabular-nums">
                        {typeof studentData.average === 'number' ? studentData.average.toFixed(2) : '—'}
                        <span className="text-xs text-slate-400 font-sans font-medium"> / {studentData.maxScore}</span>
                      </p>
                      <p className="text-[11px] font-bold text-emerald-400 mt-0.5 truncate">
                        {studentData.appreciation}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 text-rose-500" />
                        <span>Groupe Sanguin</span>
                      </span>
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                        {studentData.bloodType ? 'Identité Médicale' : 'Non précisé'}
                      </span>
                    </div>
                    <div>
                      {studentData.bloodType ? (
                        <p className="text-2xl font-black text-rose-400 font-mono flex items-center gap-2">
                          <span>{studentData.bloodType}</span>
                          <span className="text-xs text-slate-400 font-sans font-medium">
                            {studentData.bloodType.includes('-') ? 'Rhésus Négatif' : 'Rhésus Positif'}
                          </span>
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-slate-400 font-mono">
                          Non renseigné
                        </p>
                      )}
                      <p className="text-[11px] text-slate-300 truncate mt-0.5" title={studentData.allergies}>
                        {studentData.allergies || 'Aucune allergie particulière signalée'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Assiduité & Absences</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        (studentData.totalAbsences || 0) > 3 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {studentData.attendanceRate !== undefined ? `${studentData.attendanceRate}% assidu` : 'Assiduité'}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-white font-mono tabular-nums">
                        {studentData.totalAbsences !== undefined ? studentData.totalAbsences : 0}
                        <span className="text-xs text-slate-400 font-sans font-medium"> {(studentData.totalAbsences || 0) > 1 ? 'absences' : 'absence'}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {studentData.justifiedAbsences !== undefined ? `${studentData.justifiedAbsences} justifiée(s) · ${studentData.unjustifiedAbsences || 0} non` : 'Historique d\'assiduité'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Scolarité FCFA</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        studentData.remainingAmount !== undefined
                          ? (studentData.remainingAmount <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400')
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {studentData.remainingAmount !== undefined
                          ? (studentData.remainingAmount <= 0 ? 'En Règle' : 'Solde Dû')
                          : 'Frais'}
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-black text-white font-mono tabular-nums">
                        {studentData.totalPaid !== undefined ? formatFCFA(studentData.totalPaid) : (studentData.annualFee !== undefined ? formatFCFA(studentData.annualFee) : 'Non renseigné')}
                      </p>
                      <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                        {studentData.remainingAmount !== undefined
                          ? (studentData.remainingAmount > 0 ? `Reste : ${formatFCFA(studentData.remainingAmount)}` : '100% Soldé')
                          : 'Scolarité annuelle'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filiation & Parents Section */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Coordonnées Parents & Urgence Directe
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Communication officielle école</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Père / Tuteur Légal</span>
                      <p className="font-bold text-white text-sm mt-0.5">{studentData.fatherName || 'Non renseigné'}</p>
                      {studentData.fatherProfession && <p className="text-xs text-slate-400">{studentData.fatherProfession}</p>}
                    </div>
                    {studentData.fatherPhone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${studentData.fatherPhone}`}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-sky-400" />
                          <span>Appeler</span>
                        </a>
                        <a
                          href={`https://wa.me/${studentData.fatherPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, nous vous contactons concernant votre enfant ${studentData.name} (${studentData.className}) au ${studentData.schoolName}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-1">Numéro de téléphone non renseigné</p>
                    )}
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mère / Tutrice Légale</span>
                      <p className="font-bold text-white text-sm mt-0.5">{studentData.motherName || 'Non renseignée'}</p>
                      {studentData.motherProfession && <p className="text-xs text-slate-400">{studentData.motherProfession}</p>}
                    </div>
                    {studentData.motherPhone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${studentData.motherPhone}`}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-sky-400" />
                          <span>Appeler</span>
                        </a>
                        <a
                          href={`https://wa.me/${studentData.motherPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, nous vous contactons concernant votre enfant ${studentData.name} (${studentData.className}) au ${studentData.schoolName}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-1">Numéro de téléphone non renseigné</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Adresse : <strong className="text-white">{studentData.address || 'Non renseignée'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-400 font-semibold">
                    <HeartPulse className="w-4 h-4 shrink-0" />
                    <span>Urgence Directe : <strong className="font-mono text-white">{studentData.emergencyContact || 'Non renseigné'}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Controls for Mobile / Gatekeeper / Supervisor */}
          <div className="no-print space-y-3 pt-2">
            {/* Main Attendance Check-in Button */}
            <button
              onClick={handleMarkPresent}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer active:scale-[0.98] ${
                isPresentMarkedToday
                  ? 'bg-emerald-700 text-white shadow-emerald-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30'
              }`}
            >
              <UserCheck className="w-5 h-5 text-emerald-200" />
              <span>{isPresentMarkedToday ? 'Présence Validée Aujourd\'hui ✓' : 'Pointer Présent / Autoriser l\'Accès'}</span>
            </button>

            {/* Secondary Quick Action Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={handlePrintBadgePvc}
                className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                title="Ouvrir la boîte d'impression pour le Badge Plastique"
              >
                <CreditCard className="w-4 h-4 text-slate-950" />
                <span>Imprimer Badge</span>
              </button>

              <button
                onClick={handleShareMobile}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-sky-400" />}
                <span>{copiedLink ? 'Lien Copié !' : 'Partager'}</span>
              </button>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Scanner Suivant</span>
              </button>

              <button
                onClick={() => setShowRawInspector(true)}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Inspecter le payload JSON complet du QR Code"
              >
                <Code className="w-4 h-4 text-amber-400" />
                <span>Voir JSON</span>
              </button>
            </div>
          </div>

          {/* Demo Quick Test Banner */}
          <div className="no-print bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tester avec les élèves réels de l'établissement :</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {students.slice(0, 3).map((std, i) => (
                <button
                  key={std.id}
                  onClick={() => {
                    lastAutoPrintedMatriculeRef.current = null;
                    setRawData(JSON.stringify(std));
                    playChime();
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${
                    i === 0 ? 'bg-slate-800 hover:bg-slate-700 text-amber-300' : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                  }`}
                >
                  {std.lastName} {std.firstName} ({std.matricule})
                </button>
              ))}
              {students.length === 0 && (
                <span className="text-xs text-slate-500 italic">Aucun élève enregistré dans l'établissement pour le moment</span>
              )}
            </div>
          </div>
        </main>

        {/* Footer Bar */}
        <footer className="no-print border-t border-slate-900 bg-[#080c16] p-4 text-center text-xs text-slate-500">
          <p>
            KalanGest · Plateforme Nationale de Contrôle d'Accès & Authentification des Badges Scolaires du Mali
          </p>
        </footer>
      </div>

      {/* Modal / Drawer: Paste or Enter Raw JSON */}
      {showJsonDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Coller les données JSON du QR Code</h3>
              </div>
              <button onClick={() => setShowJsonDrawer(false)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Lorsque vous scannez le badge avec un lecteur de code-barre ou l'appareil photo d'un smartphone en dehors de l'application, collez ici le résultat (texte JSON ou URL de vérification).
            </p>

            <form onSubmit={handleApplyPastedJson} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Texte JSON ou URL scannée :</span>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Coller du presse-papier</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={jsonInputText}
                  onChange={e => setJsonInputText(e.target.value)}
                  placeholder='{"matricule": "MALI-2025-0142", "name": "TRAORE AMINATA", "bloodType": "O+", "average": 15.5}'
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

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
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Afficher & Imprimer la Fiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raw JSON Inspector Modal */}
      {showRawInspector && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Données JSON Brutes du Scan</h3>
              </div>
              <button onClick={() => setShowRawInspector(false)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Structure JSON reçue et interprétée par le lecteur de badge :
            </p>

            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-72 custom-scrollbar">
              {JSON.stringify(studentData, null, 2)}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setShowRawInspector(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal QR Scanner Modal (Camera / Photo) */}
      <StudentQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onStudentFound={(scannedStudent) => {
          setIsScannerOpen(false);
          lastAutoPrintedMatriculeRef.current = null; // Reset to allow auto-print for newly scanned student
          setRawData(JSON.stringify(scannedStudent));
          playChime();
        }}
      />
    </div>
  );
};
