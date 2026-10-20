/**
 * SomaSikolo / KalanGest - Historique des scans récents
 * Interface claire, simple et directe pour consulter les 10 derniers profils scannés sans rescanner.
 */

import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { ScanHistoryEntry, ScanHistoryService } from '../../services/scanHistoryService';
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
  className = '',
  isDrawer = false,
  onCloseDrawer
}) => {
  const { students, classes } = useSchool();
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setHistory(ScanHistoryService.getHistory());
    const unsubscribe = ScanHistoryService.subscribe((updated) => {
      setHistory(updated);
    });
    return () => unsubscribe();
  }, []);

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Récemment';
    }
  };

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

  const handleAddSampleScan = () => {
    if (students.length === 0) return;
    const std = students[Math.floor(Math.random() * students.length)];
    const cls = classes.find(c => c.id === std.classId);
    ScanHistoryService.recordScan(std, cls?.name, 'MANUEL');
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Header simple et direct */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Historique des scans
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800">
              {history.length} / 10
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Cliquez sur un élève pour ouvrir sa fiche complète sans avoir à rescanner son QR code.
          </p>
        </div>

        {/* Boutons d'action fonctionnels */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          {onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="px-3.5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Scanner un QR code
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Effacer l'historique des scans récents ?")) {
                  ScanHistoryService.clearHistory();
                }
              }}
              className="px-3 py-2 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 font-medium text-xs transition-colors cursor-pointer"
            >
              Effacer tout
            </button>
          )}

          {isDrawer && onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors text-xs font-bold"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche si plus de 3 scans */}
      {history.length > 3 && (
        <div className="p-3 border-b border-slate-100 bg-white">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, matricule ou classe..."
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900"
          />
        </div>
      )}

      {/* Contenu principal : liste épurée et lisible */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-semibold text-slate-800">
              Aucun élève scanné récemment
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Chaque fois que vous scannez le badge d'un élève, sa fiche s'affiche automatiquement dans cette liste.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Ouvrir la caméra pour scanner
                </button>
              )}
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddSampleScan}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Ajouter un élève test
                </button>
              )}
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Aucun résultat pour « {searchTerm} ».
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {filteredHistory.map((item) => {
              const std = item.student;
              const resolvedClass = classes.find(c => c.id === std.classId);
              const displayClass = item.className || resolvedClass?.name || 'Classe non assignée';

              return (
                <div
                  key={item.id}
                  onClick={() => onViewStudentProfile(std)}
                  className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  {/* Photo / Avatar et informations principales */}
                  <div className="flex items-center gap-3 min-w-0">
                    {std.photoUrl ? (
                      <img
                        src={std.photoUrl}
                        alt={`${std.firstName} ${std.lastName}`}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {std.firstName?.[0] || '?'}{std.lastName?.[0] || '?'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {std.lastName?.toUpperCase()} {std.firstName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600 font-semibold">{std.matricule}</span>
                        <span>•</span>
                        <span className="text-slate-600">{displayClass}</span>
                        <span>•</span>
                        <span className="text-slate-400">{formatTimeAgo(item.scannedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions claires */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onViewStudentProfile(std)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Voir la fiche
                    </button>
                    <button
                      type="button"
                      onClick={() => ScanHistoryService.removeEntry(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Retirer de la liste"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
