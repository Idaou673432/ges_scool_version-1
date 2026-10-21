import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Apple } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm transition-all cursor-pointer ${className}`}
        title="Installer l'application sur votre appareil pour un accès hors-ligne instantané"
      >
        <Download className="w-3.5 h-3.5 text-slate-950" />
        <span>Installer l'App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-all cursor-pointer ${className}`}
          title="Installer sur iPhone / iPad"
        >
          <Apple className="w-3.5 h-3.5 text-slate-300" />
          <span>Installer iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Installer sur iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-500">Accès hors-ligne direct depuis l'écran d'accueil</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-900 text-white text-[10px] font-black">
                    1
                  </span>
                  <p>
                    Appuyez sur le bouton <strong>Partager</strong> <span className="text-blue-600 font-bold">⎋</span> dans la barre inférieure de Safari.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-900 text-white text-[10px] font-black">
                    2
                  </span>
                  <p>
                    Faites défiler vers le bas et touchez <strong>Sur l'écran d'accueil</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium">
                    L'icône SomaSikolo apparaîtra avec vos autres applications et fonctionnera même sans connexion !
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
