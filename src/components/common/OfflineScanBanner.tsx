import React, { useState } from 'react';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  X, 
  ChevronRight,
  Clock,
  QrCode,
  UserCheck
} from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOfflineScanQueue } from '../../hooks/useOfflineScanQueue';
import { useSchool } from '../../contexts/SchoolContext';

export const OfflineScanBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { queue, pendingCount, isSyncing, syncNow, removeScan, clearSynced } = useOfflineScanQueue();
  const { refreshData } = useSchool();
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (!isOnline) {
      setSyncFeedback("Impossible de synchroniser : vous êtes actuellement hors-ligne.");
      setTimeout(() => setSyncFeedback(null), 3500);
      return;
    }

    try {
      const res = await syncNow(() => {
        refreshData();
      });
      if (res.syncedCount > 0) {
        setSyncFeedback(`Succès : ${res.syncedCount} scan(s) synchronisé(s) dans le Cloud !`);
      } else if (res.failedCount > 0) {
        setSyncFeedback(`Attention : ${res.failedCount} scan(s) n'ont pas pu être synchronisés.`);
      } else {
        setSyncFeedback("Tous les scans sont déjà à jour !");
      }
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback("Erreur lors de la synchronisation : " + (err?.message || 'Réessayer'));
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Only render if offline OR if there are pending scans in the queue
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* Top Floating Notification Ribbon */}
      <div className={`px-4 py-2.5 transition-all text-xs font-bold border-b flex flex-wrap items-center justify-between gap-3 shadow-xs ${
        !isOnline 
          ? 'bg-amber-500 text-slate-950 border-amber-600/40' 
          : 'bg-blue-900 text-white border-blue-950'
      }`}>
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
              </span>
              <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                <strong>Mode Hors-Ligne Actif</strong> — Consultation des données locales synchronisées disponible sans internet.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Connexion rétablie — Des scans hors-ligne sont en attente d'envoi.
              </span>
            </div>
          )}

          {pendingCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
              !isOnline ? 'bg-slate-950 text-amber-400' : 'bg-amber-400 text-slate-950'
            }`}>
              {pendingCount} scan(s) en file d'attente
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setShowQueueModal(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                !isOnline 
                  ? 'bg-slate-950/15 hover:bg-slate-950/25 text-slate-950' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Voir la file ({pendingCount})</span>
            </button>
          )}

          {isOnline && pendingCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="fixed top-14 right-4 z-50 bg-slate-950 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold animate-in fade-in duration-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Queue Details Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight text-white">
                    File d'Attente des Scans Hors-Ligne
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Scans capturés localement en attente de synchronisation avec le Cloud
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {queue.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucun scan en file d'attente</p>
                  <p className="text-[11px]">Tous vos scans ont été synchronisés avec succès.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  {queue.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                          item.action === 'ATTENDANCE_CHECKIN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {item.action === 'ATTENDANCE_CHECKIN' ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <QrCode className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate">
                            {item.studentName}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>Matricule: {item.studentMatricule}</span>
                            {item.className && <span>• {item.className}</span>}
                            <span>•</span>
                            <span>{new Date(item.scannedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </p>
                          {item.action === 'ATTENDANCE_CHECKIN' && item.attendanceDetails && (
                            <p className="text-[10px] font-bold text-emerald-700 mt-1">
                              Présence pointée pour le {item.attendanceDetails.date} ({item.attendanceDetails.status})
                            </p>
                          )}
                          {item.syncError && (
                            <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                              ⚠️ {item.syncError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.syncStatus === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.syncStatus === 'SYNCING'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : item.syncStatus === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {item.syncStatus === 'SYNCED' ? 'Synchronisé' :
                           item.syncStatus === 'SYNCING' ? 'Envoi...' :
                           item.syncStatus === 'FAILED' ? 'Échec' : 'En attente'}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeScan(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Supprimer ce scan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={clearSynced}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Nettoyer les scans terminés
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>

                {isOnline && pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Synchroniser ({pendingCount})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
