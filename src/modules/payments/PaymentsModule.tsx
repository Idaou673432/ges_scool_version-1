/**
 * SomaSikolo / KalanGest - Module Caisse & Scolarités
 * Interface de caisse épurée, ultra-facile d'utilisation et intuitive pour les caissiers d'établissements scolaires au Mali.
 * 100% des fonctions existantes conservées : encaissements 1-clic, reçus multi-formats (POS thermique 80mm & A5 avec cachet),
 * relances WhatsApp/SMS pour impayés, suivi des dépenses d'établissement, factures scolaires et exports CSV/PDF.
 */

import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  Receipt, 
  Download, 
  Search, 
  CheckCircle2, 
  MessageCircle, 
  Printer, 
  FileText, 
  X, 
  Users, 
  Filter, 
  AlertCircle, 
  Clock, 
  FileSpreadsheet, 
  Wallet, 
  MinusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  BellRing, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  MessageSquare,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Lock,
  ShieldCheck,
  Building2,
  FileCheck,
  Eye
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Payment, PaymentCategory, PaymentMethod, Student, Expense, ExpenseCategory, TuitionInvoice, InvoiceStatus, DailyCashClosure } from '../../types';
import { formatFCFA, getAnnualTuitionFee, getEvaluationCountForClass } from '../../constants/maliEducation';
import { secureLocalStorage } from '../../services/secureStorage';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { cloudSyncService } from '../../services/cloudSyncService';
import { DailyCashClosureModal } from '../../components/payments/DailyCashClosureModal';
import { ReceiptVerificationModal } from '../../components/receipts/ReceiptVerificationModal';
import { HorizontalReceiptModal } from '../../components/receipts/HorizontalReceiptModal';

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    reference: 'DEP-2025-001',
    category: 'SALAIRE',
    description: 'Acompte Salaire Enseignants Vacataires - Octobre',
    amount: 450000,
    expenseDate: '2025-10-15',
    beneficiary: 'Corps Professoral Mandaté',
    paymentMethod: 'ESPECES',
    approvedBy: 'Le Directeur Général'
  },
  {
    id: 'exp-2',
    reference: 'DEP-2025-002',
    category: 'ELECTRICITE_EAU',
    description: 'Facture Électricité EDM-SA & Eau SOMAGEP',
    amount: 85000,
    expenseDate: '2025-10-18',
    beneficiary: 'EDM-SA / SOMAGEP',
    paymentMethod: 'ORANGE_MONEY',
    approvedBy: 'Service Comptabilité'
  },
  {
    id: 'exp-3',
    reference: 'DEP-2025-003',
    category: 'FOURNITURES',
    description: 'Achat de rames de papier, craies blanches & registres',
    amount: 125000,
    expenseDate: '2025-10-22',
    beneficiary: 'Librairie Papeterie du Fleuve',
    paymentMethod: 'ESPECES',
    approvedBy: 'Le Directeur Général'
  },
  {
    id: 'exp-4',
    reference: 'DEP-2025-004',
    category: 'CARBURANT',
    description: 'Carburant Groupe Électrogène de Secours (Secteur Coupure)',
    amount: 60000,
    expenseDate: '2025-10-25',
    beneficiary: 'Station TotalEnergies Lafiabougou',
    paymentMethod: 'ESPECES',
    approvedBy: 'Gestionnaire de Caisse'
  }
];

