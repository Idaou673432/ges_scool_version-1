/**
 * SomaSikolo / KalanGest - Volet & Section 'Historique des Scans'
 * Affiche les 10 derniers profils d'élèves scannés sans avoir à rescanner le QR.
 */

import React, { useState, useEffect } from 'react';
import { 
  History, 
  QrCode, 
  Clock, 
  Trash2, 
  Eye, 
  CreditCard, 
  Sparkles, 
  ExternalLink, 
  Check, 
  ChevronRight, 
  Search,
  User,
  HeartPulse,
  Printer
} from 'lucide-react';
import { Student, SchoolClass } from '../../types';
import { ScanHistoryEntry, ScanHistoryService } from '../../services/scanHistoryService';
import { PdfService } from '../../services/pdfService';
import { useSchool } from '../../contexts/SchoolContext';

interface ScanHistoryPanelProps {
  onViewStudentProfile: (student: Student) => void;
  onOpenQrScanner?: () => void;
  onNavigateToCards?: (student: Student) => void;
  className?: string;
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export const ScanHistoryPanel: React.FC<ScanHistoryPanelProps> = ({
  onViewStudentProfile,
  onOpenQrScanner,
  onNavigateToCards,
  className = '',
  isDrawer = false,
  onCloseDrawer
}) => {
  const { students, classes, settings } = useSchool();
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedMatricule, setCopiedMatricule] = useState<string | null>(null);

  // Charger et s'abonner aux mises à jour de l'historique
  useEffect(() => {
    setHistory(ScanHistoryService.getHistory());

    const unsubscribe = ScanHistoryService.subscribe((updated) => {
      setHistory(updated);
    });

    return () => unsubscribe();
  }, []);

  // Formater l'heure de façon humaine
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h (${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`;
      return `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Récemment';
    }
  };

  const handleCopyMatricule = (e: React.MouseEvent, matricule: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(matricule);
    setCopiedMatricule(matricule);
    setTimeout(() => setCopiedMatricule(null), 1500);
  };

  const handleDirectPrintCard = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    PdfService.generateStudentCardsBatchPdf([student], classes, settings);
  };

  // Filtrer selon la recherche
  const filteredHistory = history.filter(item => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const s = item.student;
    return (
      s.lastName.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.matricule.toLowerCase().includes(q) ||
      (item.className && item.className.toLowerCase().includes(q))
    );
  });

  // Démonstration : ajouter un élève existant si l'historique est vide
  const handleAddSampleScan = () => {
    if (students.length === 0) return;
    const std = students[Math.floor(Math.random() * students.length)];
    const cls = classes.find(c => c.id === std.classId);
    ScanHistoryService.recordScan(std, cls?.name, 'MANUEL');
  };

  return (
    <div className={`bg-white border border-slate-200/90 rounded-3xl shadow-2xs overflow-hidden flex flex-col ${className}`}>
      {/* Panel Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 via-white to-amber-50/30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
            <History className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Historique des Scans
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black font-mono bg-blue-900 text-white shadow-2xs">
                {history.length} / 10
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Consultez les 10 derniers profils d'élèves scannés sans avoir à rescanner leur QR
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          {onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
              title="Ouvrir la caméra pour scanner un nouveau QR code"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Nouveau Scan</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Voulez-vous effacer l'historique des 10 derniers scans ?")) {
                  ScanHistoryService.clearHistory();
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-semibold text-xs transition-colors cursor-pointer border border-slate-200/70"
              title="Vider la liste des scans récents"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vider</span>
            </button>
          )}

          {isDrawer && onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Fermer le volet"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Search if more than 3 scans */}
      {history.length > 3 && (
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrer parmi les profils scannés (nom, matricule, classe)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>
      )}

      {/* History Items List */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
        {history.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <QrCode className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Aucun profil dans l'historique pour le moment
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Dès qu'une carte d'élève est scannée (avec la caméra, la douchette ou le scanner mobile), son profil complet est automatiquement conservé ici pour un accès direct en 1 clic.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-amber-300" />
                  <span>Scanner un Premier Badge</span>
                </button>
              )}
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddSampleScan}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tester avec un élève inscrit</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Aucun élève ne correspond à votre recherche « {searchTerm} ».
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHistory.map((item, index) => {
              const std = item.student;
              const resolvedClass = classes.find(c => c.id === std.classId);
              const displayClass = item.className || resolvedClass?.name || 'Classe non assignée';

              return (
                <div
                  key={item.id}
                  onClick={() => onViewStudentProfile(std)}
                  className="group relative bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-blue-900/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  {/* Top Bar: Order badge & Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-blue-900 group-hover:text-white text-slate-600 font-mono font-black text-[10px] flex items-center justify-center transition-colors">
                        #{index + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimeAgo(item.scannedAt)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Blood type pill if available */}
                      {std.bloodType ? (
                        <span className="px-1.5 py-0.5 rounded-md font-mono font-black text-[9.5px] bg-rose-50 text-rose-700 border border-rose-200/70">
                          🩸 {std.bloodType}
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-slate-400">
                          GS non précisé
                        </span>
                      )}

                      {/* Remove single item button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ScanHistoryService.removeEntry(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition-all rounded-md hover:bg-rose-50"
                        title="Retirer de l'historique"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Student Body */}
                  <div className="flex items-center gap-3">
                    {/* Photo / Avatar */}
                    {std.photoUrl ? (
                      <img
                        src={std.photoUrl}
                        alt={`${std.firstName} ${std.lastName}`}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        std.gender === 'F'
                          ? 'bg-pink-50 text-pink-700 border-pink-200/60'
                          : 'bg-blue-50 text-blue-900 border-blue-200/60'
                      }`}>
                        {std.firstName?.[0] || '?'}{std.lastName?.[0] || '?'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-950 truncate tracking-tight">
                          {std.lastName?.toUpperCase()} {std.firstName}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => handleCopyMatricule(e, std.matricule)}
                          className="font-mono font-bold text-[10px] text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Cliquer pour copier le matricule"
                        >
                          {std.matricule}
                          {copiedMatricule === std.matricule ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : null}
                        </button>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="font-medium text-[11px] text-slate-600 truncate">
                          {displayClass}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-blue-900 group-hover:text-blue-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Consulter Fiche Complète</span>
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleDirectPrintCard(e, std)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Imprimer directement la carte scolaire en PDF"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span className="hidden sm:inline">Carte PDF</span>
                      </button>

                      {onNavigateToCards && (
                        <button
                          type="button"
                          onClick={() => onNavigateToCards(std)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-amber-200/60"
                          title="Ouvrir dans le module Cartes & Badges"
                        >
                          <CreditCard className="w-3 h-3 text-amber-700" />
                          <span>Badge</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info Notice */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between px-5">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Accès direct instantané : cliquez sur n'importe quel profil pour afficher son dossier sans rescanner.</span>
        </span>
        <span className="text-slate-400 font-mono text-[10px]">
          Limite : 10 profils
        </span>
      </div>
    </div>
  );
};
