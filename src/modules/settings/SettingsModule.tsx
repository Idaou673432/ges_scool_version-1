/**
 * SomaSikolo - Paramètres École
 */

import React, { useState } from 'react';
import { Settings, CheckCircle2, Save, Key, Eye, EyeOff, Image, Trash2, Lock, ShieldAlert, Upload, Calendar, RotateCcw, Calculator, Sliders, Cloud, Smartphone, Laptop, Copy, Check, Share2, UploadCloud, RefreshCw } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { MALI_ACADEMIES, DEFAULT_EVALUATION_MONTHS, getTermLabel } from '../../constants/maliEducation';
import { PwaInstallModal } from '../../components/common/PwaInstallModal';

const MONTH_OPTIONS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre', 
  'Janvier', 'Février', 'Mars', 'Avril', 
  'Mai', 'Juin', 'Juillet', 'Août'
];

export const SettingsModule: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    cloudSchoolCode, 
    syncStatus, 
    syncStatusMessage, 
    switchOrJoinSchool, 
    forceCloudPush,
    students,
    classes
  } = useSchool();
  const [formData, setFormData] = useState({
    ...settings,
    adminPassword: settings.adminPassword || '0022390070321',
    evaluationCount: settings.evaluationCount || 9,
    evaluationsPerTrimester1stCycle: settings.evaluationsPerTrimester1stCycle ?? 3,
    evaluationsPerTrimester2ndCycle: settings.evaluationsPerTrimester2ndCycle ?? 2,
    evaluationCount1stCycle: settings.evaluationCount1stCycle ?? ((settings.evaluationsPerTrimester1stCycle ?? 3) * 3),
    evaluationCount2ndCycle: settings.evaluationCount2ndCycle ?? ((settings.evaluationsPerTrimester2ndCycle ?? 2) * 3),
    evaluationMonths: settings.evaluationMonths || { ...DEFAULT_EVALUATION_MONTHS }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testPasswordInput, setTestPasswordInput] = useState('');
  const [testResult, setTestResult] = useState<'IDLE' | 'SUCCESS' | 'FAIL'>('IDLE');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGO_SECURITY' | 'EVALUATION_CALENDAR' | 'CALCULATION_FORMULA' | 'CLOUD_SYNC'>('INFO');
  
  // Cloud Sync form state
  const [targetCode, setTargetCode] = useState(cloudSchoolCode);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleMonthChange = (termKey: string, monthValue: string) => {
    setFormData(prev => ({
      ...prev,
      evaluationMonths: {
        ...(prev.evaluationMonths || DEFAULT_EVALUATION_MONTHS),
        [termKey]: monthValue
      }
    }));
  };

  const handleResetMonths = () => {
    if (window.confirm('Voulez-vous réinitialiser les mois d\'évaluation aux valeurs par défaut ?')) {
      setFormData(prev => ({
        ...prev,
        evaluationMonths: { ...DEFAULT_EVALUATION_MONTHS }
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image trop lourde. Veuillez choisir une image de moins de 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          setFormData(prev => ({ ...prev, logoUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image trop lourde. Veuillez choisir une image de moins de 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          setFormData(prev => ({ ...prev, stampUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-900" />
            <span>Paramètres Établissement</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Académie, CAP & agrément • Logo officiel et sécurité de l'application
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-full text-xs font-black uppercase tracking-widest flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'INFO' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Fiche École
          </button>
          <button
            onClick={() => setActiveTab('LOGO_SECURITY')}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'LOGO_SECURITY' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Logo & Mot de Passe
          </button>
          <button
            onClick={() => setActiveTab('EVALUATION_CALENDAR')}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'EVALUATION_CALENDAR' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mois d'Évaluation</span>
          </button>
          <button
            onClick={() => setActiveTab('CALCULATION_FORMULA')}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'CALCULATION_FORMULA' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Formules de Calcul</span>
          </button>
          <button
            onClick={() => setActiveTab('CLOUD_SYNC')}
            className={`px-5 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'CLOUD_SYNC' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud & Multi-Appareils</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Paramètres mis à jour avec succès.</span>
        </div>
      )}

      {activeTab === 'INFO' && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom Officiel de l'Établissement *</label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Académie d'Enseignement *</label>
              <select
                value={formData.academyName}
                onChange={e => setFormData({ ...formData, academyName: e.target.value })}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
              >
                {MALI_ACADEMIES.map(ac => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Centre d'Animation Pédagogique (CAP) *</label>
              <input
                type="text"
                required
                value={formData.capName}
                onChange={e => setFormData({ ...formData, capName: e.target.value })}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">N° Agrément / Autorisation MEN *</label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom du Directeur / Proviseur *</label>
              <input
                type="text"
                required
                value={formData.directorName}
                onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Année Académique Active *</label>
              <input
                type="text"
                required
                value={formData.currentAcademicYear}
                onChange={e => setFormData({ ...formData, currentAcademicYear: e.target.value })}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-4 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder les Modifications</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'LOGO_SECURITY' && (
        <div className="space-y-8">
          {/* LOGO SECTION */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center font-black">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase">
                  Logo de l'Établissement
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  Importez ou modifiez le logo officiel apparaissant sur les reçus, bulletins et cartes scolaires.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              {/* Logo Preview Box */}
              <div className="w-32 h-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-3 text-center shadow-xs overflow-hidden shrink-0">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo de l'établissement" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center gap-1">
                    <Image className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Aucun Logo</span>
                  </div>
                )}
              </div>

              {/* Logo Action Buttons */}
              <div className="space-y-4 text-center sm:text-left">
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-md transition-all">
                    <Upload className="w-4 h-4" />
                    <span>Choisir une Image (PNG/JPG)</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logoUrl: undefined }))}
                      className="flex items-center gap-2 px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer le Logo</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-medium max-w-md">
                  💡 Format recommandé : PNG carré ou rectangulaire sur fond transparent. Taille maximale : 2 Mo. Ce logo apparaîtra automatiquement sur tous les documents officiels.
                </p>
              </div>
            </div>
          </div>

          {/* CACHET ET SIGNATURE SECTION */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center font-black">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase">
                  Cachet & Signature Officielle du Directeur
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  Importez le tampon et la signature numérisée pour authentifier les bulletins et reçus.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="w-32 h-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-3 text-center shadow-xs overflow-hidden shrink-0">
                {formData.stampUrl ? (
                  <img src={formData.stampUrl} alt="Cachet et signature" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center gap-1">
                    <Image className="w-8 h-8 text-amber-700/40" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Aucun Cachet</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 text-center sm:text-left">
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 px-6 py-3 bg-amber-800 hover:bg-amber-900 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-md transition-all">
                    <Upload className="w-4 h-4" />
                    <span>Choisir Cachet / Signature (PNG)</span>
                    <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                  </label>

                  {formData.stampUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, stampUrl: undefined }))}
                      className="flex items-center gap-2 px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer le Cachet</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-medium max-w-md">
                  💡 Format recommandé : Image PNG sur fond transparent avec le sceau bleu/noir de l'école et la signature. S'imprime automatiquement au bas des bulletins A4.
                </p>
              </div>
            </div>
          </div>

          {/* MOT DE PASSE SECTION */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-900 rounded-2xl flex items-center justify-center font-black">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Mot de Passe Administrateur (Code PIN)
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    Définissez et modifiez le code de sécurité requis pour les actions sensibles (Comptabilité, Suppression, Accès).
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Statut : <strong className="font-mono text-emerald-900 text-sm">Protégé par Code PIN</strong></span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Nouveau Mot de Passe / Code PIN *
                  </label>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.adminPassword}
                      onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full p-3.5 pr-12 bg-white border border-slate-200 rounded-full text-sm font-black font-mono text-slate-900 outline-none focus:ring-2 focus:ring-blue-900 tracking-wider"
                      placeholder="Saisissez un nouveau code"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                    Modifiez et enregistrez pour mettre à jour votre mot de passe de sécurité.
                  </p>
                </div>

                {/* Tester le code */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Tester le Code PIN en direct
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={testPasswordInput}
                      onChange={e => {
                        setTestPasswordInput(e.target.value);
                        setTestResult('IDLE');
                      }}
                      placeholder="Saisissez le code pour tester..."
                      className="flex-1 p-3 bg-white border border-slate-200 rounded-full text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (testPasswordInput === (formData.adminPassword || '0022390070321')) {
                          setTestResult('SUCCESS');
                        } else {
                          setTestResult('FAIL');
                        }
                      }}
                      className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer"
                    >
                      Vérifier
                    </button>
                  </div>

                  {testResult === 'SUCCESS' && (
                    <p className="text-xs font-black text-emerald-600 flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Code Correct ! Mot de passe valide.</span>
                    </p>
                  )}
                  {testResult === 'FAIL' && (
                    <p className="text-xs font-black text-rose-600 flex items-center gap-1.5 pt-1">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Code Invalide. Le mot de passe ne correspond pas.</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer le Logo & Mot de Passe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'EVALUATION_CALENDAR' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Intro Card */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center font-black">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Configuration des Mois d'Évaluation
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Modifiez le mois ou la période associée à chaque évaluation (ex: Évaluation N°1 = Octobre)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetMonths}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser par Défaut</span>
              </button>
            </div>

            {/* NOMBRE D'EVALUATIONS & MENSUALITES PAR CYCLE */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Liaison entre le Nombre d'Évaluations et les Mensualités (Scolarité)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Chaque évaluation mensuelle correspond à 1 mensualité due. Si le 1er cycle organise 2 évaluations dans l'année, les parents ne payent que 2 mensualités.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1er Cycle */}
                <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                      Premier Cycle (Fondamental)
                    </span>
                    <span className="text-[10px] font-bold text-amber-800">
                      {formData.evaluationCount1stCycle || 2} Mensualité(s) Dues
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Nombre d'évaluations mensuelles / devoirs retenus au 1er Cycle :
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.evaluationCount1stCycle ?? 2}
                      onChange={e => setFormData(prev => ({ ...prev, evaluationCount1stCycle: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) }))}
                      className="w-24 p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-950 text-center outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-amber-900">
                      = {(formData.evaluationCount1stCycle ?? 2)} mensualité(s) à payer
                    </span>
                  </div>
                </div>

                {/* 2ème Cycle & Lycée */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                      Second Cycle & Lycée
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      {formData.evaluationCount2ndCycle || 6} Mensualité(s) Dues
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Nombre d'évaluations mensuelles / devoirs retenus au 2ème Cycle & Lycée :
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.evaluationCount2ndCycle ?? 6}
                      onChange={e => setFormData(prev => ({ ...prev, evaluationCount2ndCycle: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) }))}
                      className="w-24 p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-950 text-center outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-black text-emerald-900">
                      = {(formData.evaluationCount2ndCycle ?? 6)} mensualité(s) à payer
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Nombre d'évaluations global par défaut :</h4>
                  <p className="text-[11px] text-slate-500">Utilisé si aucune catégorie n'est précisée dans la classe</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.evaluationCount || 9}
                    onChange={e => setFormData(prev => ({ ...prev, evaluationCount: Math.max(1, Math.min(12, parseInt(e.target.value) || 9)) }))}
                    className="w-20 p-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <span className="text-xs font-medium text-slate-500">évaluations / an</span>
                </div>
              </div>
            </div>

            {/* Évaluations Mensuelles (1er Cycle & Devoirs) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                    Premier & Second Cycle
                  </span>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Liste des {formData.evaluationCount || 9} Évaluations Définies
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: formData.evaluationCount || 9 }, (_, i) => {
                  const num = i + 1;
                  const key = `EVALUATION_${num}`;
                  const defaultMonthsMap: Record<number, string> = {
                    1: 'Octobre', 2: 'Novembre', 3: 'Décembre', 4: 'Janvier', 5: 'Février',
                    6: 'Mars', 7: 'Avril', 8: 'Mai', 9: 'Juin', 10: 'Juillet', 11: 'Août', 12: 'Septembre'
                  };
                  const defaultMonth = defaultMonthsMap[num] || `Mois ${num}`;
                  const currentMonth = formData.evaluationMonths?.[key] || defaultMonth;
                  const isStandard = MONTH_OPTIONS.includes(currentMonth);

                  return (
                    <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-900 uppercase">
                          Évaluation N°{num}
                        </label>
                        <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                          Mois {num}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <select
                          value={isStandard ? currentMonth : 'CUSTOM'}
                          onChange={e => {
                            if (e.target.value !== 'CUSTOM') {
                              handleMonthChange(key, e.target.value);
                            }
                          }}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
                        >
                          {MONTH_OPTIONS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="CUSTOM">Personnalisé / Libellé libre...</option>
                        </select>

                        {(!isStandard || currentMonth === 'CUSTOM') && (
                          <input
                            type="text"
                            value={currentMonth === 'CUSTOM' ? '' : currentMonth}
                            onChange={e => handleMonthChange(key, e.target.value)}
                            placeholder="Ex: Octobre - Éval 1"
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          />
                        )}
                      </div>

                      <p className="text-[10px] font-medium text-slate-400">
                        Affiche : <strong className="text-slate-800">{getTermLabel(key, formData.evaluationMonths, formData.evaluationCount || 9)}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trimestres */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                  2ème Cycle & Lycée
                </span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Trimestres Scolaires
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'TRIMESTRE_1', label: '1er Trimestre', defaultVal: 'Octobre - Décembre' },
                  { key: 'TRIMESTRE_2', label: '2ème Trimestre', defaultVal: 'Janvier - Mars' },
                  { key: 'TRIMESTRE_3', label: '3ème Trimestre', defaultVal: 'Avril - Juin' },
                ].map(t => (
                  <div key={t.key} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <label className="text-xs font-black text-slate-900 uppercase">
                      {t.label}
                    </label>
                    <input
                      type="text"
                      value={formData.evaluationMonths?.[t.key] || t.defaultVal}
                      onChange={e => handleMonthChange(t.key, e.target.value)}
                      placeholder={t.defaultVal}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    <p className="text-[10px] font-medium text-slate-400">
                      Affiche : <strong className="text-slate-800">{getTermLabel(t.key, formData.evaluationMonths)}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Semestres */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                  BT & Technique
                </span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Semestres
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'SEMESTRE_1', label: '1er Semestre', defaultVal: 'Octobre - Février' },
                  { key: 'SEMESTRE_2', label: '2ème Semestre', defaultVal: 'Mars - Juin' },
                ].map(s => (
                  <div key={s.key} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <label className="text-xs font-black text-slate-900 uppercase">
                      {s.label}
                    </label>
                    <input
                      type="text"
                      value={formData.evaluationMonths?.[s.key] || s.defaultVal}
                      onChange={e => handleMonthChange(s.key, e.target.value)}
                      placeholder={s.defaultVal}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    <p className="text-[10px] font-medium text-slate-400">
                      Affiche : <strong className="text-slate-800">{getTermLabel(s.key, formData.evaluationMonths)}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-4 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer le Calendrier d'Évaluations</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB: CALCULATION_FORMULA */}
      {activeTab === 'CALCULATION_FORMULA' && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-900" />
                <span>Formules & Config. des Évaluations par Trimestre</span>
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                Définissez le nombre d'évaluations par trimestre et par cycle (Fondamental vs Secondaire) et choisissez la formule exacte de calcul des moyennes.
              </p>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer la Configuration</span>
            </button>
          </div>

          {/* PANNEAU DÉDIÉ: NOMBRE D'ÉVALUATIONS PAR TRIMESTRE ET PAR CYCLE */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-3xl text-white space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                <Sliders className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Panneau de Configuration : Nombre d'Évaluations par Trimestre
                </h3>
                <p className="text-xs text-blue-200/80 font-medium mt-0.5">
                  Ajustez le nombre de devoirs / interrogations comptabilisés dans le calcul de la Note de Classe chaque trimestre.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Cycle Fondamental */}
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/30 text-amber-300 rounded-full font-black text-[10px] uppercase tracking-wider">
                    Cycle Fondamental (Notes / 10)
                  </span>
                  <span className="text-[10px] font-bold text-blue-200 bg-blue-900/60 px-2.5 py-1 rounded-full border border-blue-400/30">
                    {(formData.evaluationsPerTrimester1stCycle || 3) * 3} devoirs/an
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Évaluations / Devoirs retenus par trimestre :
                  </label>
                  <p className="text-[11px] text-blue-200/70 mb-3">
                    Nombre d'interrogations / devoirs dont la moyenne forme la Note de Classe du trimestre.
                  </p>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          evaluationsPerTrimester1stCycle: num,
                          evaluationCount1stCycle: num * 3
                        }))}
                        className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                          (formData.evaluationsPerTrimester1stCycle || 3) === num
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black scale-105'
                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                        }`}
                      >
                        {num} / Trim.
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-300">Saisie sur mesure :</span>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formData.evaluationsPerTrimester1stCycle || 3}
                      onChange={e => {
                        const val = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
                        setFormData(prev => ({
                          ...prev,
                          evaluationsPerTrimester1stCycle: val,
                          evaluationCount1stCycle: val * 3
                        }));
                      }}
                      className="w-20 p-2 bg-slate-900/80 border border-white/20 rounded-xl text-xs font-black text-white text-center outline-none focus:border-amber-400"
                    />
                    <span className="text-[11px] font-semibold text-blue-200">évaluations / trimestre</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/10 text-[11px] space-y-1.5 font-mono">
                  <p className="text-amber-300 font-bold">📐 Impact sur la Note de Classe (Fondamental) :</p>
                  <p className="text-slate-300">
                    Note de Classe = (Devoir 1 + ... + Devoir {formData.evaluationsPerTrimester1stCycle || 3}) / {formData.evaluationsPerTrimester1stCycle || 3}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Scolarité annuelle = {(formData.evaluationsPerTrimester1stCycle || 3) * 3} mensualités dues.
                  </p>
                </div>
              </div>

              {/* Card Cycle Secondaire / Lycée */}
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-emerald-400/20 border border-emerald-300/30 text-emerald-300 rounded-full font-black text-[10px] uppercase tracking-wider">
                    Cycle Secondaire & Lycée (Notes / 20)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-200 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-400/30">
                    {(formData.evaluationsPerTrimester2ndCycle || 2) * 3} devoirs/an
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Évaluations / Devoirs retenus par trimestre :
                  </label>
                  <p className="text-[11px] text-blue-200/70 mb-3">
                    Nombre d'interrogations / devoirs dont la moyenne forme la Note de Classe du trimestre.
                  </p>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          evaluationsPerTrimester2ndCycle: num,
                          evaluationCount2ndCycle: num * 3
                        }))}
                        className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                          (formData.evaluationsPerTrimester2ndCycle || 2) === num
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-md font-black scale-105'
                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                        }`}
                      >
                        {num} / Trim.
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-300">Saisie sur mesure :</span>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formData.evaluationsPerTrimester2ndCycle || 2}
                      onChange={e => {
                        const val = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
                        setFormData(prev => ({
                          ...prev,
                          evaluationsPerTrimester2ndCycle: val,
                          evaluationCount2ndCycle: val * 3
                        }));
                      }}
                      className="w-20 p-2 bg-slate-900/80 border border-white/20 rounded-xl text-xs font-black text-white text-center outline-none focus:border-emerald-400"
                    />
                    <span className="text-[11px] font-semibold text-blue-200">évaluations / trimestre</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/10 text-[11px] space-y-1.5 font-mono">
                  <p className="text-emerald-300 font-bold">📐 Impact sur la Note de Classe (Secondaire) :</p>
                  <p className="text-slate-300">
                    Note de Classe = (Devoir 1 + ... + Devoir {formData.evaluationsPerTrimester2ndCycle || 2}) / {formData.evaluationsPerTrimester2ndCycle || 2}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Scolarité annuelle = {(formData.evaluationsPerTrimester2ndCycle || 2) * 3} mensualités dues.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1er Cycle */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                Premier Cycle Fondamental (Notes / 10)
              </span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Mode de Calcul de la Moyenne Trimestrielle
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'MALI_OFFICIAL', label: 'Modèle Standard Malien', formula: '(Note Classe + Composition) / 2', desc: 'Moyenne égale entre devoirs et composition.' },
                { id: 'EQUAL_WEIGHT', label: 'Moyenne Égale (50% / 50%)', formula: '(Note Classe + Composition) / 2', desc: 'Devoirs et composition ont le même poids.' },
                { id: 'CLASS_ONLY', label: 'Notes de Classe Seules (100%)', formula: 'Note de Classe', desc: 'Ignore la composition, uniquement les devoirs.' },
                { id: 'COMP_ONLY', label: 'Composition Seule (100%)', formula: 'Composition', desc: 'Ignore les devoirs, uniquement la composition.' },
                { id: 'CUSTOM', label: 'Pondération Sur-Mesure', formula: '(Classe × Poids1 + Comp × Poids2) / Total', desc: 'Définissez vos propres coefficients pour devoirs et composition.' },
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setFormData(prev => ({ ...prev, calculationFormula1stCycle: item.id as any }))}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    (formData.calculationFormula1stCycle || 'MALI_OFFICIAL') === item.id
                      ? 'bg-blue-50/80 border-blue-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase">{item.label}</span>
                    <input
                      type="radio"
                      name="calc1st"
                      checked={(formData.calculationFormula1stCycle || 'MALI_OFFICIAL') === item.id}
                      onChange={() => {}}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-blue-900 bg-white/80 px-2 py-1 rounded border border-blue-100 inline-block">
                    {item.formula}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>

            {formData.calculationFormula1stCycle === 'CUSTOM' && (
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200/80 space-y-3">
                <h4 className="text-xs font-black text-blue-950 uppercase">Coefficients Personnalisés (1er Cycle)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Poids Devoirs / Note de Classe :</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.classScoreWeight1st ?? 1}
                      onChange={e => setFormData(prev => ({ ...prev, classScoreWeight1st: parseFloat(e.target.value) || 1 }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Poids Composition :</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.compScoreWeight1st ?? 1}
                      onChange={e => setFormData(prev => ({ ...prev, compScoreWeight1st: parseFloat(e.target.value) || 1 }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2ème Cycle / Lycée */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full font-black text-[10px] uppercase tracking-wider">
                Second Cycle & Lycée (Notes / 20)
              </span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Mode de Calcul de la Moyenne Trimestrielle
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'MALI_OFFICIAL', label: 'Officiel Mali (Coef 1 Devoir, Coef 2 Comp)', formula: '(Note Classe /20 + Comp /40) / 3', desc: 'Composition compte double par rapport aux devoirs.' },
                { id: 'EQUAL_WEIGHT', label: 'Moyenne Égale (50% / 50%)', formula: '(Note Classe /20 + Comp /20) / 2', desc: 'Devoirs et composition ont le même coefficient (1 et 1).' },
                { id: 'CLASS_ONLY', label: 'Notes de Classe Seules (100%)', formula: 'Note de Classe /20', desc: 'Seuls les devoirs comptent dans la moyenne trimestrielle.' },
                { id: 'COMP_ONLY', label: 'Composition Seule (100%)', formula: 'Composition /20', desc: 'Seule la composition compte dans la moyenne trimestrielle.' },
                { id: 'CUSTOM', label: 'Coefficients Sur-Mesure', formula: '(Classe × Poids1 + Comp × Poids2) / Total', desc: 'Choisissez les poids exacts pour devoirs et composition.' },
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setFormData(prev => ({ ...prev, calculationFormula2ndCycle: item.id as any }))}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    (formData.calculationFormula2ndCycle || 'MALI_OFFICIAL') === item.id
                      ? 'bg-emerald-50/80 border-emerald-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase">{item.label}</span>
                    <input
                      type="radio"
                      name="calc2nd"
                      checked={(formData.calculationFormula2ndCycle || 'MALI_OFFICIAL') === item.id}
                      onChange={() => {}}
                      className="text-emerald-900 focus:ring-emerald-900"
                    />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-emerald-900 bg-white/80 px-2 py-1 rounded border border-emerald-100 inline-block">
                    {item.formula}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>

            {formData.calculationFormula2ndCycle === 'CUSTOM' && (
              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/80 space-y-3">
                <h4 className="text-xs font-black text-emerald-950 uppercase">Coefficients Personnalisés (2ème Cycle & Lycée)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Coefficient Devoirs / Note de Classe :</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.classScoreWeight2nd ?? 1}
                      onChange={e => setFormData(prev => ({ ...prev, classScoreWeight2nd: parseFloat(e.target.value) || 1 }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Coefficient Composition :</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.compScoreWeight2nd ?? 2}
                      onChange={e => setFormData(prev => ({ ...prev, compScoreWeight2nd: parseFloat(e.target.value) || 2 }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Absences de Notes */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Gestion des Absences de Notes dans la Période
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase block">
                  Si un élève n'a PAS de note de Devoirs :
                </label>
                <select
                  value={formData.missingClassScoreBehavior || 'USE_COMP_ONLY'}
                  onChange={e => setFormData(prev => ({ ...prev, missingClassScoreBehavior: e.target.value as any }))}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
                >
                  <option value="USE_COMP_ONLY">Prendre la note de Composition seule comme moyenne</option>
                  <option value="ZERO">Compter la note de devoirs comme 0/20 (ou 0/10)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase block">
                  Si un élève n'a PAS de note de Composition :
                </label>
                <select
                  value={formData.missingCompScoreBehavior || 'USE_CLASS_ONLY'}
                  onChange={e => setFormData(prev => ({ ...prev, missingCompScoreBehavior: e.target.value as any }))}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
                >
                  <option value="USE_CLASS_ONLY">Prendre la moyenne des Devoirs comme moyenne trimestrielle</option>
                  <option value="ZERO">Compter la composition comme 0/20 (ou 0/10)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-4 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Formules & Config.</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: CLOUD_SYNC */}
      {activeTab === 'CLOUD_SYNC' && (
        <div className="space-y-8">
          {/* Status & Overview */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center font-black">
                  <Cloud className="w-6 h-6 text-blue-900" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">
                    Synchronisation Multi-Établissements & Multi-Appareils
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Permet d'utiliser KalanGest sur plusieurs téléphones et ordinateurs simultanément avec les mêmes données.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                  syncStatus === 'CONNECTED' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{syncStatus === 'CONNECTED' ? 'Synchronisé en Direct' : syncStatus}</span>
                </span>
              </div>
            </div>

            {/* School Code Highlight Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-sky-300">
                  Code Établissement Partagé (Identifiant Cloud Unique)
                </span>
                <span className="text-[11px] font-bold text-slate-300">
                  {students.length} Élève(s) • {classes.length} Classe(s)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 bg-black/50 border border-white/20 px-5 py-3.5 rounded-2xl font-mono text-xl font-black text-amber-300 tracking-wider select-all">
                  {cloudSchoolCode}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cloudSchoolCode);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2500);
                  }}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
                >
                  {codeCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{codeCopied ? 'Code Copié !' : 'Copier le Code'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                👉 <strong>Pour connecter votre téléphone ou un autre PC :</strong> Ouvrez l'application sur l'appareil, accédez à cet écran (ou cliquez sur le bouton Cloud dans l'en-tête), collez le code <strong className="text-amber-300">{cloudSchoolCode}</strong> et validez. Vos notes, inscriptions et caisse se synchroniseront automatiquement !
              </p>
            </div>

            {/* Form to change / join school code */}
            <div className="pt-4 space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Rejoindre une autre école ou changer de code
              </h3>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={targetCode}
                  onChange={e => setTargetCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ECOLE-HAMDALLAYE"
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-900 tracking-wider outline-none focus:ring-2 focus:ring-blue-900"
                />

                <button
                  type="button"
                  disabled={isCloudBusy || !targetCode.trim()}
                  onClick={async () => {
                    if (!targetCode.trim()) return;
                    setIsCloudBusy(true);
                    setCloudMessage(null);
                    try {
                      const ok = await switchOrJoinSchool(targetCode, formData.schoolName, formData.adminPassword);
                      if (ok) {
                        setCloudMessage({ text: `Connecté à l'établissement [${targetCode.toUpperCase()}] avec succès !`, isError: false });
                      } else {
                        setCloudMessage({ text: "Échec de connexion au code établissement.", isError: true });
                      }
                    } catch (e) {
                      setCloudMessage({ text: "Erreur de connexion.", isError: true });
                    } finally {
                      setIsCloudBusy(false);
                    }
                  }}
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCloudBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                  <span>Se Connecter</span>
                </button>

                <button
                  type="button"
                  disabled={isCloudBusy}
                  onClick={async () => {
                    setIsCloudBusy(true);
                    setCloudMessage(null);
                    try {
                      const ok = await forceCloudPush();
                      if (ok) {
                        setCloudMessage({ text: "Toutes les données ont été synchronisées vers le Cloud !", isError: false });
                      } else {
                        setCloudMessage({ text: "Erreur de synchronisation.", isError: true });
                      }
                    } catch (e) {
                      setCloudMessage({ text: "Erreur réseau Cloud.", isError: true });
                    } finally {
                      setIsCloudBusy(false);
                    }
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  title="Téléverser toutes les données locales vers Firebase Firestore"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Forcer Envoi Cloud</span>
                </button>
              </div>

              {cloudMessage && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  cloudMessage.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{cloudMessage.text}</span>
                </div>
              )}
            </div>

            {/* Architecture Multi-Écoles & Multi-Appareils expliquée */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-900" />
                Comment fonctionne l'utilisation simultanée :
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <strong className="block text-xs font-black text-slate-900">1. Bureau & Direction</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Le directeur inscrit les élèves, enregistre les paiements et génère les bulletins officiels.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <strong className="block text-xs font-black text-slate-900">2. Enseignants sur Mobile</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Les professeurs saisissent les notes de devoirs et compositions directement depuis leur smartphone en classe.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <strong className="block text-xs font-black text-slate-900">3. Cloud Firestore</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Chaque modification est instantanément répliquée sur tous les appareils connectés au même code d'école.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Installation Modal */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
    </div>
  );
};