export const PaymentsModule: React.FC = () => {
  const { 
    payments, 
    expenses,
    closures,
    students, 
    classes, 
    recordPayment, 
    updatePayment, 
    deletePayment, 
    deleteAllPayments,
    saveExpense,
    deleteExpense,
    saveClosure,
    deleteClosure,
    settings,
    cloudSchoolCode
  } = useSchool();

  // Navigation par onglets simples
  const [activeTab, setActiveTab] = useState<'STUDENTS_FINANCES' | 'TRANSACTIONS' | 'CLOSURES' | 'EXPENSES' | 'INVOICES'>('STUDENTS_FINANCES');

  // Filtres Situation Élèves
  const [studentSearchGlobal, setStudentSearchGlobal] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'A_JOUR' | 'PARTIEL' | 'UNPAID'>('ALL');

  // Filtre Journal des Reçus
  const [searchReceipts, setSearchReceipts] = useState('');

  // Modals & Notifications
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  
  // Nouveau Paiement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [receiptModalPayment, setReceiptModalPayment] = useState<Payment | null>(null);
  const [selectedPaymentForVerification, setSelectedPaymentForVerification] = useState<Payment | null>(null);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [paymentToDeleteModal, setPaymentToDeleteModal] = useState<Payment | null>(null);
  const [paymentToEditModal, setPaymentToEditModal] = useState<Payment | null>(null);

  // Clôture Journalière de Caisse State
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [closureToDelete, setClosureToDelete] = useState<DailyCashClosure | null>(null);

  const handleSaveClosure = (newClosure: DailyCashClosure) => {
    saveClosure(newClosure);
    setSyncToast(`Procès-Verbal N° ${newClosure.reference} enregistré avec succès !`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleDeleteClosure = (id: string) => {
    deleteClosure(id);
    setClosureToDelete(null);
    setSyncToast('Procès-verbal de clôture supprimé.');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Factures & Échéances State
  const [globalDueDate] = useState('2025-11-10');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceClassFilter, setInvoiceClassFilter] = useState('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'EN_RETARD' | 'IMPAYE' | 'PARTIEL' | 'PAYE'>('ALL');
  
  // Expenses State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseToDeleteModal, setExpenseToDeleteModal] = useState<Expense | null>(null);
  const [expenseFormData, setExpenseFormData] = useState<Partial<Expense>>({
    category: 'SALAIRE',
    description: '',
    amount: 50000,
    expenseDate: new Date().toISOString().slice(0, 10),
    beneficiary: '',
    paymentMethod: 'ESPECES',
    approvedBy: 'Service Comptabilité'
  });

  const handleDeleteExpenseConfirm = () => {
    if (expenseToDeleteModal) {
      deleteExpense(expenseToDeleteModal.id);
      setExpenseToDeleteModal(null);
      setSyncToast('Dépense supprimée avec succès. Le solde de la caisse a été mis à jour.');
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  // Dedicated Modal State for Individual Unpaid Student Reminder (WhatsApp & SMS)
  const [unpaidReminderModalData, setUnpaidReminderModalData] = useState<{
    studentId: string;
    studentName: string;
    matricule: string;
    className: string;
    remainingFee: number;
    totalPaid: number;
    annualFee: number;
    percentPaid: number;
    status: 'UNPAID' | 'PARTIEL' | 'A_JOUR';
    phone: string;
    messageText: string;
  } | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  // Formulaire d'encaissement simplifié
  const [formData, setFormData] = useState<Partial<Payment>>({
    studentId: '',
    studentMatricule: '',
    studentName: '',
    className: '',
    category: 'MENSUALITE',
    monthCovered: 'Octobre 2025',
    amountPaid: 25000,
    expectedAmount: 25000,
    method: 'ESPECES',
    referenceNumber: '',
    cashierName: 'Caisse Principale',
    academicYear: settings.currentAcademicYear
  });

  // Calculs financiers pour chaque élève
  const studentsFinancials = useMemo(() => {
    return students.map(student => {
      const cls = classes.find(c => c.id === student.classId);
      const studentPayments = payments.filter(p => p.studentId === student.id);
      const totalPaid = studentPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);
      const evalCount = getEvaluationCountForClass(cls?.category, settings);
      const annualFee = getAnnualTuitionFee(cls, settings);
      const remaining = Math.max(0, annualFee - totalPaid);
      const percentPaid = annualFee > 0 ? Math.min(100, Math.round((totalPaid / annualFee) * 100)) : 0;
      
      let status: 'A_JOUR' | 'PARTIEL' | 'UNPAID' = 'UNPAID';
      if (totalPaid >= annualFee) status = 'A_JOUR';
      else if (totalPaid > 0) status = 'PARTIEL';

      return {
        student,
        clsName: cls?.name || 'Sans classe',
        clsCategory: cls?.category,
        monthlyFee: cls?.monthlyFee || 25000,
        annualFee,
        evalCount,
        totalPaid,
        remaining,
        percentPaid,
        status,
        paymentsCount: studentPayments.length,
        lastPaymentDate: studentPayments[0]?.paymentDate
      };
    });
  }, [students, classes, payments, settings]);

  // Liste filtrée des élèves pour l'onglet principal via la zone de recherche
  const filteredStudentsFinancials = useMemo(() => {
    return studentsFinancials.filter(item => {
      const q = studentSearchGlobal.toLowerCase().trim();
      if (!q) return true;
      return (
        item.student.firstName.toLowerCase().includes(q) ||
        item.student.lastName.toLowerCase().includes(q) ||
        item.student.matricule.toLowerCase().includes(q) ||
        item.clsName.toLowerCase().includes(q) ||
        (item.student.parent?.fatherPhone && item.student.parent.fatherPhone.includes(q)) ||
        (item.student.parent?.motherPhone && item.student.parent.motherPhone.includes(q))
      );
    }).sort((a, b) => {
      return b.remaining - a.remaining || a.student.lastName.localeCompare(b.student.lastName);
    });
  }, [studentsFinancials, studentSearchGlobal]);

  // Totaux financiers généraux
  const totalCollected = useMemo(() => payments.reduce((acc, curr) => acc + curr.amountPaid, 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  const netBalance = totalCollected - totalExpenses;
  const totalExpectedRevenue = useMemo(() => studentsFinancials.reduce((acc, curr) => acc + curr.annualFee, 0), [studentsFinancials]);
  const totalRemainingToCollect = useMemo(() => studentsFinancials.reduce((acc, curr) => acc + curr.remaining, 0), [studentsFinancials]);
  const recoveryRate = totalExpectedRevenue > 0 ? Math.round((totalCollected / totalExpectedRevenue) * 100) : 0;

  const upToDateCount = studentsFinancials.filter(s => s.status === 'A_JOUR').length;
  const partialCount = studentsFinancials.filter(s => s.status === 'PARTIEL').length;
  const unpaidCount = studentsFinancials.filter(s => s.status === 'UNPAID').length;

  // Factures automatiques
  const todayStr = new Date().toISOString().slice(0, 10);
  const invoices: TuitionInvoice[] = useMemo(() => {
    return studentsFinancials.map((item, idx) => {
      const parentPhone = item.student.parent?.fatherPhone || item.student.parent?.motherPhone || settings.phone;
      const parentName = item.student.parent?.fatherName || item.student.parent?.motherName || 'Parent / Tuteur';

      let status: InvoiceStatus = 'IMPAYE';
      if (item.remaining <= 0) {
        status = 'PAYE';
      } else if (todayStr > globalDueDate) {
        status = 'EN_RETARD';
      } else if (item.totalPaid > 0) {
        status = 'PARTIEL';
      }

      return {
        id: `inv-${item.student.id}`,
        invoiceNumber: `FAC-2025-${String(idx + 1).padStart(3, '0')}`,
        studentId: item.student.id,
        studentMatricule: item.student.matricule,
        studentName: `${item.student.lastName.toUpperCase()} ${item.student.firstName}`,
        className: item.clsName,
        parentName,
        parentPhone,
        issueDate: '2025-10-01',
        dueDate: globalDueDate,
        academicYear: settings.currentAcademicYear,
        description: `Appel de Scolarité & Frais d'Études (${settings.currentAcademicYear})`,
        totalAmount: item.annualFee,
        paidAmount: item.totalPaid,
        remainingAmount: item.remaining,
        status
      };
    });
  }, [studentsFinancials, settings, globalDueDate, todayStr]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = invoiceSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        inv.studentName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.studentMatricule.toLowerCase().includes(q);
      const matchesClass = invoiceClassFilter === 'ALL' || inv.className === invoiceClassFilter ||
        classes.find(c => c.id === invoiceClassFilter)?.name === inv.className;
      const matchesStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [invoices, invoiceSearch, invoiceClassFilter, invoiceStatusFilter, classes]);

  // Ouvrir le modal d'encaissement pour un élève spécifique ou vierge, avec option de solder
  const handleOpenAddForStudent = (targetStudent?: Student, settleFull: boolean = false) => {
    if (targetStudent) {
      const targetFin = studentsFinancials.find(f => f.student.id === targetStudent.id);
      if (targetFin && targetFin.remaining <= 0) return;
    }
    const firstUnpaidStudent = studentsFinancials.find(f => f.remaining > 0)?.student;
    const std = targetStudent || firstUnpaidStudent;
    if (!std) return;
    const defaultClass = classes.find(c => c.id === std?.classId);
    const stdFin = std ? studentsFinancials.find(f => f.student.id === std.id) : undefined;
    
    let suggestedAmount = defaultClass?.monthlyFee || 25000;
    if (stdFin) {
      if (settleFull && stdFin.remaining > 0) {
        suggestedAmount = stdFin.remaining;
      } else if (stdFin.remaining > 0) {
        suggestedAmount = Math.min(stdFin.remaining, defaultClass?.monthlyFee || 25000);
      }
    }

    setModalStudentSearch('');
    setIsChangingStudent(!targetStudent);
    setFormData({
      studentId: std?.id || '',
      studentMatricule: std?.matricule || '',
      studentName: std ? `${std.lastName.toUpperCase()} ${std.firstName}` : '',
      className: defaultClass?.name || '',
      category: settleFull ? 'SOLDE_TOTAL' : 'MENSUALITE',
      monthCovered: settleFull ? 'Solde intégral scolarité' : 'Octobre 2025',
      amountPaid: suggestedAmount,
      expectedAmount: defaultClass?.monthlyFee || 25000,
      method: 'ESPECES',
      referenceNumber: '',
      cashierName: 'Caisse Principale',
      academicYear: settings.currentAcademicYear
    });
    setIsModalOpen(true);
  };

  const handleStudentSelect = (studentId: string) => {
    const std = students.find(s => s.id === studentId);
    if (!std) return;
    const cls = classes.find(c => c.id === std.classId);
    const stdFin = studentsFinancials.find(f => f.student.id === std.id);
    if (stdFin && stdFin.remaining <= 0) return;
    const suggestedAmount = stdFin && stdFin.remaining > 0 
      ? Math.min(stdFin.remaining, cls?.monthlyFee || 25000) 
      : (cls?.monthlyFee || 25000);

    setFormData(prev => ({
      ...prev,
      studentId: std.id,
      studentMatricule: std.matricule,
      studentName: `${std.lastName.toUpperCase()} ${std.firstName}`,
      className: cls?.name || '',
      amountPaid: suggestedAmount,
      expectedAmount: cls?.monthlyFee || 25000
    }));
    setIsChangingStudent(false);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) return;
    const currentFin = studentsFinancials.find(f => f.student.id === formData.studentId);
    if (currentFin && currentFin.remaining <= 0) return;

    const newPayment = recordPayment({
      ...formData,
      monthCovered: formData.monthCovered || '',
      referenceNumber: formData.referenceNumber || '',
      notes: formData.notes || ''
    });

    setIsModalOpen(false);
    setSyncToast(`Reçu N° ${newPayment.receiptNumber} (${formatFCFA(newPayment.amountPaid)}) enregistré avec succès !`);
    setTimeout(() => setSyncToast(null), 4000);
    setReceiptModalPayment(newPayment);
  };

  const handleOpenExpenseModal = () => {
    setExpenseError(null);
    setIsExpenseModalOpen(true);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqAmount = Number(expenseFormData.amount) || 0;
    if (reqAmount <= 0) {
      setExpenseError('Veuillez saisir un montant valide supérieur à 0 FCFA.');
      return;
    }
    // Strict business rule: Expenses cannot exceed available cash/revenue
    if (netBalance <= 0) {
      setExpenseError(
        `Opération refusée : Le solde en caisse est actuellement nul ou négatif (${formatFCFA(netBalance)}). Le système interdit d'engager des dépenses sans recettes préalables.`
      );
      return;
    }
    if (reqAmount > netBalance) {
      setExpenseError(
        `Opération refusée : Le montant de la dépense (${formatFCFA(reqAmount)}) dépasse le solde disponible en caisse (${formatFCFA(netBalance)}). Les dépenses ne peuvent pas être supérieures à la caisse disponible.`
      );
      return;
    }
    setExpenseError(null);

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      reference: `DEP-2025-${String(expenses.length + 1).padStart(3, '0')}`,
      category: expenseFormData.category || 'AUTRES',
      description: expenseFormData.description || 'Dépense de fonctionnement',
      amount: reqAmount,
      expenseDate: expenseFormData.expenseDate || new Date().toISOString().slice(0, 10),
      beneficiary: expenseFormData.beneficiary || 'Bénéficiaire',
      paymentMethod: expenseFormData.paymentMethod || 'ESPECES',
      approvedBy: expenseFormData.approvedBy || 'Direction'
    };
    saveExpense(newExpense);
    setIsExpenseModalOpen(false);
    setExpenseFormData({
      category: 'SALAIRE',
      description: '',
      amount: 50000,
      expenseDate: new Date().toISOString().slice(0, 10),
      beneficiary: '',
      paymentMethod: 'ESPECES',
      approvedBy: 'Service Comptabilité'
    });
    setSyncToast(`Dépense de ${formatFCFA(newExpense.amount)} enregistrée.`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // WhatsApp helpers
  const handleSendReceiptWhatsApp = (p: Payment) => {
    const std = students.find(s => s.id === p.studentId);
    const parentPhone = std?.parent?.fatherPhone || std?.parent?.motherPhone || settings.phone;
    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `*REÇU DE PAIEMENT - ${settings.schoolName.toUpperCase()}*\n` +
      `----------------------------------------\n` +
      `🧾 *Reçu N°:* ${p.receiptNumber}\n` +
      `📅 *Date:* ${new Date(p.paymentDate).toLocaleDateString('fr-FR')}\n` +
      `👤 *Élève:* ${p.studentName} (${p.className})\n` +
      `🆔 *Matricule:* ${p.studentMatricule}\n` +
      `----------------------------------------\n` +
      `📋 *Motif:* ${p.category} ${p.monthCovered ? '(' + p.monthCovered + ')' : ''}\n` +
      `💰 *Montant Versé:* ${formatFCFA(p.amountPaid)}\n` +
      `💳 *Mode:* ${p.method}\n` +
      `⚠️ *Reste à Payer:* ${formatFCFA(p.remainingAmount)}\n` +
      `----------------------------------------\n` +
      `Merci pour votre règlement.\n` +
      `Caisse: ${p.cashierName} • Tél: ${settings.phone}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleOpenUnpaidReminder = (item: typeof studentsFinancials[0]) => {
    const fatherPhone = item.student.parent?.fatherPhone || '';
    const motherPhone = item.student.parent?.motherPhone || '';
    const initialPhone = fatherPhone || motherPhone || settings.phone;
    const studentFullName = `${item.student.lastName.toUpperCase()} ${item.student.firstName}`;

    const ecole = settings.schoolName || 'Établissement Scolaire';
    const annee = settings.currentAcademicYear || '2025-2026';
    const contact = settings.phone || '';

    const defaultMsg = (
      `*RAPPEL DE SCOLARITÉ - ${ecole.toUpperCase()}*\n` +
      `----------------------------------------\n` +
      `Bonjour Chers Parents / Tuteurs,\n\n` +
      `Nous vous contactons au sujet de la scolarité de l'élève :\n` +
      `👤 *${studentFullName}*\n` +
      `📚 Classe : *${item.clsName}*\n` +
      `🆔 Matricule : *${item.student.matricule}*\n` +
      `📅 Année Scolaire : *${annee}*\n\n` +
      `📊 *Situation Financière :*\n` +
      `• Frais annuels exigibles : ${formatFCFA(item.annualFee)}\n` +
      `• Déjà versé : ${formatFCFA(item.totalPaid)}\n` +
      `⚠️ *SOLDE RESTANT À RÉGLER : ${formatFCFA(item.remaining)}*\n\n` +
      `Merci de régulariser ce solde auprès de la caisse ou par mobile money.\n` +
      (contact ? `📞 Caisse & Direction : ${contact}\n` : '') +
      `_Direction - ${ecole}_`
    );

    setUnpaidReminderModalData({
      studentId: item.student.id,
      studentName: studentFullName,
      matricule: item.student.matricule,
      className: item.clsName,
      remainingFee: item.remaining,
      totalPaid: item.totalPaid,
      annualFee: item.annualFee,
      percentPaid: item.percentPaid,
      status: item.status,
      phone: initialPhone,
      messageText: defaultMsg
    });
  };

  const handleSwitchReminderLanguage = (lang: 'FR' | 'BAMBARA') => {
    if (!unpaidReminderModalData) return;
    const ecole = settings.schoolName || 'Établissement Scolaire';
    const annee = settings.currentAcademicYear || '2025-2026';
    const contact = settings.phone || '';
    const studentFullName = unpaidReminderModalData.studentName;

    if (lang === 'BAMBARA') {
      const bamanankanMsg = (
        `*KALANSARA LAKALI - ${ecole.toUpperCase()}*\n` +
        `----------------------------------------\n` +
        `I ni ce k'an kɛnɛya chers parents,\n\n` +
        `An b'aw laseli den ka kalansara kow la :\n` +
        `👤 *${studentFullName}*\n` +
        `📚 Klasikɔnɔ : *${unpaidReminderModalData.className}*\n` +
        `🆔 Matricule : *${unpaidReminderModalData.matricule}*\n` +
        `📅 San : *${annee}*\n\n` +
        `📊 *Kalansara Jateminɛ :*\n` +
        `• Kalansara bɛɛ lajɛlen : ${formatFCFA(unpaidReminderModalData.annualFee)}\n` +
        `• A sara kɔrɔ : ${formatFCFA(unpaidReminderModalData.totalPaid)}\n` +
        `⚠️ *DESE BƐ A LA : ${formatFCFA(unpaidReminderModalData.remainingFee)}*\n\n` +
        `Aw ye hami ka den ka kalansara sara kɛnɛ ma cike la (Caisse walima Orange Money).\n` +
        `Ala ka denw ka kalan n'u sɔrɔ dèmè!\n` +
        (contact ? `📞 Caisse & Direction : ${contact}\n` : '') +
        `_Kalan Kuntigi - ${ecole}_`
      );
      setUnpaidReminderModalData(prev => prev ? ({ ...prev, messageText: bamanankanMsg }) : null);
    } else {
      const frenchMsg = (
        `*RAPPEL DE SCOLARITÉ - ${ecole.toUpperCase()}*\n` +
        `----------------------------------------\n` +
        `Bonjour Chers Parents / Tuteurs,\n\n` +
        `Nous vous contactons au sujet de la scolarité de l'élève :\n` +
        `👤 *${studentFullName}*\n` +
        `📚 Classe : *${unpaidReminderModalData.className}*\n` +
        `🆔 Matricule : *${unpaidReminderModalData.matricule}*\n` +
        `📅 Année Scolaire : *${annee}*\n\n` +
        `📊 *Situation Financière :*\n` +
        `• Frais annuels exigibles : ${formatFCFA(unpaidReminderModalData.annualFee)}\n` +
        `• Déjà versé : ${formatFCFA(unpaidReminderModalData.totalPaid)}\n` +
        `⚠️ *SOLDE RESTANT À RÉGLER : ${formatFCFA(unpaidReminderModalData.remainingFee)}*\n\n` +
        `Merci de régulariser ce solde auprès de la caisse ou par mobile money.\n` +
        (contact ? `📞 Caisse & Direction : ${contact}\n` : '') +
        `_Direction - ${ecole}_`
      );
      setUnpaidReminderModalData(prev => prev ? ({ ...prev, messageText: frenchMsg }) : null);
    }
  };

  const handleSendReminderViaWhatsApp = () => {
    if (!unpaidReminderModalData) return;
    const cleanPhone = unpaidReminderModalData.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(unpaidReminderModalData.messageText);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const handleSendReminderViaSMS = () => {
    if (!unpaidReminderModalData) return;
    const cleanPhone = unpaidReminderModalData.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(unpaidReminderModalData.messageText);
    window.location.href = `sms:${cleanPhone}?body=${encoded}`;
  };

  const handleCopyReminderMessage = () => {
    if (!unpaidReminderModalData) return;
    navigator.clipboard.writeText(unpaidReminderModalData.messageText);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2000);
  };

  const handleSendInvoiceWhatsApp = (inv: TuitionInvoice) => {
    const cleanPhone = inv.parentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `*FACTURE DE SCOLARITÉ N° ${inv.invoiceNumber}*\n` +
      `----------------------------------------\n` +
      `📍 *Établissement:* ${settings.schoolName}\n` +
      `👤 *Élève:* ${inv.studentName} (${inv.className})\n` +
      `🆔 *Matricule:* ${inv.studentMatricule}\n` +
      `----------------------------------------\n` +
      `💰 *Montant Exigible:* ${formatFCFA(inv.totalAmount)}\n` +
      `✅ *Versements Effectués:* ${formatFCFA(inv.paidAmount)}\n` +
      `⚠️ *RESTE À PAYER:* ${formatFCFA(inv.remainingAmount)}\n` +
      `📅 *Date Échéance:* ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}\n` +
      `Tél Caisse: ${settings.phone}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleDownloadSingleInvoicePdf = (inv: TuitionInvoice) => {
    const stdPayments = payments.filter(p => p.studentId === inv.studentId);
    PdfService.generateInvoicePdf(inv, stdPayments, settings);
  };

  const handleDownloadBatchInvoicesPdf = () => {
    const paymentsMap: Record<string, Payment[]> = {};
    filteredInvoices.forEach(inv => {
      paymentsMap[inv.studentId] = payments.filter(p => p.studentId === inv.studentId);
    });
    const clsName = invoiceClassFilter === 'ALL' ? 'Toutes_les_Classes' : (classes.find(c => c.id === invoiceClassFilter)?.name || invoiceClassFilter);
    PdfService.generateClassInvoicesPdf(filteredInvoices, paymentsMap, settings, clsName);
  };

  const handleDownloadStudentStatementPdf = (std: Student) => {
    const stdClass = classes.find(c => c.id === std.classId);
    const stdPayments = payments.filter(p => p.studentId === std.id);
    const annualFee = getAnnualTuitionFee(stdClass, settings);
    PdfService.generateStudentStatementPdf(std, stdClass, stdPayments, annualFee, settings);
  };

  // CSV Exporters
  const handleExportStudentsCsv = () => {
    const headers = ['Matricule', 'Nom & Prénoms', 'Classe', 'Frais Annuel (FCFA)', 'Total Versé (FCFA)', 'Solde Dû (FCFA)', 'Statut', 'Téléphone Parent'];
    const rows = studentsFinancials.map(item => [
      `"${item.student.matricule}"`,
      `"${(item.student.lastName.toUpperCase() + ' ' + item.student.firstName).replace(/"/g, '""')}"`,
      `"${item.clsName}"`,
      item.annualFee,
      item.totalPaid,
      item.remaining,
      item.status === 'A_JOUR' ? 'À Jour' : item.status === 'PARTIEL' ? 'Solde Partiel' : 'Non Payé',
      `"${item.student.parent?.fatherPhone || item.student.parent?.motherPhone || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Situation_Scolarites_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportTransactionsCsv = () => {
    const headers = ['N° Reçu', 'Date', 'Matricule', 'Nom Élève', 'Classe', 'Motif', 'Mode', 'Montant Versé', 'Reste Dû', 'Caissier'];
    const rows = payments.map(p => [
      `"${p.receiptNumber}"`,
      `"${new Date(p.paymentDate).toLocaleDateString('fr-FR')}"`,
      `"${p.studentMatricule}"`,
      `"${p.studentName.replace(/"/g, '""')}"`,
      `"${p.className}"`,
      `"${p.category} ${p.monthCovered ? '(' + p.monthCovered + ')' : ''}"`,
      `"${p.method}"`,
      p.amountPaid,
      p.remainingAmount,
      `"${p.cashierName}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Journal_Encaissements_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportExpensesCsv = () => {
    const headers = ['Référence', 'Date', 'Catégorie', 'Description', 'Bénéficiaire', 'Montant (FCFA)', 'Mode', 'Approuvé Par'];
    const rows = expenses.map(exp => [
      `"${exp.reference}"`,
      `"${exp.expenseDate}"`,
      `"${exp.category}"`,
      `"${exp.description.replace(/"/g, '""')}"`,
      `"${exp.beneficiary.replace(/"/g, '""')}"`,
      exp.amount,
      `"${exp.paymentMethod}"`,
      `"${exp.approvedBy.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Journal_Depenses_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportInvoicesCsv = () => {
    const headers = ['N° Facture', 'Élève', 'Matricule', 'Classe', 'Date Échéance', 'Total Exigible', 'Déjà Payé', 'Reste Dû', 'Statut'];
    const rows = filteredInvoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.studentName.replace(/"/g, '""')}"`,
      `"${inv.studentMatricule}"`,
      `"${inv.className}"`,
      `"${inv.dueDate}"`,
      inv.totalAmount,
      inv.paidAmount,
      inv.remainingAmount,
      inv.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Factures_Scolarite_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Liste filtrée des reçus pour le journal
  const filteredPayments = useMemo(() => {
    const q = searchReceipts.toLowerCase().trim();
    if (!q) return payments;
    return payments.filter(p => 
      p.receiptNumber.toLowerCase().includes(q) ||
      p.studentName.toLowerCase().includes(q) ||
      p.studentMatricule.toLowerCase().includes(q) ||
      p.className.toLowerCase().includes(q)
    );
  }, [payments, searchReceipts]);

  // Étudiant actuellement sélectionné dans le modal d'encaissement
  const activeModalStudent = useMemo(() => {
    return students.find(s => s.id === formData.studentId);
  }, [students, formData.studentId]);

  const activeModalStudentFinancial = useMemo(() => {
    if (!activeModalStudent) return null;
    return studentsFinancials.find(f => f.student.id === activeModalStudent.id) || null;
  }, [activeModalStudent, studentsFinancials]);

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      
      {/* Barre Unifiée Ultra-Compacte : Scolarités & Factures */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Title + Tabs */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline font-bold">Scolarités</span>
            </div>

            {/* Onglets */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('STUDENTS_FINANCES')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeTab === 'STUDENTS_FINANCES'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Situation ({students.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('INVOICES')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeTab === 'INVOICES'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Factures ({invoices.length})</span>
              </button>
            </div>

            {/* Inlined Search & Filters according to tab */}
            {activeTab === 'STUDENTS_FINANCES' ? (
              <div className="relative flex-1 min-w-[150px] max-w-[280px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchGlobal}
                  onChange={e => setStudentSearchGlobal(e.target.value)}
                  placeholder="Rechercher élève, classe..."
                  className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                />
                {studentSearchGlobal && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchGlobal('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={e => setInvoiceSearch(e.target.value)}
                    placeholder="N° facture ou élève..."
                    className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <select
                  value={invoiceClassFilter}
                  onChange={e => setInvoiceClassFilter(e.target.value)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[130px]"
                >
                  <option value="ALL">Toutes classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDownloadBatchInvoicesPdf}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  title="Télécharger toutes les factures en PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {totalRemainingToCollect > 0 && (
              <button
                type="button"
                onClick={() => handleOpenAddForStudent()}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Encaisser</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (activeTab === 'STUDENTS_FINANCES') handleExportStudentsCsv();
                else handleExportInvoicesCsv();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              title="Exporter la situation en CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Micro-synthèse financière en 1 ligne discrète */}
        <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
          <span>Dues : <strong className="text-slate-900 font-mono">{formatFCFA(totalExpectedRevenue)}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Recouvré : <strong className="text-emerald-700 font-mono">{formatFCFA(totalCollected)}</strong> <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded text-[10px]">{recoveryRate}%</span></span>
          <span aria-hidden="true">·</span>
          <span>Reste : <strong className="text-amber-800 font-mono">{formatFCFA(totalRemainingToCollect)}</strong> <span className="text-amber-800 bg-amber-50 px-1 py-0.2 rounded text-[10px] font-bold">{studentsFinancials.filter(f => f.remaining > 0).length} débiteurs</span></span>
        </div>
      </div>

      {/* 4. ONGLET 1 : Situation des Élèves & Encaissements Rapides */}
      {activeTab === 'STUDENTS_FINANCES' && (
        <div className="space-y-2">
          {/* Tableau Simplifié des Élèves */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Élève</th>
                    <th className="py-2 px-2.5">Classe</th>
                    <th className="py-2 px-2.5 text-right">Frais Annuel</th>
                    <th className="py-2 px-2.5 text-right">Payé</th>
                    <th className="py-2 px-2.5 text-right">Reste Dû</th>
                    <th className="py-2 px-2.5">Statut</th>
                    <th className="py-2 px-3 text-right">Action Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudentsFinancials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucun élève trouvé avec ces critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentsFinancials.map(item => {
                      const isUnpaid = item.status === 'UNPAID';
                      const isPartial = item.status === 'PARTIEL';
                      const isUpToDate = item.status === 'A_JOUR';

                      return (
                        <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Élève */}
                          <td className="py-1.5 sm:py-2 px-3">
                            <div className="flex items-center gap-2">
                              {item.student.photoUrl ? (
                                <img
                                  src={item.student.photoUrl}
                                  alt=""
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 border border-slate-200"
                                />
                              ) : (
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                  isUnpaid 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : isPartial 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {item.student.firstName[0]}{item.student.lastName[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900 leading-snug">
                                  {item.student.lastName.toUpperCase()} {item.student.firstName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.student.matricule}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Classe */}
                          <td className="py-1.5 sm:py-2 px-2.5 font-semibold text-slate-700">
                            {item.clsName}
                          </td>

                          {/* Frais Annuel */}
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-medium text-slate-600 font-mono tabular-nums">
                            {formatFCFA(item.annualFee)}
                          </td>

                          {/* Déjà Payé */}
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-bold text-emerald-700 font-mono tabular-nums">
                            {formatFCFA(item.totalPaid)}
                          </td>

                          {/* Reste Dû */}
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-bold font-mono tabular-nums">
                            {item.remaining > 0 ? (
                              <span className="text-rose-600">{formatFCFA(item.remaining)}</span>
                            ) : (
                              <span className="text-slate-400">0 FCFA</span>
                            )}
                          </td>

                          {/* Statut */}
                          <td className="py-1.5 sm:py-2 px-2.5">
                            {isUpToDate && (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>À jour</span>
                              </span>
                            )}
                            {isPartial && (
                              <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Partiel ({item.percentPaid}%)</span>
                              </span>
                            )}
                            {isUnpaid && (
                              <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Impayé</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-1.5 sm:py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Bouton Encaisser uniquement si reliquat restant */}
                              {item.remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddForStudent(item.student)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Encaisser un versement"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Encaisser</span>
                                </button>
                              )}

                              {/* Bouton Solder Tout en 1 Clic si reliquat restant */}
                              {item.remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddForStudent(item.student, true)}
                                  className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title={`Solder immédiatement tout le reliquat (${formatFCFA(item.remaining)})`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Solder ({formatFCFA(item.remaining)})</span>
                                </button>
                              )}

                              {/* Bouton Relance si solde restant */}
                              {item.remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUnpaidReminder(item)}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Envoyer un rappel par WhatsApp ou SMS"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Fiche détaillée */}
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForDetails(item.student)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Voir l'historique et le relevé"
                              >
                                <FileText className="w-4 h-4" />
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
        </div>
      )}

      {/* 5. ONGLET 2 : Journal des Reçus de Caisse */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchReceipts}
                onChange={e => setSearchReceipts(e.target.value)}
                placeholder="Rechercher par n° reçu, élève ou matricule..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''} enregistré{filteredPayments.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">N° Reçu</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Élève</th>
                    <th className="py-3 px-4">Motif</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-4 text-right">Montant Versé</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucun reçu ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{p.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule} · {p.className}</p>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {p.category} {p.monthCovered ? `(${p.monthCovered})` : ''}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {p.method}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono tabular-nums text-sm">
                          {formatFCFA(p.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Certificat Anti-Fraude */}
                            <button
                              type="button"
                              onClick={() => setSelectedPaymentForVerification(p)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Vérifier le certificat officiel anti-fraude de ce reçu"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Certificat</span>
                            </button>

                            {/* Visualiser la Quittance Horizontale */}
                            <button
                              type="button"
                              onClick={() => setReceiptModalPayment(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Visualiser la quittance officielle (format horizontal détaillé)"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>Quittance</span>
                            </button>

                            {/* Envoi WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendReceiptWhatsApp(p)}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Envoyer reçu WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            {/* Modifier */}
                            <button
                              type="button"
                              onClick={() => setPaymentToEditModal(p)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Modifier ce reçu"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Supprimer */}
                            <button
                              type="button"
                              onClick={() => setPaymentToDeleteModal(p)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce reçu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* =========================================================================
          NOUVEL ONGLET : Clôtures Journalières & Procès-Verbaux de Caisse
          ========================================================================= */}
      {activeTab === 'CLOSURES' && (
        <div className="space-y-4">
          
          {/* En-tête de section Clôtures */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-950 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Registre des Clôtures de Caisse & Procès-Verbaux
                </h2>
                <p className="text-xs text-slate-500">
                  Contrôles à l'aveugle · Confrontation recettes vs physique · Historique officiel
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsClosureModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Faire la Clôture de Caisse du Jour</span>
            </button>
          </div>

          {/* Table des Clôtures */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {closures.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Aucune clôture de caisse enregistrée</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    À la fin de chaque journée ou service, utilisez le bouton « Faire la Clôture de Caisse du Jour » ci-dessus pour saisir vos espèces comptées à l'aveugle et imprimer le procès-verbal officiel.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Réf PV & Date</th>
                      <th className="py-3 px-4">Caissier</th>
                      <th className="py-3 px-4 text-right">Espèces Comptées</th>
                      <th className="py-3 px-4 text-right">Attendu Système</th>
                      <th className="py-3 px-4 text-center">Écart de Caisse</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closures.map(closure => {
                      const isEquilibre = closure.status === 'EQUILIBRE';
                      return (
                        <tr key={closure.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-slate-900">{closure.reference}</p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(closure.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-700">
                            {closure.cashierName}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatFCFA(closure.countedCash)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatFCFA(closure.systemNetExpectedCash)}
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs ${
                              isEquilibre 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : closure.cashDiscrepancy > 0 
                                ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {closure.cashDiscrepancy > 0 ? '+' : ''}{formatFCFA(closure.cashDiscrepancy)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isEquilibre ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Conforme</span>
                              </span>
                            ) : closure.status === 'EXCEDENT' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>Excédent</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Manquant</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Imprimer PV */}
                              <button
                                type="button"
                                onClick={() => PdfService.generateCashClosurePvPdf(closure, settings)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                                title="Télécharger ou imprimer le procès-verbal signé"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Imprimer PV</span>
                              </button>

                              {/* Supprimer */}
                              <button
                                type="button"
                                onClick={() => setClosureToDelete(closure)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer ce procès-verbal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. ONGLET 4 : Dépenses de l'École */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registre des Décaissements</h2>
              <p className="text-xs text-slate-500">Salaires vacataires, électricité EDM, eau SOMAGEP, carburant, fournitures</p>
            </div>
            <button
              type="button"
              onClick={handleOpenExpenseModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enregistrer une Dépense</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Réf & Date</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Bénéficiaire</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucune dépense enregistrée.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-900">{exp.reference}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{exp.expenseDate}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {exp.description}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {exp.beneficiary}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {exp.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-700 font-mono tabular-nums text-sm">
                          {formatFCFA(exp.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpenseToDeleteModal(exp)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer la dépense"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* 7. ONGLET 4 : Factures & Échéances */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">N° Facture</th>
                    <th className="py-2 px-3">Élève & Classe</th>
                    <th className="py-2 px-2.5 text-right">Total Exigible</th>
                    <th className="py-2 px-2.5 text-right">Déjà Payé</th>
                    <th className="py-2 px-2.5 text-right">Reste Dû</th>
                    <th className="py-2 px-2.5">Statut</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-1.5 sm:py-2 px-3 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3">
                        <p className="font-bold text-slate-900">{inv.studentName}</p>
                        <p className="text-[10px] text-slate-400">{inv.className}</p>
                      </td>
                      <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono tabular-nums text-slate-700">
                        {formatFCFA(inv.totalAmount)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono tabular-nums text-emerald-700 font-bold">
                        {formatFCFA(inv.paidAmount)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono tabular-nums font-bold">
                        {inv.remainingAmount > 0 ? (
                          <span className="text-rose-600">{formatFCFA(inv.remainingAmount)}</span>
                        ) : (
                          <span className="text-slate-400">0 FCFA</span>
                        )}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2.5 font-semibold text-[11px]">
                        {inv.status === 'PAYE' && <span className="text-emerald-700 font-bold">Réglé</span>}
                        {inv.status === 'PARTIEL' && <span className="text-amber-700 font-bold">Partiel</span>}
                        {inv.status === 'IMPAYE' && <span className="text-rose-600 font-bold">Impayé</span>}
                        {inv.status === 'EN_RETARD' && <span className="text-rose-700 font-bold">En Retard</span>}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleInvoicePdf(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Télécharger PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendInvoiceWhatsApp(inv)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Envoyer Facture WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1 : NOUVEAU RÈGLEMENT (ENCAISSEMENT ULTRA-FACILE)
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-6">
            {/* Entête Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Encaisser un Règlement</h3>
                  <p className="text-xs text-slate-500">Saisie directe et délivrance du reçu officiel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4 text-xs">
              
              {/* Étape 1 : Élève Sélectionné ou Recherche */}
              {activeModalStudent && !isChangingStudent ? (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {activeModalStudent.photoUrl ? (
                        <img
                          src={activeModalStudent.photoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-emerald-300"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                          {activeModalStudent.firstName[0]}{activeModalStudent.lastName[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">
                          {activeModalStudent.lastName.toUpperCase()} {activeModalStudent.firstName}
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Classe : <span className="font-bold">{formData.className}</span> · Mat : <span className="font-mono">{activeModalStudent.matricule}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingStudent(true)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Changer
                    </button>
                  </div>

                  {activeModalStudentFinancial && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-center">
                      <div>
                        <span className="text-[10px] text-emerald-800 block">Frais Annuel</span>
                        <span className="font-bold font-mono text-slate-900">{formatFCFA(activeModalStudentFinancial.annualFee)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800 block">Déjà Versé</span>
                        <span className="font-bold font-mono text-emerald-700">{formatFCFA(activeModalStudentFinancial.totalPaid)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800 block font-semibold">Reste Dû</span>
                        <span className="font-bold font-mono text-rose-600">{formatFCFA(activeModalStudentFinancial.remaining)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    1. Sélectionner l'Élève *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalStudentSearch}
                      onChange={e => setModalStudentSearch(e.target.value)}
                      placeholder="Tapez le nom ou matricule de l'élève..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  {/* Liste rapide filtrée d'élèves */}
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 divide-y divide-slate-100 p-1">
                    {students
                      .filter(s => {
                        const sFin = studentsFinancials.find(f => f.student.id === s.id);
                        if (sFin && sFin.remaining <= 0) return false;
                        if (!modalStudentSearch) return true;
                        const q = modalStudentSearch.toLowerCase().trim();
                        return `${s.lastName} ${s.firstName}`.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q);
                      })
                      .slice(0, 8)
                      .map(s => {
                        const isSelected = formData.studentId === s.id;
                        const sClass = classes.find(c => c.id === s.classId);
                        const sFin = studentsFinancials.find(f => f.student.id === s.id);

                        return (
                          <div
                            key={s.id}
                            onClick={() => handleStudentSelect(s.id)}
                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-200/70 text-slate-800'
                            }`}
                          >
                            <div>
                              <p className="font-bold">
                                {s.lastName.toUpperCase()} {s.firstName}
                              </p>
                              <p className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                                {sClass?.name || 'Sans classe'} · Mat: {s.matricule}
                              </p>
                            </div>
                            <div className="text-right">
                              {sFin && sFin.remaining > 0 ? (
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-rose-600'}`}>
                                  Dû : {formatFCFA(sFin.remaining)}
                                </span>
                              ) : (
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                                  Soldé
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Étape 2 : Montant & Raccourcis 1 Clic */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  2. Montant Versé en FCFA *
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  step="500"
                  value={formData.amountPaid}
                  onChange={e => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-emerald-800 outline-none focus:bg-white focus:border-emerald-600"
                />

                {/* Raccourcis 1 Clic pour le Caissier */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeModalStudentFinancial && activeModalStudentFinancial.remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amountPaid: activeModalStudentFinancial.remaining })}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Tout solder ({formatFCFA(activeModalStudentFinancial.remaining)})
                    </button>
                  )}
                  {activeModalStudentFinancial && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amountPaid: activeModalStudentFinancial.monthlyFee })}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      1 Mensualité ({formatFCFA(activeModalStudentFinancial.monthlyFee)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, amountPaid: 10000 })}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    10 000
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, amountPaid: 25000 })}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    25 000
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, amountPaid: 50000 })}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    50 000
                  </button>
                </div>
              </div>

              {/* Étape 3 : Motif & Période */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Motif du Règlement</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as PaymentCategory })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="MENSUALITE">Mensualité de Scolarité</option>
                    <option value="INSCRIPTION">Frais d'Inscription</option>
                    <option value="CANTINE">Service Cantine</option>
                    <option value="TRANSPORT">Transport / Bus</option>
                    <option value="UNIFORME">Tenue Scolaire</option>
                    <option value="AUTRES">Frais Divers</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mois / Période</label>
                  <input
                    type="text"
                    value={formData.monthCovered || ''}
                    onChange={e => setFormData({ ...formData, monthCovered: e.target.value })}
                    placeholder="Ex: Octobre 2025"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Étape 4 : Mode de Paiement */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mode de Paiement</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ESPECES', label: '💵 Espèces' },
                    { id: 'ORANGE_MONEY', label: '🟠 Orange' },
                    { id: 'MOOV_MONEY', label: '🔵 Moov' },
                    { id: 'CHEQUE', label: '🏦 Chèque' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, method: m.id as PaymentMethod })}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        formData.method === m.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Modal */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!formData.studentId}
                  className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer & Générer le Reçu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2 : QUITTANCE HORIZONTALE DÉTAILLÉE (APERÇU DIRECT SANS TÉLÉCHARGEMENT)
          ========================================================================= */}
      <HorizontalReceiptModal
        isOpen={Boolean(receiptModalPayment)}
        payment={receiptModalPayment}
        settings={settings}
        onClose={() => setReceiptModalPayment(null)}
        onShareWhatsApp={handleSendReceiptWhatsApp}
      />

      {/* =========================================================================
          MODAL 3 : SAISIE D'UNE DÉPENSE
          ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <MinusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enregistrer une Dépense</h3>
                  <p className="text-xs text-slate-500">Décaissement de la caisse d'établissement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="p-6 space-y-3.5 text-xs">
              {/* Solde Disponible en Caisse */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                netBalance > 0 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div>
                  <span className="font-bold text-xs block">Solde Disponible en Caisse</span>
                  <span className="text-[10px] text-slate-500">Recettes : {formatFCFA(totalCollected)} • Dépenses : {formatFCFA(totalExpenses)}</span>
                </div>
                <span className={`font-black font-mono text-sm ${netBalance > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatFCFA(Math.max(0, netBalance))}
                </span>
              </div>

              {/* Message d'erreur / Refus si dépense supérieure aux recettes */}
              {expenseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 shadow-2xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <p className="text-xs font-semibold leading-relaxed">
                    {expenseError}
                  </p>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catégorie de Dépense *</label>
                <select
                  value={expenseFormData.category}
                  onChange={e => setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none cursor-pointer"
                >
                  <option value="SALAIRE">Salaires & Vacations Enseignants</option>
                  <option value="ELECTRICITE_EAU">Factures Électricité (EDM) & Eau</option>
                  <option value="FOURNITURES">Fournitures Scolaires & Rames</option>
                  <option value="CARBURANT">Carburant Groupe Électrogène</option>
                  <option value="MAINTENANCE">Entretien & Réparations</option>
                  <option value="EQUIPEMENT">Achat Équipement & Mobilier</option>
                  <option value="EVENEMENT">Fêtes & Cérémonies</option>
                  <option value="AUTRES">Autres Charges Diverses</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Motif *</label>
                <input
                  type="text"
                  required
                  value={expenseFormData.description}
                  onChange={e => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  placeholder="Ex: Acompte salaire enseignants vacataires..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Montant en FCFA *</label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    value={expenseFormData.amount}
                    onChange={e => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl font-bold font-mono text-sm outline-none ${
                      Number(expenseFormData.amount) > netBalance || netBalance <= 0
                        ? 'border-rose-400 text-rose-700 bg-rose-50/50'
                        : 'border-slate-200 text-slate-900'
                    }`}
                  />
                  {Number(expenseFormData.amount) > netBalance && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">
                      ⚠️ Refus : Dépasse le solde en caisse ({formatFCFA(Math.max(0, netBalance))})
                    </span>
                  )}
                  {netBalance <= 0 && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">
                      ⚠️ Caisse vide : aucune dépense ne peut être enregistrée.
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bénéficiaire *</label>
                  <input
                    type="text"
                    required
                    value={expenseFormData.beneficiary}
                    onChange={e => setExpenseFormData({ ...expenseFormData, beneficiary: e.target.value })}
                    placeholder="Ex: Nom ou Société"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mode de Règlement</label>
                  <select
                    value={expenseFormData.paymentMethod}
                    onChange={e => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MOOV_MONEY">Moov Money</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement Bancaire</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Approuvé Par</label>
                  <input
                    type="text"
                    value={expenseFormData.approvedBy}
                    onChange={e => setExpenseFormData({ ...expenseFormData, approvedBy: e.target.value })}
                    placeholder="Ex: Le Directeur Général"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    !expenseFormData.amount ||
                    Number(expenseFormData.amount) <= 0 ||
                    Number(expenseFormData.amount) > netBalance ||
                    netBalance <= 0
                  }
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Valider la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4 : RELANCE D'IMPAYÉ (WHATSAPP & SMS EN 1 CLIC)
          ========================================================================= */}
      {unpaidReminderModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Relance de Scolarité</h3>
                  <p className="text-xs text-slate-500">{unpaidReminderModalData.studentName} ({unpaidReminderModalData.className})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnpaidReminderModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Carte Solde Restant */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-amber-800 font-semibold uppercase">Solde Restant à Régler</p>
                  <p className="text-xl font-bold font-mono text-amber-900 tabular-nums">{formatFCFA(unpaidReminderModalData.remainingFee)}</p>
                </div>
                <div className="text-right text-[11px] text-amber-800">
                  <p>Déjà payé : {formatFCFA(unpaidReminderModalData.totalPaid)}</p>
                  <p>Total exigible : {formatFCFA(unpaidReminderModalData.annualFee)}</p>
                </div>
              </div>

              {/* Destinataire */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Numéro de Téléphone du Parent :</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={unpaidReminderModalData.phone}
                    onChange={e => setUnpaidReminderModalData({ ...unpaidReminderModalData, phone: e.target.value })}
                    placeholder="Ex: +223 70 00 00 00"
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Texte du message avec choix de la langue */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 block">Message de Relance :</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchReminderLanguage('FR')}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 transition-colors cursor-pointer"
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchReminderLanguage('BAMBARA')}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 transition-colors cursor-pointer"
                    >
                      🇲🇱 Bambara
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={unpaidReminderModalData.messageText}
                  onChange={e => setUnpaidReminderModalData({ ...unpaidReminderModalData, messageText: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-[11px] leading-relaxed outline-none focus:bg-white focus:border-amber-500"
                />
              </div>

              {/* Boutons d'envoi direct */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendReminderViaWhatsApp}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Envoyer par WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendReminderViaSMS}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Envoyer par SMS</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReminderMessage}
                  className="w-full sm:w-auto py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {reminderCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{reminderCopied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5 : FICHE FINANCIÈRE DE L'ÉLÈVE
          ========================================================================= */}
      {selectedStudentForDetails && (() => {
        const std = selectedStudentForDetails;
        const stdClass = classes.find(c => c.id === std.classId);
        const stdPayments = payments.filter(p => p.studentId === std.id);
        const annualFee = getAnnualTuitionFee(stdClass, settings);
        const totalPaid = stdPayments.reduce((acc, p) => acc + p.amountPaid, 0);
        const remaining = Math.max(0, annualFee - totalPaid);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center uppercase">
                    {std.firstName[0]}{std.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {std.lastName.toUpperCase()} {std.firstName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Classe : {stdClass?.name} · Mat : {std.matricule}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDetails(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* 3 Cartes indicateurs */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Frais Scolaires</p>
                    <p className="text-sm font-bold font-mono text-slate-900 mt-1">{formatFCFA(annualFee)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] text-emerald-800 font-semibold uppercase">Total Versé</p>
                    <p className="text-sm font-bold font-mono text-emerald-700 mt-1">{formatFCFA(totalPaid)}</p>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <p className="text-[10px] text-rose-700 font-semibold uppercase">Reste Dû</p>
                    <p className="text-sm font-bold font-mono text-rose-700 mt-1">{formatFCFA(remaining)}</p>
                  </div>
                </div>

                {/* Historique des paiements de cet élève */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900 text-xs">Historique des Règlements ({stdPayments.length})</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentForDetails(null);
                        handleOpenAddForStudent(std);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter Versement</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-2.5">N° Reçu</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Motif</th>
                          <th className="p-2.5 text-right">Montant</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stdPayments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              Aucun versement enregistré pour cet élève.
                            </td>
                          </tr>
                        ) : (
                          stdPayments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                              <td className="p-2.5 text-slate-500">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td>
                              <td className="p-2.5 font-medium">{p.category} {p.monthCovered ? `(${p.monthCovered})` : ''}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">{formatFCFA(p.amountPaid)}</td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setReceiptModalPayment(p)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold cursor-pointer border border-slate-200"
                                  title="Visualiser la quittance officielle (format horizontal détaillé)"
                                >
                                  <Eye className="w-3 h-3 text-slate-600" />
                                  <span>Quittance</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDownloadStudentStatementPdf(std)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Relevé PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentForDetails(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modals de suppression */}
      {paymentToDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Supprimer ce reçu ?</h3>
            <p className="text-xs text-slate-600">
              Voulez-vous supprimer le reçu <strong>{paymentToDeleteModal.receiptNumber}</strong> ({formatFCFA(paymentToDeleteModal.amountPaid)}) ? Le solde de l'élève sera réajusté.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDeleteModal(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePayment(paymentToDeleteModal.id);
                  setPaymentToDeleteModal(null);
                  setSyncToast('Reçu supprimé avec succès.');
                  setTimeout(() => setSyncToast(null), 3000);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression dépense */}
      {expenseToDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Supprimer cette dépense ?</h3>
            <p className="text-xs text-slate-600">
              Voulez-vous supprimer la dépense <strong>{expenseToDeleteModal.reference}</strong> ({formatFCFA(expenseToDeleteModal.amount)}) ?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDeleteModal(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteExpenseConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification Reçu */}
      {paymentToEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Modifier Reçu N° {paymentToEditModal.receiptNumber}</h3>
            <form onSubmit={e => {
              e.preventDefault();
              updatePayment(paymentToEditModal);
              setPaymentToEditModal(null);
              setSyncToast('Reçu modifié avec succès.');
              setTimeout(() => setSyncToast(null), 3000);
            }} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Montant Versé (FCFA)</label>
                <input
                  type="number"
                  required
                  value={paymentToEditModal.amountPaid}
                  onChange={e => setPaymentToEditModal({ ...paymentToEditModal, amountPaid: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mois / Période</label>
                <input
                  type="text"
                  value={paymentToEditModal.monthCovered || ''}
                  onChange={e => setPaymentToEditModal({ ...paymentToEditModal, monthCovered: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentToEditModal(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Payments Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllPayments}
        title="Supprimer Tous les Paiements"
        itemCount={payments.length}
        description="Attention ! Cette action supprimera définitivement TOUS les reçus de paiement enregistrés dans la caisse."
      />

      {/* Modal Clôture de Caisse Journalière "À l'aveugle" */}
      {isClosureModalOpen && (
        <DailyCashClosureModal
          payments={payments}
          expenses={expenses}
          settings={settings}
          onSaveClosure={handleSaveClosure}
          onClose={() => setIsClosureModalOpen(false)}
        />
      )}

      {/* Modal Certificat Anti-Fraude & Vérification Reçu */}
      {selectedPaymentForVerification && (
        <ReceiptVerificationModal
          payment={selectedPaymentForVerification}
          settings={settings}
          onClose={() => setSelectedPaymentForVerification(null)}
        />
      )}

      {/* Modal Suppression PV de Clôture */}
      {closureToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 text-center">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supprimer ce Procès-Verbal ?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Voulez-vous supprimer le PV de clôture <strong>{closureToDelete.reference}</strong> ({new Date(closureToDelete.date).toLocaleDateString('fr-FR')}) de l'historique ?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClosureToDelete(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClosure(closureToDelete.id)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
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
