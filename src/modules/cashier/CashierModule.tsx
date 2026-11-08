/**
 * SomaSikolo / KalanGest - Module Caisse de l'Établissement
 * Dédié à la gestion de la trésorerie et de la caisse générale :
 * - Livre de Caisse & Journal des Encaissements (reçus, réimpression, vérification QR)
 * - Dépenses de fonctionnement (salaires vacataires, électricité EDM, fournitures, etc.)
 * - Solde Net Réel disponible en caisse (Recettes - Dépenses)
 * - Procès-Verbaux (PV) de Clôture Journalière de Caisse
 */

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Receipt, 
  MinusCircle, 
  Lock, 
  Download, 
  Search, 
  CheckCircle2, 
  Printer, 
  X, 
  Filter, 
  Trash2, 
  ShieldCheck, 
  Building2, 
  Check, 
  Calendar,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Payment, Expense, ExpenseCategory, DailyCashClosure } from '../../types';
import { formatFCFA } from '../../constants/maliEducation';
import { secureLocalStorage } from '../../services/secureStorage';
import { PdfService } from '../../services/pdfService';
import { cloudSyncService } from '../../services/cloudSyncService';
import { DailyCashClosureModal } from '../../components/payments/DailyCashClosureModal';
import { ReceiptVerificationModal } from '../../components/receipts/ReceiptVerificationModal';
import { HorizontalReceiptModal } from '../../components/receipts/HorizontalReceiptModal';

