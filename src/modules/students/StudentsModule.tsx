/**
 * SomaSikolo / KalanGest - Module Élèves & Inscriptions (Centralisé & Allégé)
 * Interface épurée et ultra-rapide : zone de recherche unique (sans filtres encombrants).
 * Centralisation intégrale des opérations de l'élève au niveau de l'élève :
 * - Encaissement direct & Solde en 1 clic avec génération immédiate du reçu officiel PDF
 * - Carte Scolaire & QR Code officiel téléchargeable en 1 clic
 * - Bulletin de notes trimestriel téléchargeable en 1 clic
 * - Fiche Dossier 360° : Identité, Famille WhatsApp/Appel, Caisse & Reçus, Notes, Assiduité
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  QrCode, 
  Phone, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  FileSpreadsheet, 
  Download,
  Calendar,
  Camera,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  FileText,
  Printer,
  Clock,
  MessageCircle,
  Award,
  Wallet,
  Building2,
  ExternalLink,
  ShieldCheck,
  Check,
  UserCheck,
  UserX,
  Copy
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Student, Gender, StudentStatus, PaymentCategory, PaymentMethod, Payment } from '../../types';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { ExcelImportModal } from '../../components/students/ExcelImportModal';
import { MenOfficialStatsModal } from '../../components/students/MenOfficialStatsModal';
import { StudentProfileView } from '../../components/students/StudentProfileView';
import { formatFCFA, getAnnualTuitionFee, getMaliScoreAppreciation } from '../../constants/maliEducation';

export const StudentsModule: React.FC = () => {
  const { 
    students, 
    classes, 
    saveStudent, 
    deleteStudent, 
    deleteAllStudents, 
    settings,
    payments,
    recordPayment,
    generateReportCard,
    attendanceRecords,
    saveAttendanceBatch
  } = useSchool();

  // Zone de recherche unique (allégée, sans filtres superflus)
  const [search, setSearch] = useState('');

  // Modals et états interactifs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isMenStatsOpen, setIsMenStatsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [dossierTab, setDossierTab] = useState<'PROFIL' | 'FINANCES' | 'CARTE' | 'NOTES' | 'PRESENCES'>('PROFIL');
  const [qrModalStudent, setQrModalStudent] = useState<{ student: Student; qrUrl: string } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<{ id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal d'encaissement et solde direct pour un élève spécifique
  const [paymentModalStudent, setPaymentModalStudent] = useState<Student | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<{
    amount: number;
    category: PaymentCategory;
    month: string;
    method: PaymentMethod;
    notes: string;
  }>({
    amount: 25000,
    category: 'MENSUALITE',
    month: 'Octobre 2025',
    method: 'ESPECES',
    notes: ''
  });

  // Form state pour inscription / modification
  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    gender: 'M',
    birthDate: '2010-01-01',
    birthPlace: 'Bamako',
    nationality: 'Mali',
    address: 'Bamako',
    phone: '',
    photoUrl: '',
    classId: classes[0]?.id || '',
    status: 'ACTIF',
    academicYear: settings.currentAcademicYear,
    bloodType: undefined,
    allergies: '',
    emergencyContact: '',
    parent: {
      fatherName: '',
      fatherPhone: '',
      motherName: '',
      motherPhone: ''
    },
    observations: ''
  });

  // Effectif rapide
  const activeStudents = useMemo(() => students.filter(s => s.status === 'ACTIF'), [students]);
  const maleCount = useMemo(() => students.filter(s => s.gender === 'M').length, [students]);
  const femaleCount = useMemo(() => students.filter(s => s.gender === 'F').length, [students]);

  // Filtrage intelligent et instantané via la zone de recherche unique
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      return [...students].sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
    return students.filter(s => {
      const cls = classes.find(c => c.id === s.classId);
      return (
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        (cls && cls.name.toLowerCase().includes(q)) ||
        (s.status && s.status.toLowerCase().includes(q)) ||
        (s.parent?.fatherPhone && s.parent.fatherPhone.includes(q)) ||
        (s.parent?.motherPhone && s.parent.motherPhone.includes(q)) ||
        (s.parent?.fatherName && s.parent.fatherName.toLowerCase().includes(q)) ||
        (s.parent?.motherName && s.parent.motherName.toLowerCase().includes(q))
      );
    }).sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, search, classes]);

  // Calcul financier centralisé pour un élève
  const getStudentFinance = (student: Student) => {
    const cls = classes.find(c => c.id === student.classId);
    const stdPayments = payments.filter(p => p.studentId === student.id);
    const totalPaid = stdPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const annualFee = getAnnualTuitionFee(cls, settings);
    const remaining = Math.max(0, annualFee - totalPaid);
    const isUpToDate = totalPaid >= annualFee && annualFee > 0;
    const isPartial = totalPaid > 0 && totalPaid < annualFee;
    const isUnpaid = totalPaid === 0 && annualFee > 0;
    return {
      cls,
      stdPayments,
      totalPaid,
      annualFee,
      remaining,
      isUpToDate,
      isPartial,
      isUnpaid
    };
  };

  // Calcul assiduité pour un élève
  const getStudentAttendance = (student: Student) => {
    const records = attendanceRecords.filter(r => r.studentId === student.id);
    const total = records.length;
    const presents = records.filter(r => r.status === 'PRESENT').length;
    const justAbs = records.filter(r => r.status === 'ABSENT_JUSTIFIED').length;
    const unjustAbs = records.filter(r => r.status === 'ABSENT_UNJUSTIFIED').length;
    const lates = records.filter(r => r.status === 'RETARD').length;
    const rate = total > 0 ? Math.round((presents / total) * 100) : 100;
    return {
      total,
      presents,
      justAbs,
      unjustAbs,
      lates,
      rate
    };
  };

  // Ouvre le modal d'inscription vierge
  const handleOpenAddModal = () => {
    setSelectedStudent(null);
    setFormData({
      firstName: '',
      lastName: '',
      gender: 'M',
      birthDate: '2010-05-15',
      birthPlace: 'Bamako',
      nationality: 'Mali',
      address: 'Bamako',
      phone: '',
      photoUrl: '',
      classId: classes[0]?.id || '',
      status: 'ACTIF',
      academicYear: settings.currentAcademicYear,
      bloodType: undefined,
      allergies: '',
      emergencyContact: '',
      parent: {
        fatherName: '',
        fatherPhone: '',
        motherName: '',
        motherPhone: ''
      },
      observations: ''
    });
    setIsModalOpen(true);
  };

  // Ouvre la modification d'un élève
  const handleOpenEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;

    saveStudent(formData);
    setIsModalOpen(false);
    setToastMessage(`L'élève ${formData.lastName?.toUpperCase()} ${formData.firstName} a été enregistré avec succès.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const confirmDeleteStudent = () => {
    if (deletingStudent) {
      deleteStudent(deletingStudent.id);
      setToastMessage(`L'élève ${deletingStudent.name} a été supprimé.`);
      setDeletingStudent(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 1. Centralisé : Ouverture Encaissement / Solder pour un élève
  const handleOpenPayment = (student: Student, settleAll: boolean = false) => {
    const fin = getStudentFinance(student);
    setPaymentModalStudent(student);
    let amount = fin.cls?.monthlyFee || 25000;
    if (settleAll && fin.remaining > 0) {
      amount = fin.remaining;
    } else if (fin.remaining > 0) {
      amount = Math.min(fin.remaining, fin.cls?.monthlyFee || 25000);
    }

    setPaymentFormData({
      amount,
      category: settleAll ? 'SOLDE_TOTAL' : 'MENSUALITE',
      month: settleAll ? 'Solde intégral scolarité' : 'Octobre 2025',
      method: 'ESPECES',
      notes: ''
    });
  };

  // 2. Centralisé : Validation d'un paiement avec téléchargement immédiat du reçu PDF
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalStudent) return;
    const fin = getStudentFinance(paymentModalStudent);
    const amt = Number(paymentFormData.amount) || 0;
    if (amt <= 0) return;

    const newPayment = recordPayment({
      studentId: paymentModalStudent.id,
      studentMatricule: paymentModalStudent.matricule,
      studentName: `${paymentModalStudent.lastName.toUpperCase()} ${paymentModalStudent.firstName}`,
      className: fin.cls?.name || 'Sans classe',
      category: paymentFormData.category,
      monthCovered: paymentFormData.month,
      amountPaid: amt,
      expectedAmount: fin.cls?.monthlyFee || 25000,
      paymentDate: new Date().toISOString(),
      method: paymentFormData.method,
      referenceNumber: '',
      notes: paymentFormData.notes,
      cashierName: 'Caisse Principale',
      academicYear: settings.currentAcademicYear
    });

    setPaymentModalStudent(null);
    setToastMessage(`Paiement de ${formatFCFA(amt)} validé ! Reçu N° ${newPayment.receiptNumber} émis.`);
    setTimeout(() => setToastMessage(null), 4000);

    // Téléchargement automatique du reçu officiel PDF
    PdfService.generateReceiptPdf(newPayment, settings);
  };

  // 3. Centralisé : Téléchargement direct de la Carte Scolaire PDF avec QR Code et photo
  const handleDownloadStudentCard = async (student: Student) => {
    try {
      setToastMessage(`Génération de la carte de ${student.firstName}...`);
      await PdfService.generateStudentCardsBatchPdf([student], classes, settings);
      setToastMessage(`Carte scolaire de ${student.firstName} téléchargée avec succès !`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage("Erreur lors de la génération de la carte.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 4. Centralisé : Téléchargement direct du Bulletin de Notes PDF
  const handleDownloadStudentBulletin = async (student: Student) => {
    try {
      const rep = generateReportCard(student.id, settings.activeTerm);
      if (!rep || !rep.subjects || rep.subjects.length === 0) {
        setToastMessage(`Aucune note saisie pour ${student.firstName} au ${settings.activeTerm}.`);
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      setToastMessage(`Génération du bulletin de ${student.firstName}...`);
      await PdfService.generateReportCardPdf(rep, settings);
      setToastMessage(`Bulletin de ${student.firstName} téléchargé avec succès !`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage("Erreur lors de la génération du bulletin.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 5. Centralisé : Marquer présence ou absence en 1 clic
  const handleQuickMarkAttendance = (student: Student, status: 'PRESENT' | 'ABSENT_UNJUSTIFIED') => {
    const today = new Date().toISOString().slice(0, 10);
    saveAttendanceBatch([{
      studentId: student.id,
      classId: student.classId,
      date: today,
      status,
      period: 'JOURNEE',
      academicYear: settings.currentAcademicYear
    }]);
    setToastMessage(`Statut d'assiduité mis à jour pour ${student.firstName} (${status === 'PRESENT' ? 'Présent' : 'Absent'}).`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShowQrCode = async (student: Student) => {
    const qrUrl = await PdfService.generateStudentCardQr(student);
    setQrModalStudent({ student, qrUrl });
  };

  const handleBatchImport = (importedStudents: Partial<Student>[]) => {
    importedStudents.forEach(std => {
      saveStudent(std);
    });
    setToastMessage(`${importedStudents.length} élève(s) importé(s) depuis le fichier Excel.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportCsv = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Sexe', 'Classe', 'Date Naissance', 'Lieu Naissance', 'Téléphone Parent', 'Statut'];
    const rows = filteredStudents.map(s => {
      const cls = classes.find(c => c.id === s.classId);
      return [
        `"${s.matricule}"`,
        `"${s.lastName.replace(/"/g, '""')}"`,
        `"${s.firstName.replace(/"/g, '""')}"`,
        `"${s.gender}"`,
        `"${cls?.name || ''}"`,
        `"${s.birthDate}"`,
        `"${s.birthPlace}"`,
        `"${s.parent?.fatherPhone || s.parent?.motherPhone || ''}"`,
        `"${s.status}"`
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Repertoire_Eleves_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Si un élève est sélectionné, afficher la Vue 'Profil Élève' Complète & Centralisée
  if (viewingStudent) {
    return (
      <StudentProfileView
        student={viewingStudent}
        onBack={() => setViewingStudent(null)}
        onEditStudent={(std) => {
          setViewingStudent(null);
          handleOpenEditModal(std);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Entête Épuré du Répertoire des Élèves */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Répertoire des Élèves & Opérations Centralisées
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {students.length} inscrits · {activeStudents.length} actifs · {maleCount}G · {femaleCount}F · {classes.length} classes
            </p>
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Inscrire un Élève</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExcelImportOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Importer Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenStatsOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Générer la fiche officielle statistique demandée par le CAP et l'Académie"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Fiche MEN</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Exporter la liste actuelle en fichier CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          {students.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Supprimer tous les élèves"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message de confirmation Toast */}
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

      {/* 2. Zone de Recherche Unique & Épurée (sans filtres encombrants) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par élève (nom, prénom, matricule, classe ex: 9ème, téléphone parent)..."
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* 3. Tableau Centralisé des Élèves avec Opérations Directes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Élève & Matricule</th>
                <th className="py-3 px-3">Classe</th>
                <th className="py-3 px-3">Scolarité & Caisse</th>
                <th className="py-3 px-3">Parent / Contact</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-4 text-right">Opérations Centralisées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Aucun élève trouvé pour cette recherche.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const studentClass = classes.find(c => c.id === std.classId);
                  const isActif = std.status === 'ACTIF';
                  const fin = getStudentFinance(std);

                  return (
                    <tr 
                      key={std.id} 
                      onClick={() => setViewingStudent(std)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      title="Cliquer pour ouvrir le Dossier Centralisé de l'élève (Paiements, Carte, Notes, Assiduité)"
                    >
                      {/* Élève */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {std.photoUrl ? (
                            <img
                              src={std.photoUrl}
                              alt={std.firstName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-blue-600 transition-all"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-blue-900 transition-colors">
                              {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                              {std.lastName.toUpperCase()} {std.firstName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                              <span>Mat: {std.matricule}</span>
                              <span>•</span>
                              <span>{std.gender === 'F' ? 'Fille' : 'Garçon'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Classe */}
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {studentClass?.name || 'Non assigné'}
                      </td>

                      {/* Scolarité & Situation en Caisse */}
                      <td className="py-3 px-3">
                        {fin.annualFee > 0 ? (
                          <div>
                            {fin.remaining === 0 ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>À jour ({formatFCFA(fin.totalPaid)})</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                                  <Clock className="w-3 h-3 text-rose-500" />
                                  <span>Reste : {formatFCFA(fin.remaining)}</span>
                                </span>
                                <p className="text-[10px] text-slate-400">Versé : {formatFCFA(fin.totalPaid)}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Non configuré</span>
                        )}
                      </td>

                      {/* Parent / Contact */}
                      <td className="py-3 px-3">
                        <p className="text-slate-800 font-medium truncate max-w-[140px]">
                          {std.parent?.fatherName || std.parent?.motherName || 'Tuteur'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {std.parent?.fatherPhone || std.parent?.motherPhone || '—'}
                        </p>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isActif 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {std.status}
                        </span>
                      </td>

                      {/* Actions Centralisées */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* 1. Bouton Encaisser pour cet élève */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPayment(std, false);
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Encaisser un versement pour cet élève"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Encaisser</span>
                          </button>

                          {/* 2. Bouton Solder en 1 Clic si reliquat */}
                          {fin.remaining > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPayment(std, true);
                              }}
                              className="px-2 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title={`Solder immédiatement le reliquat (${formatFCFA(fin.remaining)})`}
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Solder</span>
                            </button>
                          )}

                          {/* 3. Carte Scolaire PDF A4 avec QR Code */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadStudentCard(std);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Télécharger / Imprimer la Carte Scolaire PDF avec QR Code"
                          >
                            <QrCode className="w-4 h-4 text-amber-700" />
                          </button>

                          {/* 4. Bulletin de Notes Trimestriel PDF */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadStudentBulletin(std);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Télécharger le Bulletin de Notes Trimestriel PDF"
                          >
                            <FileText className="w-4 h-4 text-blue-700" />
                          </button>

                          {/* 5. Dossier Complet 360° */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingStudent(std);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Consulter le dossier 360° de l'élève"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 6. Modifier */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(std);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Modifier la fiche"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* 7. Supprimer */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingStudent({ id: std.id, name: `${std.lastName.toUpperCase()} ${std.firstName}` });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer l'élève"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL D'ENCAISSEMENT & SOLDE CENTRALISÉ POUR UN ÉLÈVE
          ========================================================================= */}
      {paymentModalStudent && (() => {
        const fin = getStudentFinance(paymentModalStudent);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden my-6">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Encaisser & Émettre le Reçu</h3>
                    <p className="text-xs text-slate-500">
                      {paymentModalStudent.lastName.toUpperCase()} {paymentModalStudent.firstName} ({fin.cls?.name})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalStudent(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-3.5 text-xs">
                {/* Situation financière de l'élève */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Scolarité Annuelle :</span>
                    <strong className="font-mono text-slate-900">{formatFCFA(fin.annualFee)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Déjà Versé :</span>
                    <strong className="font-mono text-emerald-700">{formatFCFA(fin.totalPaid)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-800">
                    <span className="font-bold">Reliquat Dû :</span>
                    <strong className="font-mono font-bold text-rose-600">{formatFCFA(fin.remaining)}</strong>
                  </div>
                </div>

                {/* Montant à encaisser */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Montant à Encaisser en FCFA *</label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    value={paymentFormData.amount}
                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-emerald-800 outline-none focus:bg-white focus:border-emerald-600"
                  />

                  {/* Raccourcis de calcul rapide */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {fin.remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentFormData({
                          ...paymentFormData,
                          amount: fin.remaining,
                          category: 'SOLDE_TOTAL',
                          month: 'Solde intégral scolarité'
                        })}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Tout solder ({formatFCFA(fin.remaining)})
                      </button>
                    )}
                    {fin.cls && (
                      <button
                        type="button"
                        onClick={() => setPaymentFormData({ ...paymentFormData, amount: fin.cls?.monthlyFee || 25000 })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        1 Mensualité ({formatFCFA(fin.cls?.monthlyFee || 25000)})
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Motif du Paiement</label>
                    <select
                      value={paymentFormData.category}
                      onChange={e => setPaymentFormData({ ...paymentFormData, category: e.target.value as PaymentCategory })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="MENSUALITE">Mensualité de Scolarité</option>
                      <option value="SOLDE_TOTAL">Solde Intégral</option>
                      <option value="INSCRIPTION">Frais d'Inscription</option>
                      <option value="CANTINE">Service Cantine</option>
                      <option value="TRANSPORT">Transport / Bus</option>
                      <option value="UNIFORME">Tenue Scolaire</option>
                      <option value="AUTRES">Frais Divers</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Période / Mois Couvert</label>
                    <input
                      type="text"
                      value={paymentFormData.month}
                      onChange={e => setPaymentFormData({ ...paymentFormData, month: e.target.value })}
                      placeholder="Ex: Novembre 2025"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mode de Règlement</label>
                  <select
                    value={paymentFormData.method}
                    onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value as PaymentMethod })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MOOV_MONEY">Moov Money</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement Bancaire</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentModalStudent(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Valider & Reçu PDF</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
      {/* Ancien modal remplacé par la vue complète StudentProfileView */}
      {false && (() => {
        const studentClass = classes.find(c => c.id === viewingStudent.classId);
        const fin = getStudentFinance(viewingStudent);
        const att = getStudentAttendance(viewingStudent);
        const reportCard = generateReportCard(viewingStudent.id, settings.activeTerm);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
              
              {/* Header Dossier */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  {viewingStudent.photoUrl ? (
                    <img
                      src={viewingStudent.photoUrl}
                      alt={viewingStudent.firstName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {viewingStudent.firstName.charAt(0)}{viewingStudent.lastName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {viewingStudent.lastName.toUpperCase()} {viewingStudent.firstName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Matricule : {viewingStudent.matricule} • Classe : {studentClass?.name || 'Non assigné'}
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setViewingStudent(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Onglets de navigation du dossier 360° */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDossierTab('PROFIL')}
                  className={`px-3 py-2 rounded-t-xl transition-colors cursor-pointer ${
                    dossierTab === 'PROFIL'
                      ? 'bg-white text-slate-900 border-t-2 border-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Identité & Famille
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('FINANCES')}
                  className={`px-3 py-2 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                    dossierTab === 'FINANCES'
                      ? 'bg-white text-slate-900 border-t-2 border-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Caisse & Reçus</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${fin.remaining === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {fin.stdPayments.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('CARTE')}
                  className={`px-3 py-2 rounded-t-xl transition-colors cursor-pointer ${
                    dossierTab === 'CARTE'
                      ? 'bg-white text-slate-900 border-t-2 border-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Carte Scolaire & QR
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('NOTES')}
                  className={`px-3 py-2 rounded-t-xl transition-colors cursor-pointer ${
                    dossierTab === 'NOTES'
                      ? 'bg-white text-slate-900 border-t-2 border-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Notes & Bulletin
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('PRESENCES')}
                  className={`px-3 py-2 rounded-t-xl transition-colors cursor-pointer ${
                    dossierTab === 'PRESENCES'
                      ? 'bg-white text-slate-900 border-t-2 border-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Assiduité ({att.rate}%)
                </button>
              </div>

              {/* Contenu de l'onglet actif */}
              <div className="p-6 text-xs space-y-4">
                
                {/* 1. Profil & Famille */}
                {dossierTab === 'PROFIL' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Date de Naissance</span>
                        <p className="font-semibold text-slate-800">{new Date(viewingStudent.birthDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Lieu de Naissance</span>
                        <p className="font-semibold text-slate-800">{viewingStudent.birthPlace || 'Bamako'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Nationalité</span>
                        <p className="font-semibold text-slate-800">{viewingStudent.nationality || 'Malienne'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Adresse</span>
                        <p className="font-semibold text-slate-800">{viewingStudent.address || 'Bamako'}</p>
                      </div>
                    </div>

                    {/* Parents & Contacts directs */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Parents & Tuteurs Légaux</h4>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-900">
                            {viewingStudent.parent?.fatherName || viewingStudent.parent?.motherName || 'Tuteur'}
                          </p>
                          <p className="text-slate-500 font-mono text-xs">
                            {viewingStudent.parent?.fatherPhone || viewingStudent.parent?.motherPhone || 'Aucun numéro'}
                          </p>
                        </div>

                        {/* Boutons d'action directes appel & WhatsApp */}
                        {(viewingStudent.parent?.fatherPhone || viewingStudent.parent?.motherPhone) && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/${(viewingStudent.parent?.fatherPhone || viewingStudent.parent?.motherPhone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`tel:${viewingStudent.parent?.fatherPhone || viewingStudent.parent?.motherPhone}`}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Appeler</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Caisse & Reçus */}
                {dossierTab === 'FINANCES' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Scolarité Dûe</span>
                        <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{formatFCFA(fin.annualFee)}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Versé</span>
                        <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{formatFCFA(fin.totalPaid)}</p>
                      </div>
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-rose-700 block">Reliquat Restant</span>
                        <p className="font-mono font-bold text-rose-800 text-sm mt-0.5">{formatFCFA(fin.remaining)}</p>
                      </div>
                    </div>

                    {/* Actions Caisse en 1 clic */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(viewingStudent, false)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Encaisser un versement</span>
                      </button>

                      {fin.remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenPayment(viewingStudent, true)}
                          className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Tout Solder ({formatFCFA(fin.remaining)})</span>
                        </button>
                      )}
                    </div>

                    {/* Historique des reçus */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700">
                        Historique des Reçus de Paiement ({fin.stdPayments.length})
                      </div>
                      {fin.stdPayments.length === 0 ? (
                        <p className="p-4 text-center text-slate-400">Aucun paiement enregistré pour cet élève.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {fin.stdPayments.map(p => (
                            <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                              <div>
                                <p className="font-bold text-slate-900">
                                  {p.receiptNumber} • {formatFCFA(p.amountPaid)}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {new Date(p.paymentDate).toLocaleDateString('fr-FR')} • {p.category} ({p.monthCovered})
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => PdfService.generateReceiptPdf(p, settings)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                title="Réimprimer ce reçu PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Reçu PDF</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Carte Scolaire & QR */}
                {dossierTab === 'CARTE' && (
                  <div className="space-y-4 text-center">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                      <QrCode className="w-24 h-24 text-slate-800 mx-auto" />
                      <p className="font-mono font-bold text-slate-700 mt-2">{viewingStudent.matricule}</p>
                      <p className="text-[10px] text-slate-400">QR Code officiel de vérification scannable</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadStudentCard(viewingStudent)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Télécharger la Carte Scolaire PDF A4</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/?verify=${viewingStudent.matricule}`);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Lien Copié !' : 'Copier le Lien Public'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Notes & Bulletin */}
                {dossierTab === 'NOTES' && (
                  <div className="space-y-4">
                    {reportCard ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Moyenne Générale</span>
                            <p className="font-mono font-bold text-blue-900 text-lg mt-0.5">
                              {reportCard.generalAverage.toFixed(2)} / {reportCard.maxScore}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Rang dans la Classe</span>
                            <p className="font-mono font-bold text-slate-900 text-lg mt-0.5">
                              {reportCard.rankInClass}e / {reportCard.totalClassStudents}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Appréciation</span>
                            <p className="font-bold text-emerald-800 text-xs mt-1">
                              {reportCard.appreciation || 'Travail régulier'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadStudentBulletin(viewingStudent)}
                          className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Télécharger le Bulletin de Notes Trimestriel PDF</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-slate-300" />
                        <p>Aucune note enregistrée pour cet élève au {settings.activeTerm}.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Assiduité */}
                {dossierTab === 'PRESENCES' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Présences</span>
                        <p className="font-mono font-bold text-emerald-900 text-base mt-0.5">{att.presents}</p>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <span className="text-[10px] font-bold uppercase text-amber-700 block">Abs. Justifiées</span>
                        <p className="font-mono font-bold text-amber-900 text-base mt-0.5">{att.justAbs}</p>
                      </div>
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                        <span className="text-[10px] font-bold uppercase text-rose-700 block">Abs. Injustifiées</span>
                        <p className="font-mono font-bold text-rose-900 text-base mt-0.5">{att.unjustAbs}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleQuickMarkAttendance(viewingStudent, 'PRESENT')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Marquer Présent Aujourd'hui</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickMarkAttendance(viewingStudent, 'ABSENT_UNJUSTIFIED')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Signaler Absent Aujourd'hui</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Fermer le Dossier
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL 1 : FORMULAIRE D'INSCRIPTION / MODIFICATION D'UN ÉLÈVE
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStudent ? 'Modifier le Dossier Élève' : 'Inscription d\'un Nouvel Élève'}
                  </h3>
                  <p className="text-xs text-slate-500">Informations scolaires et administratives</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold">
              {/* Photo d'identité */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative shrink-0">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Aperçu"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 text-slate-400 font-bold flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-slate-500 block">
                    Photo d'Identité (Optionnelle)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Identité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prénom de l'Élève *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Ibrahim"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom de Famille *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: TRAORÉ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sexe *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="M">Masculin (Garçon)</option>
                    <option value="F">Féminin (Fille)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Classe d'Affectation *</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date de Naissance *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lieu de Naissance *</label>
                  <input
                    type="text"
                    required
                    value={formData.birthPlace}
                    onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                    placeholder="Ex: Bamako, Ségou, Sikasso..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Parents / Tuteur */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="font-bold text-slate-800 text-xs">Parent / Tuteur Légal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Nom du Parent *</label>
                    <input
                      type="text"
                      required
                      value={formData.parent?.fatherName}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherName: e.target.value }
                      })}
                      placeholder="Nom complet du tuteur"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Téléphone de Contact *</label>
                    <input
                      type="text"
                      required
                      value={formData.parent?.fatherPhone}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherPhone: e.target.value }
                      })}
                      placeholder="Ex: +223 76 00 00 00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pied de formulaire */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Enregistrer l'Élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3 : QR CODE EN GRAND FORMAT
          ========================================================================= */}
      {qrModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-6 space-y-4 text-center border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">QR Code de l'Élève</h3>
            <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-200">
              <img src={qrModalStudent.qrUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {qrModalStudent.student.lastName.toUpperCase()} {qrModalStudent.student.firstName}
              </p>
              <p className="font-mono text-slate-500 font-bold text-xs mt-0.5">
                {qrModalStudent.student.matricule}
              </p>
            </div>
            <button
              onClick={() => setQrModalStudent(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4 : CONFIRMATION DE SUPPRESSION
          ========================================================================= */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-center border border-slate-200">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supprimer cet élève ?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Voulez-vous supprimer le dossier de <strong>{deletingStudent.name}</strong> ?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'import Excel */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        classes={classes}
        currentAcademicYear={settings.currentAcademicYear}
        onImport={handleBatchImport}
      />

      {/* Modal de suppression groupée */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllStudents}
        title="Supprimer Tous les Élèves"
        itemCount={students.length}
        description="Attention ! Cette action supprimera définitivement TOUS les élèves inscrits ainsi que leurs dossiers scolaires."
      />

      {/* Modal Fiche Statistique Officielle MEN / CAP */}
      {isMenStatsOpen && (
        <MenOfficialStatsModal
          students={students}
          classes={classes}
          settings={settings}
          onClose={() => setIsMenStatsOpen(false)}
        />
      )}
    </div>
  );
};
