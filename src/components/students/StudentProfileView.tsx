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
  X
} from 'lucide-react';
import { Student, SchoolClass, Payment, AttendanceRecord, EvaluationTerm, PaymentCategory, PaymentMethod, ReportCard } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { PdfService } from '../../services/pdfService';
import { formatFCFA, getAnnualTuitionFee, getMaliScoreAppreciation } from '../../constants/maliEducation';

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

  // Onglet actif
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'CARDS' | 'GRADES' | 'ATTENDANCE' | 'INFO'>(initialTab);

  // Terme sélectionné pour les notes / bulletins
  const [selectedTerm, setSelectedTerm] = useState<EvaluationTerm>('TRIMESTRE_1');

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

  // Classe de l'élève
  const studentClass = useMemo(() => {
    return classes.find(c => c.id === student.classId);
  }, [classes, student.classId]);

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
    setToastMessage(`Paiement de ${formatFCFA(amt)} enregistré ! Reçu N° ${newPayment.receiptNumber} téléchargé.`);
    setTimeout(() => setToastMessage(null), 4000);

    // Téléchargement immédiat du reçu officiel PDF
    PdfService.generateReceiptPdf(newPayment, settings);
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

    setToastMessage(`Solde intégral de ${formatFCFA(newPayment.amountPaid)} effectué ! Reçu N° ${newPayment.receiptNumber} généré.`);
    setTimeout(() => setToastMessage(null), 4000);

    PdfService.generateReceiptPdf(newPayment, settings);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Barre Supérieure de Navigation & Retour */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer border border-slate-200"
              title="Retourner à la liste des élèves"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3.5">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.firstName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900">
                  {student.lastName.toUpperCase()} {student.firstName}
                </h1>
                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  student.status === 'ACTIF' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {student.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Matricule : <strong className="text-slate-800">{student.matricule}</strong> • Classe : <strong className="text-slate-800">{studentClass?.name || 'Non assigné'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Actions Rapides en Entête */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {studentFinance.remaining > 0 && (
            <button
              type="button"
              onClick={handleQuickSettleAll}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              title="Solder immédiatement tout le reliquat restant"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Solder ({formatFCFA(studentFinance.remaining)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCardPdf}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            title="Télécharger la Carte Scolaire A4 avec QR Code"
          >
            <QrCode className="w-4 h-4" />
            <span>Carte PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBulletinPdf}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            title="Télécharger le Bulletin Trimestriel Officiel PDF"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Bulletin PDF</span>
          </button>

          {onEditStudent && (
            <button
              type="button"
              onClick={() => onEditStudent(student)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title="Modifier la fiche d'inscription"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre d'Onglets Unifiée & Centralisée */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 overflow-x-auto shadow-2xs text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'PAYMENTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Paiements & Caisse</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
            studentFinance.remaining === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {studentFinance.isUpToDate ? 'À jour' : formatFCFA(studentFinance.remaining)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CARDS')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'CARDS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4 text-amber-400" />
          <span>Carte Scolaire & QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GRADES')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'GRADES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Award className="w-4 h-4 text-blue-400" />
          <span>Notes & Bulletins</span>
          {reportCard && (
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md text-[10px] font-mono">
              {reportCard.generalAverage.toFixed(2)}/20
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ATTENDANCE'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 text-violet-400" />
          <span>Historique d'Assiduité</span>
          <span className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md text-[10px] font-mono">
            {studentAttendance.rate}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INFO')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'INFO'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Informations & Famille</span>
        </button>
      </div>

      {/* =========================================================================
          CONTENU DE L'ONGLET 1 : PAIEMENTS & CAISSE
          ========================================================================= */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-6">
          {/* Synthèse Financière de l'Élève */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Scolarité Annuelle</span>
              <p className="font-mono font-black text-slate-900 text-xl mt-1">
                {formatFCFA(studentFinance.annualFee)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tarif officiel de la classe</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-emerald-700 font-bold uppercase text-[10px] block">Montant Déjà Encaissé</span>
              <p className="font-mono font-black text-emerald-800 text-xl mt-1">
                {formatFCFA(studentFinance.totalPaid)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{studentFinance.studentPayments.length} versement(s) reçu(s)</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-rose-700 font-bold uppercase text-[10px] block">Reliquat Restant à Payer</span>
              <p className="font-mono font-black text-rose-700 text-xl mt-1">
                {formatFCFA(studentFinance.remaining)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {studentFinance.remaining === 0 ? 'Aucune dette en caisse' : 'Solde restant exigible'}
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-slate-300 font-bold uppercase text-[10px] block">Taux d'Acquittement</span>
                <p className="font-mono font-black text-emerald-400 text-xl mt-1">
                  {studentFinance.percentPaid}%
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    studentFinance.percentPaid >= 100 ? 'bg-emerald-400' : studentFinance.percentPaid >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${studentFinance.percentPaid}%` }}
                />
              </div>
            </div>
          </div>

          {/* Actions & Formulaire d'encaissement direct */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Opérations Rapides de Caisse</h3>
                <p className="text-xs text-slate-500">Encaisser un versement ou solder en direct avec délivrance de quittance</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCashFormOpen(!isCashFormOpen)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCashFormOpen ? 'Masquer Formulaire' : 'Encaisser un Versement'}</span>
                </button>

                {studentFinance.remaining > 0 && (
                  <button
                    type="button"
                    onClick={handleQuickSettleAll}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Tout Solder ({formatFCFA(studentFinance.remaining)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Formulaire de saisie d'un paiement dépliable */}
            {isCashFormOpen && (
              <form onSubmit={handleRecordPaymentSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5 text-xs">
                <h4 className="font-bold text-slate-900">Enregistrer un Nouveau Paiement</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Montant en FCFA *</label>
                    <input
                      type="number"
                      required
                      min="500"
                      step="500"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-emerald-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Motif de Règlement</label>
                    <select
                      value={paymentCategory}
                      onChange={e => setPaymentCategory(e.target.value as PaymentCategory)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium outline-none cursor-pointer"
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
                    <label className="font-bold text-slate-700 block mb-1">Mois / Période Couverte</label>
                    <input
                      type="text"
                      value={paymentMonth}
                      onChange={e => setPaymentMonth(e.target.value)}
                      placeholder="Ex: Novembre 2025"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mode de Paiement</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium outline-none cursor-pointer"
                    >
                      <option value="ESPECES">Espèces (Caisse)</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="MOOV_MONEY">Moov Money</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="VIREMENT">Virement Bancaire</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Note / Observation</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="Ex: Versé par l'oncle maternel..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCashFormOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Valider & Générer le Reçu PDF</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Tableau d'Historique des Reçus de l'Élève */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Historique des Reçus & Versements ({studentFinance.studentPayments.length})
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                Total : {formatFCFA(studentFinance.totalPaid)}
              </span>
            </div>

            {studentFinance.studentPayments.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
                <p>Aucun paiement n'a encore été enregistré pour cet élève.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="py-3 px-4">Reçu N°</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Motif & Période</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-3">Montant Encaissé</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentFinance.studentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold">{p.category}</span>
                          {p.monthCovered && <span className="text-slate-500 ml-1">({p.monthCovered})</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {p.method}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                          {formatFCFA(p.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => PdfService.generateReceiptPdf(p, settings)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Télécharger / Réimprimer la quittance officielle PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Reçu PDF</span>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Aperçu Haute Fidélité de la Carte Scolaire (Recto) */}
            <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 p-6 rounded-3xl border-2 border-amber-400/80 shadow-xl text-white space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                    RÉPUBLIQUE DU MALI • MINISTÈRE DE L'ÉDUCATION NATIONALE
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{settings.schoolName || 'ÉTABLISSEMENT SCOLAIRE'}</h4>
                </div>
                <div className="w-6 h-4 bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-xs shadow-xs" title="Drapeau du Mali" />
              </div>

              <div className="flex items-center gap-4">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.firstName}
                    className="w-24 h-28 rounded-xl object-cover border-2 border-amber-400/80 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-24 h-28 rounded-xl bg-slate-900 border-2 border-amber-400/80 text-amber-300 font-bold flex items-center justify-center text-xl shrink-0">
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                )}

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div>
                    <span className="text-[10px] text-white/60 uppercase font-bold block">Nom & Prénom</span>
                    <p className="font-black text-white text-base truncate">
                      {student.lastName.toUpperCase()} {student.firstName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/60 uppercase font-bold block">Matricule & Classe</span>
                    <p className="font-mono text-amber-300 font-bold text-xs">
                      {student.matricule} • {studentClass?.name || 'Classe'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/60 uppercase font-bold block">Date de Naissance</span>
                    <p className="text-white text-xs">
                      {new Date(student.birthDate).toLocaleDateString('fr-FR')} ({student.birthPlace})
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
                <span>Année : {settings.currentAcademicYear}</span>
                <span className="font-bold text-amber-300">CARTE D'IDENTITÉ SCOLAIRE</span>
              </div>
            </div>

            {/* QR Code Officiel Scannable & Actions */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5 text-center flex flex-col items-center justify-center">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-2xs">
                {studentQrUrl ? (
                  <img src={studentQrUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                    <QrCode className="w-16 h-16 animate-pulse" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-base">QR Code Officiel de Sécurité</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Scannable avec tout smartphone pour afficher instantanément la fiche complète, les notes, la situation en caisse et l'assiduité.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handleDownloadCardPdf}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger la Carte Scolaire PDF A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?verify=${student.matricule}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Lien Copié !' : 'Copier Lien de Vérification'}</span>
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
        <div className="space-y-6">
          {/* Sélecteur de Trimestre & Téléchargement Bulletin */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Trimestre :</span>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value as EvaluationTerm)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="TRIMESTRE_1">1er Trimestre</option>
                <option value="TRIMESTRE_2">2ème Trimestre</option>
                <option value="TRIMESTRE_3">3ème Trimestre</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleDownloadBulletinPdf}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Télécharger le Bulletin Trimestriel PDF</span>
            </button>
          </div>

          {/* Synthèse Académique */}
          {reportCard ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Moyenne Générale</span>
                  <p className="font-mono font-black text-blue-900 text-2xl mt-1">
                    {reportCard.generalAverage.toFixed(2)} / {reportCard.maxScore}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Barème officiel de passage</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Rang dans la Classe</span>
                  <p className="font-mono font-black text-slate-900 text-2xl mt-1">
                    {reportCard.rankInClass}e <span className="text-xs font-normal text-slate-500">/ {reportCard.totalClassStudents} élèves</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Classement trimestriel</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Moyennes de la Classe</span>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-1">
                    Max : <strong className="text-emerald-700">{reportCard.classMaxAverage}</strong> • Min : <strong className="text-rose-700">{reportCard.classMinAverage}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Moyenne classe : {reportCard.classOverallAverage}</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
                  <span className="text-emerald-800 font-bold uppercase text-[10px] block">Appréciation Officielle</span>
                  <p className="font-black text-emerald-950 text-sm mt-1">
                    {getMaliScoreAppreciation(reportCard.generalAverage, reportCard.maxScore || 20).appreciation || reportCard.directorDecision || 'Travail satisfaisant'}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Mention du conseil des maîtres</p>
                </div>
              </div>

              {/* Grille Détaillée des Matières */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Relevé Détaillé des Matières & Coefficients ({reportCard.subjectAverages.length} matières)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/50">
                        <th className="py-3 px-4">Matière</th>
                        <th className="py-3 px-3">Coef.</th>
                        <th className="py-3 px-3">Note de Classe</th>
                        <th className="py-3 px-3">Composition</th>
                        <th className="py-3 px-3">Moyenne Matière</th>
                        <th className="py-3 px-4">Appréciation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportCard.subjectAverages.map((sub) => {
                        const classVal = sub.classScore !== undefined ? sub.classScore : sub.finalScore;
                        const compVal = sub.compositionScore !== undefined 
                          ? sub.compositionScore 
                          : ((reportCard.maxScore || 20) === 10 ? sub.finalScore : sub.finalScore * 2);
                        const sMax = sub.maxScore || reportCard.maxScore || 20;
                        const { appreciation } = getMaliScoreAppreciation(sub.finalScore, sMax);

                        return (
                          <tr key={sub.subjectId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {sub.subjectName}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {sub.coefficient}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {classVal.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {compVal.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-blue-900">
                              {sub.finalScore.toFixed(2)} / {sMax}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {sub.appreciation || appreciation}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">Aucune note enregistrée pour le {selectedTerm}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
        <div className="space-y-6">
          {/* Synthèse d'Assiduité */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Taux d'Assiduité</span>
              <p className="font-mono font-black text-emerald-700 text-2xl mt-1">
                {studentAttendance.rate}%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{studentAttendance.totalDays} jour(s) comptabilisé(s)</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-emerald-700 font-bold uppercase text-[10px] block">Présences Réelles</span>
              <p className="font-mono font-black text-emerald-800 text-2xl mt-1">
                {studentAttendance.presents}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Jours à l'école</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-amber-700 font-bold uppercase text-[10px] block">Absences Justifiées</span>
              <p className="font-mono font-black text-amber-800 text-2xl mt-1">
                {studentAttendance.justAbs}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Avec motif des parents</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-rose-700 font-bold uppercase text-[10px] block">Absences Injustifiées</span>
              <p className="font-mono font-black text-rose-700 text-2xl mt-1">
                {studentAttendance.unjustAbs}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sans justificatif</p>
            </div>
          </div>

          {/* Actions Rapides pour Aujourd'hui */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Pointer la Présence d'Aujourd'hui ({new Date().toLocaleDateString('fr-FR')})
            </h3>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('PRESENT')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Marquer Présent(e)</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('ABSENT_JUSTIFIED')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Signaler Absence Justifiée</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('ABSENT_UNJUSTIFIED')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                <span>Signaler Absence Injustifiée</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAttendanceToday('RETARD')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Signaler un Retard</span>
              </button>
            </div>
          </div>

          {/* Journal Chronologique d'Assiduité */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Journal Historique des Pointages ({studentAttendance.studentRecords.length})
              </h3>
            </div>

            {studentAttendance.studentRecords.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                <p>Aucun pointage d'assiduité enregistré pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-3">Statut</th>
                      <th className="py-3 px-3">Période</th>
                      <th className="py-3 px-4">Pointé Par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentAttendance.studentRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {new Date(rec.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-3">
                          {rec.status === 'PRESENT' && (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Présent(e)
                            </span>
                          )}
                          {rec.status === 'ABSENT_JUSTIFIED' && (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                              Absence Justifiée
                            </span>
                          )}
                          {rec.status === 'ABSENT_UNJUSTIFIED' && (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-50 text-rose-800 border border-rose-200">
                              Absence Injustifiée
                            </span>
                          )}
                          {rec.status === 'RETARD' && (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                              En Retard
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {rec.period || 'Journée entière'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* État Civil & Scolarité */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-900" />
                <span>État Civil & Dossier Scolaire</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nom Complet :</span>
                  <strong className="text-slate-900">{student.lastName.toUpperCase()} {student.firstName}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Sexe :</span>
                  <strong className="text-slate-900">{student.gender === 'F' ? 'Féminin (Fille)' : 'Masculin (Garçon)'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Date de Naissance :</span>
                  <strong className="text-slate-900">{new Date(student.birthDate).toLocaleDateString('fr-FR')}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Lieu de Naissance :</span>
                  <strong className="text-slate-900">{student.birthPlace || 'Bamako'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nationalité :</span>
                  <strong className="text-slate-900">{student.nationality || 'Malienne'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Groupe Sanguin :</span>
                  <strong className="text-rose-700 font-mono">{student.bloodType || 'Non renseigné'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Adresse de Résidence :</span>
                  <strong className="text-slate-900">{student.address || 'Bamako'}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Année d'Inscription :</span>
                  <strong className="text-slate-900">{student.academicYear || settings.currentAcademicYear}</strong>
                </div>
              </div>
            </div>

            {/* Parents, Tuteurs & Contacts Directs */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-700" />
                <span>Parents & Tuteurs Légaux</span>
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Père / Tuteur Principal</span>
                  <p className="font-bold text-slate-900 text-sm">{student.parent?.fatherName || 'Non renseigné'}</p>
                  <p className="font-mono text-slate-600 text-xs">{student.parent?.fatherPhone || 'Aucun numéro'}</p>
                </div>

                {student.parent?.motherName && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Mère / Tutrice</span>
                    <p className="font-bold text-slate-900 text-sm">{student.parent?.motherName}</p>
                    <p className="font-mono text-slate-600 text-xs">{student.parent?.motherPhone || 'Aucun numéro'}</p>
                  </div>
                )}

                {/* Boutons d'Action Rapide Contact */}
                {cleanPhone && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Direct</span>
                    </a>

                    <a
                      href={`tel:${student.parent?.fatherPhone || student.parent?.motherPhone}`}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Appeler</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
