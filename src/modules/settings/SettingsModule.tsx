/**
 * SomaSikolo - Paramètres École
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, CheckCircle2, Save, Key, Eye, EyeOff, Image, Trash2, Lock, Unlock, 
  ShieldAlert, ShieldCheck, Upload, Calendar, RotateCcw, Calculator, Sliders, Check,
  GraduationCap, Building2, Wrench, Globe, Sparkles, BookOpen, Users, UserPlus,
  Edit3, UserCheck, AlertCircle, RefreshCw, Phone, Mail, Shield, Search, X
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { MALI_ACADEMIES, DEFAULT_EVALUATION_MONTHS, getTermLabel, MALI_DEFAULT_CLASSES, MALI_DEFAULT_SUBJECTS } from '../../constants/maliEducation';
import { PwaInstallModal } from '../../components/common/PwaInstallModal';
import { SchoolEnabledFeatures, SchoolCategory, User, UserRole, Subject } from '../../types';
import { secureLocalStorage } from '../../services/secureStorage';
import { compressImageToDataUrl } from '../../utils/imageCompression';
import { AuthService } from '../../services/authService';

const MONTH_OPTIONS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre', 
  'Janvier', 'Février', 'Mars', 'Avril', 
  'Mai', 'Juin', 'Juillet', 'Août'
];

export interface SettingsModuleProps {
  initialTab?: 'INFO' | 'USERS_ROLES' | 'LOGO_SECURITY' | 'FEATURES' | 'EVALUATION_CALENDAR' | 'CALCULATION_FORMULA';
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ initialTab = 'INFO' }) => {
  const { 
    settings, 
    updateSettings, 
    cloudSchoolCode,
    classes,
    subjects,
    saveClass,
    saveSubject
  } = useSchool();
  const [formData, setFormData] = useState({
    ...settings,
    schoolCategory: settings.schoolCategory || ('ECOLE_FONDAMENTALE' as SchoolCategory),
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
  const [storageStats, setStorageStats] = useState(() => secureLocalStorage.getStorageUsage());
  const [cleanToast, setCleanToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'INFO' | 'USERS_ROLES' | 'LOGO_SECURITY' | 'FEATURES' | 'EVALUATION_CALENDAR' | 'CALCULATION_FORMULA'>(initialTab || 'INFO');

  const { users, currentUser, isAdmin, hasPermission, saveUser, deleteUser, loginAsUser } = useAuth();
  const canManageUsers = isAdmin && hasPermission('users:manage');
  const canManageModules = isAdmin && hasPermission('modules:manage');
  const canManageAdminSecurity = isAdmin && hasPermission('security:admin');

  // User Management State (Multi-Rôles & Mots de passe - ADMIN uniquement)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEditing, setUserEditing] = useState<User | null>(null);
  const [userDeleting, setUserDeleting] = useState<User | null>(null);
  const [showUserPasswords, setShowUserPasswords] = useState<Record<string, boolean>>({});
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

  const [userFormData, setUserFormData] = useState<{
    fullName: string;
    username: string;
    role: UserRole;
    password: string;
    email: string;
    phone: string;
    active: boolean;
  }>({
    fullName: '',
    username: '',
    role: 'DIRECTEUR',
    password: '',
    email: '',
    phone: '',
    active: true
  });

  const handleOpenAddUser = () => {
    if (!canManageUsers) return;
    setUserEditing(null);
    setUserFormData({
      fullName: '',
      username: '',
      role: 'DIRECTEUR',
      password: '',
      email: '',
      phone: '',
      active: true
    });
    setUserModalError(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    if (!canManageUsers) return;
    setUserEditing(u);
    setUserFormData({
      fullName: u.fullName,
      username: u.username,
      role: u.role,
      password: u.password || '',
      email: u.email || '',
      phone: u.phone || '',
      active: u.active
    });
    setUserModalError(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.fullName.trim()) {
      setUserModalError('Veuillez saisir le nom complet de l\'utilisateur.');
      return;
    }
    if (!userFormData.username.trim()) {
      setUserModalError('Veuillez saisir un identifiant / nom d\'utilisateur.');
      return;
    }
    if (!userFormData.password.trim()) {
      setUserModalError('Veuillez définir un mot de passe ou code PIN.');
      return;
    }

    const cleanUsername = userFormData.username.trim().toLowerCase();
    const duplicate = users.find(u => 
      u.username.toLowerCase() === cleanUsername &&
      (!userEditing || u.id !== userEditing.id)
    );
    if (duplicate) {
      setUserModalError(`L'identifiant "${cleanUsername}" est déjà utilisé par un autre compte.`);
      return;
    }

    saveUser({
      ...(userEditing ? { id: userEditing.id } : {}),
      fullName: userFormData.fullName.trim(),
      username: cleanUsername,
      role: userFormData.role,
      password: userFormData.password.trim(),
      email: userFormData.email.trim(),
      phone: userFormData.phone.trim(),
      active: userFormData.active
    });

    setIsUserModalOpen(false);
    setUserEditing(null);
    setCleanToast(`Compte "${userFormData.fullName}" (${userFormData.role}) enregistré.`);
    setTimeout(() => setCleanToast(null), 3000);
  };

  const handleConfirmDeleteUser = () => {
    if (!userDeleting || !canManageUsers) return;

    if (userDeleting.role === 'ADMIN') {
      const adminCount = users.filter(u => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        setCleanToast('Action bloquée : Vous ne pouvez pas supprimer le seul compte Administrateur.');
        setUserDeleting(null);
        setTimeout(() => setCleanToast(null), 3500);
        return;
      }
    }

    deleteUser(userDeleting.id);
    setCleanToast(`Le compte "${userDeleting.fullName}" a été supprimé.`);
    setUserDeleting(null);
    setTimeout(() => setCleanToast(null), 3000);
  };

  const toggleShowPasswordForUser = (userId: string) => {
    setShowUserPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'DIRECTEUR':
        return {
          label: 'Directeur Général',
          color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          desc: 'Direction générale, validation globale, pédagogie, clôtures et finances'
        };
      case 'COMPTABLE':
        return {
          label: 'Chef Comptable',
          color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          desc: 'Encaissements, gestion caisse, dépenses, clôtures journalières et relances'
        };
      case 'SECRETAIRE':
        return {
          label: 'Secrétaire Général(e)',
          color: 'bg-amber-50 text-amber-950 border-amber-200',
          desc: 'Inscriptions des élèves, registres, cartes d\'identité scolaires et scolarité'
        };
      case 'ENSEIGNANT':
        return {
          label: 'Enseignant / Professeur',
          color: 'bg-sky-50 text-sky-900 border-sky-200',
          desc: 'Saisie des notes, devoirs, compositions et assiduité de ses classes'
        };
      case 'ADMIN':
        return {
          label: 'Administrateur Système',
          color: 'bg-slate-900 text-white border-slate-900',
          desc: 'Accès superviseur complet, configuration de l\'école et sécurité'
        };
      case 'LECTURE_SEULE':
        return {
          label: 'Consultation Seule',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          desc: 'Lecture des listes et rapports sans droit d\'écriture'
        };
      default:
        return {
          label: role,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          desc: 'Accès standard'
        };
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase().trim();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    });
  }, [users, userRoleFilter, userSearch]);
  
  useEffect(() => {
    if (initialTab) {
      if ((initialTab === 'USERS_ROLES' && !canManageUsers) || (initialTab === 'FEATURES' && !canManageModules)) {
        setActiveTab('INFO');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, canManageUsers, canManageModules]);

  useEffect(() => {
    if ((activeTab === 'USERS_ROLES' && !canManageUsers) || (activeTab === 'FEATURES' && !canManageModules)) {
      setActiveTab('INFO');
    }
  }, [activeTab, canManageUsers, canManageModules]);

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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'ECOLE_FONDAMENTALE': return 'École Fondamentale / Primaire';
      case 'LYCEE': return 'Lycée d\'Enseignement Général';
      case 'PROFESSIONNEL': return 'Formation Professionnelle & Technique';
      case 'COMPLEXE': return 'Complexe Scolaire / Mixte';
      default: return 'École Fondamentale / Primaire';
    }
  };

  const handleApplySchoolTypePreset = (category: SchoolCategory) => {
    let newSettings: Partial<typeof formData> = {
      schoolCategory: category
    };

    if (category === 'ECOLE_FONDAMENTALE') {
      newSettings = {
        ...newSettings,
        evaluationCount1stCycle: 9,
        evaluationCount2ndCycle: 9,
        evaluationsPerTrimester1stCycle: 3,
        evaluationsPerTrimester2ndCycle: 3,
        calculationFormula1stCycle: 'MALI_OFFICIAL',
        calculationFormula2ndCycle: 'MALI_OFFICIAL',
        classScoreWeight1st: 1,
        compScoreWeight1st: 1,
        missingClassScoreBehavior: 'USE_COMP_ONLY',
        missingCompScoreBehavior: 'USE_CLASS_ONLY'
      };
    } else if (category === 'LYCEE') {
      newSettings = {
        ...newSettings,
        evaluationCount2ndCycle: 9,
        evaluationsPerTrimester2ndCycle: 3,
        calculationFormula2ndCycle: 'MALI_OFFICIAL',
        missingClassScoreBehavior: 'USE_COMP_ONLY',
        missingCompScoreBehavior: 'USE_CLASS_ONLY'
      };
    } else if (category === 'PROFESSIONNEL') {
      newSettings = {
        ...newSettings,
        evaluationCount2ndCycle: 9,
        evaluationsPerTrimester2ndCycle: 3,
        calculationFormula2ndCycle: 'MALI_OFFICIAL',
        missingClassScoreBehavior: 'USE_COMP_ONLY',
        missingCompScoreBehavior: 'USE_CLASS_ONLY'
      };
    }

    const merged = { ...formData, ...newSettings };
    setFormData(merged);
    updateSettings(merged);

    // Génération automatique immédiate des classes et matières officielles pour ce type
    handleGenerateDefaultClassesAndSubjects(category);
  };

  const handleGenerateDefaultClassesAndSubjects = (category: SchoolCategory) => {
    let classesToCreate = MALI_DEFAULT_CLASSES;
    let subjectsToCreate = MALI_DEFAULT_SUBJECTS;

    if (category === 'ECOLE_FONDAMENTALE') {
      classesToCreate = MALI_DEFAULT_CLASSES.filter(c => c.category === 'FONDAMENTAL_1' || c.category === 'FONDAMENTAL_2');
      subjectsToCreate = MALI_DEFAULT_SUBJECTS.filter(s => s.classCategory === 'FONDAMENTAL_1' || s.classCategory === 'FONDAMENTAL_2');
    } else if (category === 'LYCEE') {
      classesToCreate = MALI_DEFAULT_CLASSES.filter(c => c.category === 'LYCEE');
      subjectsToCreate = MALI_DEFAULT_SUBJECTS.filter(s => s.classCategory === 'LYCEE');
    } else if (category === 'PROFESSIONNEL') {
      classesToCreate = MALI_DEFAULT_CLASSES.filter(c => c.category === 'TECHNIQUE_BT' || c.category === 'PROFESSIONNEL_CAP');
      subjectsToCreate = MALI_DEFAULT_SUBJECTS.filter(s => s.classCategory === 'TECHNIQUE_BT' || s.classCategory === 'PROFESSIONNEL_CAP');
    }

    // Étape 1 : Créer les matières officielles manquantes et référencer toutes les matières disponibles
    const activeSubjectsMap = new Map<string, Subject>();
    subjects.forEach(s => activeSubjectsMap.set(s.code, s));

    let addedSubjects = 0;
    subjectsToCreate.forEach(sub => {
      let existing = subjects.find(s => s.code.toLowerCase() === sub.code.toLowerCase() || s.name.toLowerCase() === sub.name.toLowerCase());
      if (!existing) {
        existing = saveSubject({
          code: sub.code,
          name: sub.name,
          coefficient: sub.coefficient,
          classCategory: sub.classCategory as any,
          order: sub.order
        });
        addedSubjects++;
      }
      activeSubjectsMap.set(sub.code, existing);
    });

    const allCurrentSubjects = Array.from(activeSubjectsMap.values());

    // Étape 2 : Créer les classes officielles manquantes avec leurs matières pré-associées
    let addedClasses = 0;
    classesToCreate.forEach(cls => {
      const existingClass = classes.find(c => c.name.toLowerCase() === cls.name.toLowerCase());
      if (!existingClass) {
        // Pré-associer automatiquement les matières officielles correspondant à cette classe
        const matchingSubjectIds = allCurrentSubjects
          .filter(s => s.classCategory === cls.category)
          .map(s => s.id);

        saveClass({
          name: cls.name,
          category: cls.category as any,
          level: cls.level,
          monthlyFee: cls.fee,
          inscriptionFee: cls.insFee,
          classroom: 'Salle Principale',
          passingGrade: cls.category === 'FONDAMENTAL_1' ? 5 : 10,
          subjectIds: matchingSubjectIds
        });
        addedClasses++;
      } else if (!existingClass.subjectIds || existingClass.subjectIds.length === 0) {
        // Si la classe existe déjà mais n'a pas encore de subjectIds, lui assigner les matières officielles de son cycle
        const matchingSubjectIds = allCurrentSubjects
          .filter(s => s.classCategory === existingClass.category)
          .map(s => s.id);
        if (matchingSubjectIds.length > 0) {
          saveClass({
            ...existingClass,
            subjectIds: matchingSubjectIds
          });
        }
      }
    });

    const catLabel = getCategoryLabel(category);
    setCleanToast(`Configuration "${catLabel}" appliquée : ${addedClasses} classe(s) et ${addedSubjects} matière(s) générées automatiquement ! Rendez-vous dans "Classes" pour choisir les matières spécifiques par classe.`);
    setTimeout(() => setCleanToast(null), 5000);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image trop lourde. Veuillez choisir une image de moins de 5 Mo.');
        return;
      }
      try {
        const compressed = await compressImageToDataUrl(file, {
          maxWidth: 360,
          maxHeight: 360,
          quality: 0.85,
          preserveTransparency: true
        });
        setFormData(prev => ({ ...prev, logoUrl: compressed }));
      } catch {
        alert('Impossible de lire le fichier image.');
      }
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image trop lourde. Veuillez choisir une image de moins de 5 Mo.');
        return;
      }
      try {
        const compressed = await compressImageToDataUrl(file, {
          maxWidth: 360,
          maxHeight: 360,
          quality: 0.85,
          preserveTransparency: true
        });
        setFormData(prev => ({ ...prev, stampUrl: compressed }));
      } catch {
        alert('Impossible de lire le fichier image.');
      }
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

  const handleCleanStorage = () => {
    const res = secureLocalStorage.cleanTemporaryData({ forceAllTemps: true });
    setStorageStats(secureLocalStorage.getStorageUsage());
    if (res.deletedKeys.length > 0) {
      setCleanToast(`Nettoyage réussi : ${res.deletedKeys.length} clé(s) temporaire(s) supprimée(s), ${(res.freedBytes / 1024).toFixed(1)} Ko libérés !`);
    } else {
      setCleanToast(`Stockage déjà optimisé : aucune clé temporaire superflue.`);
    }
    setTimeout(() => setCleanToast(null), 4000);
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
      key: 'examSchedule',
      name: 'Planning des Examens & Compositions',
      category: 'Évaluations',
      description: 'Génération automatique, aménagement des salles et impression des emplois du temps de composition.'
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
    <div className="space-y-3 pb-8">
      {/* Barre d'Action & Onglets Unifiée Ultra-Compacte */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
          <Settings className="w-4 h-4 text-blue-900 shrink-0" />
          <span className="font-bold">Paramètres</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold flex-wrap gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('INFO')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'INFO' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Fiche École
          </button>
          {canManageUsers && (
            <button
              type="button"
              onClick={() => setActiveTab('USERS_ROLES')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'USERS_ROLES' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <Users className="w-3 h-3 text-amber-400" />
              <span>Comptes & Rôles ({users.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('LOGO_SECURITY')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'LOGO_SECURITY' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {canManageAdminSecurity ? 'Logo & Sécurité' : 'Logo & Cachet'}
          </button>
          {canManageModules && (
            <button
              type="button"
              onClick={() => setActiveTab('FEATURES')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'FEATURES' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Modules</span>
              {!isModulesUnlocked ? (
                <span className="ml-0.5 px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-900 font-bold flex items-center gap-0.5" title="Protégé par code PIN">
                  <Lock className="w-2.5 h-2.5" /> PIN
                </span>
              ) : (
                <span className="ml-0.5 px-1 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5" title="Déverrouillé">
                  <Check className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('EVALUATION_CALENDAR')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'EVALUATION_CALENDAR' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Évaluations</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CALCULATION_FORMULA')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'CALCULATION_FORMULA' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Calculator className="w-3 h-3" />
            <span>Formules</span>
          </button>
        </div>
      </div>

      {/* Si non déverrouillé, afficher l'écran d'accès sécurisé par code PIN pour l'ensemble des paramètres */}
      {!isModulesUnlocked ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs max-w-xs sm:max-w-sm mx-auto my-3 text-center animate-fadeIn">
          {/* Lock Icon */}
          <div className="w-10 h-10 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-2xs">
            <Lock className="w-5 h-5" />
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100/90 text-amber-900 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3 h-3" />
            <span>Accès Protégé</span>
          </div>

          <h2 className="text-sm font-black text-slate-900 mb-1">
            Accès Sécurisé par Code PIN
          </h2>
          <p className="text-[11px] text-slate-500 font-medium mb-3">
            Saisissez votre code PIN (par défaut: 0000) pour modifier les paramètres.
          </p>

          {/* 4 PIN Digit Dots Display */}
          <div className="flex justify-center items-center gap-2 mb-3">
            {[0, 1, 2, 3].map((idx) => {
              const hasChar = modulesPinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-9 h-10 rounded-lg border-2 flex items-center justify-center font-mono text-lg font-black transition-all ${
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

          {/* Keyboard input */}
          <div className="mb-3 max-w-[200px] mx-auto">
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
              className="w-full text-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm tracking-widest font-bold focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none"
            />
          </div>

          {pinError && (
            <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* On-screen Keypad */}
          <div className="max-w-[220px] mx-auto grid grid-cols-3 gap-1.5 mb-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinDigitPress(digit)}
                className="py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-sm rounded-lg transition-all cursor-pointer shadow-2xs font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePinClear}
              className="py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer font-sans"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => handlePinDigitPress('0')}
              className="py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-sm rounded-lg transition-all cursor-pointer shadow-2xs font-mono"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center"
              title="Supprimer un chiffre"
            >
              ⌫
            </button>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => handleVerifyModulesPin()}
            className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5 text-amber-400" />
            <span>Déverrouiller les Paramètres</span>
          </button>
        </div>
      ) : (
        <>
          {/* Security Unlock Active Banner (Ultra-Compact) */}
          <div className="flex items-center justify-between gap-2 px-3 py-1 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{isAdmin ? 'Accès Administrateur Déverrouillé' : 'Accès Direction Déverrouillé'}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsModulesUnlocked(false);
                setModulesPinInput('');
              }}
              className="px-2.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Reverrouiller l'accès"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Reverrouiller</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Paramètres mis à jour avec succès.</span>
            </div>
          )}

          {/* ================= TAB 1: FICHE ECOLE (INFO) ================= */}
          {activeTab === 'INFO' && (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="font-bold text-slate-900 text-xs">
                  Informations Officielles de l'Établissement
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sauvegarder</span>
                </button>
              </div>

              {/* SÉLECTEUR RAPIDE DU TYPE D'ÉTABLISSEMENT & ATTRIBUTS */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-bold text-xs sm:text-sm">Type d'Établissement & Attributs Automatiques</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Configure instantanément barèmes (/10 ou /20), seuils de passage, examens et cycles
                  </span>
                </div>

                {/* 4 Cards de Type d'École */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Option 1: École Fondamentale */}
                  <button
                    type="button"
                    onClick={() => handleApplySchoolTypePreset('ECOLE_FONDAMENTALE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      formData.schoolCategory === 'ECOLE_FONDAMENTALE'
                        ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        🏫
                      </div>
                      {formData.schoolCategory === 'ECOLE_FONDAMENTALE' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">École Fondamentale</div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">1ère à 9ème DEF • /10 & /20</div>
                  </button>

                  {/* Option 2: Lycée Général */}
                  <button
                    type="button"
                    onClick={() => handleApplySchoolTypePreset('LYCEE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      formData.schoolCategory === 'LYCEE'
                        ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                        🎓
                      </div>
                      {formData.schoolCategory === 'LYCEE' && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">Lycée Général</div>
                    <div className="text-[10px] text-blue-700 font-semibold mt-0.5">10ème à 12ème BAC • /20</div>
                  </button>

                  {/* Option 3: Professionnel */}
                  <button
                    type="button"
                    onClick={() => handleApplySchoolTypePreset('PROFESSIONNEL')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      formData.schoolCategory === 'PROFESSIONNEL'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                        ⚙️
                      </div>
                      {formData.schoolCategory === 'PROFESSIONNEL' && (
                        <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">Professionnel & BT</div>
                    <div className="text-[10px] text-amber-700 font-semibold mt-0.5">CAP 1&2 • BT 1&2 • /20</div>
                  </button>

                  {/* Option 4: Complexe */}
                  <button
                    type="button"
                    onClick={() => handleApplySchoolTypePreset('COMPLEXE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      formData.schoolCategory === 'COMPLEXE'
                        ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                        🌐
                      </div>
                      {formData.schoolCategory === 'COMPLEXE' && (
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">Complexe Scolaire</div>
                    <div className="text-[10px] text-purple-700 font-semibold mt-0.5">Tous cycles • Mixte</div>
                  </button>
                </div>

                {/* Synthèse des Attributs Appliqués Instantanément */}
                <div className="bg-white rounded-lg border border-slate-200/90 p-2.5 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Barème & Passage</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {formData.schoolCategory === 'ECOLE_FONDAMENTALE' && '1er Cycle : /10 (≥5/10) • 2nd Cycle : /20 (≥10/20)'}
                        {formData.schoolCategory === 'LYCEE' && 'Barème Officiel /20 (Admis si Moyenne ≥ 10.00/20)'}
                        {formData.schoolCategory === 'PROFESSIONNEL' && 'Barème Officiel /20 (Admis si Moyenne ≥ 10.00/20)'}
                        {formData.schoolCategory === 'COMPLEXE' && 'Mixte 1er Cycle /10 et Secondaire /20'}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cycles & Niveaux</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {formData.schoolCategory === 'ECOLE_FONDAMENTALE' && '1ère à 6ème (1er Cycle) + 7ème à 9ème DEF'}
                        {formData.schoolCategory === 'LYCEE' && '10ème Commune + 11ème & 12ème BAC (TSE, TSEXP, etc.)'}
                        {formData.schoolCategory === 'PROFESSIONNEL' && 'CAP 1 & 2 (Métiers) • BT 1 & 2 (Technique)'}
                        {formData.schoolCategory === 'COMPLEXE' && 'Fondamental 1 & 2 + Lycée + Professionnel'}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Examen Préparé</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {formData.schoolCategory === 'ECOLE_FONDAMENTALE' && 'DEF (Diplôme d\'Études Fondamentales)'}
                        {formData.schoolCategory === 'LYCEE' && 'BAC (Baccalauréat Malien)'}
                        {formData.schoolCategory === 'PROFESSIONNEL' && 'CAP & BT (Brevet de Technicien)'}
                        {formData.schoolCategory === 'COMPLEXE' && 'DEF, BAC Malien & BT'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                      <span className="font-bold text-slate-800">Statut actuel :</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px]">
                        {getCategoryLabel(formData.schoolCategory)}
                      </span>
                      <span>({classes.length} classes, {subjects.length} matières actives)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerateDefaultClassesAndSubjects(formData.schoolCategory || 'ECOLE_FONDAMENTALE')}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-2xs transition-colors cursor-pointer text-xs"
                      title="Génère automatiquement les classes et matières officielles pour ce type d'établissement"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-950" />
                      <span>⚡ Charger les classes & matières officielles ({getCategoryLabel(formData.schoolCategory).split('/')[0].trim()})</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Nom Officiel *</label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName}
                    onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Académie *</label>
                  <select
                    value={formData.academyName}
                    onChange={e => setFormData({ ...formData, academyName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400 cursor-pointer"
                  >
                    {MALI_ACADEMIES.map(ac => (
                      <option key={ac} value={ac}>{ac}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">CAP *</label>
                  <input
                    type="text"
                    required
                    value={formData.capName}
                    onChange={e => setFormData({ ...formData, capName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">N° Agrément / Autorisation *</label>
                  <input
                    type="text"
                    required
                    value={formData.registrationNumber}
                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Directeur / Proviseur *</label>
                  <input
                    type="text"
                    required
                    value={formData.directorName}
                    onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Année Scolaire Active *</label>
                  <input
                    type="text"
                    required
                    value={formData.currentAcademicYear}
                    onChange={e => setFormData({ ...formData, currentAcademicYear: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Site Web / URL Publique pour QR Codes (Optionnel)
                  </label>
                  <input
                    type="url"
                    placeholder="Laisser vide pour utiliser automatiquement l'URL web actuelle de l'application"
                    value={formData.website || ''}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>
            </form>
          )}

          {/* ================= TAB: COMPTES & MULTI-RÔLES (ADMIN UNIQUEMENT) ================= */}
          {activeTab === 'USERS_ROLES' && canManageUsers && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
              {/* Header & Bouton Ajouter */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-900" />
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Gestion des Utilisateurs & Accès Multi-Rôles
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {filteredUsers.length} compte(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Définissez les accès pour le Directeur, Chef Comptable, Secrétaire, Enseignants avec leurs mots de passe d'accès.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Ajouter un Utilisateur</span>
                </button>
              </div>

              {/* Toolbar: Filtre par rôle & Recherche */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Rôles :</span>
                  {[
                    { id: 'ALL', label: 'Tous' },
                    { id: 'DIRECTEUR', label: 'Directeur' },
                    { id: 'COMPTABLE', label: 'Comptable' },
                    { id: 'SECRETAIRE', label: 'Secrétaire' },
                    { id: 'ENSEIGNANT', label: 'Enseignant' },
                    { id: 'ADMIN', label: 'Admin' }
                  ].map(rf => (
                    <button
                      key={rf.id}
                      type="button"
                      onClick={() => setUserRoleFilter(rf.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        userRoleFilter === rf.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {rf.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[180px] max-w-xs flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Rechercher nom, login, tél..."
                    className="w-full pl-8 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tableau des Utilisateurs */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-3">Utilisateur</th>
                        <th className="py-2 px-2.5">Rôle & Permissions</th>
                        <th className="py-2 px-2.5">Identifiant</th>
                        <th className="py-2 px-2.5">Mot de Passe</th>
                        <th className="py-2 px-2.5">Contact</th>
                        <th className="py-2 px-2 text-center">Statut</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                            Aucun compte utilisateur ne correspond aux critères.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => {
                          const roleInfo = getRoleInfo(u.role);
                          const isCurrent = currentUser?.id === u.id;
                          const isPasswordShown = Boolean(showUserPasswords[u.id]);

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                                    u.role === 'ADMIN' ? 'bg-slate-900 text-white' :
                                    u.role === 'DIRECTEUR' ? 'bg-indigo-100 text-indigo-900' :
                                    u.role === 'COMPTABLE' ? 'bg-emerald-100 text-emerald-900' :
                                    u.role === 'SECRETAIRE' ? 'bg-amber-100 text-amber-900' :
                                    'bg-sky-100 text-sky-900'
                                  }`}>
                                    {u.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900">{u.fullName}</span>
                                      {isCurrent && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-900 font-bold">
                                          Actif
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono block">ID: {u.id}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-2 px-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}>
                                  {roleInfo.label}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={roleInfo.desc}>
                                  {roleInfo.desc}
                                </span>
                              </td>

                              <td className="py-2 px-2.5">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {u.username}
                                </span>
                              </td>

                              <td className="py-2 px-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-slate-800">
                                    {isPasswordShown ? (u.password || 'Non défini') : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleShowPasswordForUser(u.id)}
                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title={isPasswordShown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                  >
                                    {isPasswordShown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              <td className="py-2 px-2.5 text-[11px] text-slate-600">
                                {u.phone ? <div className="font-mono">{u.phone}</div> : <span className="text-slate-300">-</span>}
                                {u.email && <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{u.email}</div>}
                              </td>

                              <td className="py-2 px-2 text-center">
                                <span className={`inline-block w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={u.active ? 'Actif' : 'Désactivé'} />
                              </td>

                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        loginAsUser(u.id);
                                        setCleanToast(`Session basculée sur ${u.fullName} (${roleInfo.label}).`);
                                        setTimeout(() => setCleanToast(null), 3000);
                                      }}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] transition-colors cursor-pointer"
                                      title="Se connecter avec ce compte"
                                    >
                                      Basculer
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                    title="Modifier le compte ou mot de passe"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUserDeleting(u)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title="Supprimer ce compte"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: LOGO & SECURITE (ULTRA-COMPACT) ================= */}
          {activeTab === 'LOGO_SECURITY' && (
            <div className="space-y-2.5">
              {/* BLOC 1: LOGO & CACHET EN GRILLE COMPACTE */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  Logo & Cachet Officiel de l'Établissement
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* LOGO */}
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center">
                          <Image className="w-5 h-5 text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-400">Pas de logo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-bold text-slate-800">Logo Officiel</div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">Reçus, bulletins et cartes scolaires.</p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-md cursor-pointer transition-colors shadow-2xs">
                          <Upload className="w-3 h-3 text-amber-400" />
                          <span>Choisir Image</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {formData.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: undefined }))}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-md border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CACHET */}
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                      {formData.stampUrl ? (
                        <img src={formData.stampUrl} alt="Cachet" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center">
                          <Image className="w-5 h-5 text-amber-700/40" />
                          <span className="text-[9px] font-bold text-slate-400">Pas de sceau</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-bold text-slate-800">Cachet & Signature</div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">Apparaît au bas des bulletins A4.</p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white font-bold text-[10px] rounded-md cursor-pointer transition-colors shadow-2xs">
                          <Upload className="w-3 h-3 text-amber-300" />
                          <span>Choisir Cachet</span>
                          <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                        </label>
                        {formData.stampUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, stampUrl: undefined }))}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-md border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOC 2: MOT DE PASSE & CODE PIN (ADMIN UNIQUEMENT) */}
              {canManageAdminSecurity && (
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2">
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mot de Passe & Code PIN Administrateur</span>
                    </div>

                    <button
                      type="submit"
                      className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                      <span>Enregistrer les Mots de Passe</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Mot de passe caisse */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Mot de Passe / PIN Caisse *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.adminPassword}
                          onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="w-full px-2.5 py-1 pr-8 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Code PIN Paramètres */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        PIN de Sécurité Paramètres (4 chiffres) *
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={8}
                        value={formData.modulesSecurityPin || '0000'}
                        onChange={e => setFormData({ ...formData, modulesSecurityPin: e.target.value })}
                        className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>

                    {/* Tester code */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Tester le Code PIN
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="password"
                          value={testPasswordInput}
                          onChange={e => {
                            setTestPasswordInput(e.target.value);
                            setTestResult('IDLE');
                          }}
                          placeholder="Code à tester..."
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 outline-none"
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
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded-md cursor-pointer"
                        >
                          Tester
                        </button>
                      </div>
                      {testResult === 'SUCCESS' && (
                        <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">✓ Code Correct</span>
                      )}
                      {testResult === 'FAIL' && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">✗ Code Invalide</span>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              )}

              {/* BLOC 3: STOCKAGE LOCAL & CACHE (BARRE ULTRA COMPACTE) */}
              <div className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-900" />
                    <span>Cache :</span>
                  </div>
                  <span>Utilisé : <strong className="font-mono text-slate-800">{storageStats.usedKb} Ko</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Clés : <strong className="font-mono text-slate-800">{storageStats.keysCount}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Nettoyage auto actif
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCleanStorage}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-md border border-slate-300 transition-colors cursor-pointer"
                >
                  Nettoyer le cache
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: MODULES & FONCTIONNALITES (ADMIN UNIQUEMENT) ================= */}
          {activeTab === 'FEATURES' && canManageModules && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5 animate-fadeIn">
              {/* Header unifié avec presets intégrés sur 1 ligne */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-900 shrink-0" />
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Activation des Modules</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded-full font-bold text-[10px]">
                    {FEATURES_CONFIG.filter(f => isFeatureActive(f.key)).length}/{FEATURES_CONFIG.length} actifs
                  </span>
                </div>

                {/* Boutons Presets Rapides Compacts */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={handleEnableAllFeatures}
                    className="px-2 py-0.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md transition-colors cursor-pointer"
                  >
                    Tout activer (10/10)
                  </button>
                  <button
                    type="button"
                    onClick={handleSetPedagogyOnly}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    Pédagogie seule
                  </button>
                  <button
                    type="button"
                    onClick={handleSetEssentialOnly}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    Essentiel
                  </button>
                  <button
                    type="button"
                    onClick={handleSetFinanceOnly}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    Caisse & Inscriptions
                  </button>
                </div>
              </div>

              {/* Ruban Filtres Catégories */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Filtrer :</span>
                  {(['TOUS', 'Scolarité', 'Pédagogie', 'Évaluations', 'Finance', 'Sécurité & Scan'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFeatureCategoryFilter(cat)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        featureCategoryFilter === cat 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'TOUS' ? 'Tous' : cat}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-slate-400 font-medium">
                  Établissement : <strong className="text-slate-700">{formData.schoolName}</strong> ({cloudSchoolCode})
                </span>
              </div>

              {/* Grille ultra-compacte des modules (2 colonnes) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {FEATURES_CONFIG
                  .filter(feat => featureCategoryFilter === 'TOUS' || feat.category === featureCategoryFilter || (featureCategoryFilter === 'Pédagogie' && feat.category === 'Vie Scolaire'))
                  .map((feat) => {
                    const active = isFeatureActive(feat.key);
                    return (
                      <div
                        key={feat.key}
                        className={`px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-2.5 ${
                          active 
                            ? 'bg-white border-slate-300 shadow-2xs' 
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {feat.category}
                            </span>
                            {feat.isCore && (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Requis
                              </span>
                            )}
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {feat.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {feat.description}
                          </p>
                        </div>

                        {/* Toggle Switch Compact */}
                        <div className="shrink-0">
                          {feat.isCore ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Actif
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleFeature(feat.key)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                active ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                              role="switch"
                              aria-checked={active}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ================= TAB 4: MOIS D'EVALUATIONS (SCREENSHOT 3 COMPACTED) ================= */}
          {activeTab === 'EVALUATION_CALENDAR' && (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
              {/* Header avec Réinitialiser & Sauvegarder sur la même ligne */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>Configuration des Mois d'Évaluation</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetMonths}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Par Défaut</span>
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </div>

              {/* Barre compacte des effectifs de mensualités */}
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">1er Cycle :</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.evaluationCount1stCycle ?? 2}
                    onChange={e => setFormData(prev => ({ ...prev, evaluationCount1stCycle: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) }))}
                    className="w-12 py-0.5 px-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 text-center outline-none"
                  />
                  <span className="text-[11px] text-slate-500">mensualités</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">2ème Cycle & Lycée :</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.evaluationCount2ndCycle ?? 6}
                    onChange={e => setFormData(prev => ({ ...prev, evaluationCount2ndCycle: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) }))}
                    className="w-12 py-0.5 px-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 text-center outline-none"
                  />
                  <span className="text-[11px] text-slate-500">mensualités</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Total annuel :</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.evaluationCount || 9}
                    onChange={e => setFormData(prev => ({ ...prev, evaluationCount: Math.max(1, Math.min(12, parseInt(e.target.value) || 9)) }))}
                    className="w-12 py-0.5 px-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 text-center outline-none"
                  />
                  <span className="text-[11px] text-slate-500">évals/an</span>
                </div>
              </div>

              {/* Grille Ultra-Compacte des Évaluations Mensuelles */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Évaluations Mensuelles ({formData.evaluationCount || 9} définies) :</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
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
                      <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">Éval N°{num}</span>
                          <span className="text-[9px] font-bold text-blue-900 bg-blue-100/70 px-1.5 py-0.2 rounded">
                            M{num}
                          </span>
                        </div>

                        <select
                          value={isStandard ? currentMonth : 'CUSTOM'}
                          onChange={e => {
                            if (e.target.value !== 'CUSTOM') {
                              handleMonthChange(key, e.target.value);
                            }
                          }}
                          className="w-full py-1 px-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        >
                          {MONTH_OPTIONS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="CUSTOM">Personnalisé...</option>
                        </select>

                        {(!isStandard || currentMonth === 'CUSTOM') && (
                          <input
                            type="text"
                            value={currentMonth === 'CUSTOM' ? '' : currentMonth}
                            onChange={e => handleMonthChange(key, e.target.value)}
                            placeholder="Libellé..."
                            className="w-full py-0.5 px-1.5 bg-white border border-slate-200 rounded text-xs outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trimestres & Semestres : masqués si École Fondamentale */}
              {formData.schoolCategory === 'ECOLE_FONDAMENTALE' ? (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center gap-2 text-xs text-blue-950 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>
                    <strong>Structure exclusive École Fondamentale :</strong> Votre établissement utilise exclusivement les <strong>Évaluations Mensuelles N°1 à N°{formData.evaluationCount || 9}</strong> officielles du Ministère de l'Éducation Nationale du Mali. Les trimestres de lycée et semestres techniques sont automatiquement masqués de toutes les interfaces.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  {/* Trimestres (Lycée) */}
                  {formData.schoolCategory !== 'PROFESSIONNEL' && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Trimestres (Lycée) :
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: 'TRIMESTRE_1', label: '1er Trim.', defaultVal: 'Octobre - Décembre' },
                          { key: 'TRIMESTRE_2', label: '2ème Trim.', defaultVal: 'Janvier - Mars' },
                          { key: 'TRIMESTRE_3', label: '3ème Trim.', defaultVal: 'Avril - Juin' },
                        ].map(t => (
                          <div key={t.key} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">{t.label}</label>
                            <input
                              type="text"
                              value={formData.evaluationMonths?.[t.key] || t.defaultVal}
                              onChange={e => handleMonthChange(t.key, e.target.value)}
                              className="w-full py-0.5 px-1 bg-white border border-slate-200 rounded text-[11px] font-medium outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Semestres (Technique / Professionnel) */}
                  {formData.schoolCategory !== 'LYCEE' && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Semestres (Technique & BT) :
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'SEMESTRE_1', label: '1er Semestre', defaultVal: 'Octobre - Février' },
                          { key: 'SEMESTRE_2', label: '2ème Semestre', defaultVal: 'Mars - Juin' },
                        ].map(s => (
                          <div key={s.key} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">{s.label}</label>
                            <input
                              type="text"
                              value={formData.evaluationMonths?.[s.key] || s.defaultVal}
                              onChange={e => handleMonthChange(s.key, e.target.value)}
                              className="w-full py-0.5 px-1 bg-white border border-slate-200 rounded text-[11px] font-medium outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* ================= TAB 5: FORMULES DES MOYENNES (SCREENSHOT 4 COMPACTED) ================= */}
          {activeTab === 'CALCULATION_FORMULA' && (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Calculator className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>Formules de Calcul des Moyennes Trimestrielles</span>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enregistrer les Formules</span>
                </button>
              </div>

              {/* 1ER CYCLE FONDAMENTAL (NOTES / 10) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.2 bg-amber-100 text-amber-900 rounded font-bold text-[10px] uppercase">
                    1er Cycle Fondamental (/10)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Mode de calcul appliqué aux bulletins
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1.5">
                  {[
                    { id: 'MALI_OFFICIAL', label: 'Standard Malien', formula: '(Classe + Comp) / 2', desc: 'Poids égal devoirs et composition.' },
                    { id: 'EQUAL_WEIGHT', label: 'Égale (50%/50%)', formula: '(Classe + Comp) / 2', desc: 'Poids égal 50% devoirs / 50% comp.' },
                    { id: 'CLASS_ONLY', label: 'Classe Seule (100%)', formula: 'Note Classe', desc: 'Ignore la composition.' },
                    { id: 'COMP_ONLY', label: 'Compos Seule (100%)', formula: 'Composition', desc: 'Ignore les devoirs.' },
                    { id: 'CUSTOM', label: 'Sur-Mesure', formula: 'Pondération libre', desc: 'Poids personnalisés.' },
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => setFormData(prev => ({ ...prev, calculationFormula1stCycle: item.id as any }))}
                      className={`p-2 rounded-lg border transition-all cursor-pointer space-y-1 ${
                        (formData.calculationFormula1stCycle || 'MALI_OFFICIAL') === item.id
                          ? 'bg-blue-50/90 border-blue-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>
                        <input
                          type="radio"
                          name="calc1st"
                          checked={(formData.calculationFormula1stCycle || 'MALI_OFFICIAL') === item.id}
                          onChange={() => {}}
                          className="text-blue-900"
                        />
                      </div>
                      <p className="text-[10px] font-mono font-bold text-blue-900 bg-white px-1.5 py-0.2 rounded border border-blue-100 inline-block">
                        {item.formula}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {formData.calculationFormula1stCycle === 'CUSTOM' && (
                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200 flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-bold text-blue-950 text-[11px]">Poids personnalisés (1er cycle) :</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">Poids Devoirs :</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.classScoreWeight1st ?? 1}
                        onChange={e => setFormData(prev => ({ ...prev, classScoreWeight1st: parseFloat(e.target.value) || 1 }))}
                        className="w-16 py-0.5 px-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">Poids Composition :</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.compScoreWeight1st ?? 1}
                        onChange={e => setFormData(prev => ({ ...prev, compScoreWeight1st: parseFloat(e.target.value) || 1 }))}
                        className="w-16 py-0.5 px-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2EME CYCLE & LYCEE (NOTES / 20) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.2 bg-emerald-100 text-emerald-900 rounded font-bold text-[10px] uppercase">
                    2nd Cycle & Lycée (/20)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Mode de calcul appliqué aux bulletins
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1.5">
                  {[
                    { id: 'MALI_OFFICIAL', label: 'Officiel Mali', formula: '(Dev /20 + Comp /40) / 3', desc: 'Composition compte double.' },
                    { id: 'EQUAL_WEIGHT', label: 'Égale (50%/50%)', formula: '(Dev /20 + Comp /20) / 2', desc: 'Même coefficient 1 et 1.' },
                    { id: 'CLASS_ONLY', label: 'Classe Seule (100%)', formula: 'Note Classe /20', desc: 'Uniquement devoirs.' },
                    { id: 'COMP_ONLY', label: 'Compos Seule (100%)', formula: 'Composition /20', desc: 'Uniquement composition.' },
                    { id: 'CUSTOM', label: 'Sur-Mesure', formula: 'Coefficients libres', desc: 'Poids personnalisés.' },
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => setFormData(prev => ({ ...prev, calculationFormula2ndCycle: item.id as any }))}
                      className={`p-2 rounded-lg border transition-all cursor-pointer space-y-1 ${
                        (formData.calculationFormula2ndCycle || 'MALI_OFFICIAL') === item.id
                          ? 'bg-emerald-50/90 border-emerald-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>
                        <input
                          type="radio"
                          name="calc2nd"
                          checked={(formData.calculationFormula2ndCycle || 'MALI_OFFICIAL') === item.id}
                          onChange={() => {}}
                          className="text-emerald-900"
                        />
                      </div>
                      <p className="text-[10px] font-mono font-bold text-emerald-900 bg-white px-1.5 py-0.2 rounded border border-emerald-100 inline-block">
                        {item.formula}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {formData.calculationFormula2ndCycle === 'CUSTOM' && (
                  <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-bold text-emerald-950 text-[11px]">Coefficients personnalisés (2nd cycle/lycée) :</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">Poids Devoirs :</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.classScoreWeight2nd ?? 1}
                        onChange={e => setFormData(prev => ({ ...prev, classScoreWeight2nd: parseFloat(e.target.value) || 1 }))}
                        className="w-16 py-0.5 px-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">Poids Composition :</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.compScoreWeight2nd ?? 2}
                        onChange={e => setFormData(prev => ({ ...prev, compScoreWeight2nd: parseFloat(e.target.value) || 2 }))}
                        className="w-16 py-0.5 px-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ABSENCES DE NOTES (2 COMPACT DROPDOWNS) */}
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Gestion des Absences de Notes dans la Période :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Si l'élève n'a pas de note de devoirs :
                    </label>
                    <select
                      value={formData.missingClassScoreBehavior || 'USE_COMP_ONLY'}
                      onChange={e => setFormData(prev => ({ ...prev, missingClassScoreBehavior: e.target.value as any }))}
                      className="w-full py-1 px-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="USE_COMP_ONLY">Prendre la note de Composition comme moyenne</option>
                      <option value="ZERO">Compter la note de devoirs comme 0</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Si l'élève n'a pas de note de composition :
                    </label>
                    <select
                      value={formData.missingCompScoreBehavior || 'USE_CLASS_ONLY'}
                      onChange={e => setFormData(prev => ({ ...prev, missingCompScoreBehavior: e.target.value as any }))}
                      className="w-full py-1 px-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="USE_CLASS_ONLY">Prendre la moyenne des devoirs comme moyenne</option>
                      <option value="ZERO">Compter la composition comme 0</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          )}
        </>
      )}

      {/* Modal Création / Modification Utilisateur */}
      {canManageUsers && isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {userEditing ? 'Modifier le Compte Utilisateur' : 'Ajouter un Nouvel Utilisateur'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {userModalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{userModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Ousmane COULIBALY"
                  value={userFormData.fullName}
                  onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Identifiant / Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: directeur, comptable"
                    value={userFormData.username}
                    onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rôle & Attribution *</label>
                  <select
                    value={userFormData.role}
                    onChange={e => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="DIRECTEUR">Directeur Général</option>
                    <option value="COMPTABLE">Chef Comptable</option>
                    <option value="SECRETAIRE">Secrétaire Général(e)</option>
                    <option value="ENSEIGNANT">Enseignant / Professeur</option>
                    <option value="ADMIN">Administrateur Système</option>
                    <option value="LECTURE_SEULE">Consultation Seule</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">Mot de Passe d'Accès *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                      setUserFormData(prev => ({ ...prev, password: randomPin }));
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    Générer PIN auto
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Code d'accès ou mot de passe"
                    value={userFormData.password}
                    onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-1.5 pr-8 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="+223 76 00 11 22"
                    value={userFormData.phone}
                    onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="nom@ecole.edu.ml"
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-active-check"
                  checked={userFormData.active}
                  onChange={e => setUserFormData({ ...userFormData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-900 cursor-pointer"
                />
                <label htmlFor="user-active-check" className="font-semibold text-slate-700 cursor-pointer">
                  Compte actif (autorisé à se connecter au système)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {userEditing ? 'Mettre à jour' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression Utilisateur */}
      {canManageUsers && userDeleting && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-xl border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Supprimer cet Utilisateur ?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Voulez-vous supprimer le compte de <strong className="text-slate-800">{userDeleting.fullName}</strong> ({userDeleting.role}) ?
              </p>
              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg mt-2">
                Cet utilisateur ne pourra plus accéder à la plateforme.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserDeleting(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Installation Modal */}
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
    </div>
  );
};
