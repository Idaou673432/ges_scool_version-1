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
  AlertCircle
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Payment, Expense, ExpenseCategory, DailyCashClosure } from '../../types';
import { formatFCFA } from '../../constants/maliEducation';
import { secureLocalStorage } from '../../services/secureStorage';
import { PdfService } from '../../services/pdfService';
import { cloudSyncService } from '../../services/cloudSyncService';
import { DailyCashClosureModal } from '../../components/payments/DailyCashClosureModal';
import { ReceiptVerificationModal } from '../../components/receipts/ReceiptVerificationModal';

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
    if (reqAmount > netBalance) {
      setExpenseError(
        `Dépense refusée : Le montant (${formatFCFA(reqAmount)}) dépasse le solde net disponible en caisse (${formatFCFA(Math.max(0, netBalance))}).`
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
    <div className="space-y-3.5 max-w-7xl mx-auto pb-12">
      {/* 1. Entête Compact de la Caisse */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Caisse & Trésorerie de l'Établissement
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Livre de caisse · Dépenses de fonctionnement · Clôtures journalières & PV
            </p>
          </div>
        </div>

        {/* Actions Rapides de la Caisse */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Enregistrer Dépense</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClosureModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Effectuer le contrôle et le PV de clôture journalière de caisse"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Clôture Journalière (PV)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (cashTab === 'EXPENSES') handleExportExpensesCsv();
              else handleExportReceiptsCsv();
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Exporter les données actuelles de la caisse en CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Message Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Synthèse Compacte de Trésorerie (1 seule ligne) */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Recettes Encaissées :</span>
          <span className="font-bold text-slate-900 font-mono">{formatFCFA(totalCollected)}</span>
          <span className="text-slate-400">({payments.length} quittances)</span>
        </div>
        <span className="hidden sm:inline text-slate-200">|</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Dépenses Réglées :</span>
          <span className="font-bold text-rose-700 font-mono">{formatFCFA(totalExpenses)}</span>
          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
            {expenses.length} dépenses
          </span>
        </div>
        <span className="hidden sm:inline text-slate-200">|</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Solde Net Disponible :</span>
          <span className={`font-bold font-mono ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatFCFA(netBalance)}
          </span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">(caisse & mobile money)</span>
        </div>
      </div>

      {/* 3. Barre Unifiée : Onglets + Recherche */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Onglets */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setCashTab('RECEIPTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              cashTab === 'RECEIPTS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>Livre de Caisse & Reçus ({payments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCashTab('EXPENSES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              cashTab === 'EXPENSES' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Dépenses ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCashTab('CLOSURES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              cashTab === 'CLOSURES' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>PV de Clôture ({closures.length})</span>
          </button>
        </div>

        {/* Recherche rapide intégrée sur la droite */}
        {cashTab === 'RECEIPTS' && (
          <div className="flex items-center gap-2 flex-1 md:justify-end">
            <div className="relative flex-1 md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchReceipts}
                onChange={e => setSearchReceipts(e.target.value)}
                placeholder="Rechercher par N° reçu, élève, classe..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
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
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">
              {filteredPayments.length} reçu{filteredPayments.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* 4. CONTENU ONGLET 1 : LIVRE DE CAISSE & REÇUS */}
      {cashTab === 'RECEIPTS' && (
        <div className="space-y-3">
          {/* Tableau des Écritures de Caisse */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">N° Quittance</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4">Élève & Matricule</th>
                    <th className="py-3 px-3">Classe</th>
                    <th className="py-3 px-3">Motif & Mode</th>
                    <th className="py-3 px-3 text-right">Montant Encaissé</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucun reçu trouvé dans le journal de caisse.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{p.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule}</p>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {p.className}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800">{p.category}</span>
                          {p.monthCovered && <span className="text-[11px] text-slate-500 block">{p.monthCovered}</span>}
                          <span className="text-[10px] text-slate-400 block font-mono">{p.method}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums text-sm">
                          {formatFCFA(p.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReceipt(p);
                                setReceiptFormat('THERMAL');
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Réimprimer le reçu thermique (80mm)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => PdfService.generateReceiptPdf(p, settings, 'download')}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Télécharger le reçu officiel en PDF A5 avec cachet"
                            >
                              <Download className="w-4 h-4" />
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
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Réf. Dépense</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-4">Description & Bénéficiaire</th>
                    <th className="py-3 px-3">Mode & Validation</th>
                    <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        Aucune dépense enregistrée.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {exp.reference}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {new Date(exp.expenseDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {exp.category}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{exp.description}</p>
                          <p className="text-[11px] text-slate-500">Bénéficiaire : {exp.beneficiary}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-mono text-[10px] block">{exp.paymentMethod}</span>
                          <span className="text-[10px] text-slate-400 block">Validé par : {exp.approvedBy}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 tabular-nums text-sm">
                          -{formatFCFA(exp.amount)}
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
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">N° PV Clôture</th>
                    <th className="py-3 px-3">Date & Heure</th>
                    <th className="py-3 px-3">Caissier</th>
                    <th className="py-3 px-3 text-right">Total Recettes</th>
                    <th className="py-3 px-3 text-right">Total Dépenses</th>
                    <th className="py-3 px-3 text-right">Solde Physique</th>
                    <th className="py-3 px-4 text-right">Écart & Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucun procès-verbal de clôture enregistré. Cliquez sur « Clôture Journalière (PV) » pour en créer un.
                      </td>
                    </tr>
                  ) : (
                    closures.map(c => {
                      const hasGap = c.gap !== 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {c.reference}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium">
                            {c.closureDate} à {c.closureTime}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {c.cashierName}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatFCFA(c.totalReceiptsAmount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 tabular-nums">
                            {formatFCFA(c.totalExpensesAmount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatFCFA(c.physicalCashCounted)}
                          </td>
                          <td className="py-3 px-4 text-right">
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

      {/* Modal d'Enregistrement de Dépense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Enregistrer une Dépense de Caisse</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

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
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Montant (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    step="500"
                    value={expenseFormData.amount}
                    onChange={e => setExpenseFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Valider la Dépense
                </button>
              </div>
            </form>
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

      {/* Modal Réimpression Reçu */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-xs">Quittance N° {selectedReceipt.receiptNumber}</span>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p><strong>Élève :</strong> {selectedReceipt.studentName}</p>
              <p><strong>Classe :</strong> {selectedReceipt.className}</p>
              <p><strong>Montant :</strong> <span className="font-mono font-bold text-emerald-700">{formatFCFA(selectedReceipt.amountPaid)}</span></p>
              <p><strong>Date :</strong> {new Date(selectedReceipt.paymentDate).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  PdfService.generateReceiptPosTicketPdf(selectedReceipt, settings, 'print');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Ticket (80mm)</span>
              </button>
              <button
                onClick={() => {
                  PdfService.generateReceiptPdf(selectedReceipt, settings, 'download');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF A5 Cachet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
