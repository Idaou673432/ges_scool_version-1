/**
 * SomaSikolo / KalanGest - Modal Aperçu Quittance Horizontale Haute Fidélité
 * Affiche la quittance officielle au format paysage/horizontal (souche détachable + quittance élève)
 * Permet de visualiser le reçu en direct sans téléchargement forcé, avec options d'impression et PDF.
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Scissors, 
  MessageCircle, 
  Building2, 
  Calendar, 
  User, 
  FileText,
  CreditCard
} from 'lucide-react';
import QRCode from 'qrcode';
import { Payment, SchoolSettings } from '../../types';
import { formatFCFA } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';
import { numberToFcfaWords } from '../../utils/numberToWords';

interface HorizontalReceiptModalProps {
  isOpen: boolean;
  payment: Payment | null;
  settings: SchoolSettings;
  onClose: () => void;
  onShareWhatsApp?: (payment: Payment) => void;
}

export const HorizontalReceiptModal: React.FC<HorizontalReceiptModalProps> = ({
  isOpen,
  payment,
  settings,
  onClose,
  onShareWhatsApp
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!payment) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const verifyUrl = `${origin}/?verify_receipt=${encodeURIComponent(payment.receiptNumber)}&mat=${encodeURIComponent(payment.studentMatricule)}`;
    
    QRCode.toDataURL(verifyUrl, { width: 120, margin: 1, errorCorrectionLevel: 'M' })
      .then(url => setQrDataUrl(url))
      .catch(err => console.warn('Erreur génération QR quittance:', err));
  }, [payment]);

  if (!isOpen || !payment) return null;

  const checksumToken = `ML-SEC-${payment.receiptNumber.replace(/[^A-Za-z0-9]/g, '')}-${(payment.amountPaid * 7).toString(36).toUpperCase()}`;
  const amountInWords = numberToFcfaWords(payment.amountPaid);

  const handlePrint = () => {
    if (receiptPrintRef.current) {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Quittance_${payment.receiptNumber}</title>
              <style>
                @page { size: landscape; margin: 6mm; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  margin: 0;
                  padding: 8px;
                  color: #0f172a;
                  background: #ffffff;
                }
                * { box-sizing: border-box; }
              </style>
            </head>
            <body>
              <div style="max-width: 950px; margin: 0 auto;">
                ${receiptPrintRef.current.outerHTML}
              </div>
            </body>
          </html>
        `);
        frameDoc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 1500);
        }, 300);
        return;
      }
    }
    PdfService.generateReceiptPdf(payment, settings, 'print');
  };

  const handleDownloadPdf = () => {
    PdfService.generateReceiptPdf(payment, settings, 'download');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Barre d'Action Supérieure Épurée */}
        <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-xs sm:text-sm font-bold truncate">
                Quittance Officielle de Caisse
              </h2>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                N° {payment.receiptNumber} • {payment.studentName} ({payment.className})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(payment)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Partager par WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Lancer l'impression officielle"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-700"
              title="Télécharger le fichier PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zone de Visualisation : Quittance Horizontale à Souche (Haute Précision) */}
        <div className="p-3 sm:p-5 overflow-auto bg-slate-100/70 flex justify-center items-center flex-1">
          
          <div 
            ref={receiptPrintRef}
            className="bg-white rounded-xl border border-slate-300 shadow-md p-3 sm:p-4 w-full max-w-3xl text-slate-900 select-text flex flex-col md:flex-row gap-3 relative overflow-hidden"
            style={{ minHeight: '340px' }}
          >
            {/* Liseré tricolore Mali sur le bord supérieur */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600" />

            {/* =========================================================================
                PARTIE GAUCHE : TALON / SOUCHE COMPTABILITÉ (Établissement)
                ========================================================================= */}
            <div className="w-full md:w-1/4 bg-slate-50/90 rounded-lg border border-slate-200/90 p-2.5 flex flex-col justify-between text-[10px] space-y-2 relative">
              <div className="space-y-1.5">
                <div className="text-center border-b border-slate-200 pb-1.5">
                  <span className="font-black text-[9px] uppercase tracking-wider text-slate-500 block">
                    RÉPUBLIQUE DU MALI
                  </span>
                  <span className="font-bold text-[10px] text-emerald-800 block">
                    TALON DE CAISSE
                  </span>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Quittance N° :</span>
                    <span className="font-mono font-bold text-slate-900 text-[10px]">{payment.receiptNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Date :</span>
                    <span className="font-medium text-slate-800">{new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Élève :</span>
                    <span className="font-bold text-slate-900 truncate block">{payment.studentName}</span>
                    <span className="font-mono text-slate-500 text-[9px]">{payment.studentMatricule}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Classe :</span>
                    <span className="font-semibold text-slate-800">{payment.className}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Motif :</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {payment.category} {payment.monthCovered ? `(${payment.monthCovered})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-1.5 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-semibold text-[9px]">Versé :</span>
                  <span className="font-mono font-bold text-emerald-800 text-[11px]">{formatFCFA(payment.amountPaid)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-semibold text-[9px]">Reste :</span>
                  <span className={`font-mono font-bold text-[9px] ${payment.remainingAmount <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {payment.remainingAmount <= 0 ? '0 F (Soldé)' : formatFCFA(payment.remainingAmount)}
                  </span>
                </div>
                <div className="pt-1 text-center">
                  <span className="text-[8px] text-slate-400 uppercase block">Visa Caissier</span>
                  <span className="font-bold text-slate-700 text-[9px]">{payment.cashierName}</span>
                </div>
              </div>

              {/* Ligne pointillée de découpe avec ciseaux sur desktop */}
              <div className="hidden md:flex absolute -right-3 top-0 bottom-0 items-center justify-center pointer-events-none">
                <div className="h-full border-r-2 border-dashed border-slate-300 flex items-center justify-center">
                  <Scissors className="w-3.5 h-3.5 text-slate-400 rotate-90 bg-white p-0.5 rounded-full border border-slate-300" />
                </div>
              </div>
            </div>

            {/* =========================================================================
                PARTIE DROITE : QUITTANCE OFFICIELLE PRINCIPALE (Élève & Parent)
                ========================================================================= */}
            <div className="w-full md:w-3/4 flex flex-col justify-between space-y-2.5 pl-0 md:pl-2">
              
              {/* En-tête officiel de la quittance */}
              <div className="border-b border-slate-200 pb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-2.5 bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600 rounded-2xs" />
                    <span className="text-[9px] font-black tracking-wider uppercase text-slate-600">
                      RÉPUBLIQUE DU MALI • MINISTÈRE DE L'ÉDUCATION NATIONALE
                    </span>
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-tight">
                    {settings.schoolName || 'ÉTABLISSEMENT SCOLAIRE'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {settings.address} • Tél : {settings.phone} • Année : <strong className="text-slate-700">{settings.currentAcademicYear}</strong>
                  </p>
                </div>

                <div className="text-right bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                  <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider block">
                    QUITTANCE OFFICIELLE
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-950 block">
                    N° {payment.receiptNumber}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-medium">
                    Date : {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Informations Détaillées du Règlement */}
              <div className="space-y-1.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/70 p-2 rounded-lg border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Reçu de l'Élève :</span>
                    <strong className="text-slate-900 font-bold text-xs">{payment.studentName}</strong>
                    <span className="text-slate-500 text-[10px] font-mono ml-1.5">(Mle: {payment.studentMatricule})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Classe d'Étude :</span>
                    <strong className="text-slate-800 font-semibold">{payment.className}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                  <div>
                    <span className="text-slate-500 text-[10px]">Motif du versement : </span>
                    <strong className="text-slate-900 font-semibold">{payment.category}</strong>
                    {payment.monthCovered && <span className="text-slate-600 font-medium ml-1">({payment.monthCovered})</span>}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Mode de règlement : </span>
                    <strong className="text-slate-800 font-semibold">{payment.method}</strong>
                    {payment.referenceNumber && <span className="text-slate-500 font-mono text-[10px] ml-1">(Réf: {payment.referenceNumber})</span>}
                  </div>
                </div>

                {/* Montant en toutes lettres */}
                <div className="bg-amber-50/70 border border-amber-200/80 px-2.5 py-1 rounded-lg text-[11px]">
                  <span className="text-amber-800 font-bold uppercase text-[9px] mr-1.5">La somme de :</span>
                  <strong className="text-amber-950 font-bold italic">{amountInWords}</strong>
                </div>
              </div>

              {/* Tableau Financier Synthétique */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Montant Attendu</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {formatFCFA(payment.expectedAmount)}
                  </span>
                </div>

                <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-300 shadow-2xs">
                  <span className="text-[9px] uppercase font-black text-emerald-800 block">Montant Versé (Encaissé)</span>
                  <span className="font-mono font-black text-emerald-900 text-sm">
                    {formatFCFA(payment.amountPaid)}
                  </span>
                </div>

                <div className={`p-1.5 rounded-lg border ${
                  payment.remainingAmount <= 0 
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Reste à Payer</span>
                  <span className="font-mono font-bold text-xs">
                    {payment.remainingAmount <= 0 ? '0 F (Soldé ✓)' : formatFCFA(payment.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Pied de Quittance : Sécurité, QR Code & Cachet */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3 text-[10px]">
                {/* QR Code & Token Anti-Fraude */}
                <div className="flex items-center gap-2">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Sécurité" className="w-12 h-12 rounded border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400 shrink-0">
                      QR
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold text-[9px] text-emerald-800 uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Authentifié & Infalsifiable
                    </span>
                    <span className="font-mono text-[8px] text-slate-400 block">
                      {checksumToken}
                    </span>
                    <span className="text-[8px] text-slate-400 block">
                      Tout versement est non remboursable.
                    </span>
                  </div>
                </div>

                {/* Signature et Cachet */}
                <div className="text-right space-y-0.5 min-w-[140px]">
                  <span className="font-bold text-slate-600 uppercase text-[9px] block">
                    Le Caissier / Comptable
                  </span>
                  <div className="h-7 flex items-center justify-end">
                    {settings.stampUrl ? (
                      <img src={settings.stampUrl} alt="Cachet" className="h-7 max-w-[80px] object-contain" />
                    ) : (
                      <span className="text-[9px] italic text-slate-400 border border-dashed border-slate-300 px-2 py-0.5 rounded">
                        Cachet & Signature
                      </span>
                    )}
                  </div>
                  <strong className="text-slate-900 font-bold text-[10px] block truncate">
                    {payment.cashierName || 'Comptabilité'}
                  </strong>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Pied de Boîte de Dialogue */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Format : Carnet de Quittance Scolaire Horizontal (Mali)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer transition-colors"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