export const CashierModule: React.FC = () => {
  const { payments, settings, cloudSchoolCode } = useSchool();

  // Navigation interne simple de la caisse
  const [cashTab, setCashTab] = useState<'RECEIPTS' | 'EXPENSES' | 'CLOSURES'>('RECEIPTS');

  // Recherche dans le journal des reçus
  const [searchReceipts, setSearchReceipts] = useState('');

  // Gestion des dépenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      return secureLocalStorage.getJSON<Expense[]>('soma_expenses', [
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
        }
      ]);
    } catch {
      return [];
    }
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState<{
    category: ExpenseCategory;
    description: string;
    amount: number;
    expenseDate: string;
    beneficiary: string;
    paymentMethod: any;
    approvedBy: string;
  }>({
    category: 'SALAIRE',
    description: '',
    amount: 50000,
    expenseDate: new Date().toISOString().slice(0, 10),
    beneficiary: '',
    paymentMethod: 'ESPECES',
    approvedBy: 'Le Directeur Général'
  });
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseToDeleteModal, setExpenseToDeleteModal] = useState<Expense | null>(null);
  const [showDeleteAllExpensesModal, setShowDeleteAllExpensesModal] = useState(false);

  // Clôtures journalières de caisse
  const [closures, setClosures] = useState<DailyCashClosure[]>(() => {
    try {
      return secureLocalStorage.getJSON<DailyCashClosure[]>('kalangest_cash_closures', []);
    } catch {
      return [];
    }
  });
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);

  // Modals de visualisation & quittance
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'THERMAL' | 'A5'>('THERMAL');
  const [selectedPaymentForVerification, setSelectedPaymentForVerification] = useState<Payment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Indicateurs financiers globaux de la caisse
  const totalCollected = useMemo(() => {
    return payments.reduce((acc, curr) => acc + curr.amountPaid, 0);
  }, [payments]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const netBalance = totalCollected - totalExpenses;

  // Filtrage du journal des reçus
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

  // Enregistrement d'une nouvelle dépense
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqAmount = Number(expenseFormData.amount) || 0;
    if (reqAmount <= 0) {
      setExpenseError('Veuillez saisir un montant supérieur à 0 FCFA.');
      return;
    }
    // Règle stricte : la dépense ne peut pas être enregistrée si pas d'argent en caisse ou si montant > caisse
    if (netBalance <= 0) {
      setExpenseError(
        `Opération refusée : Le solde en caisse est actuellement nul ou négatif (${formatFCFA(netBalance)}). Le système interdit d'engager des dépenses sans recettes préalables en caisse.`
      );
      return;
    }
    if (reqAmount > netBalance) {
      setExpenseError(
        `Dépense refusée : Le montant demandé (${formatFCFA(reqAmount)}) dépasse le solde disponible en caisse (${formatFCFA(netBalance)}). Le système refuse toute dépense supérieure à la caisse.`
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

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    secureLocalStorage.setJSON('soma_expenses', updated);
    cloudSyncService.syncExpense(newExpense, cloudSchoolCode);
    setIsExpenseModalOpen(false);
    setExpenseFormData({
      category: 'SALAIRE',
      description: '',
      amount: 50000,
      expenseDate: new Date().toISOString().slice(0, 10),
      beneficiary: '',
      paymentMethod: 'ESPECES',
      approvedBy: 'Le Directeur Général'
    });
    setToastMessage(`Dépense de ${formatFCFA(newExpense.amount)} enregistrée.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Suppression d'une dépense
  const handleDeleteExpenseConfirm = () => {
    if (expenseToDeleteModal) {
      const updated = expenses.filter(e => e.id !== expenseToDeleteModal.id);
      setExpenses(updated);
      secureLocalStorage.setJSON('soma_expenses', updated);
      cloudSyncService.deleteExpense(expenseToDeleteModal.id, cloudSchoolCode);
      setExpenseToDeleteModal(null);
      setToastMessage('Dépense supprimée avec succès. Le solde de la caisse a été mis à jour.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Suppression de toutes les dépenses
  const handleDeleteAllExpensesConfirm = () => {
    expenses.forEach(e => {
      cloudSyncService.deleteExpense(e.id, cloudSchoolCode);
    });
    setExpenses([]);
    secureLocalStorage.setJSON('soma_expenses', []);
    setShowDeleteAllExpensesModal(false);
    setToastMessage('Toutes les dépenses ont été supprimées. Le solde de la caisse a été recalculé.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveClosure = (newClosure: DailyCashClosure) => {
    const updated = [newClosure, ...closures];
    setClosures(updated);
    secureLocalStorage.setJSON('kalangest_cash_closures', updated);
    setToastMessage(`Procès-Verbal N° ${newClosure.reference} enregistré.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Exports CSV
  const handleExportReceiptsCsv = () => {
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
    link.download = `Journal_Caisse_Encaissements_${new Date().toISOString().slice(0, 10)}.csv`;
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
    link.download = `Journal_Caisse_Depenses_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* Barre Unifiée Ultra-Compacte : Caisse & Trésorerie */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Title + Tabs */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
              <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline font-bold">Caisse</span>
            </div>

            {/* Onglets */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setCashTab('RECEIPTS')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  cashTab === 'RECEIPTS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>Reçus ({payments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCashTab('EXPENSES')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  cashTab === 'EXPENSES' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Dépenses ({expenses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCashTab('CLOSURES')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  cashTab === 'CLOSURES' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>PV Clôture ({closures.length})</span>
              </button>
            </div>

            {/* Inlined Search if Receipts */}
            {cashTab === 'RECEIPTS' && (
              <div className="relative flex-1 min-w-[150px] max-w-[280px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchReceipts}
                  onChange={e => setSearchReceipts(e.target.value)}
                  placeholder="N° reçu, élève..."
                  className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                />
                {searchReceipts && (
                  <button
                    type="button"
                    onClick={() => setSearchReceipts('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {cashTab === 'EXPENSES' && expenses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllExpensesModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
                title="Supprimer toutes les dépenses enregistrées"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Supprimer Tout ({expenses.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setExpenseError(null);
                setIsExpenseModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Dépense</span>
            </button>

            <button
              type="button"
              onClick={() => setIsClosureModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              title="Effectuer le contrôle et le PV de clôture journalière"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PV Clôture</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (cashTab === 'EXPENSES') handleExportExpensesCsv();
                else handleExportReceiptsCsv();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              title="Exporter les données de la caisse en CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Micro-synthèse de trésorerie en 1 ligne discrète */}
        <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
          <span>Recettes : <strong className="text-slate-900 font-mono">{formatFCFA(totalCollected)}</strong> ({payments.length})</span>
          <span aria-hidden="true">·</span>
          <span>Dépenses : <strong className="text-rose-700 font-mono">{formatFCFA(totalExpenses)}</strong> ({expenses.length})</span>
          <span aria-hidden="true">·</span>
          <span>Solde Net : <strong className={`font-mono font-bold ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatFCFA(netBalance)}</strong></span>
        </div>
      </div>

      {/* Message Toast */}
      {toastMessage && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. CONTENU ONGLET 1 : LIVRE DE CAISSE & REÇUS */}
      {cashTab === 'RECEIPTS' && (
        <div className="space-y-2">
          {/* Tableau des Écritures de Caisse */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">N° Quittance</th>
                    <th className="py-2 px-2.5">Date</th>
                    <th className="py-2 px-3">Élève & Matricule</th>
                    <th className="py-2 px-2.5">Classe</th>
                    <th className="py-2 px-2.5">Motif & Mode</th>
                    <th className="py-2 px-2.5 text-right">Montant Encaissé</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Aucun reçu trouvé dans le journal de caisse.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 sm:py-2 px-3 font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-slate-600 font-medium">
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-1.5 sm:py-2 px-3">
                          <p className="font-bold text-slate-900">{p.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule}</p>
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 font-semibold text-slate-700">
                          {p.className}
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5">
                          <span className="font-semibold text-slate-800">{p.category}</span>
                          {p.monthCovered && <span className="text-[10px] text-slate-500 block">{p.monthCovered}</span>}
                          <span className="text-[10px] text-slate-400 block font-mono">{p.method}</span>
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatFCFA(p.amountPaid)}
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Visualiser la quittance officielle (format horizontal détaillé)"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>Quittance</span>
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

      {/* 5. CONTENU ONGLET 2 : DÉPENSES DE FONCTIONNEMENT */}
      {cashTab === 'EXPENSES' && (
        <div className="space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Réf. Dépense</th>
                    <th className="py-2 px-2.5">Date</th>
                    <th className="py-2 px-2.5">Catégorie</th>
                    <th className="py-2 px-3">Description & Bénéficiaire</th>
                    <th className="py-2 px-2.5">Mode & Validation</th>
                    <th className="py-2 px-3 text-right">Montant (FCFA)</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Aucune dépense enregistrée.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 sm:py-2 px-3 font-mono font-bold text-slate-900">
                          {exp.reference}
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-slate-600 font-medium">
                          {new Date(exp.expenseDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 font-semibold text-slate-800">
                          {exp.category}
                        </td>
                        <td className="py-1.5 sm:py-2 px-3">
                          <p className="font-semibold text-slate-900 leading-tight">{exp.description}</p>
                          <p className="text-[10px] text-slate-500">Bénéficiaire : {exp.beneficiary}</p>
                        </td>
                        <td className="py-1.5 sm:py-2 px-2.5 text-slate-600">
                          <span className="font-mono text-[10px] block">{exp.paymentMethod}</span>
                          <span className="text-[10px] text-slate-400 block">Validé par : {exp.approvedBy}</span>
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 text-right font-mono font-bold text-rose-700 tabular-nums">
                          -{formatFCFA(exp.amount)}
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpenseToDeleteModal(exp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="Supprimer cette dépense et recréditer la caisse"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Supprimer</span>
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

      {/* 6. CONTENU ONGLET 3 : PROCÈS-VERBAUX DE CLÔTURE DE CAISSE */}
      {cashTab === 'CLOSURES' && (
        <div className="space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">N° PV Clôture</th>
                    <th className="py-2 px-2.5">Date & Heure</th>
                    <th className="py-2 px-2.5">Caissier</th>
                    <th className="py-2 px-2.5 text-right">Total Recettes</th>
                    <th className="py-2 px-2.5 text-right">Total Dépenses</th>
                    <th className="py-2 px-2.5 text-right">Solde Physique</th>
                    <th className="py-2 px-3 text-right">Écart & Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Aucun procès-verbal de clôture enregistré. Cliquez sur « Clôture Journalière (PV) » pour en créer un.
                      </td>
                    </tr>
                  ) : (
                    closures.map(c => {
                      const hasGap = c.gap !== 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 sm:py-2 px-3 font-mono font-bold text-slate-900">
                            {c.reference}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 text-slate-600 font-medium">
                            {c.closureDate} à {c.closureTime}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 font-semibold text-slate-800">
                            {c.cashierName}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatFCFA(c.totalReceiptsAmount)}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-rose-700 tabular-nums">
                            {formatFCFA(c.totalExpensesAmount)}
                          </td>
                          <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatFCFA(c.physicalCashCounted)}
                          </td>
                          <td className="py-1.5 sm:py-2 px-3 text-right">
                            <span className={`font-mono text-xs font-bold ${hasGap ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {hasGap ? `Écart: ${formatFCFA(c.gap)}` : 'Conforme (0 FCFA)'}
                            </span>
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

      {/* Modal d'Enregistrement de Dépense avec Refus Strict si Caisse Insuffisante */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Enregistrer une Dépense de Caisse</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Solde Disponible en Caisse */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              netBalance > 0 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div>
                <span className="font-bold text-xs block">Solde Réel Disponible en Caisse</span>
                <span className="text-[10px] text-slate-500">Recettes : {formatFCFA(totalCollected)} • Dépenses : {formatFCFA(totalExpenses)}</span>
              </div>
              <span className={`font-black font-mono text-sm ${netBalance > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatFCFA(Math.max(0, netBalance))}
              </span>
            </div>

            {/* RÈGLE STRICTE : REFUS SI CAISSE VIDE (netBalance <= 0) */}
            {netBalance <= 0 ? (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>⛔ OPÉRATION REFUSÉE : CAISSE VIDE (0 F CFA)</span>
                </div>
                <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                  Le système interdit formellement d'enregistrer une dépense si le solde de la caisse est nul ou insuffisant. 
                  Vous devez d'abord encaisser des frais scolaires pour réapprovisionner la trésorerie.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpenseModalOpen(false);
                    setCashTab('RECEIPTS');
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Fermer et Voir les Recettes / Reçus
                </button>
              </div>
            ) : (
              <>
                {expenseError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{expenseError}</span>
                  </div>
                )}

                <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Motif / Description *</label>
                    <input
                      type="text"
                      required
                      value={expenseFormData.description}
                      onChange={e => setExpenseFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Achat de craies blanches et registres"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 block">Montant (FCFA) *</label>
                        <button
                          type="button"
                          onClick={() => setExpenseFormData(prev => ({ ...prev, amount: netBalance }))}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          Max ({formatFCFA(netBalance)})
                        </button>
                      </div>
                      <input
                        type="number"
                        required
                        min="100"
                        step="500"
                        value={expenseFormData.amount}
                        onChange={e => setExpenseFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold outline-none focus:bg-white ${
                          Number(expenseFormData.amount) > netBalance
                            ? 'border-rose-400 text-rose-700 bg-rose-50/50'
                            : 'border-slate-200 text-slate-900'
                        }`}
                      />
                      {Number(expenseFormData.amount) > netBalance && (
                        <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-700 font-bold mt-1">
                          ⛔ Refus strict : Le montant dépasse les {formatFCFA(netBalance)} en caisse.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Catégorie</label>
                      <select
                        value={expenseFormData.category}
                        onChange={e => setExpenseFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                      >
                        <option value="SALAIRE">Salaires vacataires</option>
                        <option value="ELECTRICITE_EAU">Électricité EDM / Eau</option>
                        <option value="FOURNITURES">Fournitures & Craies</option>
                        <option value="CARBURANT">Carburant groupe</option>
                        <option value="REPARATION">Entretien & Travaux</option>
                        <option value="AUTRES">Autres dépenses</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Bénéficiaire</label>
                      <input
                        type="text"
                        value={expenseFormData.beneficiary}
                        onChange={e => setExpenseFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
                        placeholder="Nom du bénéficiaire"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Mode de règlement</label>
                      <select
                        value={expenseFormData.paymentMethod}
                        onChange={e => setExpenseFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                      >
                        <option value="ESPECES">Espèces</option>
                        <option value="ORANGE_MONEY">Orange Money</option>
                        <option value="MOOV_MONEY">Moov Money</option>
                        <option value="VIREMENT">Virement bancaire</option>
                        <option value="CHEQUE">Chèque</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsExpenseModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Valider la Dépense
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression Dépense Individuelle */}
      {expenseToDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Supprimer cette dépense ?</h3>
              <p className="text-xs text-slate-500">
                Voulez-vous supprimer la dépense <strong className="text-slate-800">{expenseToDeleteModal.reference}</strong> ({formatFCFA(expenseToDeleteModal.amount)}) ?
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg mt-2">
                Le montant sera immédiatement réintégré dans le solde de la caisse.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpenseToDeleteModal(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteExpenseConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression de TOUTES les Dépenses */}
      {showDeleteAllExpensesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Supprimer Toutes les Dépenses ?</h3>
              <p className="text-xs text-slate-500">
                Vous vous apprêtez à supprimer définitivement les <strong className="text-slate-800">{expenses.length} dépenses</strong> enregistrées pour un total de <strong className="text-rose-700">{formatFCFA(totalExpenses)}</strong>.
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg mt-2">
                Le solde net de la caisse sera immédiatement recrédité de {formatFCFA(totalExpenses)}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllExpensesModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAllExpensesConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Oui, Tout Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clôture Journalière de Caisse */}
      {isClosureModalOpen && (
        <DailyCashClosureModal
          isOpen={isClosureModalOpen}
          onClose={() => setIsClosureModalOpen(false)}
          payments={payments}
          expenses={expenses}
          cashierName="Caisse Principale"
          schoolName={settings.schoolName}
          onSaveClosure={handleSaveClosure}
        />
      )}

      {/* Modal Quittance Horizontale Haute Fidélité */}
      <HorizontalReceiptModal
        isOpen={Boolean(selectedReceipt)}
        payment={selectedReceipt}
        settings={settings}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
