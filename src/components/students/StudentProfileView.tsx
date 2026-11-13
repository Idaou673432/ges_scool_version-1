/**
 * SomaSikolo / KalanGest - Vue 'Profil Élève' Complète, Unique & Centralisée
 * Centralise 100% des opérations liées à un élève en un seul endroit :
 * - Onglet 1 : Paiements & Caisse (Solde, acompte, solde intégral en 1 clic, réimpression des reçus PDF)
 * - Onglet 2 : Carte Scolaire & QR Code (Aperçu badge Mali, téléchargement PDF A4, copie lien de vérification)
 * - Onglet 3 : Notes & Bulletins (Moyenne générale, rang, appréciations officielles MEN, grille des matières, PDF)
 * - Onglet 4 : Historique d'Assiduité (Taux de présence, marquage 1-clic présent/absent, journal des dates)
 * - Onglet 5 : Informations Personnelles & Famille (État civil, WhatsApp tuteur direct, appel, groupe sanguin)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  Award, 
  FileText, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download, 
  Plus, 
  Check, 
  Copy, 
  MessageCircle, 
  ExternalLink, 
  ShieldCheck, 
  Droplet, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Wallet, 
  HeartPulse, 
  Edit3,
  BookOpen,
  TrendingUp,
  Share2,
  X,
  Eye
} from 'lucide-react';
import { Student, SchoolClass, Payment, AttendanceRecord, EvaluationTerm, PaymentCategory, PaymentMethod, ReportCard } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { PdfService } from '../../services/pdfService';
import { formatFCFA, getAnnualTuitionFee, getMaliScoreAppreciation, getFilteredEvaluationTerms } from '../../constants/maliEducation';
import { HorizontalReceiptModal } from '../receipts/HorizontalReceiptModal';

interface StudentProfileViewProps {
  student: Student;
  onBack?: () => void;
  initialTab?: 'PAYMENTS' | 'CARDS' | 'GRADES' | 'ATTENDANCE' | 'INFO';
  onEditStudent?: (student: Student) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  onBack,
  initialTab = 'PAYMENTS',
  onEditStudent
}) => {
  const { 
    classes, 
    settings, 
    payments, 
    recordPayment, 
    generateReportCard, 
    attendanceRecords, 
    saveAttendanceBatch 
  } = useSchool();
  const { hasPermission } = useAuth();
  const canViewPayments = hasPermission('payments:view');
  const canRecordPayment = hasPermission('payments:record');
  const canGenerateCards = hasPermission('cards:generate');
  const canViewGrades = hasPermission('grades:view') || hasPermission('bulletins:view') || hasPermission('bulletins:generate');
  const canViewAttendance = hasPermission('attendance:view');
  const canEditStudent = hasPermission('students:edit');

  // Onglet actif (basculer automatiquement si l'utilisateur n'a pas accès aux paiements)
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'CARDS' | 'GRADES' | 'ATTENDANCE' | 'INFO'>(() => {
    if (initialTab === 'PAYMENTS' && !canViewPayments) return 'INFO';
    return initialTab;
  });

  // Classe de l'élève
  const studentClass = useMemo(() => {
    return classes.find(c => c.id === student.classId);
  }, [classes, student.classId]);

  // Périodes strictement filtrées selon le cycle de la classe
  const filteredTerms = useMemo(() => {
    return getFilteredEvaluationTerms(
      studentClass?.category,
      settings.schoolCategory,
      settings.evaluationMonths,
      settings.evaluationCount
    );
  }, [studentClass?.category, settings.schoolCategory, settings.evaluationMonths, settings.evaluationCount]);

  // Terme sélectionné pour les notes / bulletins
  const [selectedTerm, setSelectedTerm] = useState<EvaluationTerm>(() => {
    const isFondamental = 
      studentClass?.category === 'FONDAMENTAL_1' || 
      studentClass?.category === 'FONDAMENTAL_2' || 
      settings.schoolCategory === 'ECOLE_FONDAMENTALE';
    if (isFondamental) return 'EVALUATION_1';
    if (studentClass?.category === 'LYCEE' || settings.schoolCategory === 'LYCEE') return 'TRIMESTRE_1';
    if (studentClass?.category === 'TECHNIQUE_BT' || studentClass?.category === 'PROFESSIONNEL_CAP' || settings.schoolCategory === 'PROFESSIONNEL') return 'SEMESTRE_1';
    return 'EVALUATION_1';
  });

  // Basculer automatiquement le terme si le cycle ne correspond pas
  useEffect(() => {
    const isFondamental = 
      studentClass?.category === 'FONDAMENTAL_1' || 
      studentClass?.category === 'FONDAMENTAL_2' || 
      settings.schoolCategory === 'ECOLE_FONDAMENTALE';

    if (isFondamental) {
      if (selectedTerm.startsWith('TRIMESTRE_') || selectedTerm.startsWith('SEMESTRE_')) {
        setSelectedTerm('EVALUATION_1');
      }
    } else if (studentClass?.category === 'LYCEE' || settings.schoolCategory === 'LYCEE') {
      if (!selectedTerm.startsWith('TRIMESTRE_')) {
        setSelectedTerm('TRIMESTRE_1');
      }
    } else if (studentClass?.category === 'TECHNIQUE_BT' || studentClass?.category === 'PROFESSIONNEL_CAP' || settings.schoolCategory === 'PROFESSIONNEL') {
      if (!selectedTerm.startsWith('SEMESTRE_')) {
        setSelectedTerm('SEMESTRE_1');
      }
    }
  }, [studentClass?.category, settings.schoolCategory, selectedTerm]);

  // Messages de retour / notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [studentQrUrl, setStudentQrUrl] = useState<string>('');

  // Formulaire d'encaissement direct
  const [paymentAmount, setPaymentAmount] = useState<number>(25000);
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('MENSUALITE');
  const [paymentMonth, setPaymentMonth] = useState<string>('Octobre 2025');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isCashFormOpen, setIsCashFormOpen] = useState(false);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);

  // Situation financière de l'élève
  const studentFinance = useMemo(() => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const totalPaid = studentPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const annualFee = getAnnualTuitionFee(studentClass, settings);
    const remaining = Math.max(0, annualFee - totalPaid);
    const percentPaid = annualFee > 0 ? Math.min(100, Math.round((totalPaid / annualFee) * 100)) : 100;
    const isUpToDate = remaining <= 0 && annualFee > 0;
    const isPartial = totalPaid > 0 && remaining > 0;
    const isUnpaid = totalPaid === 0 && annualFee > 0;

    return {
      studentPayments: studentPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
      totalPaid,
      annualFee,
      remaining,
      percentPaid,
      isUpToDate,
      isPartial,
      isUnpaid
    };
  }, [payments, student.id, studentClass, settings]);

  // Statistiques d'assiduité
  const studentAttendance = useMemo(() => {
    const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
    const presents = studentRecords.filter(r => r.status === 'PRESENT').length;
    const justAbs = studentRecords.filter(r => r.status === 'ABSENT_JUSTIFIED').length;
    const unjustAbs = studentRecords.filter(r => r.status === 'ABSENT_UNJUSTIFIED').length;
    const lates = studentRecords.filter(r => r.status === 'RETARD').length;
    const totalDays = studentRecords.length;
    const rate = totalDays > 0 ? Math.round((presents / totalDays) * 100) : 100;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRecord = studentRecords.find(r => r.date === todayStr);

    return {
      studentRecords: studentRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totalDays,
      presents,
      justAbs,
      unjustAbs,
      totalAbsences: justAbs + unjustAbs,
      lates,
      rate,
      todayRecord
    };
  }, [attendanceRecords, student.id]);

  // Bulletin & Performance académique de l'élève
  const reportCard: ReportCard | null = useMemo(() => {
    return generateReportCard(student.id, selectedTerm);
  }, [generateReportCard, student.id, selectedTerm]);

  // Calcul du QR Code de la carte scolaire
  useEffect(() => {
    let isMounted = true;
    PdfService.generateStudentCardQr(student).then((url) => {
      if (isMounted) setStudentQrUrl(url);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [student]);

  // 1. Action : Encaisser un versement direct
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentFinance.remaining <= 0) return;
    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) return;

    const newPayment = recordPayment({
      studentId: student.id,
      studentMatricule: student.matricule,
      studentName: `${student.lastName.toUpperCase()} ${student.firstName}`,
      className: studentClass?.name || 'Sans classe',
      category: paymentCategory,
      monthCovered: paymentMonth,
      amountPaid: amt,
      expectedAmount: studentClass?.monthlyFee || 25000,
      paymentDate: new Date().toISOString(),
      method: paymentMethod,
      referenceNumber: '',
      notes: paymentNotes,
      cashierName: 'Caisse Principale',
      academicYear: settings.currentAcademicYear
    });

    setIsCashFormOpen(false);
    setToastMessage(`Paiement de ${formatFCFA(amt)} enregistré !`);
    setTimeout(() => setToastMessage(null), 3500);

    // Visionner directement la quittance à l'écran sans téléchargement forcé
    setPreviewPayment(newPayment);
  };

  // 2. Action : Tout Solder en 1 clic
  const handleQuickSettleAll = () => {
    if (studentFinance.remaining <= 0) return;
    const newPayment = recordPayment({
      studentId: student.id,
      studentMatricule: student.matricule,
      studentName: `${student.lastName.toUpperCase()} ${student.firstName}`,
      className: studentClass?.name || 'Sans classe',
      category: 'SOLDE_TOTAL',
      monthCovered: 'Solde intégral scolarité',
      amountPaid: studentFinance.remaining,
      expectedAmount: studentClass?.monthlyFee || 25000,
      paymentDate: new Date().toISOString(),
      method: 'ESPECES',
      referenceNumber: '',
      notes: 'Solde intégral de scolarité en 1 clic',
      cashierName: 'Caisse Principale',
      academicYear: settings.currentAcademicYear
    });

    setToastMessage(`Solde intégral de ${formatFCFA(newPayment.amountPaid)} effectué !`);
    setTimeout(() => setToastMessage(null), 3500);

    // Visionner directement la quittance à l'écran sans téléchargement forcé
    setPreviewPayment(newPayment);
  };

  // 3. Action : Télécharger Carte Scolaire PDF A4
  const handleDownloadCardPdf = async () => {
    try {
      setToastMessage(`Téléchargement de la carte scolaire de ${student.firstName}...`);
      await PdfService.generateStudentCardsBatchPdf([student], classes, settings);
      setToastMessage(`Carte scolaire de ${student.firstName} prête !`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setToastMessage("Erreur lors de la génération de la carte.");
    }
  };

  // 4. Action : Télécharger Bulletin de Notes PDF
  const handleDownloadBulletinPdf = async () => {
    try {
      if (!reportCard || !reportCard.subjectAverages || reportCard.subjectAverages.length === 0) {
        setToastMessage(`Aucune note disponible pour le ${selectedTerm}.`);
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      setToastMessage(`Téléchargement du bulletin de ${student.firstName}...`);
      await PdfService.generateReportCardPdf(reportCard, settings);
      setToastMessage(`Bulletin de ${student.firstName} téléchargé avec succès !`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setToastMessage("Erreur lors de la génération du bulletin.");
    }
  };

  // 5. Action : Marquer présence ou absence pour aujourd'hui
  const handleMarkAttendanceToday = (status: 'PRESENT' | 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED' | 'RETARD') => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const statusLabels: Record<string, string> = {
      PRESENT: 'Présent(e)',
      ABSENT_JUSTIFIED: 'Absence Justifiée',
      ABSENT_UNJUSTIFIED: 'Absence Injustifiée',
      RETARD: 'En Retard'
    };
    saveAttendanceBatch([{
      date: todayStr,
      studentId: student.id,
      studentMatricule: student.matricule,
      studentName: `${student.lastName.toUpperCase()} ${student.firstName}`,
      classId: student.classId,
      className: studentClass?.name || 'Classe non assignée',
      status,
      period: 'JOURNEE',
      academicYear: settings.currentAcademicYear
    }]);

    setToastMessage(`Assiduité d'aujourd'hui enregistrée : ${statusLabels[status]}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const cleanPhone = (student.parent?.fatherPhone || student.parent?.motherPhone || '').replace(/[^0-9]/g, '');

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4 animate-fadeIn">
      
      {/* Barre Supérieure de Navigation & Entête Élève Compact */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer border border-slate-200"
              title="Retourner à la liste des élèves"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.firstName}
                className="w-7 h-7 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-slate-900">
                {student.lastName.toUpperCase()} {student.firstName}
              </h1>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                student.status === 'ACTIF' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {student.status}
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                MLE : <strong className="text-slate-800">{student.matricule}</strong> • Classe : <strong className="text-slate-800">{studentClass?.name || 'Non assigné'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Actions Rapides en Entête */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {canRecordPayment && studentFinance.remaining > 0 && (
            <button
              type="button"
              onClick={handleQuickSettleAll}
              className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Solder immédiatement tout le reliquat restant"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Solder ({formatFCFA(studentFinance.remaining)})</span>
            </button>
          )}

          {canGenerateCards && (
            <button
              type="button"
              onClick={handleDownloadCardPdf}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Télécharger la Carte Scolaire A4 avec QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Carte PDF</span>
            </button>
          )}

          {canViewGrades && (
            <button
              type="button"
              onClick={handleDownloadBulletinPdf}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Télécharger le Bulletin Trimestriel Officiel PDF"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Bulletin PDF</span>
            </button>
          )}

          {onEditStudent && canEditStudent && (
            <button
              type="button"
              onClick={() => onEditStudent(student)}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Modifier la fiche d'inscription"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barre d'Onglets Unifiée & Compacte */}
      <div className="bg-white px-2 py-1 rounded-xl border border-slate-200/90 flex items-center gap-1 overflow-x-auto shadow-2xs text-xs font-semibold">
        {canViewPayments && (
          <button
            type="button"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
              activeTab === 'PAYMENTS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paiements</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              studentFinance.remaining === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {studentFinance.isUpToDate ? 'Soldé' : formatFCFA(studentFinance.remaining)}
            </span>
          </button>
        )}

        {canGenerateCards && (
          <button
            type="button"
            onClick={() => setActiveTab('CARDS')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
              activeTab === 'CARDS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Carte & QR</span>
          </button>
        )}

        {canViewGrades && (
          <button
            type="button"
            onClick={() => setActiveTab('GRADES')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
              activeTab === 'GRADES'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span>Notes & Bulletins</span>
            {reportCard && (
              <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
                {reportCard.generalAverage.toFixed(2)}/20
              </span>
            )}
          </button>
        )}

        {canViewAttendance && (
          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
              activeTab === 'ATTENDANCE'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span>Assiduité</span>
            <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
              {studentAttendance.rate}%
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('INFO')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
            activeTab === 'INFO'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>Famille & Infos</span>
        </button>
      </div>

      {/* =========================================================================
          CONTENU DE L'ONGLET 1 : PAIEMENTS & CAISSE
          ========================================================================= */}
      {activeTab === 'PAYMENTS' && canViewPayments && (
        <div className="space-y-2">
          {/* Synthèse Financière & Actions en Ruban Compact */}
          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Scolarité :</span>
                <span className="font-mono font-bold text-slate-900">{formatFCFA(studentFinance.annualFee)}</span>
              </div>
              <span className="text-slate-200 font-light">|</span>
              <div className="flex items-center gap-1">
                <span className="text-emerald-700 font-bold uppercase text-[10px]">Encaissé :</span>
                <span className="font-mono font-bold text-emerald-800">{formatFCFA(studentFinance.totalPaid)}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {studentFinance.percentPaid}%
                </span>
              </div>
              <span className="text-slate-200 font-light">|</span>
              <div className="flex items-center gap-1">
                <span className="text-rose-700 font-bold uppercase text-[10px]">Reliquat :</span>
                <span className={`font-mono font-bold ${studentFinance.remaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatFCFA(studentFinance.remaining)}
                </span>
                {studentFinance.remaining === 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Soldé
                  </span>
                )}
              </div>
            </div>

            {canRecordPayment && studentFinance.remaining > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCashFormOpen(!isCashFormOpen)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCashFormOpen ? 'Fermer' : 'Encaisser'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Formulaire de saisie d'un paiement dépliable */}
          {canRecordPayment && isCashFormOpen && studentFinance.remaining > 0 && (
            <form onSubmit={handleRecordPaymentSubmit} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">Enregistrer un Nouveau Paiement</h4>
                <button type="button" onClick={() => setIsCashFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Montant en FCFA *</label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-800 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Motif de Règlement</label>
                  <select
                    value={paymentCategory}
                    onChange={e => setPaymentCategory(e.target.value as PaymentCategory)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium outline-none cursor-pointer text-xs"
                  >
                    <option value="MENSUALITE">Mensualité de Scolarité</option>
                    <option value="SOLDE_TOTAL">Solde Intégral</option>
                    <option value="INSCRIPTION">Frais d'Inscription</option>
                    <option value="CANTINE">Service Cantine</option>
                    <option value="TRANSPORT">Transport Scolaire</option>
                    <option value="UNIFORME">Tenue Scolaire</option>
                    <option value="AUTRES">Frais Divers</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Mois / Période</label>
                  <input
                    type="text"
                    value={paymentMonth}
                    onChange={e => setPaymentMonth(e.target.value)}
                    placeholder="Ex: Novembre 2025"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Mode de Paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium outline-none cursor-pointer text-xs"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MOOV_MONEY">Moov Money</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement Bancaire</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Note / Observation</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Ex: Versé par le père..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCashFormOpen(false)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Valider & Reçu PDF</span>
                </button>
              </div>
            </form>
          )}

          {/* Tableau d'Historique des Reçus de l'Élève */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
              <h3 className="font-bold text-slate-800 uppercase text-[11px]">
                Reçus & Versements ({studentFinance.studentPayments.length})
              </h3>
              <span className="font-mono font-bold text-slate-600 text-xs">
                Total Encaissé : <strong className="text-emerald-800">{formatFCFA(studentFinance.totalPaid)}</strong>
              </span>
            </div>

            {studentFinance.studentPayments.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1 text-xs">
                <CreditCard className="w-6 h-6 mx-auto text-slate-300" />
                <p>Aucun paiement n'a encore été enregistré pour cet élève.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="py-1.5 px-3">Reçu N°</th>
                      <th className="py-1.5 px-2.5">Date</th>
                      <th className="py-1.5 px-2.5">Motif & Période</th>
                      <th className="py-1.5 px-2.5">Mode</th>
                      <th className="py-1.5 px-2.5">Montant</th>
                      <th className="py-1.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentFinance.studentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600">
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-700">
                          <span className="font-semibold">{p.category}</span>
                          {p.monthCovered && <span className="text-slate-500 ml-1">({p.monthCovered})</span>}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">
                          {p.method}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-800">
                          {formatFCFA(p.amountPaid)}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewPayment(p)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-xs inline-flex items-center gap-1 transition-colors cursor-pointer border border-slate-200/80"
                            title="Visualiser la quittance officielle horizontale"
                          >
                            <Eye className="w-3 h-3 text-slate-600" />
                            <span>Voir Quittance</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ONGLET 2 : CARTE SCOLAIRE & QR CODE
          ========================================================================= */}
      {activeTab === 'CARDS' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            
            {/* Aperçu Haute Fidélité de la Carte Scolaire (Recto) */}
            <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 p-4 rounded-xl border border-amber-400/80 shadow-md text-white space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 block">
                    RÉPUBLIQUE DU MALI • MINISTÈRE DE L'ÉDUCATION NATIONALE
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5">{settings.schoolName || 'ÉTABLISSEMENT SCOLAIRE'}</h4>
                </div>
                <div className="w-5 h-3.5 bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-xs shadow-xs" title="Drapeau du Mali" />
              </div>

              <div className="flex items-center gap-3">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.firstName}
                    className="w-16 h-20 rounded-lg object-cover border border-amber-400/80 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-16 h-20 rounded-lg bg-slate-900 border border-amber-400/80 text-amber-300 font-bold flex items-center justify-center text-base shrink-0">
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                )}

                <div className="space-y-1 flex-1 min-w-0 text-xs">
                  <div>
                    <span className="text-[9px] text-white/60 uppercase font-bold block">Nom & Prénom</span>
                    <p className="font-black text-white truncate text-sm">
                      {student.lastName.toUpperCase()} {student.firstName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 uppercase font-bold block">Matricule & Classe</span>
                    <p className="font-mono text-amber-300 font-bold text-xs">
                      {student.matricule} • {studentClass?.name || 'Classe'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/60 uppercase font-bold block">Date de Naissance</span>
                    <p className="text-white text-[11px]">
                      {new Date(student.birthDate).toLocaleDateString('fr-FR')} ({student.birthPlace})
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
                <span>Année : {settings.currentAcademicYear}</span>
                <span className="font-bold text-amber-300">CARTE D'IDENTITÉ SCOLAIRE</span>
              </div>
            </div>

            {/* QR Code Officiel Scannable & Actions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-center flex flex-col items-center justify-center">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 inline-block shadow-2xs">
                {studentQrUrl ? (
                  <img src={studentQrUrl} alt="QR Code" className="w-32 h-32 mx-auto" />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 animate-pulse" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs">QR Code Officiel de Sécurité</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                  Vérification instantanée de la fiche, des notes, de la situation en caisse et de l'assiduité.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?verify=${student.matricule}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copié !' : 'Copier Lien'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ONGLET 3 : NOTES & BULLETINS ACADÉMIQUES
          ========================================================================= */}
      {activeTab === 'GRADES' && (
        <div className="space-y-2">
          {/* Ruban Compact Trimestre & Synthèse */}
          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  {filteredTerms.trimesterTerms.length > 0 ? 'Trimestre :' : (filteredTerms.semesterTerms.length > 0 ? 'Semestre :' : 'Période :')}
                </span>
                <select
                  value={selectedTerm}
                  onChange={e => setSelectedTerm(e.target.value as EvaluationTerm)}
                  className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none cursor-pointer max-w-[220px]"
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

              {reportCard && (
                <>
                  <span className="text-slate-200 font-light">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Moyenne :</span>
                    <span className="font-mono font-bold text-blue-900 text-sm">
                      {reportCard.generalAverage.toFixed(2)} / {reportCard.maxScore}
                    </span>
                  </div>
                  <span className="text-slate-200 font-light">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Rang :</span>
                    <span className="font-bold text-slate-900">
                      {reportCard.rankInClass}e <span className="text-slate-400 font-normal text-[11px]">/ {reportCard.totalClassStudents}</span>
                    </span>
                  </div>
                  <span className="text-slate-200 font-light">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-700 font-bold uppercase text-[10px]">Mention :</span>
                    <span className="font-semibold text-emerald-900">
                      {getMaliScoreAppreciation(reportCard.generalAverage, reportCard.maxScore || 20).appreciation || reportCard.directorDecision || 'Satisfaisant'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grille Détaillée des Matières */}
          {reportCard ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
                <h3 className="font-bold text-slate-800 uppercase text-[11px]">
                  Matières & Coefficients ({reportCard.subjectAverages.length})
                </h3>
                <span className="text-slate-500 font-mono text-[11px]">
                  Classe : Min {reportCard.classMinAverage} • Moy {reportCard.classOverallAverage} • Max {reportCard.classMaxAverage}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="py-1.5 px-3">Matière</th>
                      <th className="py-1.5 px-2.5">Coef.</th>
                      <th className="py-1.5 px-2.5">Note Classe</th>
                      <th className="py-1.5 px-2.5">Composition</th>
                      <th className="py-1.5 px-2.5">Moyenne</th>
                      <th className="py-1.5 px-3">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportCard.subjectAverages.map((sub) => {
                      const hasGrades = sub.hasGrades ?? (sub.classScore !== undefined || sub.compositionScore !== undefined);
                      const sMax = sub.maxScore || reportCard.maxScore || 20;
                      const { appreciation } = getMaliScoreAppreciation(sub.finalScore, sMax);

                      return (
                        <tr key={sub.subjectId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-bold text-slate-900">
                            {sub.subjectName}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-slate-600">
                            {sub.coefficient}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-slate-700">
                            {sub.classScore !== undefined ? sub.classScore.toFixed(2) : '—'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-slate-700">
                            {sub.compositionScore !== undefined ? sub.compositionScore.toFixed(2) : '—'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-blue-900">
                            {hasGrades ? `${sub.finalScore.toFixed(2)} / ${sMax}` : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600 font-medium">
                            {hasGrades ? (sub.appreciation || appreciation) : 'Non noté'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-1.5 shadow-2xs">
              <FileText className="w-6 h-6 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-xs">Aucune note enregistrée pour le {selectedTerm}</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Les évaluations mensuelles ou compositions de ce trimestre n'ont pas encore été saisies pour cette classe.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ONGLET 4 : HISTORIQUE D'ASSIDUITÉ & PRÉSENCES
          ========================================================================= */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-2">
          {/* Ruban Compact d'Assiduité & Pointage Rapide */}
          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Taux :</span>
                <span className="font-mono font-bold text-emerald-700">{studentAttendance.rate}%</span>
              </div>
              <span className="text-slate-200 font-light">|</span>
              <div className="flex items-center gap-1">
                <span className="text-emerald-700 font-bold uppercase text-[10px]">Présents :</span>
                <span className="font-mono font-bold text-emerald-800">{studentAttendance.presents}</span>
              </div>
              <span className="text-slate-200 font-light">|</span>
              <div className="flex items-center gap-1">
                <span className="text-amber-700 font-bold uppercase text-[10px]">Justifiées :</span>
                <span className="font-mono font-bold text-amber-800">{studentAttendance.justAbs}</span>
              </div>
              <span className="text-slate-200 font-light">|</span>
              <div className="flex items-center gap-1">
                <span className="text-rose-700 font-bold uppercase text-[10px]">Injustifiées :</span>
                <span className="font-mono font-bold text-rose-700">{studentAttendance.unjustAbs}</span>
              </div>
            </div>

            {/* Boutons Pointage Rapide Aujourd'hui */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 font-semibold mr-1 hidden sm:inline">Aujourd'hui :</span>
              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('PRESENT')}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Marquer présent(e) aujourd'hui"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Présent</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('ABSENT_JUSTIFIED')}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Absence avec justificatif"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Abs. Justifiée</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('ABSENT_UNJUSTIFIED')}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Absence sans motif"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Abs. Injustifiée</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('RETARD')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                title="Signaler un retard"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Retard</span>
              </button>
            </div>
          </div>

          {/* Journal Historique des Pointages */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
              <h3 className="font-bold text-slate-800 uppercase text-[11px]">
                Historique des Pointages ({studentAttendance.studentRecords.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {studentAttendance.totalDays} jour(s) comptabilisé(s)
              </span>
            </div>

            {studentAttendance.studentRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1 text-xs">
                <Clock className="w-6 h-6 mx-auto text-slate-300" />
                <p>Aucun pointage d'assiduité enregistré pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="py-1.5 px-3">Date</th>
                      <th className="py-1.5 px-2.5">Statut</th>
                      <th className="py-1.5 px-2.5">Période</th>
                      <th className="py-1.5 px-3">Pointé Par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentAttendance.studentRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                          {new Date(rec.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-1.5 px-2.5">
                          {rec.status === 'PRESENT' && (
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Présent(e)
                            </span>
                          )}
                          {rec.status === 'ABSENT_JUSTIFIED' && (
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                              Absence Justifiée
                            </span>
                          )}
                          {rec.status === 'ABSENT_UNJUSTIFIED' && (
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-rose-50 text-rose-800 border border-rose-200">
                              Absence Injustifiée
                            </span>
                          )}
                          {rec.status === 'RETARD' && (
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                              En Retard
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600">
                          {rec.period || 'Journée entière'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {rec.markedBy || 'Administration'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ONGLET 5 : INFORMATIONS PERSONNELLES & FAMILLE
          ========================================================================= */}
      {activeTab === 'INFO' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            
            {/* État Civil & Scolarité */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
              <h3 className="font-bold text-[11px] text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-900" />
                <span>État Civil & Dossier Scolaire</span>
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Nom Complet :</span>
                  <strong className="text-slate-900">{student.lastName.toUpperCase()} {student.firstName}</strong>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Sexe :</span>
                  <strong className="text-slate-900">{student.gender === 'F' ? 'Féminin (Fille)' : 'Masculin (Garçon)'}</strong>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Date de Naissance :</span>
                  <strong className="text-slate-900">{new Date(student.birthDate).toLocaleDateString('fr-FR')}</strong>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Lieu de Naissance :</span>
                  <strong className="text-slate-900">{student.birthPlace || 'Bamako'}</strong>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Nationalité :</span>
                  <strong className="text-slate-900">{student.nationality || 'Malienne'}</strong>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Groupe Sanguin :</span>
                  <strong className="text-rose-700 font-mono">{student.bloodType || 'Non renseigné'}</strong>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Adresse de Résidence :</span>
                  <strong className="text-slate-900">{student.address || 'Bamako'}</strong>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Année d'Inscription :</span>
                  <strong className="text-slate-900">{student.academicYear || settings.currentAcademicYear}</strong>
                </div>
              </div>
            </div>

            {/* Parents, Tuteurs & Contacts Directs */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
              <h3 className="font-bold text-[11px] text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                <span>Parents & Tuteurs Légaux</span>
              </h3>

              <div className="space-y-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Père / Tuteur Principal</span>
                  <p className="font-bold text-slate-900 text-xs">{student.parent?.fatherName || 'Non renseigné'}</p>
                  <p className="font-mono text-slate-600 text-[11px]">{student.parent?.fatherPhone || 'Aucun numéro'}</p>
                </div>

                {student.parent?.motherName && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Mère / Tutrice</span>
                    <p className="font-bold text-slate-900 text-xs">{student.parent?.motherName}</p>
                    <p className="font-mono text-slate-600 text-[11px]">{student.parent?.motherPhone || 'Aucun numéro'}</p>
                  </div>
                )}

                {/* Boutons d'Action Rapide Contact */}
                {cleanPhone && (
                  <div className="pt-1 flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Direct</span>
                    </a>

                    <a
                      href={`tel:${student.parent?.fatherPhone || student.parent?.motherPhone}`}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Appeler</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Aperçu Quittance Horizontale Directe */}
      <HorizontalReceiptModal
        isOpen={Boolean(previewPayment)}
        payment={previewPayment}
        settings={settings}
        onClose={() => setPreviewPayment(null)}
      />
    </div>
  );
};
