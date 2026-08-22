import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, Share, PlusSquare, CheckCircle, X, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-md bg-white p-0.5 shrink-0">
              <img
                src="/somasikolo_logo.jpg"
                alt="SomaSikolo Icon"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">Installer KalanGest sur votre Appareil</h2>
              <p className="text-xs text-amber-400 font-bold">
                Icône d'application sur votre Écran d'accueil (Android, iPhone, PC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {/* Direct Install Button if Browser Prompt is Available */}
          {deferredPrompt && !isInstalled && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Download className="w-8 h-8 text-slate-950 shrink-0 animate-bounce" />
                <div>
                  <h3 className="font-black text-sm uppercase">Installation Directe Prête !</h3>
                  <p className="text-xs font-semibold text-slate-900">
                    Cliquez ci-dessous pour installer l'application immédiatement.
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer shrink-0"
              >
                Installer Maintenant
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-900">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-sm">L'application est déjà installée sur cet appareil !</p>
                <p className="text-xs font-medium text-emerald-700">Vous pouvez y accéder directement depuis l'icône de votre écran d'accueil.</p>
              </div>
            </div>
          )}

          {/* OS Selector Tabs */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Procédure d'installation par système :
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveTab('android')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Android</span>
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>iPhone / iPad</span>
              </button>

              <button
                onClick={() => setActiveTab('desktop')}
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  activeTab === 'desktop'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>PC / Mac</span>
              </button>
            </div>
          </div>

          {/* Tab Guides */}
          {activeTab === 'android' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" /> Sur Android (Chrome / Samsung Internet) :
              </h4>
              <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 list-decimal pl-5 font-semibold">
                <li>Ouvrez le lien de l'application dans <strong>Google Chrome</strong>.</li>
                <li>Appuyez sur les <strong>3 petits points verticaux (⋮)</strong> en haut à droite.</li>
                <li>Sélectionnez <strong className="text-blue-700 dark:text-blue-400 font-black">"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.</li>
                <li>Confirmez : l'icône officielle <strong>KalanGest</strong> apparaîtra avec vos applications !</li>
              </ol>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Share className="w-4 h-4 text-blue-600" /> Sur iPhone ou iPad (Safari) :
              </h4>
              <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 list-decimal pl-5 font-semibold">
                <li>Ouvrez impérativement le lien dans le navigateur <strong>Safari</strong>.</li>
                <li>Appuyez sur le bouton <strong className="text-blue-700 dark:text-blue-400 font-black flex items-center gap-1 inline-flex"><Share className="w-3.5 h-3.5" /> Partager</strong> en bas de votre écran.</li>
                <li>Faites défiler vers le bas et appuyez sur <strong className="text-blue-700 dark:text-blue-400 font-black flex items-center gap-1 inline-flex"><PlusSquare className="w-3.5 h-3.5" /> Sur l'écran d'accueil</strong>.</li>
                <li>Validez en haut à droite en appuyant sur <strong>"Ajouter"</strong>.</li>
              </ol>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-600" /> Sur Ordinateur (Google Chrome / Microsoft Edge) :
              </h4>
              <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 list-decimal pl-5 font-semibold">
                <li>Ouvrez le lien dans <strong>Chrome</strong> ou <strong>Edge</strong>.</li>
                <li>Cliquez sur l'icône d'installation <strong className="text-blue-700 dark:text-blue-400 font-black">⊕</strong> située à droite dans la barre d'adresse.</li>
                <li>Cliquez sur <strong>"Installer"</strong> pour lancer KalanGest comme une vraie application de bureau autonome.</li>
              </ol>
            </div>
          )}

          {/* Guarantee Footer Badge */}
          <div className="flex items-center justify-between p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl text-xs font-bold text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Application PWA sécurisée &amp; rapide — Fonctionne hors-ligne (Offline) avec stockage local.</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
