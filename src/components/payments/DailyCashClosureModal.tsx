/**
 * SomaSikolo / KalanGest - Modal Clôture de Caisse Journalière "À l'aveugle"
 * Permet au caissier de compter physiquement ses billets, pièces et mobile money
 * sans voir le total théorique du système à l'avance, garantissant l'intégrité anti-fraude.
 * Génère le Procès-Verbal (PV) officiel avec calcul instantané de l'écart (+/-).
 */

import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Wallet, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  X, 
  ArrowRight, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  FileCheck,
  TrendingDown,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Payment, Expense, DailyCashClosure, SchoolSettings } from '../../types';
import { formatFCFA } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';

interface DailyCashClosureModalProps {
  payments: Payment[];
  expenses: Expense[];
  settings: SchoolSettings;
  onSaveClosure: (closure: DailyCashClosure) => void;
  onClose: () => void;
}

export const DailyCashClosureModal: React.FC<DailyCashClosureModalProps> = ({
  payments,
  expenses,
  settings,
  onSaveClosure,
  onClose
}) => {
  // Date de clôture (par défaut aujourd'hui)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // État du mode : saisie à l'aveugle vs PV révélé
  const [step, setStep] = useState<'INPUT_BLIND' | 'PV_REVEALED'>('INPUT_BLIND');

  // Dépliage du calculateur de coupures de billets FCFA
  const [showDenominations, setShowDenominations] = useState(false);
  const [denominations, setDenominations] = useState({
    b10000: 0,
    b5000: 0,
    b2000: 0,
    b1000: 0,
    b500: 0,
    coins: 0
  });

  // Montants saisis par le caissier
  const [countedCash, setCountedCash] = useState<number>(0);
  const [countedOrangeMoney, setCountedOrangeMoney] = useState<number>(0);
  const [countedMoovMoney, setCountedMoovMoney] = useState<number>(0);
  const [countedOther, setCountedOther] = useState<number>(0);
  const [cashierName, setCashierName] = useState<string>('Caisse Principale');
  const [closureNotes, setClosureNotes] = useState<string>('');

  // Mise à jour automatique des espèces quand on utilise les coupures
  const handleDenominationChange = (key: keyof typeof denominations, count: number) => {
    const val = Math.max(0, count);
    const updated = { ...denominations, [key]: val };
    setDenominations(updated);

    const totalBills = 
      (updated.b10000 * 10000) +
      (updated.b5000 * 5000) +
      (updated.b2000 * 2000) +
      (updated.b1000 * 1000) +
      (updated.b500 * 500) +
      (updated.coins || 0);

    setCountedCash(totalBills);
  };

  // 1. Calculs Théoriques du Système pour la journée sélectionnée
  const dayPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = p.paymentDate.slice(0, 10);
      return pDate === selectedDate;
    });
  }, [payments, selectedDate]);

  const dayExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eDate = e.expenseDate.slice(0, 10);
      return eDate === selectedDate;
    });
  }, [expenses, selectedDate]);

  // Recettes système par méthode
  const systemCashReceipts = useMemo(() => {
    return dayPayments.filter(p => p.method === 'ESPECES').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [dayPayments]);

  const systemMobileMoneyReceipts = useMemo(() => {
    return dayPayments.filter(p => p.method === 'ORANGE_MONEY' || p.method === 'MOOV_MONEY').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [dayPayments]);

  const systemOtherReceipts = useMemo(() => {
    return dayPayments.filter(p => p.method !== 'ESPECES' && p.method !== 'ORANGE_MONEY' && p.method !== 'MOOV_MONEY').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [dayPayments]);

  const systemTotalReceipts = systemCashReceipts + systemMobileMoneyReceipts + systemOtherReceipts;

  // Dépenses sorties en espèces
  const systemCashExpenses = useMemo(() => {
    return dayExpenses.filter(e => e.paymentMethod === 'ESPECES').reduce((sum, e) => sum + e.amount, 0);
  }, [dayExpenses]);

  // Espèces théoriques nettes attendues en caisse physique
  const systemNetExpectedCash = Math.max(0, systemCashReceipts - systemCashExpenses);

  // Totaux physiques comptés
  const totalPhysicalCounted = countedCash + countedOrangeMoney + countedMoovMoney + countedOther;

  // Écarts
  const cashDiscrepancy = countedCash - systemNetExpectedCash;
  const theoreticalNetTotal = systemTotalReceipts - systemCashExpenses;
  const totalDiscrepancy = totalPhysicalCounted - theoreticalNetTotal;

  // Statut
  const closureStatus: 'EQUILIBRE' | 'EXCEDENT' | 'DEFICIT' = 
    cashDiscrepancy === 0 ? 'EQUILIBRE' : cashDiscrepancy > 0 ? 'EXCEDENT' : 'DEFICIT';

  // Objet de clôture
  const closureRecord: DailyCashClosure = useMemo(() => {
    return {
      id: `clot-${Date.now()}`,
      reference: `CLOT-${selectedDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
      date: selectedDate,
      closedAt: new Date().toISOString(),
      cashierName,
      academicYear: settings.currentAcademicYear,
      countedCash,
      countedOrangeMoney,
      countedMoovMoney,
      countedOther,
      totalPhysicalCounted,
      systemCashReceipts,
      systemMobileMoneyReceipts,
      systemOtherReceipts,
      systemTotalReceipts,
      systemExpenses: systemCashExpenses,
      systemNetExpectedCash,
      cashDiscrepancy,
      totalDiscrepancy,
      status: closureStatus,
      notes: closureNotes
    };
  }, [
    selectedDate,
    cashierName,
    settings.currentAcademicYear,
    countedCash,
    countedOrangeMoney,
    countedMoovMoney,
    countedOther,
    totalPhysicalCounted,
    systemCashReceipts,
    systemMobileMoneyReceipts,
    systemOtherReceipts,
    systemTotalReceipts,
    systemCashExpenses,
    systemNetExpectedCash,
    cashDiscrepancy,
    totalDiscrepancy,
    closureStatus,
    closureNotes
  ]);

  const handleRevealPv = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('PV_REVEALED');
  };

  const handleValidateAndSave = () => {
    onSaveClosure(closureRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 relative">
        
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Procédure Anti-Fraude
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-1">
                Clôture de Caisse Journalière
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            {step === 'INPUT_BLIND' 
              ? "Comptage physique à l'aveugle : saisissez vos fonds sans consulter le solde machine pour garantir la sincérité du contrôle."
              : "Procès-Verbal officiel : voici la confrontation entre vos fonds physiques et les encaissements enregistrés."}
          </p>
        </div>

        {/* ÉTAPE 1 : COMPTAGE À L'AVEUGLE */}
        {step === 'INPUT_BLIND' && (
          <form onSubmit={handleRevealPv} className="p-6 space-y-5">
            
            {/* Date & Caissier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  1. Date de la Caisse à Clôturer *
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  2. Nom du Caissier Responsable *
                </label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={e => setCashierName(e.target.value)}
                  placeholder="Ex: Caisse Principale / Nom"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>

            {/* Total Espèces comptées */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-amber-700" />
                    <span>Total Espèces Physiques en Mains (FCFA) *</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Comptabilisez l'ensemble des billets et pièces présents dans votre tiroir-caisse.
                  </p>
                </div>
                
                {/* Raccourci Calculateur de Coupures */}
                <button
                  type="button"
                  onClick={() => setShowDenominations(!showDenominations)}
                  className="px-2.5 py-1.5 bg-amber-200/70 hover:bg-amber-200 text-amber-950 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-800" />
                  <span>{showDenominations ? 'Masquer coupures' : 'Compteur de billets'}</span>
                  {showDenominations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Champ principal montant espèces */}
              <input
                type="number"
                required
                min="0"
                step="25"
                value={countedCash}
                onChange={e => setCountedCash(Math.max(0, Number(e.target.value)))}
                className="w-full p-3.5 bg-white border-2 border-amber-300 rounded-xl text-2xl font-black font-mono text-amber-950 outline-none focus:border-amber-600 shadow-inner"
                placeholder="0"
              />

              {/* Dépliage : Ventilation par coupures FCFA */}
              {showDenominations && (
                <div className="bg-white border border-amber-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Billets 10 000 F</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b10000 || ''}
                      onChange={e => handleDenominationChange('b10000', Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Billets 5 000 F</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b5000 || ''}
                      onChange={e => handleDenominationChange('b5000', Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Billets 2 000 F</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b2000 || ''}
                      onChange={e => handleDenominationChange('b2000', Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Billets 1 000 F</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b1000 || ''}
                      onChange={e => handleDenominationChange('b1000', Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Billets 500 F</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b500 || ''}
                      onChange={e => handleDenominationChange('b500', Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Total Pièces (F)</label>
                    <input
                      type="number"
                      min="0"
                      value={denominations.coins || ''}
                      onChange={e => handleDenominationChange('coins', Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Money & Chèques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <label className="font-bold text-slate-900 block mb-1">
                  Orange Money Encaissé (FCFA)
                </label>
                <p className="text-[10px] text-slate-500 mb-2">
                  Total relevé sur la puce/téléphone Orange Money
                </p>
                <input
                  type="number"
                  min="0"
                  value={countedOrangeMoney}
                  onChange={e => setCountedOrangeMoney(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold font-mono text-slate-900"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <label className="font-bold text-slate-900 block mb-1">
                  Moov Money / Wave / Chèques (FCFA)
                </label>
                <p className="text-[10px] text-slate-500 mb-2">
                  Autres versements scripturaux reçus
                </p>
                <input
                  type="number"
                  min="0"
                  value={countedMoovMoney}
                  onChange={e => setCountedMoovMoney(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="font-bold text-slate-700 text-xs block mb-1">
                Observations ou Justificatifs éventuels (facultatif)
              </label>
              <input
                type="text"
                value={closureNotes}
                onChange={e => setClosureNotes(e.target.value)}
                placeholder="Ex: Facture EDM payée en espèces, acompte maître vacataire..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white"
              />
            </div>

            {/* Bouton de Révélation */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-blue-900 hover:bg-blue-800 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Calculer et Révéler le Procès-Verbal de Caisse</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ÉTAPE 2 : PROCÈS-VERBAL RÉVÉLÉ */}
        {step === 'PV_REVEALED' && (
          <div className="p-6 space-y-5 animate-in fade-in">
            
            {/* Bannière de Résultat Synthétique */}
            <div className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              closureStatus === 'EQUILIBRE'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : closureStatus === 'EXCEDENT'
                ? 'bg-blue-50 border-blue-400 text-blue-950'
                : 'bg-rose-50 border-rose-400 text-rose-950'
            }`}>
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  closureStatus === 'EQUILIBRE' 
                    ? 'bg-emerald-600 text-white' 
                    : closureStatus === 'EXCEDENT' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-rose-600 text-white'
                }`}>
                  {closureStatus === 'EQUILIBRE' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : closureStatus === 'EXCEDENT' ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider block">
                    {closureStatus === 'EQUILIBRE'
                      ? '✓ Caisse Parfaitement Équilibrée'
                      : closureStatus === 'EXCEDENT'
                      ? '▲ Excédent de Caisse Détecté'
                      : '▼ Déficit / Manquant de Caisse'}
                  </span>
                  <p className="text-xl sm:text-2xl font-black font-mono mt-0.5">
                    Écart Espèces : {cashDiscrepancy > 0 ? '+' : ''}{formatFCFA(cashDiscrepancy)}
                  </p>
                  <p className="text-xs opacity-80">
                    {closureStatus === 'EQUILIBRE'
                      ? "Le montant physique compté correspond à 100% au solde attendu."
                      : closureStatus === 'EXCEDENT'
                      ? "Il y a plus d'argent physique que d'écritures saisies dans le système."
                      : "Il manque des fonds physiques par rapport aux encaissements enregistrés."}
                  </p>
                </div>
              </div>

              {/* Tag Référence */}
              <div className="text-right shrink-0">
                <span className="px-3 py-1 bg-white/80 rounded-lg text-xs font-mono font-bold border border-slate-200">
                  {closureRecord.reference}
                </span>
              </div>
            </div>

            {/* Tableau de Confrontation Limpide */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Détail de la Confrontation (Journée du {new Date(selectedDate).toLocaleDateString('fr-FR')})</span>
                <span>Devise : FCFA</span>
              </div>

              <div className="divide-y divide-slate-200 text-xs">
                
                {/* Ligne Espèces */}
                <div className="p-3.5 grid grid-cols-3 items-center">
                  <div>
                    <p className="font-bold text-slate-900">Espèces en Caisse</p>
                    <p className="text-[10px] text-slate-500">Recettes espèces - Dépenses</p>
                  </div>
                  <div className="text-center font-mono text-slate-700">
                    <span className="text-[10px] text-slate-400 block font-sans">Attendu Système</span>
                    <span className="font-bold">{formatFCFA(systemNetExpectedCash)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">Compté Physique</span>
                    <span className={`font-bold ${cashDiscrepancy === 0 ? 'text-emerald-700' : cashDiscrepancy > 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                      {formatFCFA(countedCash)}
                    </span>
                  </div>
                </div>

                {/* Ligne Orange Money */}
                <div className="p-3.5 grid grid-cols-3 items-center">
                  <div>
                    <p className="font-bold text-slate-900">Orange Money</p>
                    <p className="text-[10px] text-slate-500">Paiements mobile reçus</p>
                  </div>
                  <div className="text-center font-mono text-slate-700">
                    <span className="text-[10px] text-slate-400 block font-sans">Attendu Système</span>
                    <span className="font-bold">{formatFCFA(systemMobileMoneyReceipts)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">Compté Physique</span>
                    <span className="font-bold text-slate-900">{formatFCFA(countedOrangeMoney)}</span>
                  </div>
                </div>

                {/* Ligne Dépenses */}
                <div className="p-3.5 grid grid-cols-3 items-center bg-rose-50/40">
                  <div>
                    <p className="font-bold text-rose-900">Dépenses Décaissement</p>
                    <p className="text-[10px] text-rose-700">Bons de caisse du jour</p>
                  </div>
                  <div className="text-center font-mono text-rose-800">
                    <span className="text-[10px] text-rose-500 block font-sans">Total Sorties</span>
                    <span className="font-bold">-{formatFCFA(systemCashExpenses)}</span>
                  </div>
                  <div className="text-right font-mono text-rose-800">
                    <span className="text-[10px] text-rose-500 block font-sans">Justificatifs</span>
                    <span className="font-bold">{dayExpenses.length} dépense(s)</span>
                  </div>
                </div>

                {/* Ligne Totale Récapitulative */}
                <div className="p-3.5 grid grid-cols-3 items-center bg-slate-900 text-white font-bold">
                  <div>
                    <p className="text-sm">TOTAL GÉNÉRAL NET</p>
                    <p className="text-[10px] text-slate-400">Toutes ressources confondues</p>
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">Solde Théorique</span>
                    <span className="text-sm">{formatFCFA(theoreticalNetTotal)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">Solde Réel Constaté</span>
                    <span className="text-sm text-emerald-400">{formatFCFA(totalPhysicalCounted)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions : Impression & Enregistrement */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              
              {/* Bouton Impression PV Officiel */}
              <button
                type="button"
                onClick={() => PdfService.generateCashClosurePvPdf(closureRecord, settings)}
                className="w-full sm:w-auto flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Procès-Verbal Signé (PDF)</span>
              </button>

              {/* Bouton Enregistrer */}
              <button
                type="button"
                onClick={handleValidateAndSave}
                className="w-full sm:w-auto flex-1 py-3 px-4 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Enregistrer la Clôture & Archiver</span>
              </button>

              {/* Modifier comptage */}
              <button
                type="button"
                onClick={() => setStep('INPUT_BLIND')}
                className="w-full sm:w-auto py-3 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Corriger mon comptage"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            </div>

          </div>
        )}

        {/* Pied de modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Établissement : {settings.schoolName}</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
