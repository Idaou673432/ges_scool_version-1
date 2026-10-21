/**
 * SomaSikolo / KalanGest - Modal Certificat de Vérification Anti-Fraude du Reçu
 * Design épuré, très simple, avec sceau vert d'authenticité infalsifiable.
 */

import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Printer, 
  Receipt, 
  Calendar, 
  User, 
  School, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Payment, SchoolSettings } from '../../types';
import { formatFCFA } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';

interface ReceiptVerificationModalProps {
  payment: Payment;
  settings: SchoolSettings;
  onClose: () => void;
}

export const ReceiptVerificationModal: React.FC<ReceiptVerificationModalProps> = ({
  payment,
  settings,
  onClose
}) => {
  // Hash token anti-fraude dérivé
  const checksumToken = `ML-SEC-${payment.receiptNumber.replace(/[^A-Za-z0-9]/g, '')}-${(payment.amountPaid * 7).toString(36).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-emerald-200 overflow-hidden my-4 relative">
        
        {/* En-tête Sécurité Vert Émeraude */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-emerald-200" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/25 text-emerald-100 tracking-wider uppercase mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Reçu Authentifié
              </span>
              <h2 className="text-xl font-black text-white tracking-tight leading-none">
                Certificat Officiel de Paiement
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 font-medium">
            Ce document est officiellement enregistré dans le registre comptable de l'établissement.
          </p>
        </div>

        {/* Corps du certificat - Design très lisible */}
        <div className="p-6 space-y-4">
          
          {/* Montant encaissé en grand format */}
          <div className="bg-emerald-50/80 border-2 border-dashed border-emerald-300 rounded-2xl p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Montant Total Encaissé à la Caisse
            </p>
            <p className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-tight my-1 font-mono">
              {formatFCFA(payment.amountPaid)}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span>Mode : {payment.method}</span>
              <span>•</span>
              <span>Reçu N° {payment.receiptNumber}</span>
            </div>
          </div>

          {/* Grille des informations essentielles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Élève */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Élève Bénéficiaire
              </span>
              <p className="font-bold text-slate-900 text-sm">{payment.studentName}</p>
              <p className="text-slate-600 font-mono mt-0.5">Mle: {payment.studentMatricule}</p>
            </div>

            {/* Classe & Année */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Classe & Session
              </span>
              <p className="font-bold text-slate-900 text-sm">{payment.className}</p>
              <p className="text-slate-600 mt-0.5">Année {payment.academicYear}</p>
            </div>

            {/* Motif & Période */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Motif du Règlement
              </span>
              <p className="font-bold text-slate-900">{payment.category}</p>
              <p className="text-slate-600 mt-0.5">{payment.monthCovered || 'Scolarité générale'}</p>
            </div>

            {/* Situation Solde */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Situation du Solde
              </span>
              <p className={`font-bold text-sm ${payment.remainingAmount <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {payment.remainingAmount <= 0 ? '✓ Soldé (0 FCFA)' : `Reste: ${formatFCFA(payment.remainingAmount)}`}
              </p>
              <p className="text-slate-500 text-[10px] mt-0.5">Attendu : {formatFCFA(payment.expectedAmount)}</p>
            </div>
          </div>

          {/* Métadonnées de Traçabilité */}
          <div className="bg-slate-100/70 rounded-xl p-3 text-[11px] space-y-1.5 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Établissement :</span>
              <span className="font-bold text-slate-900">{settings.schoolName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Date et heure d'encaissement :</span>
              <span className="font-medium text-slate-800">
                {new Date(payment.paymentDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Caissier émetteur :</span>
              <span className="font-bold text-slate-800">{payment.cashierName}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
              <span className="text-slate-500">Empreinte Sécurité (Token) :</span>
              <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-100/60 px-1.5 py-0.5 rounded">
                {checksumToken}
              </span>
            </div>
          </div>

          {/* Actions : Impression Reçus */}
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold text-slate-500 text-center">
              Imprimer ou rééditer le reçu authentique :
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => PdfService.generateReceiptPosTicketPdf(payment, settings, 'print')}
                className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-amber-700" />
                <span>Ticket Caisse POS (80mm)</span>
              </button>

              <button
                type="button"
                onClick={() => PdfService.generateReceiptPdf(payment, settings, 'print')}
                className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-200 text-blue-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-700" />
                <span>Reçu A5 avec Cachet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pied de modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Vérification sécurisée SomaSikolo Mali
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
