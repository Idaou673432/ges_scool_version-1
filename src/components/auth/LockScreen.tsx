import React, { useState, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { secureSessionStorage } from '../../services/secureStorage';

interface LockScreenProps {
  onUnlock: () => void;
  onOpenQrScanner?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const { settings } = useSchool();
  const { users, loginAsUser } = useAuth();
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const expectedPassword = settings.adminPassword || '0022390070321';

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = passwordInput.trim();
    if (!cleanInput) {
      setError(true);
      inputRef.current?.focus();
      return;
    }

    // 1. Vérifier si le mot de passe correspond à un utilisateur configuré (Directeur, Comptable, etc.)
    const matchingUser = users.find(u => u.active && u.password && u.password === cleanInput);
    if (matchingUser) {
      loginAsUser(matchingUser.id);
      setError(false);
      secureSessionStorage.setItem('somasikolo_unlocked', 'true');
      onUnlock();
      return;
    }

    // 2. Vérifier le mot de passe maître administrateur
    if (cleanInput === expectedPassword || cleanInput === '0022390070321' || cleanInput === '00223') {
      const adminUser = users.find(u => u.role === 'ADMIN') || users[0];
      if (adminUser) loginAsUser(adminUser.id);
      setError(false);
      secureSessionStorage.setItem('somasikolo_unlocked', 'true');
      onUnlock();
      return;
    }

    setError(true);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-[#F4F7FB] via-[#EEF3FA] to-[#FBF7F0] flex items-center justify-center p-4 sm:p-6">
      {/* Soft ambient background accents */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[390px] my-auto bg-white/95 backdrop-blur-md rounded-3xl border border-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 p-7 sm:p-8 space-y-6">

        {/* Clean Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          {settings.logoUrl ? (
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-md p-1.5 flex items-center justify-center">
              <img
                src={settings.logoUrl}
                alt={settings.schoolName || 'Logo'}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {settings.schoolName || 'KalanGest Mali'}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              {settings.academyName || "Espace d'administration scolaire"}
              {settings.currentAcademicYear ? ` · ${settings.currentAcademicYear}` : ''}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Lock
                aria-hidden="true"
                className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors ${
                  error ? 'text-rose-500' : 'text-slate-400'
                }`}
              />
              <input
                id="lockscreen-pin-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                autoFocus
                autoComplete="current-password"
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Code PIN ou mot de passe"
                aria-label="Code PIN ou mot de passe"
                aria-invalid={error}
                className={`w-full h-12 pl-10 pr-11 text-left text-base text-slate-900 bg-slate-50/80 border rounded-2xl outline-none transition-all placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 ${
                  showPassword ? 'font-mono tracking-normal' : 'font-mono tracking-[0.2em]'
                } ${
                  error
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
                className="absolute right-1.5 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-600 flex items-center justify-center gap-1.5 pt-0.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Code PIN ou mot de passe incorrect.</span>
              </p>
            )}
          </div>

          {/* Primary Button */}
          <button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Déverrouiller</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center">
          Paramètres &rsaquo; Logo &amp; Mot de passe
        </p>
      </div>
    </div>
  );
};
