/**
 * SomaSikolo - Encaissements, Scolarité FCFA, Dépenses & Journal de Caisse
 */

import React, { useState } from 'react';
import { 
  CreditCard, Plus, Receipt, Download, Search, CheckCircle2, DollarSign, MessageCircle, Send, 
  Printer, FileText, Smartphone, X, Users, Filter, AlertCircle, XCircle, Clock, UserCheck, ArrowRight,
  FileSpreadsheet, TrendingUp, TrendingDown, PieChart, Wallet, MinusCircle, ArrowUpRight, ArrowDownRight,
  ShieldAlert, BellRing, FileCheck, Calendar, AlertTriangle, SendHorizontal, Sparkles, RefreshCw, Eye, Trash2, Edit3, Lock, Key, Save,
  Cloud, Laptop, Share2, Copy, Check, Phone, MessageSquare, ChevronDown, ChevronUp, EyeOff
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Payment, PaymentCategory, PaymentMethod, Student, Expense, ExpenseCategory, TuitionInvoice, InvoiceStatus } from '../../types';
import { formatFCFA, getAnnualTuitionFee, getEvaluationCountForClass, getMaliEvaluationTerms } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { CloudSchoolSwitcherModal } from '../../components/common/CloudSchoolSwitcherModal';
import { cloudSyncService } from '../../services/cloudSyncService';

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
    students, 
    classes, 
    recordPayment, 
    updatePayment, 
    deletePayment, 
    deleteAllPayments, 
    settings,
    cloudSchoolCode,
    syncStatus,
    syncStatusMessage,
    forceSyncPayments
  } = useSchool();
  const [activeTab, setActiveTab] = useState<'STUDENTS_FINANCES' | 'TRANSACTIONS' | 'EXPENSES' | 'INVOICES'>('STUDENTS_FINANCES');
  const [search, setSearch] = useState('');
  const [studentSearchGlobal, setStudentSearchGlobal] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'A_JOUR' | 'PARTIEL' | 'UNPAID'>('ALL');
  const [financialSort, setFinancialSort] = useState<'REMAINING_DESC' | 'NAME_ASC' | 'CLASS_ASC'>('REMAINING_DESC');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [isSyncingPayments, setIsSyncingPayments] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentSearchInModal, setStudentSearchInModal] = useState('');
  const [receiptModalPayment, setReceiptModalPayment] = useState<Payment | null>(null);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [paymentToDeleteModal, setPaymentToDeleteModal] = useState<Payment | null>(null);
  const [paymentToEditModal, setPaymentToEditModal] = useState<Payment | null>(null);

  // Factures & Échéances State
  const [globalDueDate, setGlobalDueDate] = useState('2025-11-10');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceClassFilter, setInvoiceClassFilter] = useState('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'EN_RETARD' | 'IMPAYE' | 'PARTIEL' | 'PAYE'>('ALL');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<TuitionInvoice | null>(null);
  const [isBatchReminderModalOpen, setIsBatchReminderModalOpen] = useState(false);
  const [batchReminderClassFilter, setBatchReminderClassFilter] = useState('ALL');
  
  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('soma_expenses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_EXPENSES;
  });
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToDeleteModal, setExpenseToDeleteModal] = useState<Expense | null>(null);
  const [showDeleteAllExpensesModal, setShowDeleteAllExpensesModal] = useState(false);
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
      const updated = expenses.filter(e => e.id !== expenseToDeleteModal.id);
      setExpenses(updated);
      localStorage.setItem('soma_expenses', JSON.stringify(updated));
      setExpenseToDeleteModal(null);
    }
  };

  const handleDeleteAllExpensesConfirm = () => {
    setExpenses([]);
    localStorage.removeItem('soma_expenses');
    setShowDeleteAllExpensesModal(false);
  };

  // WhatsApp Modals State
  const [whatsappModalPayment, setWhatsappModalPayment] = useState<{
    payment: Payment;
    phone: string;
    parentType: 'FATHER' | 'MOTHER' | 'CUSTOM';
  } | null>(null);

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
    fatherName: string;
    fatherPhone: string;
    motherName: string;
    motherPhone: string;
    phone: string;
    parentType: 'FATHER' | 'MOTHER' | 'CUSTOM';
    messageText: string;
  } | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  // User toggle for financial alert summary cards ("Masquer cette partie")
  const [showFinancialAlertCards, setShowFinancialAlertCards] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kalangest_show_financial_alert_cards') === 'true';
    } catch {
      return false; // Hidden by default so user sees the whole table immediately
    }
  });

  const toggleShowFinancialAlertCards = () => {
    setShowFinancialAlertCards(prev => {
      const next = !prev;
      try {
        localStorage.setItem('kalangest_show_financial_alert_cards', String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  const openWhatsAppModal = (p: Payment) => {
    const student = students.find(s => s.id === p.studentId);
    const initialPhone = student?.parent.fatherPhone || student?.parent.motherPhone || settings.phone;
    setWhatsappModalPayment({
      payment: p,
      phone: initialPhone,
      parentType: student?.parent.fatherPhone ? 'FATHER' : 'MOTHER'
    });
  };

  const handleSendWhatsApp = () => {
    if (!whatsappModalPayment) return;
    const { payment: p, phone } = whatsappModalPayment;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `*RÉCÉPISSÉ DE PAIEMENT SOMA SIKOLO*\n` +
      `----------------------------------------\n` +
      `📍 *Établissement:* ${settings.schoolName}\n` +
      `🧾 *N° Reçu:* ${p.receiptNumber}\n` +
      `👤 *Élève:* ${p.studentName} (${p.className})\n` +
      `🆔 *Matricule:* ${p.studentMatricule}\n` +
      `📚 *Motif:* ${p.category} ${p.monthCovered ? '- ' + p.monthCovered : ''}\n` +
      `💳 *Mode:* ${p.method}\n` +
      `----------------------------------------\n` +
      `💰 *Montant Versé:* ${formatFCFA(p.amountPaid)}\n` +
      `⚠️ *Reste à Payer:* ${formatFCFA(p.remainingAmount)}\n` +
      `----------------------------------------\n` +
      `👨‍💼 *Caissier:* ${p.cashierName}\n` +
      `📅 *Date:* ${new Date(p.paymentDate).toLocaleDateString('fr-FR')}\n\n` +
      `Merci d'avoir effectué votre règlement dans les délais.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    setWhatsappModalPayment(null);
  };

  const generateUnpaidReminderMessage = (
    studentName: string,
    matricule: string,
    className: string,
    remainingFee: number,
    totalPaid: number,
    annualFee: number
  ): string => {
    const ecole = settings.schoolName || 'Établissement Scolaire';
    const annee = settings.currentAcademicYear || '2025-2026';
    const contact = settings.phone || '';

    return (
      `*RAPPEL DE SCOLARITÉ - ${ecole.toUpperCase()}*\n` +
      `----------------------------------------\n` +
      `Bonjour Chers Parents / Tuteurs,\n\n` +
      `Nous vous contactons au sujet de la scolarité de l'élève :\n` +
      `👤 *${studentName}*\n` +
      `📚 Classe : *${className}*\n` +
      `🆔 Matricule : *${matricule}*\n` +
      `📅 Année Scolaire : *${annee}*\n\n` +
      `📊 *Situation Financière :*\n` +
      `• Montant total annuel exigible : ${formatFCFA(annualFee)}\n` +
      `• Montant déjà réglé : ${formatFCFA(totalPaid)}\n` +
      `⚠️ *SOLDE RESTANT À RÉGLER : ${formatFCFA(remainingFee)}*\n\n` +
      `Nous vous prions de bien vouloir régulariser ce solde auprès de la caisse de l'établissement ou par mobile money afin de permettre la continuité normale de ses études.\n\n` +
      (contact ? `📞 Contact Caisse & Direction : ${contact}\n` : '') +
      `Merci pour votre bonne compréhension et votre confiance.\n` +
      `----------------------------------------\n` +
      `_Direction - ${ecole}_`
    );
  };

  const handleOpenUnpaidReminder = (item: typeof studentsFinancials[0]) => {
    const fatherPhone = item.student.parent.fatherPhone || '';
    const motherPhone = item.student.parent.motherPhone || '';
    const fatherName = item.student.parent.fatherName || 'Père';
    const motherName = item.student.parent.motherName || 'Mère';
    const initialPhone = fatherPhone || motherPhone || settings.phone;
    const parentType: 'FATHER' | 'MOTHER' | 'CUSTOM' = fatherPhone ? 'FATHER' : (motherPhone ? 'MOTHER' : 'CUSTOM');
    const studentFullName = `${item.student.lastName.toUpperCase()} ${item.student.firstName}`;

    const defaultMsg = generateUnpaidReminderMessage(
      studentFullName,
      item.student.matricule,
      item.clsName,
      item.remaining,
      item.totalPaid,
      item.annualFee
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
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      phone: initialPhone,
      parentType,
      messageText: defaultMsg
    });
  };

  const handleSendReminderViaWhatsApp = () => {
    if (!unpaidReminderModalData) return;
    const cleanPhone = unpaidReminderModalData.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(unpaidReminderModalData.messageText);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setSyncToast(`Relance WhatsApp envoyée pour ${unpaidReminderModalData.studentName} !`);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleSendReminderViaSMS = () => {
    if (!unpaidReminderModalData) return;
    const cleanPhone = unpaidReminderModalData.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(unpaidReminderModalData.messageText);
    window.location.href = `sms:${cleanPhone}?body=${encoded}`;
    setSyncToast(`Application SMS ouverte pour ${unpaidReminderModalData.studentName} !`);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleCopyReminderMessage = () => {
    if (!unpaidReminderModalData) return;
    navigator.clipboard.writeText(unpaidReminderModalData.messageText);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2500);
  };

  const [formData, setFormData] = useState<Partial<Payment>>({
    studentId: students[0]?.id || '',
    category: 'MENSUALITE',
    monthCovered: 'Octobre 2025',
    amountPaid: 25000,
    expectedAmount: 25000,
    method: 'ESPECES',
    referenceNumber: '',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: settings.currentAcademicYear
  });

  // Financial calculations for ALL students
  const studentsFinancials = students.map(student => {
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

  // Filtered Students Financial List
  const filteredStudentsFinancials = studentsFinancials.filter(item => {
    const matchesSearch = 
      item.student.firstName.toLowerCase().includes(studentSearchGlobal.toLowerCase()) ||
      item.student.lastName.toLowerCase().includes(studentSearchGlobal.toLowerCase()) ||
      item.student.matricule.toLowerCase().includes(studentSearchGlobal.toLowerCase()) ||
      (item.student.parent.fatherPhone && item.student.parent.fatherPhone.includes(studentSearchGlobal)) ||
      (item.student.parent.motherPhone && item.student.parent.motherPhone.includes(studentSearchGlobal));

    const matchesClass = selectedClassFilter === 'ALL' || item.student.classId === selectedClassFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Dynamic sorting (Highest Debt first by default to flag urgent cases immediately)
  filteredStudentsFinancials.sort((a, b) => {
    if (financialSort === 'REMAINING_DESC') {
      return b.remaining - a.remaining || a.student.lastName.localeCompare(b.student.lastName);
    }
    if (financialSort === 'CLASS_ASC') {
      return a.clsName.localeCompare(b.clsName) || a.student.lastName.localeCompare(b.student.lastName);
    }
    return a.student.lastName.localeCompare(b.student.lastName);
  });

  const totalCollected = payments.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalCollected - totalExpenses;

  const totalExpectedRevenue = studentsFinancials.reduce((acc, curr) => acc + curr.annualFee, 0);
  const totalRemainingToCollect = studentsFinancials.reduce((acc, curr) => acc + curr.remaining, 0);
  const recoveryRate = totalExpectedRevenue > 0 ? Math.round((totalCollected / totalExpectedRevenue) * 100) : 0;

  const totalStudentsCount = students.length;
  const upToDateCount = studentsFinancials.filter(s => s.status === 'A_JOUR').length;
  const partialCount = studentsFinancials.filter(s => s.status === 'PARTIEL').length;
  const unpaidCount = studentsFinancials.filter(s => s.status === 'UNPAID').length;
  const unpaidTotal = studentsFinancials.filter(s => s.status === 'UNPAID').reduce((acc, curr) => acc + curr.remaining, 0);
  const partialTotal = studentsFinancials.filter(s => s.status === 'PARTIEL').reduce((acc, curr) => acc + curr.remaining, 0);

  // Computation of Automatic Tuition Invoices
  const todayStr = new Date().toISOString().slice(0, 10);

  const invoices: TuitionInvoice[] = studentsFinancials.map((item, idx) => {
    const parentPhone = item.student.parent.fatherPhone || item.student.parent.motherPhone || settings.phone;
    const parentName = item.student.parent.fatherName || item.student.parent.motherName || 'Parent / Tuteur';

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

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.studentName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                          inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                          inv.studentMatricule.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesClass = invoiceClassFilter === 'ALL' || inv.className === invoiceClassFilter ||
                         classes.find(c => c.id === invoiceClassFilter)?.name === inv.className;
    const matchesStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const overdueInvoicesCount = invoices.filter(i => i.status === 'EN_RETARD' || (i.remainingAmount > 0 && todayStr > i.dueDate)).length;
  const totalInvoicedOverdueAmount = invoices.reduce((acc, i) => acc + (i.remainingAmount > 0 ? i.remainingAmount : 0), 0);

  const handleSendInvoiceWhatsApp = (inv: TuitionInvoice) => {
    const cleanPhone = inv.parentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `*FACTURE DE SCOLARITÉ N° ${inv.invoiceNumber}*\n` +
      `----------------------------------------\n` +
      `📍 *Établissement:* ${settings.schoolName}\n` +
      `👤 *Élève:* ${inv.studentName} (${inv.className})\n` +
      `🆔 *Matricule:* ${inv.studentMatricule}\n` +
      `----------------------------------------\n` +
      `📋 *Description:* ${inv.description}\n` +
      `💰 *Montant Exigible:* ${formatFCFA(inv.totalAmount)}\n` +
      `✅ *Versements Effectués:* ${formatFCFA(inv.paidAmount)}\n` +
      `⚠️ *RESTE À PAYER:* ${formatFCFA(inv.remainingAmount)}\n` +
      `----------------------------------------\n` +
      `📅 *Date Échéance:* ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}\n` +
      `----------------------------------------\n` +
      `Veuillez effectuer le règlement à la caisse de l'établissement ou par Mobile Money (Orange Money / Moov Money).\n` +
      `Tél Caisse: ${settings.phone}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleSendOverdueReminderWhatsApp = (inv: TuitionInvoice) => {
    const cleanPhone = inv.parentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `*RAPPEL D'ÉCHÉANCE EN RETARD - ${settings.schoolName.toUpperCase()}*\n` +
      `----------------------------------------\n` +
      `📍 *Établissement:* ${settings.schoolName}\n` +
      `👤 *Élève:* ${inv.studentName} (${inv.className})\n` +
      `📄 *Facture N°:* ${inv.invoiceNumber}\n` +
      `----------------------------------------\n` +
      `🚨 *Date Limite Dépassée:* L'échéance était fixée au ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}.\n` +
      `⚠️ *Solde Impayé Restant:* ${formatFCFA(inv.remainingAmount)}\n` +
      `----------------------------------------\n` +
      `Chers parents, merci de vous présenter à la caisse dans les plus brefs délais afin d'éviter toute perturbation du suivi scolaire.\n\n` +
      `Merci pour votre coopération. Tél Caisse: ${settings.phone}`
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

  const handleSendReceiptWhatsApp = (p: Payment) => {
    const std = students.find(s => s.id === p.studentId);
    const parentPhone = std?.parent.fatherPhone || std?.parent.motherPhone || settings.phone;
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

  const handleDownloadStudentStatementPdf = (std: Student) => {
    const stdClass = classes.find(c => c.id === std.classId);
    const stdPayments = payments.filter(p => p.studentId === std.id);
    const annualFee = getAnnualTuitionFee(stdClass, settings);
    PdfService.generateStudentStatementPdf(std, stdClass, stdPayments, annualFee, settings);
  };

  const filteredPayments = payments.filter(p => 
    p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.studentName.toLowerCase().includes(search.toLowerCase()) ||
    p.studentMatricule.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAddForStudent = (targetStudent?: Student) => {
    const std = targetStudent || students[0];
    const defaultClass = classes.find(c => c.id === std?.classId);
    setStudentSearchInModal('');
    setFormData({
      studentId: std?.id || '',
      studentMatricule: std?.matricule || '',
      studentName: std ? `${std.firstName} ${std.lastName}` : '',
      className: defaultClass?.name || '',
      category: 'MENSUALITE',
      monthCovered: 'Octobre 2025',
      amountPaid: defaultClass?.monthlyFee || 25000,
      expectedAmount: defaultClass?.monthlyFee || 25000,
      method: 'ESPECES',
      cashierName: 'M. Ibrahim TRAORÉ',
      academicYear: settings.currentAcademicYear
    });
    setIsModalOpen(true);
  };

  const handleStudentSelect = (studentId: string) => {
    const std = students.find(s => s.id === studentId);
    const cls = classes.find(c => c.id === std?.classId);
    setFormData(prev => ({
      ...prev,
      studentId: std?.id,
      studentMatricule: std?.matricule,
      studentName: `${std?.firstName} ${std?.lastName}`,
      className: cls?.name,
      amountPaid: cls?.monthlyFee || 25000,
      expectedAmount: cls?.monthlyFee || 25000
    }));
  };

  const handleForceSync = async () => {
    setIsSyncingPayments(true);
    try {
      const ok = await forceSyncPayments();
      if (ok) {
        setSyncToast(`Paiements synchronisés en direct avec l'établissement [${cloudSchoolCode}] !`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    } finally {
      setIsSyncingPayments(false);
    }
  };

  const handleShareMobileSyncLink = () => {
    const link = cloudSyncService.getShareableLink(cloudSchoolCode);
    const text = encodeURIComponent(
      `🏫 *Accès Caisse & Paiements KalanGest - ${settings.schoolName || 'Établissement'}*\n\nVoici votre lien de synchronisation direct pour téléphone & PC :\n👉 ${link}\n\nCode Établissement : *${cloudSchoolCode}*\nTous vos règlements et reçus se synchronisent automatiquement en direct !`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPayment = recordPayment({
      ...formData,
      monthCovered: formData.monthCovered || '',
      referenceNumber: formData.referenceNumber || '',
      notes: formData.notes || ''
    });
    setIsModalOpen(false);
    setSyncToast(`Paiement N° ${newPayment.receiptNumber} (${formatFCFA(newPayment.amountPaid)}) enregistré et synchronisé en direct sur tous vos appareils !`);
    setTimeout(() => setSyncToast(null), 4500);
    // Au lieu de télécharger automatiquement, ouvrir la fenêtre d'action pour imprimer ou délivrer le reçu
    setReceiptModalPayment(newPayment);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      reference: `DEP-2025-${String(expenses.length + 1).padStart(3, '0')}`,
      category: expenseFormData.category || 'AUTRES',
      description: expenseFormData.description || 'Dépense courante',
      amount: Number(expenseFormData.amount) || 0,
      expenseDate: expenseFormData.expenseDate || new Date().toISOString().slice(0, 10),
      beneficiary: expenseFormData.beneficiary || 'Prestataire',
      paymentMethod: expenseFormData.paymentMethod || 'ESPECES',
      approvedBy: expenseFormData.approvedBy || 'Service Comptabilité'
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    localStorage.setItem('soma_expenses', JSON.stringify(updated));
    cloudSyncService.syncExpense(newExpense, cloudSchoolCode);
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
  };

  // CSV Exporters
  const handleExportStudentsCsv = () => {
    const headers = [
      'Matricule',
      'Nom & Prénoms',
      'Classe',
      'Frais Annuel (FCFA)',
      'Total Versé (FCFA)',
      'Solde Dû (FCFA)',
      'Statut',
      'Téléphone Parent'
    ];

    const rows = studentsFinancials.map(item => [
      `"${item.student.matricule}"`,
      `"${(item.student.lastName.toUpperCase() + ' ' + item.student.firstName).replace(/"/g, '""')}"`,
      `"${item.clsName}"`,
      item.annualFee,
      item.totalPaid,
      item.remaining,
      item.status === 'A_JOUR' ? 'À Jour' : item.status === 'PARTIEL' ? 'Solde Partiel' : 'Non Payé',
      `"${item.student.parent.fatherPhone || item.student.parent.motherPhone || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Situation_Financiere_Eleves_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTransactionsCsv = () => {
    const headers = [
      'N° Reçu',
      'Date',
      'Matricule',
      'Nom Élève',
      'Classe',
      'Motif',
      'Mode',
      'Montant Versé (FCFA)',
      'Reste Dû (FCFA)',
      'Caissier'
    ];

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
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Journal_Encaissements_Reçus_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExpensesCsv = () => {
    const headers = [
      'Référence',
      'Date',
      'Catégorie',
      'Description / Motif',
      'Bénéficiaire',
      'Montant (FCFA)',
      'Mode Règlement',
      'Approuvé Par'
    ];

    const rows = expenses.map(e => [
      `"${e.reference}"`,
      `"${new Date(e.expenseDate).toLocaleDateString('fr-FR')}"`,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.beneficiary.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.paymentMethod}"`,
      `"${e.approvedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Journal_Depenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInvoicesCsv = () => {
    const headers = [
      'N° Facture',
      'Matricule',
      'Nom Élève',
      'Classe',
      'Parent Tuteur',
      'Téléphone Parent',
      'Date Émission',
      'Date Échéance',
      'Total Exigible (FCFA)',
      'Déjà Payé (FCFA)',
      'Reste Dû (FCFA)',
      'Statut'
    ];

    const rows = filteredInvoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.studentMatricule}"`,
      `"${inv.studentName.replace(/"/g, '""')}"`,
      `"${inv.className}"`,
      `"${inv.parentName.replace(/"/g, '""')}"`,
      `"${inv.parentPhone}"`,
      `"${new Date(inv.issueDate).toLocaleDateString('fr-FR')}"`,
      `"${new Date(inv.dueDate).toLocaleDateString('fr-FR')}"`,
      inv.totalAmount,
      inv.paidAmount,
      inv.remainingAmount,
      inv.status === 'PAYE' ? 'Réglé' : inv.status === 'EN_RETARD' ? 'En Retard' : inv.status === 'PARTIEL' ? 'Solde Partiel' : 'Non Payé'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Factures_Scolarite_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-blue-900" />
            <span>Gestion Financière, Caisse & Scolarités</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Suivi des encaissements en FCFA • Reçus officiels • Dépenses • Bilans & Relances directes
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {payments.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Supprimer Tout ({payments.length})</span>
            </button>
          )}

          <button
            onClick={() => handleOpenAddForStudent()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nouveau Règlement</span>
          </button>
          
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
          >
            <MinusCircle className="w-4 h-4 text-rose-600" />
            <span>Enregistrer Dépense</span>
          </button>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Financial Balance & KPI Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recettes Total */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Recettes Encaissées</p>
              <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{formatFCFA(totalCollected)}</p>
            </div>
          </div>
        </div>

        {/* Dépenses Total */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Dépenses</p>
              <p className="text-lg font-black text-rose-700 font-mono mt-0.5">{formatFCFA(totalExpenses)}</p>
            </div>
          </div>
        </div>

        {/* Solde Net de Caisse */}
        <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl text-white shadow-sm flex items-center justify-between border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/10">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-300 tracking-wider">Solde Net en Caisse</p>
              <p className={`text-lg font-black mt-0.5 font-mono ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatFCFA(netBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Reste à Recouvrer & Progress Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Reste à Recouvrer</p>
              <p className="text-lg font-black text-amber-700 font-mono mt-0.5">{formatFCFA(totalRemainingToCollect)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
              {recoveryRate}%
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
              <span>Recouvrement Global</span>
              <span>{totalStudentsCount - unpaidCount}/{totalStudentsCount} régularisés</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, recoveryRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('STUDENTS_FINANCES')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'STUDENTS_FINANCES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Situation Financière ({students.length})</span>
            {(unpaidCount + partialCount) > 0 && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                activeTab === 'STUDENTS_FINANCES' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                <span>{unpaidCount + partialCount}</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Journal de Caisse ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'EXPENSES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <MinusCircle className="w-4 h-4" />
            <span>Dépenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'INVOICES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Factures ({invoices.length})</span>
            {overdueInvoicesCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-md">
                {overdueInvoicesCount}
              </span>
            )}
          </button>
        </div>

        {/* Dynamic CSV Export Button based on active tab */}
        {activeTab === 'STUDENTS_FINANCES' && (
          <button
            onClick={handleExportStudentsCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
            title="Exporter la situation financière de tous les élèves en CSV Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Scolarités (CSV)</span>
          </button>
        )}

        {activeTab === 'INVOICES' && (
          <button
            onClick={handleExportInvoicesCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
            title="Exporter le registre des factures de scolarité en CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Export Factures (CSV)</span>
          </button>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <button
            onClick={handleExportTransactionsCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
            title="Exporter l'historique des reçus de caisse en CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exporter Encaissements (CSV)</span>
          </button>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="flex items-center gap-2">
            {expenses.length > 0 && (
              <button
                onClick={() => setShowDeleteAllExpensesModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer Tout ({expenses.length})</span>
              </button>
            )}
            <button
              onClick={handleExportExpensesCsv}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-widest rounded-full border border-slate-200 transition-all cursor-pointer"
              title="Exporter le journal des dépenses en CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-rose-600" />
              <span>Exporter Dépenses (CSV)</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: Situation Financière de TOUS les Élèves */}
      {activeTab === 'STUDENTS_FINANCES' && (
        <div className="space-y-4">
          {/* Quick Header & Toggle Bar for Impayés ("Masquer cette partie") */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 px-5 py-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Impayés & Retards :
              </span>
              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full flex items-center gap-1 shadow-2xs">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>{unpaidCount} Retard(s) Critique(s) (0 FCFA)</span>
              </span>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{partialCount} Solde(s) Partiel(s)</span>
              </span>
              <span className="text-xs font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                Reste dû : {formatFCFA(unpaidTotal + partialTotal)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleShowFinancialAlertCards}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title={showFinancialAlertCards ? "Masquer cette partie pour libérer tout l'espace d'affichage" : "Afficher les 3 cartes de synthèse des impayés"}
              >
                {showFinancialAlertCards ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>Masquer cette partie</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-blue-900" />
                    <span>Afficher la synthèse</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsBatchReminderModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Relancer en lot les parents par WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Relance WhatsApp ({unpaidCount + partialCount})</span>
              </button>
            </div>
          </div>

          {/* Centre de Notifications Visuelles pour Retards & Impayés (Affichage facultatif / masquable) */}
          {showFinancialAlertCards && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
              {/* Carte 1: Alerte Critique - 0 FCFA Versé */}
              <div 
                onClick={() => setStatusFilter(statusFilter === 'UNPAID' ? 'ALL' : 'UNPAID')}
                className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  statusFilter === 'UNPAID'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500 shadow-md'
                    : 'bg-white border-rose-100 hover:border-rose-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600"></span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Alerte Retard Critique</span>
                        <h3 className="text-2xl font-black text-rose-950 mt-0.5">{unpaidCount} Élève{unpaidCount > 1 ? 's' : ''}</h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-xs animate-pulse">
                      0 FCFA Versé
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 font-bold mt-3">
                    Élèves n'ayant encore effectué aucun paiement pour l'année scolaire en cours.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Total découvert impayé :</span>
                  <span className="font-black text-rose-700 font-mono text-sm">{formatFCFA(unpaidTotal)}</span>
                </div>
              </div>

              {/* Carte 2: Attention - Soldes Partiels Incomplets */}
              <div 
                onClick={() => setStatusFilter(statusFilter === 'PARTIEL' ? 'ALL' : 'PARTIEL')}
                className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  statusFilter === 'PARTIEL'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500 shadow-md'
                    : 'bg-white border-amber-100 hover:border-amber-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Soldes Partiels en Attente</span>
                        <h3 className="text-2xl font-black text-amber-950 mt-0.5">{partialCount} Élève{partialCount > 1 ? 's' : ''}</h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black rounded-full uppercase tracking-wider">
                      Solde Dû
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 font-bold mt-3">
                    Élèves ayant versé un acompte mais avec des mensualités en souffrance.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Reste à recouvrer :</span>
                  <span className="font-black text-amber-700 font-mono text-sm">{formatFCFA(partialTotal)}</span>
                </div>
              </div>

              {/* Carte 3: Actions Express & Relances Directes */}
              <div className="p-6 rounded-[2rem] border border-blue-900 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-sky-300 tracking-wider flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                        Actions de Recouvrement
                      </span>
                      <h3 className="text-xl font-black text-white mt-1">
                        {unpaidCount + partialCount} Dossiers en Retard
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                      <ShieldAlert className="w-5 h-5 text-amber-300" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Envoyez un rappel automatique WhatsApp aux parents d'élèves en retard ou imprimez les relevés de compte.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchReminderModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Relancer par WhatsApp ({unpaidCount + partialCount})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search input by Student Name / Matricule */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchGlobal}
                  onChange={e => setStudentSearchGlobal(e.target.value)}
                  placeholder="Saisir le nom, prénom, matricule ou téléphone du parent..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                />
                {studentSearchGlobal && (
                  <button
                    onClick={() => setStudentSearchGlobal('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Class Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="ALL">Toutes les Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status & Sort Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">Statut :</span>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tous ({studentsFinancials.length})
                </button>
                <button
                  onClick={() => setStatusFilter('UNPAID')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'UNPAID' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>🚨 Retard Critique ({unpaidCount})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('PARTIEL')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'PARTIEL' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>⏳ Solde Partiel ({partialCount})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('A_JOUR')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === 'A_JOUR' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  ✅ À Jour ({upToDateCount})
                </button>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Trier :</span>
                <select
                  value={financialSort}
                  onChange={(e) => setFinancialSort(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
                >
                  <option value="REMAINING_DESC">🚨 Plus gros impayés d'abord</option>
                  <option value="NAME_ASC">Nom Élève (A-Z)</option>
                  <option value="CLASS_ASC">Classe</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Financial Table with Visual Notifications */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-xs">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <th className="py-3.5 px-6">Élève & Matricule</th>
                    <th className="py-3.5 px-3">Classe</th>
                    <th className="py-3.5 px-3">Total Payé (FCFA)</th>
                    <th className="py-3.5 px-3">Reste Dû (FCFA)</th>
                    <th className="py-3.5 px-3">Statut & Échéance</th>
                    <th className="py-3.5 px-3">Parent Contact</th>
                    <th className="py-3.5 px-6 text-right sticky right-0 bg-slate-50/95 backdrop-blur-xs z-20 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-bold text-slate-700">
                  {filteredStudentsFinancials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-bold">
                        Aucun élève trouvé pour ces critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentsFinancials.map(item => {
                      const isCriticalUnpaid = item.status === 'UNPAID';
                      const isPartial = item.status === 'PARTIEL';
                      const isUpToDate = item.status === 'A_JOUR';

                      return (
                        <tr 
                          key={item.student.id} 
                          className={`border-b transition-colors ${
                            isCriticalUnpaid 
                              ? 'border-b-rose-100 bg-rose-50/20 hover:bg-rose-50/40 border-l-4 border-l-rose-500' 
                              : isPartial 
                              ? 'border-b-amber-100 bg-amber-50/15 hover:bg-amber-50/30 border-l-4 border-l-amber-500' 
                              : 'border-b-slate-50 hover:bg-slate-50/50 border-l-4 border-l-emerald-500'
                          }`}
                        >
                          <td className="py-3.5 px-6">
                            <div 
                              onClick={() => setSelectedStudentForDetails(item.student)}
                              className="flex items-center gap-3 cursor-pointer group"
                              title="Cliquer pour ouvrir la fiche financière détaillée"
                            >
                              <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center uppercase transition-colors shrink-0 ${
                                isCriticalUnpaid
                                  ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-500 animate-pulse'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400/60'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.student.firstName[0]}{item.student.lastName[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                                    {item.student.lastName.toUpperCase()} {item.student.firstName}
                                  </p>
                                  {isCriticalUnpaid && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>0 FCFA Versé</span>
                                    </span>
                                  )}
                                  {isPartial && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 text-amber-700" />
                                      <span>Solde Dû</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Mat: {item.student.matricule}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-bold text-slate-800">
                            <div>{item.clsName}</div>
                            <div className="text-[10px] font-bold text-slate-400">
                              {item.evalCount} mensualité{item.evalCount > 1 ? 's' : ''} ({formatFCFA(item.annualFee)})
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-black text-emerald-700">
                            <div className="flex items-center justify-between text-xs">
                              <span>{formatFCFA(item.totalPaid)}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{item.percentPaid}%</span>
                            </div>
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${isUpToDate ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${item.percentPaid}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className={`font-black font-mono text-sm block ${
                              isCriticalUnpaid ? 'text-rose-600 font-black' : isPartial ? 'text-amber-700' : 'text-slate-400'
                            }`}>
                              {formatFCFA(item.remaining)}
                            </span>
                            {isCriticalUnpaid && (
                              <span className="text-[9px] font-extrabold text-rose-600 flex items-center gap-1 uppercase tracking-tight">
                                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                Totalité Impayée
                              </span>
                            )}
                            {isPartial && (
                              <span className="text-[9px] font-bold text-amber-700 flex items-center gap-1 uppercase tracking-tight">
                                Reste à verser
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            {isUpToDate && (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                À Jour (100%)
                              </span>
                            )}
                            {isPartial && (
                              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700" />
                                <span>Solde Partiel ({item.percentPaid}%)</span>
                              </span>
                            )}
                            {isCriticalUnpaid && (
                              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm inline-flex items-center gap-1.5 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5 text-white" />
                                <span>Retard Critique</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-xs font-mono text-slate-500">
                            <span className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                              {item.student.parent.fatherPhone || item.student.parent.motherPhone || 'Non renseigné'}
                            </span>
                          </td>

                          <td className="py-3.5 px-6 text-right sticky right-0 bg-white/95 backdrop-blur-xs z-10 border-l border-slate-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              {item.remaining > 0 && (
                                <button
                                  onClick={() => handleOpenAddForStudent(item.student)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                                  title="Encaisser un versement pour cet élève"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Encaisser</span>
                                </button>
                              )}

                              {item.remaining > 0 && (
                                <button
                                  onClick={() => handleOpenUnpaidReminder(item)}
                                  className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 shrink-0"
                                  title="Générer automatiquement un message type pour WhatsApp ou SMS rappelant le solde restant à régler"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-amber-800" />
                                  <span>Relancer</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedStudentForDetails(item.student)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                title="Consulter l'historique complet des paiements et la fiche financière de l'élève"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-900" />
                                <span>Fiche</span>
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

      {/* TAB 2: Historique des Reçus de Caisse */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par N° Reçu, Nom de l'Élève, Matricule..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                    <th className="py-4 px-8">N° Reçu</th>
                    <th className="py-4 px-4">Élève & Matricule</th>
                    <th className="py-4 px-4">Catégorie</th>
                    <th className="py-4 px-4">Mode</th>
                    <th className="py-4 px-4">Versé (FCFA)</th>
                    <th className="py-4 px-4">Solde Dû</th>
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-8 text-right">Actions Reçu</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-bold text-slate-700">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-8 font-mono font-black text-blue-900">
                        <div className="flex items-center gap-2">
                          <span>{p.receiptNumber}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Synchronisé en direct avec le Cloud Firebase">
                            <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Cloud</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{p.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule} ({p.className})</p>
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-800">
                        {p.category} {p.monthCovered ? `(${p.monthCovered})` : ''}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-slate-600">{p.method}</td>
                      <td className="py-4 px-4 font-black text-emerald-700">{formatFCFA(p.amountPaid)}</td>
                      <td className="py-4 px-4 font-black text-rose-600">{formatFCFA(p.remainingAmount)}</td>
                      <td className="py-4 px-4 text-xs text-slate-400">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td>
                      <td className="py-4 px-8 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openWhatsAppModal(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            title="Envoyer le reçu au parent via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => setReceiptModalPayment(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-full font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            title="Imprimer / Télécharger Reçu (Format A5, A4, Ticket POS)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimer Reçu</span>
                          </button>
                          <button
                            onClick={() => setPaymentToEditModal(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-full font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            title="Modifier les informations de ce reçu de paiement"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => setPaymentToDeleteModal(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            title="Supprimer ce reçu de paiement de la comptabilité"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
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

      {/* TAB 3: Journal des Dépenses & Charges */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                    <th className="py-4 px-8">N° Référence</th>
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4">Catégorie</th>
                    <th className="py-4 px-4">Description / Motif</th>
                    <th className="py-4 px-4">Bénéficiaire</th>
                    <th className="py-4 px-4">Montant (FCFA)</th>
                    <th className="py-4 px-4">Mode</th>
                    <th className="py-4 px-4 text-right">Approuvé par</th>
                    <th className="py-4 px-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-bold text-slate-700">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-bold">
                        Aucune dépense enregistrée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-8 font-mono font-black text-rose-900">{exp.reference}</td>
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(exp.expenseDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-100">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">{exp.description}</td>
                        <td className="py-4 px-4 text-xs font-medium text-slate-600">{exp.beneficiary}</td>
                        <td className="py-4 px-4 font-black text-rose-700">{formatFCFA(exp.amount)}</td>
                        <td className="py-4 px-4 text-xs font-bold text-slate-500">{exp.paymentMethod}</td>
                        <td className="py-4 px-4 text-right text-xs text-slate-500 font-mono">{exp.approvedBy}</td>
                        <td className="py-4 px-8 text-right">
                          <button
                            onClick={() => setExpenseToDeleteModal(exp)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Supprimer cette dépense"
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

      {/* TAB 4: Module Facturation Automatique & Échéances */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6">
          {/* Controls Bar & Global Due Date Setter */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-900" />
                  <span>Module Facturation Automatique & Échéances</span>
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Génération automatisée des factures de scolarité basées sur les encaissements & relances d'échéances
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl">
                  <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-[10px] font-black uppercase text-rose-900 tracking-wider">Échéance Globale:</span>
                  <input
                    type="date"
                    value={globalDueDate}
                    onChange={e => setGlobalDueDate(e.target.value)}
                    className="bg-white border border-rose-200 rounded-lg px-2 py-1 text-xs font-black text-rose-900 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setIsBatchReminderModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Relances Impayés ({overdueInvoicesCount})</span>
                </button>

                <button
                  onClick={handleDownloadBatchInvoicesPdf}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger PDF (Filtre / Classe)</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  placeholder="Rechercher par n° facture, nom d'élève, matricule..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 rounded-2xl">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={invoiceClassFilter}
                  onChange={e => setInvoiceClassFilter(e.target.value)}
                  className="w-full bg-transparent py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Toutes les Classes ({classes.length})</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.level})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl overflow-x-auto">
                {(['ALL', 'EN_RETARD', 'IMPAYE', 'PARTIEL', 'PAYE'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setInvoiceStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                      invoiceStatusFilter === st
                        ? st === 'EN_RETARD' ? 'bg-rose-600 text-white' : st === 'PAYE' ? 'bg-emerald-600 text-white' : 'bg-blue-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Toutes' : st === 'EN_RETARD' ? 'En Retard' : st === 'IMPAYE' ? 'Impayées' : st === 'PARTIEL' ? 'Partielles' : 'Réglées'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invoices KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Factures Générées</p>
              <p className="text-xl font-black text-slate-900 mt-1">{invoices.length} Factures</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{formatFCFA(totalExpectedRevenue)} Exigibles</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Encaissé sur Factures</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{formatFCFA(totalCollected)}</p>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">{recoveryRate}% Taux de Recouvrement</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-rose-100 bg-rose-50/20 shadow-sm">
              <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Factures En Retard / Impayées
              </p>
              <p className="text-xl font-black text-rose-600 mt-1">{overdueInvoicesCount} Factures</p>
              <p className="text-xs font-bold text-rose-700 mt-0.5">{formatFCFA(totalInvoicedOverdueAmount)} à recouvrer</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date Limite de Paiement</p>
                <p className="text-base font-black text-slate-900 mt-1">
                  {new Date(globalDueDate).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {todayStr > globalDueDate ? '⚠️ Échéance Échue' : 'En cours de délai'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center font-black">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Factures de Scolarité ({filteredInvoices.length})</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                Génération automatique basée sur la scolarité annuelle et l'historique de caisse
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="p-4 pl-6">N° Facture & Date</th>
                    <th className="p-4">Élève & Matricule</th>
                    <th className="p-4">Classe</th>
                    <th className="p-4">Parent & Contact</th>
                    <th className="p-4">Montant Total</th>
                    <th className="p-4">Déjà Versé</th>
                    <th className="p-4">Reste À Payer</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 pr-6 text-right">Actions Facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                        Aucune facture ne correspond à vos critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const std = students.find(s => s.id === inv.studentId);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 pl-6">
                            <span className="font-black text-blue-900 block">{inv.invoiceNumber}</span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Échéance: {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-slate-900 block">{inv.studentName}</span>
                            <span className="text-[10px] font-bold text-slate-400">{inv.studentMatricule}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-black text-slate-700 text-[10px]">
                              {inv.className}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{inv.parentName}</span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-emerald-600" />
                              {inv.parentPhone}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-900">
                            {formatFCFA(inv.totalAmount)}
                          </td>
                          <td className="p-4 font-black text-emerald-600">
                            {formatFCFA(inv.paidAmount)}
                          </td>
                          <td className="p-4 font-black text-rose-600">
                            {formatFCFA(inv.remainingAmount)}
                          </td>
                          <td className="p-4">
                            {inv.status === 'PAYE' && (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Réglée
                              </span>
                            )}
                            {inv.status === 'EN_RETARD' && (
                              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> En Retard
                              </span>
                            )}
                            {inv.status === 'PARTIEL' && (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Solde Partiel
                              </span>
                            )}
                            {inv.status === 'IMPAYE' && (
                              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" /> Non Payée
                              </span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadSingleInvoicePdf(inv)}
                                className="p-2 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                title="Télécharger la facture en PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Preview Modal */}
                              <button
                                onClick={() => setSelectedInvoiceForModal(inv)}
                                className="p-2 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                title="Aperçu visuel de la facture"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Invoice */}
                              <button
                                onClick={() => handleSendInvoiceWhatsApp(inv)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                                title="Envoyer la facture par WhatsApp au Parent"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {/* Overdue Reminder WhatsApp */}
                              {inv.remainingAmount > 0 && (
                                <button
                                  onClick={() => handleSendOverdueReminderWhatsApp(inv)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                  title="Envoyer une notification de rappel d'échéance"
                                >
                                  <BellRing className="w-4 h-4" />
                                </button>
                              )}

                              {/* Direct Payment Action */}
                              {inv.remainingAmount > 0 && std && (
                                <button
                                  onClick={() => handleOpenAddForStudent(std)}
                                  className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                  title="Encaisser un versement pour cette facture"
                                >
                                  <Plus className="w-3 h-3" /> Encaisser
                                </button>
                              )}
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

      {/* Modal - Nouveau Règlement avec filtre par nom d'élève */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Nouveau Reçu de Caisse FCFA
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    Encaissement et génération automatique du récépissé
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Searchable Student Field */}
              <div className="space-y-2">
                <label className="font-black text-slate-700 uppercase tracking-wider text-[10px]">
                  Saisir / Rechercher le nom de l'Élève *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={studentSearchInModal}
                    onChange={e => setStudentSearchInModal(e.target.value)}
                    placeholder="Tapez le nom de l'élève pour filtrer la liste..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 font-bold text-slate-900"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 divide-y divide-slate-100 p-1">
                  {students
                    .filter(s => {
                      if (!studentSearchInModal) return true;
                      const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
                      const query = studentSearchInModal.toLowerCase();
                      return fullName.includes(query) || s.matricule.toLowerCase().includes(query);
                    })
                    .map(s => {
                      const isSelected = formData.studentId === s.id;
                      const sClass = classes.find(c => c.id === s.classId);
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleStudentSelect(s.id)}
                          className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-blue-900 text-white font-bold' : 'hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">
                              {s.lastName.toUpperCase()} {s.firstName}
                            </p>
                            <p className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                              Matricule: {s.matricule} • Classe: {sClass?.name || 'N/A'}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="font-black text-slate-700 uppercase tracking-wider text-[10px]">Motif du Règlement *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as PaymentCategory })}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900 text-xs"
                >
                  <option value="INSCRIPTION">Frais d'Inscription / Réinscription</option>
                  <option value="MENSUALITE">Mensualité de Scolarité</option>
                  <option value="CANTINE">Service Cantine</option>
                  <option value="TRANSPORT">Service Transport Scolaire</option>
                  <option value="UNIFORME">Tenue / Uniforme Scolaire</option>
                </select>
              </div>

              {/* Mois / Évaluation Couverte */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-black text-slate-700 uppercase tracking-wider text-[10px]">Mois / Évaluation Couverte</label>
                  {(() => {
                    const selStd = students.find(s => s.id === formData.studentId);
                    const selCls = classes.find(c => c.id === selStd?.classId);
                    const selEvalCount = getEvaluationCountForClass(selCls?.category, settings);
                    return selCls ? (
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {selEvalCount} mensualité(s) ({selCls.name})
                      </span>
                    ) : null;
                  })()}
                </div>
                <input
                  type="text"
                  value={formData.monthCovered || ''}
                  onChange={e => setFormData({ ...formData, monthCovered: e.target.value })}
                  placeholder="Ex: Évaluation N°1 (Octobre)"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900 text-xs"
                />

                {formData.category === 'MENSUALITE' && (() => {
                  const selStd = students.find(s => s.id === formData.studentId);
                  const selCls = classes.find(c => c.id === selStd?.classId);
                  const selEvalCount = getEvaluationCountForClass(selCls?.category, settings);
                  const terms = getMaliEvaluationTerms(settings.evaluationMonths, selEvalCount).filter(t => t.category === 'EVALUATION_MENSUELLE');
                  return (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500">Choix rapide de l'évaluation :</p>
                      <div className="flex flex-wrap gap-1.5">
                        {terms.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, monthCovered: t.shortLabel })}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              formData.monthCovered === t.shortLabel
                                ? 'bg-blue-900 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {t.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-700 uppercase tracking-wider text-[10px]">Montant Versé FCFA *</label>
                  <input
                    type="number"
                    required
                    value={formData.amountPaid}
                    onChange={e => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-700 uppercase tracking-wider text-[10px]">Montant Attendu FCFA *</label>
                  <input
                    type="number"
                    required
                    value={formData.expectedAmount}
                    onChange={e => setFormData({ ...formData, expectedAmount: Number(e.target.value) })}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-black text-slate-700 uppercase tracking-wider text-[10px]">Mode de Règlement *</label>
                <select
                  value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                >
                  <option value="ESPECES">Espèces (Caisse)</option>
                  <option value="ORANGE_MONEY">Orange Money Mali</option>
                  <option value="MOOV_MONEY">Moov Money (Sotelma)</option>
                  <option value="CHEQUE">Chèque BDM / BNDA / BOA</option>
                  <option value="VIREMENT">Virement BTP / BNDA</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
                >
                  Valider & Générer Reçu PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Enregistrer une Dépense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 text-rose-800 rounded-2xl flex items-center justify-center">
                  <MinusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Enregistrer une Dépense
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    Saisie d'un décaissement de caisse ou frais de fonctionnement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">Catégorie de Dépense *</label>
                <select
                  value={expenseFormData.category}
                  onChange={e => setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                >
                  <option value="SALAIRE">Salaires & Vacations Enseignants</option>
                  <option value="ELECTRICITE_EAU">Factures Électricité (EDM) & Eau</option>
                  <option value="FOURNITURES">Fournitures Scolaires & Rames</option>
                  <option value="CARBURANT">Carburant Groupe & Transport</option>
                  <option value="MAINTENANCE">Entretien & Reparation Locaux</option>
                  <option value="EQUIPEMENT">Achat Équipement & Mobilier</option>
                  <option value="EVENEMENT">Fêtes & Événements Établissement</option>
                  <option value="AUTRES">Autres Charges Diverses</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">Description / Motif Détaillé *</label>
                <input
                  type="text"
                  required
                  value={expenseFormData.description}
                  onChange={e => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  placeholder="Ex: Acompte salaire enseignants vacataires 9ème année..."
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">Montant FCFA *</label>
                  <input
                    type="number"
                    required
                    value={expenseFormData.amount}
                    onChange={e => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-rose-700 font-black text-sm"
                  />
                </div>

                <div>
                  <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">Bénéficiaire *</label>
                  <input
                    type="text"
                    required
                    value={expenseFormData.beneficiary}
                    onChange={e => setExpenseFormData({ ...expenseFormData, beneficiary: e.target.value })}
                    placeholder="Ex: EDM-SA, Prestataire, Nom enseignant..."
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">Mode Règlement *</label>
                  <select
                    value={expenseFormData.paymentMethod}
                    onChange={e => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MOOV_MONEY">Moov Money</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement BTP / BNDA</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">Approuvé Par *</label>
                  <input
                    type="text"
                    required
                    value={expenseFormData.approvedBy}
                    onChange={e => setExpenseFormData({ ...expenseFormData, approvedBy: e.target.value })}
                    placeholder="Ex: Le Directeur Général"
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-rose-600/30 transition-all"
                >
                  Valider la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Format Receipt & Direct Printing Modal */}
      {receiptModalPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-6 md:p-8 space-y-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-wider inline-block mb-1">
                    Paiement Enregistré avec Succès
                  </span>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Reçu N° {receiptModalPayment.receiptNumber}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Élève : <span className="font-bold text-slate-900">{receiptModalPayment.studentName}</span> • Classe : <span className="font-bold text-slate-900">{receiptModalPayment.className}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptModalPayment(null)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Récapitulatif Rapide */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Montant Encaissé</p>
                <p className="text-lg font-black text-emerald-700">{formatFCFA(receiptModalPayment.amountPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Motif / Période</p>
                <p className="text-xs font-black text-slate-800">{receiptModalPayment.category} {receiptModalPayment.monthCovered ? `(${receiptModalPayment.monthCovered})` : ''}</p>
              </div>
            </div>

            {/* SECTION 1: IMPRESSION DIRECTE */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-900" />
                <span>1. Impression Directe (Caisse / Élève)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Imprimer Ticket POS 80mm */}
                <button
                  onClick={() => {
                    PdfService.generateReceiptPosTicketPdf(receiptModalPayment, settings, 'print');
                  }}
                  className="p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300 rounded-2xl transition-all text-left cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-black uppercase text-amber-900">Ticket Thermique POS (80mm)</span>
                    </div>
                    <p className="text-[10px] text-amber-800/80 font-medium leading-tight">
                      Imprime directement sur imprimante à reçu de caisse rapide (avec cachet)
                    </p>
                  </div>
                  <Printer className="w-4 h-4 text-amber-800 group-hover:scale-110 transition-transform shrink-0 ml-2" />
                </button>

                {/* Imprimer Reçu A5 Officiel avec Cachet */}
                <button
                  onClick={() => {
                    PdfService.generateReceiptPdf(receiptModalPayment, settings, 'print');
                  }}
                  className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-300 rounded-2xl transition-all text-left cursor-pointer group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-900" />
                      <span className="text-xs font-black uppercase text-blue-950">Reçu A5 avec Cachet</span>
                    </div>
                    <p className="text-[10px] text-blue-900/80 font-medium leading-tight">
                      Format standard A5 paysage avec cachet et signature de l'établissement
                    </p>
                  </div>
                  <Printer className="w-4 h-4 text-blue-900 group-hover:scale-110 transition-transform shrink-0 ml-2" />
                </button>
              </div>

              {/* Imprimer A4 Grand Format */}
              <button
                onClick={() => {
                  PdfService.generateReceiptA4Pdf(receiptModalPayment, settings, 'print');
                }}
                className="w-full p-3.5 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl transition-all text-left cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Printer className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Imprimer Grand Format A4 Officiel</h4>
                    <p className="text-[10px] text-slate-300 font-medium">Reçu complet A4 avec en-tête de l'État, logo et cachet d'établissement</p>
                  </div>
                </div>
                <Printer className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* SECTION 2: TÉLÉCHARGEMENT PDF & PARTAGE */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-700" />
                <span>2. Téléchargement & Envoi WhatsApp</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    PdfService.generateReceiptPdf(receiptModalPayment, settings, 'download');
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-900" />
                  <span>Télécharger A5</span>
                </button>

                <button
                  onClick={() => {
                    PdfService.generateReceiptPosTicketPdf(receiptModalPayment, settings, 'download');
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-amber-700" />
                  <span>Télécharger POS</span>
                </button>

                <button
                  onClick={() => {
                    PdfService.generateReceiptA4Pdf(receiptModalPayment, settings, 'download');
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Télécharger A4</span>
                </button>
              </div>

              {/* Bouton WhatsApp */}
              <button
                onClick={() => {
                  const paymentToShare = receiptModalPayment;
                  setReceiptModalPayment(null);
                  handleSendReceiptWhatsApp(paymentToShare);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Partager le Reçu via WhatsApp au Parent</span>
              </button>
            </div>

            <div className="pt-2 text-center border-t border-slate-100">
              <button
                onClick={() => setReceiptModalPayment(null)}
                className="px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-full cursor-pointer transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal - Reçu */}
      {whatsappModalPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Envoi Reçu via WhatsApp
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    Transmission directe au tuteur légal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalPayment(null)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-slate-700 uppercase tracking-wider text-[10px] font-black">
                  Numéro WhatsApp Destinataire *
                </label>
                <div className="relative mt-1.5">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={whatsappModalPayment.phone}
                    onChange={e => setWhatsappModalPayment({ ...whatsappModalPayment, phone: e.target.value })}
                    placeholder="Ex: +223 76 00 00 00"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-2 text-emerald-950">
                <p className="font-black uppercase text-[10px] tracking-wider text-emerald-800">Aperçu du Récépissé :</p>
                <p className="text-xs font-bold">Élève: {whatsappModalPayment.payment.studentName}</p>
                <p className="text-xs">Reçu N°: <span className="font-mono font-bold">{whatsappModalPayment.payment.receiptNumber}</span></p>
                <p className="text-xs">Montant Versé: <span className="font-black text-emerald-800">{formatFCFA(whatsappModalPayment.payment.amountPaid)}</span></p>
                <p className="text-xs">Reste Dû: <span className="font-black text-rose-600">{formatFCFA(whatsappModalPayment.payment.remainingAmount)}</span></p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setWhatsappModalPayment(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Ouvrir WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal - Visual Preview of Tuition Invoice */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-8 space-y-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center font-black">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Aperçu Facture de Scolarité
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    N° {selectedInvoiceForModal.invoiceNumber} • Année {selectedInvoiceForModal.academicYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-black uppercase text-blue-900">{settings.schoolName}</p>
                  <p className="text-[10px] text-slate-500">{settings.address}</p>
                  <p className="text-[10px] text-slate-500">Tél: {settings.phone}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-blue-900 text-white font-black text-[10px] rounded-full uppercase">
                    {selectedInvoiceForModal.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Élève & Matricule</span>
                  <p className="text-slate-900 font-black text-sm">{selectedInvoiceForModal.studentName}</p>
                  <p className="text-slate-500">{selectedInvoiceForModal.studentMatricule} ({selectedInvoiceForModal.className})</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Parent / Tuteur</span>
                  <p className="text-slate-900">{selectedInvoiceForModal.parentName}</p>
                  <p className="text-emerald-700 flex items-center gap-1 mt-0.5">
                    <Smartphone className="w-3 h-3" /> {selectedInvoiceForModal.parentPhone}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600">Frais d'Études / Scolarité Annuelle:</span>
                  <span className="text-slate-900 font-black">{formatFCFA(selectedInvoiceForModal.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Versements Déjà Effectués:</span>
                  <span className="font-black">- {formatFCFA(selectedInvoiceForModal.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-2 text-rose-600">
                  <span>Solde Impayé Restant À Payer:</span>
                  <span>{formatFCFA(selectedInvoiceForModal.remainingAmount)}</span>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Date d'échéance exigible : {new Date(selectedInvoiceForModal.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
              >
                Fermer
              </button>
              
              <button
                onClick={() => handleDownloadSingleInvoicePdf(selectedInvoiceForModal)}
                className="flex-1 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF</span>
              </button>

              <button
                onClick={() => handleSendInvoiceWhatsApp(selectedInvoiceForModal)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Parent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Batch Reminder Notification Modal */}
      {isBatchReminderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-8 space-y-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-black">
                  <BellRing className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Relances WhatsApp pour Impayés
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    Envoi groupé ou ciblé de notifications d'échéance impayée
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchReminderModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-700">Filtrer les relances par Classe:</span>
                <select
                  value={batchReminderClassFilter}
                  onChange={e => setBatchReminderClassFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="ALL">Toutes les classes ({classes.length})</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 text-xs space-y-1 text-rose-950 font-bold">
                <p className="font-black text-rose-900 uppercase text-[10px]">Information Relances :</p>
                <p>
                  • {invoices.filter(i => i.remainingAmount > 0 && (batchReminderClassFilter === 'ALL' || i.className === batchReminderClassFilter)).length} élève(s) concerné(s) par un solde restant dû.
                </p>
                <p>
                  • Cliquez sur le bouton WhatsApp d'un élève pour ouvrir directement le message de relance personnalisé.
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {invoices
                  .filter(i => i.remainingAmount > 0 && (batchReminderClassFilter === 'ALL' || i.className === batchReminderClassFilter))
                  .map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                      <div>
                        <span className="font-black text-slate-900 text-xs block">{inv.studentName}</span>
                        <span className="text-[10px] font-bold text-slate-400">{inv.className} • Impayé: <strong className="text-rose-600">{formatFCFA(inv.remainingAmount)}</strong></span>
                      </div>
                      <button
                        onClick={() => handleSendOverdueReminderWhatsApp(inv)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Relancer</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsBatchReminderModalOpen(false)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Fiche Financière & Historique Détaillé de l'Élève */}
      {selectedStudentForDetails && (() => {
        const std = selectedStudentForDetails;
        const stdClass = classes.find(c => c.id === std.classId);
        const stdPayments = payments.filter(p => p.studentId === std.id);
        const evalCount = getEvaluationCountForClass(stdClass?.category, settings);
        const annualFee = getAnnualTuitionFee(stdClass, settings);
        const totalPaid = stdPayments.reduce((acc, p) => acc + p.amountPaid, 0);
        const remaining = Math.max(0, annualFee - totalPaid);
        const percentPaid = annualFee > 0 ? Math.min(100, Math.round((totalPaid / annualFee) * 100)) : 0;
        const parentPhone = std.parent.fatherPhone || std.parent.motherPhone || settings.phone;
        const parentName = std.parent.fatherName || std.parent.motherName || 'Parent / Tuteur';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100 max-h-[92vh] overflow-y-auto">
              
              {/* Header Profile */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl font-black text-xl flex items-center justify-center uppercase shadow-lg shadow-blue-900/20 shrink-0">
                    {std.firstName[0]}{std.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 uppercase">
                        {std.lastName.toUpperCase()} {std.firstName}
                      </h2>
                      <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full font-black text-[10px] uppercase font-bold">
                        {stdClass?.name || 'Classe non renseignée'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      Matricule: <strong className="font-mono text-slate-800">{std.matricule}</strong> • Année Scolaire: {settings.currentAcademicYear}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-emerald-600" /> Parent: {parentName} ({parentPhone})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleDownloadStudentStatementPdf(std)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
                    title="Télécharger le relevé financier officiel au format PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Relevé PDF</span>
                  </button>

                  <button
                    onClick={() => setSelectedStudentForDetails(null)}
                    className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Frais Scolaires Annuel</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{formatFCFA(annualFee)}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{evalCount} mensualité(s) due(s) ({formatFCFA(stdClass?.monthlyFee || 25000)}/mois)</p>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Total Encaissé / Versé</p>
                  <p className="text-lg font-black text-emerald-700 mt-1">{formatFCFA(totalPaid)}</p>
                  <p className="text-[10px] font-bold text-emerald-800 mt-0.5">{stdPayments.length} versement(s) effectué(s)</p>
                </div>

                <div className={`p-4 rounded-2xl border ${remaining > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    Solde Restant Dû
                  </p>
                  <p className={`text-lg font-black mt-1 ${remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatFCFA(remaining)}
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${remaining > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {remaining > 0 ? 'Relance possible' : 'Scolarité soldée'}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Statut Règlement</p>
                  <div className="mt-1">
                    {remaining <= 0 ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> À Jour
                      </span>
                    ) : totalPaid > 0 ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 font-black text-[10px] rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Solde Partiel
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 font-black text-[10px] rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Impayé
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{percentPaid}% Honoré</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Progression des Versements de Scolarité:</span>
                  <span className="font-black text-blue-900">{percentPaid}% ({formatFCFA(totalPaid)} / {formatFCFA(annualFee)})</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                    style={{ width: `${percentPaid}%` }}
                  />
                </div>
              </div>

              {/* Transaction History Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-900" />
                    <span>Historique Complet des Transactions ({stdPayments.length})</span>
                  </h3>

                  <button
                    onClick={() => {
                      setSelectedStudentForDetails(null);
                      handleOpenAddForStudent(std);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase rounded-full shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Nouveau Versement
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="p-3 pl-4">N° Reçu</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Motif / Catégorie</th>
                          <th className="p-3">Mode</th>
                          <th className="p-3 text-right">Montant Versé</th>
                          <th className="p-3 text-right">Reste Dû</th>
                          <th className="p-3">Caissier</th>
                          <th className="p-3 pr-4 text-right">Actions Reçu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {stdPayments.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                              Aucun reçu enregistré pour cet élève.
                            </td>
                          </tr>
                        ) : (
                          stdPayments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 pl-4 font-mono font-black text-blue-900">{p.receiptNumber}</td>
                              <td className="p-3 text-slate-600">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td>
                              <td className="p-3 font-black text-slate-900">
                                {p.category} {p.monthCovered ? `(${p.monthCovered})` : ''}
                              </td>
                              <td className="p-3 text-slate-600">{p.method}</td>
                              <td className="p-3 text-right font-black text-emerald-600">{formatFCFA(p.amountPaid)}</td>
                              <td className="p-3 text-right font-black text-rose-600">{formatFCFA(p.remainingAmount)}</td>
                              <td className="p-3 text-slate-500 text-[11px]">{p.cashierName}</td>
                              <td className="p-3 pr-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Imprimer / Délivrer le Reçu */}
                                  <button
                                    onClick={() => setReceiptModalPayment(p)}
                                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                                    title="Imprimer ou Télécharger le Reçu (POS, A5, A4)"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-blue-900" />
                                    <span className="text-[10px] uppercase font-black">Imprimer</span>
                                  </button>

                                  {/* WhatsApp Reçu */}
                                  <button
                                    onClick={() => handleSendReceiptWhatsApp(p)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Partager le reçu par WhatsApp au parent"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Modifier Reçu */}
                                  <button
                                    onClick={() => setPaymentToEditModal(p)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border border-amber-200"
                                    title="Modifier les détails de ce reçu de paiement"
                                  >
                                    <Edit3 className="w-3 h-3 text-amber-700" />
                                    <span>Modifier</span>
                                  </button>

                                  {/* Supprimer Reçu */}
                                  <button
                                    onClick={() => setPaymentToDeleteModal(p)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                                    title="Supprimer ce reçu de paiement"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Supprimer</span>
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

              {/* Action Buttons Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadStudentStatementPdf(std)}
                    className="px-5 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Imprimer Relevé Financier (PDF)</span>
                  </button>

                  {remaining > 0 && (
                    <button
                      onClick={() => {
                        const stdFinancial = studentsFinancials.find(f => f.student.id === std.id);
                        if (stdFinancial) handleOpenUnpaidReminder(stdFinancial);
                      }}
                      className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95"
                      title="Générer automatiquement un message type pour WhatsApp ou SMS rappelant le solde restant à régler"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Relancer (WhatsApp / SMS)</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedStudentForDetails(null)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL SUPPRESSION REÇU / PAIEMENT */}
      {paymentToDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  Supprimer le Reçu de Paiement
                </h3>
                <p className="text-xs font-bold text-slate-400 font-mono mt-0.5">
                  N° {paymentToDeleteModal.receiptNumber}
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Élève:</span>
                <span className="font-black text-slate-900">{paymentToDeleteModal.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Catégorie:</span>
                <span className="font-black text-slate-900">{paymentToDeleteModal.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Montant Versé:</span>
                <span className="font-black text-rose-700">{formatFCFA(paymentToDeleteModal.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Date:</span>
                <span className="font-bold text-slate-700">{new Date(paymentToDeleteModal.paymentDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              ⚠️ <strong>Attention :</strong> La suppression de ce reçu réajustera le solde de la scolarité de l'élève et retirera cette transaction du journal de caisse. Cette action est irréversible.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDeleteModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePayment(paymentToDeleteModal.id);
                  setPaymentToDeleteModal(null);
                }}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Oui, Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION DU REÇU / PAIEMENT */}
      {paymentToEditModal && (
        <EditPaymentModalInner
          payment={paymentToEditModal}
          onClose={() => setPaymentToEditModal(null)}
          onSave={(updated) => {
            updatePayment(updated);
            setPaymentToEditModal(null);
          }}
          settings={settings}
        />
      )}

      {/* MODAL SUPPRESSION DÉPENSE */}
      {expenseToDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  Supprimer la Dépense
                </h3>
                <p className="text-xs font-bold text-slate-400 font-mono mt-0.5">
                  Réf: {expenseToDeleteModal.reference}
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Catégorie:</span>
                <span className="font-black text-slate-900">{expenseToDeleteModal.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Description:</span>
                <span className="font-black text-slate-900 line-clamp-1">{expenseToDeleteModal.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Montant:</span>
                <span className="font-black text-rose-700">{formatFCFA(expenseToDeleteModal.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-600">Bénéficiaire:</span>
                <span className="font-bold text-slate-700">{expenseToDeleteModal.beneficiary}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              ⚠️ Cette action supprimera la dépense du journal de caisse de façon permanente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDeleteModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteExpenseConfirm}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Oui, Supprimer</span>
              </button>
            </div>
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

      {/* Delete All Expenses Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllExpensesModal}
        onClose={() => setShowDeleteAllExpensesModal(false)}
        onConfirm={handleDeleteAllExpensesConfirm}
        title="Supprimer Tout le Journal des Dépenses"
        itemCount={expenses.length}
        description="Attention ! Cette action supprimera définitivement TOUTES les dépenses enregistrées dans le journal de caisse."
      />

      {/* MODAL DE RELANCE IMPAYÉ (WHATSAPP & SMS) */}
      {unpaidReminderModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100 my-8 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200">
                  <BellRing className="w-6 h-6 text-amber-700 animate-bounce" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full font-black text-[10px] uppercase tracking-wider inline-block mb-1">
                    Relance Scolarité & Solde Impayé
                  </span>
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    Rappel de Solde Restant Dû
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Élève : <strong className="text-blue-950">{unpaidReminderModalData.studentName}</strong> • Classe : <strong className="text-blue-950">{unpaidReminderModalData.className}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUnpaidReminderModalData(null)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-rose-700 tracking-wider">
                    Solde Restant à Régler
                  </p>
                  <p className="text-2xl font-black text-rose-700 font-mono">
                    {formatFCFA(unpaidReminderModalData.remainingFee)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                    unpaidReminderModalData.status === 'UNPAID'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {unpaidReminderModalData.status === 'UNPAID' ? '🚨 0 FCFA Versé (Retard Total)' : `⏳ Partiel (${unpaidReminderModalData.percentPaid}% versé)`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-rose-200/50 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Frais Scolaires Annuels</span>
                  <span className="font-black text-slate-800 font-mono">{formatFCFA(unpaidReminderModalData.annualFee)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Déjà Encaissé</span>
                  <span className="font-black text-emerald-700 font-mono">{formatFCFA(unpaidReminderModalData.totalPaid)}</span>
                </div>
              </div>
            </div>

            {/* Recipient Selection (Father / Mother / Custom) */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                Destinataire de la relance (Parent / Tuteur)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Père */}
                <button
                  type="button"
                  onClick={() => {
                    const phone = unpaidReminderModalData.fatherPhone || '';
                    setUnpaidReminderModalData(prev => prev ? ({ ...prev, parentType: 'FATHER', phone }) : null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    unpaidReminderModalData.parentType === 'FATHER'
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/30'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-blue-900">👨 Père : {unpaidReminderModalData.fatherName || 'Père'}</span>
                  <span className="text-xs font-mono font-bold text-slate-700 mt-1 truncate">
                    {unpaidReminderModalData.fatherPhone || 'Non renseigné'}
                  </span>
                </button>

                {/* Mère */}
                <button
                  type="button"
                  onClick={() => {
                    const phone = unpaidReminderModalData.motherPhone || '';
                    setUnpaidReminderModalData(prev => prev ? ({ ...prev, parentType: 'MOTHER', phone }) : null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    unpaidReminderModalData.parentType === 'MOTHER'
                      ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-600/30'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-purple-900">👩 Mère : {unpaidReminderModalData.motherName || 'Mère'}</span>
                  <span className="text-xs font-mono font-bold text-slate-700 mt-1 truncate">
                    {unpaidReminderModalData.motherPhone || 'Non renseigné'}
                  </span>
                </button>

                {/* Personnalisé */}
                <button
                  type="button"
                  onClick={() => {
                    setUnpaidReminderModalData(prev => prev ? ({ ...prev, parentType: 'CUSTOM' }) : null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    unpaidReminderModalData.parentType === 'CUSTOM'
                      ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900/30'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase">✏️ Autre Numéro</span>
                  <span className="text-xs font-mono font-bold mt-1">Numéro libre</span>
                </button>
              </div>

              {/* Input for Phone Number */}
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={unpaidReminderModalData.phone}
                  onChange={e => {
                    const val = e.target.value;
                    setUnpaidReminderModalData(prev => prev ? ({ ...prev, phone: val }) : null);
                  }}
                  placeholder="Numéro de téléphone (Ex: +223 76 00 00 00)"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            {/* Generated Message Text Preview & Customization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Message Type Rappelant le Solde Restant (Modifiable)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const fresh = generateUnpaidReminderMessage(
                      unpaidReminderModalData.studentName,
                      unpaidReminderModalData.matricule,
                      unpaidReminderModalData.className,
                      unpaidReminderModalData.remainingFee,
                      unpaidReminderModalData.totalPaid,
                      unpaidReminderModalData.annualFee
                    );
                    setUnpaidReminderModalData(prev => prev ? ({ ...prev, messageText: fresh }) : null);
                  }}
                  className="text-[10px] font-black uppercase text-blue-900 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                  title="Réinitialiser le texte par défaut"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rétablir message type</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={unpaidReminderModalData.messageText}
                onChange={e => {
                  const val = e.target.value;
                  setUnpaidReminderModalData(prev => prev ? ({ ...prev, messageText: val }) : null);
                }}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-blue-900 resize-y"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                💡 Vous pouvez ajouter les comptes de paiement Orange Money, Moov Money ou une date limite avant d'envoyer.
              </p>
            </div>

            {/* Action Buttons: WhatsApp, SMS, Copier, Fermer (Sticky bottom so always fully visible) */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5 z-10">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleSendReminderViaWhatsApp}
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Envoyer par WhatsApp</span>
              </button>

              {/* SMS Button */}
              <button
                type="button"
                onClick={handleSendReminderViaSMS}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Envoyer par SMS</span>
              </button>

              {/* Copy Message */}
              <button
                type="button"
                onClick={handleCopyReminderMessage}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                title="Copier le texte dans le presse-papier"
              >
                {reminderCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{reminderCopied ? 'Copié !' : 'Copier'}</span>
              </button>

              {/* Fermer */}
              <button
                type="button"
                onClick={() => setUnpaidReminderModalData(null)}
                className="w-full sm:w-auto py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud School Switcher Modal */}
      <CloudSchoolSwitcherModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
      />
    </div>
  );
};

// Component local pour l'édition de paiement
const EditPaymentModalInner: React.FC<{
  payment: Payment;
  onClose: () => void;
  onSave: (payment: Payment) => void;
  settings: any;
}> = ({ payment, onClose, onSave, settings }) => {
  const [formData, setFormData] = useState<Payment>({ ...payment });
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPin = settings.adminPassword || '0022390070321';
    if (pinCodeInput && pinCodeInput !== expectedPin) {
      setPinError(true);
      return;
    }
    const expected = Number(formData.expectedAmount) || 0;
    const paid = Number(formData.amountPaid) || 0;
    const remaining = Math.max(0, expected - paid);

    onSave({
      ...formData,
      amountPaid: paid,
      expectedAmount: expected,
      remainingAmount: remaining
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center shrink-0">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">
                Modifier le Reçu de Paiement
              </h3>
              <p className="text-xs font-bold text-slate-400 font-mono mt-0.5">
                N° {payment.receiptNumber} • {payment.studentName} ({payment.className})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie de Paiement</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as PaymentCategory })}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="INSCRIPTION">Inscription / Réinscription</option>
                <option value="MENSUALITE">Mensualité / Scolarité</option>
                <option value="CANTINE">Cantine Scolaire</option>
                <option value="TRANSPORT">Transport / Bus</option>
                <option value="UNIFORME">Tenue / Uniforme</option>
                <option value="LIVRES">Fournitures & Livres</option>
                <option value="AUTRES">Frais Divers</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mois / Période Couverte</label>
              <input
                type="text"
                value={formData.monthCovered || ''}
                onChange={e => setFormData({ ...formData, monthCovered: e.target.value })}
                placeholder="Ex: Octobre 2025, Trimestre 1"
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Montant Versé (FCFA) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.amountPaid}
                onChange={e => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                className="w-full mt-1.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Montant Attendu / Tarif (FCFA)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.expectedAmount}
                onChange={e => setFormData({ ...formData, expectedAmount: Number(e.target.value) })}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode de Paiement</label>
              <select
                value={formData.method}
                onChange={e => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="ESPECES">Espèces (Caisse)</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MOOV_MONEY">Moov Money / Moov Africa</option>
                <option value="CHEQUE">Chèque BANCAIRE</option>
                <option value="VIREMENT">Virement BNI / BDM</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">N° Référence / Trans. ID</label>
              <input
                type="text"
                value={formData.referenceNumber || ''}
                onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="Ex: MP251024.1840.A049"
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date du Paiement</label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Caissier / Comptable</label>
              <input
                type="text"
                value={formData.cashierName}
                onChange={e => setFormData({ ...formData, cashierName: e.target.value })}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarques / Observations</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes complémentaires ou ajustement de caisse..."
              className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Validation Code PIN Optionnel */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Code PIN Sécurité Administrateur (Optionnel)</span>
              </label>
            </div>
            <input
              type="password"
              value={pinCodeInput}
              onChange={e => {
                setPinCodeInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Saisissez le code PIN de validation..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
            />
            {pinError && (
              <p className="text-[11px] font-bold text-rose-600">
                Code PIN administrateur incorrect.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
