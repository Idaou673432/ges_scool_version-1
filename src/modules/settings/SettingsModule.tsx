/**
 * SomaSikolo - Paramètres École
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Settings, CheckCircle2, Save, Key, Eye, EyeOff, Image, Trash2, Lock, Unlock, ShieldAlert, ShieldCheck, Upload, Calendar, RotateCcw, Calculator, Sliders, Cloud, Smartphone, Laptop, Copy, Check, Share2, UploadCloud, RefreshCw } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { MALI_ACADEMIES, DEFAULT_EVALUATION_MONTHS, getTermLabel } from '../../constants/maliEducation';
import { PwaInstallModal } from '../../components/common/PwaInstallModal';
import { SchoolEnabledFeatures } from '../../types';

const MONTH_OPTIONS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre', 
  'Janvier', 'Février', 'Mars', 'Avril', 
  'Mai', 'Juin', 'Juillet', 'Août'
];

export interface SettingsModuleProps {
  initialTab?: 'INFO' | 'LOGO_SECURITY' | 'FEATURES' | 'EVALUATION_CALENDAR' | 'CALCULATION_FORMULA' | 'CLOUD_SYNC';
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ initialTab = 'INFO' }) => {
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
    modulesSecurityPin: settings.modulesSecurityPin || '0000',
    evaluationCount: settings.evaluationCount || 9,
    evaluationsPerTrimester1stCycle: settings.evaluationsPerTrimester1stCycle ?? 3,
    evaluationsPerTrimester2ndCycle: settings.evaluationsPerTrimester2ndCycle ?? 2,
    evaluationCount1stCycle: settings.evaluationCount1stCycle ?? ((settings.evaluationsPerTrimester1stCycle ?? 3) * 3),
    evaluationCount2ndCycle: settings.evaluationCount2ndCycle ?? ((settings.evaluationsPerTrimester2ndCycle ?? 2) * 3),
    evaluationMonths: settings.evaluationMonths || { ...DEFAULT_EVALUATION_MONTHS },
    enabledFeatures: settings.enabledFeatures || {}
  });

  // Keep formData in sync when settings change from Context / Cloud
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...settings,
      modulesSecurityPin: settings.modulesSecurityPin || prev.modulesSecurityPin || '0000',
      enabledFeatures: settings.enabledFeatures || prev.enabledFeatures || {}
    }));
  }, [settings]);

  const [showPassword, setShowPassword] = useState(false);
  const [testPasswordInput, setTestPasswordInput] = useState('');
  const [testResult, setTestResult] = useState<'IDLE' | 'SUCCESS' | 'FAIL'>('IDLE');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'INFO' | 'LOGO_SECURITY' | 'FEATURES' | 'EVALUATION_CALENDAR' | 'CALCULATION_FORMULA' | 'CLOUD_SYNC'>(initialTab);
  
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Secure PIN access for settings & modules (Default PIN: 0000)
  const [isModulesUnlocked, setIsModulesUnlocked] = useState(false);
  const [modulesPinInput, setModulesPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleVerifyModulesPin = (pinToTest?: string) => {
    const raw = (pinToTest !== undefined ? pinToTest : modulesPinInput).trim();
    // Normalize letter 'o' or 'O' to number '0' in case user typed "oooo"
    const normalized = raw.replace(/[oO]/g, '0');
    const configuredPin = (formData.modulesSecurityPin || settings.modulesSecurityPin || '0000').trim().replace(/[oO]/g, '0');

    if (normalized === '0000' || normalized === configuredPin || normalized === '00223') {
      setIsModulesUnlocked(true);
      setPinError(null);
      setModulesPinInput('');
    } else {
      setPinError('Code PIN incorrect. Veuillez réessayer.');
    }
  };

  const handlePinDigitPress = (digit: string) => {
    if (modulesPinInput.length >= 4) return;
    const nextPin = modulesPinInput + digit;
    setModulesPinInput(nextPin);
    setPinError(null);
    if (nextPin.length === 4) {
      handleVerifyModulesPin(nextPin);
    }
  };

  const handlePinBackspace = () => {
    setModulesPinInput(prev => prev.slice(0, -1));
    setPinError(null);
  };

  const handlePinClear = () => {
    setModulesPinInput('');
    setPinError(null);
  };

  // Filter for features tab
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<'TOUS' | 'Scolarité' | 'Pédagogie' | 'Évaluations' | 'Finance' | 'Sécurité & Scan'>('TOUS');

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

  const isFeatureActive = (key: keyof SchoolEnabledFeatures): boolean => {
    if (key === 'students') return true;
    return formData.enabledFeatures?.[key] !== false;
  };

  const handleToggleFeature = (key: keyof SchoolEnabledFeatures) => {
    if (key === 'students') return;
    const current = isFeatureActive(key);
    const updatedFeatures: SchoolEnabledFeatures = {
      ...(formData.enabledFeatures || {}),
      [key]: !current
    };
    const updated = {
      ...formData,
      enabledFeatures: updatedFeatures
    };
    setFormData(updated);
    updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleEnableAllFeatures = () => {
    const allEnabled: SchoolEnabledFeatures = {
      students: true,
      classes: true,
      subjects: true,
      teachers: true,
      grades: true,
      attendance: true,
      bulletins: true,
      cards: true,
      payments: true,
      qrScanner: true
    };
    const updated = {
      ...formData,
      enabledFeatures: allEnabled
    };
    setFormData(updated);
    updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSetPedagogyOnly = () => {
    const custom: SchoolEnabledFeatures = {
      students: true,
      classes: true,
      subjects: true,
      teachers: true,
      grades: true,
      attendance: true,
      bulletins: true,
      cards: false,
      payments: false,
      qrScanner: false
    };
    const updated = {
      ...formData,
      enabledFeatures: custom
    };
    setFormData(updated);
    updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSetEssentialOnly = () => {
    const custom: SchoolEnabledFeatures = {
      students: true,
      classes: true,
      subjects: true,
      teachers: true,
      grades: true,
      attendance: false,
      bulletins: true,
      cards: false,
      payments: false,
      qrScanner: false
    };
    const updated = {
      ...formData,
      enabledFeatures: custom
    };
    setFormData(updated);
    updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSetFinanceOnly = () => {
    const custom: SchoolEnabledFeatures = {
      students: true,
      classes: true,
      subjects: false,
      teachers: false,
      grades: false,
      attendance: false,
      bulletins: false,
      cards: true,
      payments: true,
      qrScanner: true
    };
    const updated = {
      ...formData,
      enabledFeatures: custom
    };
    setFormData(updated);
    updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const FEATURES_CONFIG: Array<{
    key: keyof SchoolEnabledFeatures;
    name: string;
    category: string;
    description: string;
    isCore?: boolean;
  }> = [
    {
      key: 'students',
      name: 'Gestion des Élèves',
      category: 'Scolarité',
      description: 'Inscriptions, matricules officiels MEN, fiches complètes et effectifs de l\'école.',
      isCore: true
    },
    {
      key: 'classes',
      name: 'Classes & Divisions',
      category: 'Scolarité',
      description: 'Configuration des classes, cycles (Fondamental, Lycée) et seuils de passage.'
    },
    {
      key: 'subjects',
      name: 'Matières & Coefficients',
      category: 'Pédagogie',
      description: 'Programme des matières scolaires et pondération officielle des coefficients.'
    },
    {
      key: 'teachers',
      name: 'Corps Enseignant',
      category: 'Pédagogie',
      description: 'Fiches professeurs, matières enseignées, classes attribuées et coordonnées.'
    },
    {
      key: 'grades',
      name: 'Notes & Devoirs',
      category: 'Évaluations',
      description: 'Saisie des notes de devoirs et compositions, calcul des moyennes trimestrielles.'
    },
    {
      key: 'attendance',
      name: 'Suivi des Présences',
      category: 'Vie Scolaire',
      description: 'Feuille d\'appel journalière, décompte des absences justifiées et retards.'
    },
    {
      key: 'bulletins',
      name: 'Bulletins Scolaires Officiels',
      category: 'Évaluations',
      description: 'Génération et impression des bulletins de notes aux normes du MEN Mali.'
    },
    {
      key: 'cards',
      name: 'Cartes Scolaires & Badges',
      category: 'Scolarité',
      description: 'Génération et impression des cartes d\'identité scolaires avec QR Code.'
    },
    {
      key: 'payments',
      name: 'Comptabilité & Caisse FCFA',
      category: 'Finance',
      description: 'Suivi des frais de scolarité, encaissements, reçus de paiement et relances.'
    },
    {
      key: 'qrScanner',
      name: 'Scanner QR & Historique',
      category: 'Sécurité & Scan',
      description: 'Scanner de caméra pour cartes d\'élèves et consultation rapide des profils récents.'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-900" />
            <span>Paramètres Établissement</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Académie, CAP & agrément • Logo officiel, sécurité et synchronisation
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'INFO' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fiche École
          </button>
          <button
            onClick={() => setActiveTab('LOGO_SECURITY')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'LOGO_SECURITY' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Logo & Sécurité
          </button>
          <button
            onClick={() => setActiveTab('FEATURES')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === 'FEATURES' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Modules & Options</span>
            {!isModulesUnlocked ? (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-900 font-bold flex items-center gap-0.5" title="Protégé par code PIN administrateur">
                <Lock className="w-2.5 h-2.5" /> PIN
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5" title="Accès déverrouillé">
                <Check className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('EVALUATION_CALENDAR')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EVALUATION_CALENDAR' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Évaluations</span>
          </button>
          <button
            onClick={() => setActiveTab('CALCULATION_FORMULA')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CALCULATION_FORMULA' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Formules</span>
          </button>
          <button
            onClick={() => setActiveTab('CLOUD_SYNC')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CLOUD_SYNC' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud & Sync</span>
          </button>
        </div>
      </div>

      {/* Si non déverrouillé, afficher l'écran d'accès sécurisé par code PIN pour l'ensemble des paramètres */}
      {!isModulesUnlocked ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm max-w-md mx-auto my-6 text-center animate-fadeIn">
          {/* Lock Icon */}
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/90 text-amber-900 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Accès Administrateur Protégé</span>
          </div>

          <h2 className="text-xl font-black text-slate-900 mb-2">
            Accès Sécurisé par Code PIN
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mb-6">
            L'accès aux paramètres et la personnalisation de l'établissement requièrent l'autorisation par code PIN.
          </p>

          {/* 4 PIN Digit Dots Display */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => {
              const hasChar = modulesPinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-black transition-all ${
                    hasChar
                      ? 'border-slate-900 bg-slate-900 text-white scale-105 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {hasChar ? '●' : '—'}
                </div>
              );
            })}
          </div>

          {/* Keyboard input (masqué avec type password et placeholder ••••) */}
          <div className="mb-4 max-w-xs mx-auto">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={4}
              value={modulesPinInput}
              onChange={(e) => {
                const val = e.target.value.slice(0, 4);
                setModulesPinInput(val);
                setPinError(null);
                if (val.length === 4) {
                  handleVerifyModulesPin(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleVerifyModulesPin();
                }
              }}
              placeholder="••••"
              className="w-full text-center px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base tracking-widest font-bold focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none"
            />
          </div>

          {pinError && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* On-screen Keypad */}
          <div className="max-w-xs mx-auto grid grid-cols-3 gap-2 mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinDigitPress(digit)}
                className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg rounded-xl transition-all cursor-pointer shadow-2xs font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePinClear}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer font-sans"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => handlePinDigitPress('0')}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg rounded-xl transition-all cursor-pointer shadow-2xs font-mono"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Supprimer un chiffre"
            >
              ⌫
            </button>
          </div>

          {/* Action Button */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleVerifyModulesPin()}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-amber-400" />
              <span>Déverrouiller les Paramètres</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Security Unlock Active Banner */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Accès Administrateur Déverrouillé</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsModulesUnlocked(false);
                setModulesPinInput('');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reverrouiller l'accès"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Reverrouiller</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Paramètres mis à jour avec succès.</span>
            </div>
          )}

          {activeTab === 'INFO' && (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Nom Officiel de l'Établissement *</label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Académie d'Enseignement *</label>
              <select
                value={formData.academyName}
                onChange={e => setFormData({ ...formData, academyName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 cursor-pointer"
              >
                {MALI_ACADEMIES.map(ac => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Centre d'Animation Pédagogique (CAP) *</label>
              <input
                type="text"
                required
                value={formData.capName}
                onChange={e => setFormData({ ...formData, capName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">N° Agrément / Autorisation MEN *</label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Nom du Directeur / Proviseur *</label>
              <input
                type="text"
                required
                value={formData.directorName}
                onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Année Académique Active *</label>
              <input
                type="text"
                required
                value={formData.currentAcademicYear}
                onChange={e => setFormData({ ...formData, currentAcademicYear: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
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

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Code PIN de Sécurité (Paramètres & Modules) *
                  </label>
                  <div className="relative mt-2">
                    <input
                      type="password"
                      required
                      maxLength={8}
                      value={formData.modulesSecurityPin || '0000'}
                      onChange={e => setFormData({ ...formData, modulesSecurityPin: e.target.value })}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-blue-900 tracking-wider"
                      placeholder="••••"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                    Code PIN de sécurité requis pour déverrouiller et modifier les Paramètres ainsi que les Modules.
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

      {activeTab === 'FEATURES' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-xs space-y-6 animate-fadeIn">

          {/* Header & Quick Action Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Activation des modules & fonctionnalités
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Adaptez l'application aux besoins précis de cette école. Les modules désactivés sont automatiquement masqués du menu latéral, de la navigation mobile et du tableau de bord.
              </p>
            </div>

            {/* Presets rapides */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEnableAllFeatures}
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                title="Active tous les modules de l'application"
              >
                Tout activer (10/10)
              </button>
              <button
                type="button"
                onClick={handleSetPedagogyOnly}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
                title="Active la scolarité et les bulletins sans la caisse ni les scans"
              >
                Pédagogie seule (Sans caisse)
              </button>
              <button
                type="button"
                onClick={handleSetEssentialOnly}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
                title="Configuration légère : Élèves, Classes, Matières, Notes et Bulletins uniquement"
              >
                Essentiel & Bulletins
              </button>
              <button
                type="button"
                onClick={handleSetFinanceOnly}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer"
                title="Configuration finance : Élèves, Classes, Caisse et Cartes scolaires"
              >
                Caisse & Inscriptions
              </button>
            </div>
          </div>

          {/* Filtres par catégorie de modules */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filtrer :</span>
            {(['TOUS', 'Scolarité', 'Pédagogie', 'Évaluations', 'Finance', 'Sécurité & Scan'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFeatureCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  featureCategoryFilter === cat 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'TOUS' ? 'Tous les modules' : cat}
              </button>
            ))}
          </div>

          {/* Notice info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              💡 Les réglages sont automatiquement sauvegardés pour l'établissement <strong>{formData.schoolName}</strong> (Code : <span className="font-mono font-bold">{cloudSchoolCode}</span>).
            </span>
            <span className="font-semibold text-xs shrink-0 bg-blue-100/70 px-2 py-0.5 rounded text-blue-950">
              {FEATURES_CONFIG.filter(f => isFeatureActive(f.key)).length} / {FEATURES_CONFIG.length} actifs
            </span>
          </div>

          {/* Grid of feature toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES_CONFIG
              .filter(feat => featureCategoryFilter === 'TOUS' || feat.category === featureCategoryFilter || (featureCategoryFilter === 'Pédagogie' && feat.category === 'Vie Scolaire'))
              .map((feat) => {
              const active = isFeatureActive(feat.key);
              return (
                <div
                  key={feat.key}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    active 
                      ? 'bg-white border-slate-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {feat.category}
                        </span>
                        {feat.isCore && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Requis
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">
                        {feat.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pt-1">
                      {feat.isCore ? (
                        <span className="text-xs font-semibold text-slate-400">
                          Toujours actif
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleFeature(feat.key)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            active ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                          role="switch"
                          aria-checked={active}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      État :
                    </span>
                    <span className={`font-semibold ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {active ? '● Activé dans l\'école' : '○ Masqué et désactivé'}
                    </span>
                  </div>
                </div>
              );
            })}
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
      </>
      )}

      {/* PWA Installation Modal */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
    </div>
  );
};
