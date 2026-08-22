import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Lock, ShieldAlert } from 'lucide-react';

interface DeleteAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  itemCount?: number;
}

export const DeleteAllModal: React.FC<DeleteAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description = "Cette action supprimera définitivement tous les éléments enregistrés dans ce module. Cette opération est irréversible.",
  itemCount
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0000') {
      onConfirm();
      onClose();
    } else {
      setError('Mot de passe de validation incorrect !');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-red-200 dark:border-red-900 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-700/80 rounded-2xl">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide uppercase">{title}</h2>
              {itemCount !== undefined && (
                <p className="text-xs font-bold text-red-100">{itemCount} élément(s) concerné(s)</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-red-200 hover:text-white hover:bg-red-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-900 dark:text-red-200 leading-relaxed">
              {description}
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Saisissez le mot de passe de validation :</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Entrez le mot de passe"
              autoFocus
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center text-lg font-black tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-red-500 transition-all"
            />
            {error && (
              <p className="text-xs font-black text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!password}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Tout Supprimer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
