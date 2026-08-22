/**
 * CloudSchoolSwitcherModal
 * Allows switching school codes or connecting new devices (phones, tablets, PCs)
 * to synchronize live data across any device in real-time.
 */

import React, { useState } from 'react';
import { 
  Cloud, 
  Smartphone, 
  Laptop, 
  Check, 
  Copy, 
  RefreshCw, 
  Building2, 
  KeyRound, 
  AlertCircle, 
  Share2, 
  X,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';

interface CloudSchoolSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSchoolSwitcherModal: React.FC<CloudSchoolSwitcherModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    cloudSchoolCode, 
    settings, 
    syncStatus, 
    syncStatusMessage, 
    switchOrJoinSchool, 
    forceCloudPush,
    students,
    classes
  } = useSchool();

  const [inputCode, setInputCode] = useState(cloudSchoolCode);
  const [schoolName, setSchoolName] = useState(settings.schoolName || '');
  const [pinCode, setPinCode] = useState(settings.adminPassword || '00223');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cloudSchoolCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSwitchSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setErrorMessage("Veuillez saisir un code établissement.");
      return;
    }
    setErrorMessage('');
    setIsProcessing(true);
    try {
      const ok = await switchOrJoinSchool(inputCode, schoolName, pinCode);
      if (ok) {
        setSuccessMessage(`Connecté avec succès à l'établissement [${inputCode.toUpperCase()}] ! Vos données se synchronisent désormais.`);
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1800);
      } else {
        setErrorMessage("Impossible de se connecter à ce code d'établissement.");
      }
    } catch (err) {
      setErrorMessage("Une erreur est survenue lors de la synchronisation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadAll = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const ok = await forceCloudPush();
      if (ok) {
        setSuccessMessage("Toutes vos données locales ont été téléversées et synchronisées dans le Cloud !");
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage("Erreur lors de la synchronisation cloud.");
      }
    } catch (e) {
      setErrorMessage("Erreur réseau ou Cloud.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://somasikolo.vercel.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cloud className="w-5 h-5 text-sky-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Synchronisation Multi-Écoles & Appareils</h2>
              <p className="text-xs text-sky-200">Partagez vos données en temps réel sur PC, Téléphone & Tablette</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-800 dark:text-slate-200">
          {/* Status Badge */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase text-blue-900 dark:text-blue-300">État de la Synchronisation</p>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  syncStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' :
                  syncStatus === 'SYNCING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {syncStatus === 'CONNECTED' ? 'CONNECTÉ & EN DIRECT' : syncStatus}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">{syncStatusMessage}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {students.length} élève(s) et {classes.length} classe(s) reliés au code établissement.
              </p>
            </div>
          </div>

          {/* Current Active School Code Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-400">Code Établissement Actif</span>
              <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full">Partagez ce code</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/40 border border-white/15 px-4 py-3 rounded-xl font-mono text-lg font-black tracking-wider text-amber-300 truncate">
                {cloudSchoolCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              👉 <strong>Pour utiliser sur votre téléphone ou un autre ordinateur :</strong> Ouvrez l'application sur l'appareil, venez dans ce menu et collez ce <strong>Code Établissement</strong>. Toutes vos saisies de notes, paiements et élèves apparaîtront instantanément !
            </p>
          </div>

          {/* Connect to Another School or Create a Code */}
          <form onSubmit={handleSwitchSchool} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Rejoindre ou Créer un autre Établissement
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                  Code Établissement (Ex: LYCEE-MALI-01, COMPLEXE-DIARRA, etc.)
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ECOLE-HAMDALLAYE"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nom de l'école (Optionnel)</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Nom officiel de l'école"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Code PIN Direction</label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="00223"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-900 hover:bg-blue-800 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>Se Connecter à cet Établissement</span>
              </button>

              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isProcessing}
                className="w-full sm:w-auto py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Synchroniser immédiatement toutes les données locales vers le cloud"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Envoyer vers le Cloud</span>
              </button>
            </div>
          </form>

          {/* Multi-Device Steps */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              Comment connecter plusieurs appareils (Téléphone & PC) :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                <Laptop className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white">1. Sur Ordinateur (Direction)</strong>
                  <span className="text-slate-500">Saisissez les classes, enseignants, frais et élèves. Vos données sont instantanément envoyées sur le Cloud.</span>
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white">2. Sur Téléphone (Enseignants)</strong>
                  <span className="text-slate-500">Ouvrez le lien Vercel, entrez le même code <strong className="text-blue-600">{cloudSchoolCode}</strong> : les notes saisies se mettent à jour partout en direct !</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">KalanGest Cloud Realtime Firebase</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
