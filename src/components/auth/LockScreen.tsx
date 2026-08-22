import React, { useState } from 'react';
import { Lock, Key, Eye, EyeOff, ShieldCheck, AlertCircle, Building2, ArrowRight } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const { settings } = useSchool();
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const expectedPassword = settings.adminPassword || '0022390070321';

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === expectedPassword) {
      setError(false);
      sessionStorage.setItem('somasikolo_unlocked', 'true');
      onUnlock();
    } else {
      setError(true);
    }
  };

  const handleKeypadPress = (val: string) => {
    setError(false);
    if (val === 'CLEAR') {
      setPasswordInput('');
    } else if (val === 'BACK') {
      setPasswordInput(prev => prev.slice(0, -1));
    } else {
      setPasswordInput(prev => prev + val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-slate-950 to-black">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 space-y-8 border border-slate-800 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Decorative Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-900 via-emerald-600 to-amber-500" />

        {/* Branding & Logo */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center justify-center">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo Établissement"
                className="w-20 h-20 object-contain rounded-2xl border-2 border-slate-100 p-1 bg-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                <Building2 className="w-8 h-8" />
              </div>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {settings.academyName || 'Académie d\'Enseignement'}
            </span>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {settings.schoolName || 'KalanGest Mali'}
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-900 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Lock className="w-3 h-3 text-blue-800" />
            <span>Accès Sécurisé • Entrez le mot de passe</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setError(false);
                }}
                placeholder="Saisissez votre Code PIN / Mot de passe"
                className={`w-full p-4 pr-12 text-center text-lg font-black font-mono text-slate-900 bg-slate-50 border rounded-2xl outline-none transition-all ${
                  error 
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20' 
                    : 'border-slate-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <p className="text-xs font-black text-rose-600 text-center flex items-center justify-center gap-1.5 animate-bounce">
                <AlertCircle className="w-4 h-4" />
                <span>Code PIN / Mot de passe incorrect ! Veuillez réessayer.</span>
              </p>
            )}
          </div>

          {/* Quick Keypad for Touch / PIN entry */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-blue-900 active:text-white rounded-xl text-base font-black text-slate-800 transition-all cursor-pointer shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('CLEAR')}
              className="py-3 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-blue-900 active:text-white rounded-xl text-base font-black text-slate-800 transition-all cursor-pointer shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('BACK')}
              className="py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
            >
              ⌫
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-900 hover:bg-blue-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Déverrouiller l'Application</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            Modifiable à tout moment dans <strong className="text-slate-600">Paramètres ➔ Logo & Mot de passe</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
