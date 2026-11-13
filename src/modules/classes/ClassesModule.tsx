/**
 * SomaSikolo - Classes & Niveaux Module
 * Gestion des divisions scolaires et sélection des matières par classe
 */

import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, Plus, Edit3, Trash2, Users, Building2, BookOpen, Printer, 
  FileText, Search, X, CheckCircle2, Sparkles, Check, Sliders, Layers, 
  ArrowRight, Settings, Info, Filter, RotateCcw
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { SchoolClass, SchoolLevelCategory, Subject, SchoolCategory } from '../../types';
import { 
  formatFCFA, 
  MALI_SCHOOL_LEVEL_CATEGORIES, 
  MALI_DEFAULT_CLASSES, 
  MALI_DEFAULT_SUBJECTS 
} from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';

export const ClassesModule: React.FC = () => {
  const { classes, teachers, students, subjects, settings, saveClass, deleteClass, deleteAllClasses, saveSubject } = useSchool();
  const { hasPermission } = useAuth();
  const canManageClasses = hasPermission('classes:manage');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- GESTION DES MATIÈRES PAR CLASSE ---
  const [classForSubjects, setClassForSubjects] = useState<SchoolClass | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [customCoeffs, setCustomCoeffs] = useState<Record<string, number>>({});
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  const [subjectFilterTab, setSubjectFilterTab] = useState<'ALL' | 'SELECTED'>('ALL');

  // --- AUTO-GÉNÉRATION MODAL ---
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState(false);

  const confirmDeleteClass = () => {
    if (deletingClass) {
      deleteClass(deletingClass.id);
      setToastMessage(`La classe "${deletingClass.name}" a été supprimée.`);
      setDeletingClass(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handlePrintClassList = (cls: SchoolClass) => {
    const classStudents = students.filter(s => s.classId === cls.id && s.status === 'ACTIF');
    PdfService.generateClassListPdf(cls.name, classStudents, settings);
  };

  const getDefaultCategory = (): SchoolClass['category'] => {
    if (settings.schoolCategory === 'LYCEE') return 'LYCEE';
    if (settings.schoolCategory === 'PROFESSIONNEL') return 'TECHNIQUE_BT';
    return 'FONDAMENTAL_2';
  };

  const getDefaultLevel = () => {
    if (settings.schoolCategory === 'LYCEE') return '10ème';
    if (settings.schoolCategory === 'PROFESSIONNEL') return 'BT1';
    return '7ème';
  };

  // Ouverture de la modale de sélection des matières pour une classe
  const handleOpenClassSubjects = (cls: SchoolClass) => {
    setClassForSubjects(cls);
    if (cls.subjectIds && cls.subjectIds.length > 0) {
      setSelectedSubjectIds([...cls.subjectIds]);
    } else {
      // Pré-sélectionner par défaut les matières de son cycle si non encore personnalisées
      const cycleIds = subjects.filter(s => s.classCategory === cls.category).map(s => s.id);
      setSelectedSubjectIds(cycleIds.length > 0 ? cycleIds : subjects.map(s => s.id));
    }
    setCustomCoeffs(cls.customCoefficients ? { ...cls.customCoefficients } : {});
    setSubjectSearch('');
    setSubjectFilterTab('ALL');
  };

  // Basculer l'activation d'une matière pour la classe en cours
  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    );
  };

  // Ajuster le coefficient personnalisé pour cette classe
  const handleCustomCoeffChange = (subId: string, val: number) => {
    const clamped = Math.max(1, Math.min(20, Math.round(val)));
    setCustomCoeffs(prev => ({
      ...prev,
      [subId]: clamped
    }));
  };

  // Enregistrer les matières choisies pour la classe
  const handleSaveClassSubjects = () => {
    if (!classForSubjects) return;
    saveClass({
      ...classForSubjects,
      subjectIds: selectedSubjectIds,
      customCoefficients: customCoeffs
    });
    setToastMessage(`Matières de la classe "${classForSubjects.name}" enregistrées (${selectedSubjectIds.length} matière(s) configurée(s)).`);
    setClassForSubjects(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Génération automatique des classes et matières pour une catégorie donnée
  const handleAutoGenerateClassesForCategory = (cat: 'ECOLE_FONDAMENTALE' | 'LYCEE' | 'PROFESSIONNEL' | 'COMPLEXE') => {
    let classesToCreate = MALI_DEFAULT_CLASSES;
    let subjectsToCreate = MALI_DEFAULT_SUBJECTS;

    if (cat === 'ECOLE_FONDAMENTALE') {
      classesToCreate = MALI_DEFAULT_CLASSES.filter(c => c.category === 'FONDAMENTAL_1' || c.category === 'FONDAMENTAL_2');
      subjectsToCreate = MALI_DEFAULT_SUBJECTS.filter(s => s.classCategory === 'FONDAMENTAL_1' || s.classCategory === 'FONDAMENTAL_2');
    } else if (cat === 'LYCEE') {
      classesToCreate = MALI_DEFAULT_CLASSES.filter(c => c.category === 'LYCEE');
      subjectsToCreate = MALI_DEFAULT_SUBJECTS.filter(s => s.classCategory === 'LYCEE');
    } else if (cat === 'PROFESSIONNEL') {
      classesToCreate = MALI_DEFAULT_CLASSES.filter(c => c.category === 'TECHNIQUE_BT' || c.category === 'PROFESSIONNEL_CAP');
      subjectsToCreate = MALI_DEFAULT_SUBJECTS.filter(s => s.classCategory === 'TECHNIQUE_BT' || s.classCategory === 'PROFESSIONNEL_CAP');
    }

    // 1. Assurer la présence des matières
    const subjectsMap = new Map<string, Subject>();
    subjects.forEach(s => subjectsMap.set(s.code, s));

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
      }
      subjectsMap.set(sub.code, existing);
    });

    const allSubs = Array.from(subjectsMap.values());
    let addedCount = 0;

    // 2. Créer les classes avec leurs matières pré-associées
    classesToCreate.forEach(cls => {
      const existingClass = classes.find(c => c.name.toLowerCase() === cls.name.toLowerCase());
      if (!existingClass) {
        const matchingIds = allSubs
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
          subjectIds: matchingIds
        });
        addedCount++;
      } else if (!existingClass.subjectIds || existingClass.subjectIds.length === 0) {
        const matchingIds = allSubs
          .filter(s => s.classCategory === existingClass.category)
          .map(s => s.id);
        if (matchingIds.length > 0) {
          saveClass({
            ...existingClass,
            subjectIds: matchingIds
          });
        }
      }
    });

    setToastMessage(`Génération terminée : ${addedCount} classe(s) officielle(s) et matières ajoutées !`);
    setIsAutoGenModalOpen(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const classSuggestions = useMemo(() => {
    if (settings.schoolCategory === 'LYCEE') {
      return [
        { name: '10ème Commune', category: 'LYCEE', level: '10ème', fee: 30000 },
        { name: '11ème Sciences', category: 'LYCEE', level: '11ème', fee: 30000 },
        { name: '11ème Lettres', category: 'LYCEE', level: '11ème', fee: 30000 },
        { name: '12ème TSE', category: 'LYCEE', level: '12ème', fee: 35000 },
        { name: '12ème TSEXP', category: 'LYCEE', level: '12ème', fee: 35000 },
        { name: '12ème TSECO', category: 'LYCEE', level: '12ème', fee: 35000 },
        { name: '12ème TSS', category: 'LYCEE', level: '12ème', fee: 35000 },
        { name: '12ème TAL', category: 'LYCEE', level: '12ème', fee: 35000 },
      ];
    }
    if (settings.schoolCategory === 'PROFESSIONNEL') {
      return [
        { name: 'CAP 1 Mécanique', category: 'PROFESSIONNEL_CAP', level: 'CAP1', fee: 25000 },
        { name: 'CAP 2 Mécanique', category: 'PROFESSIONNEL_CAP', level: 'CAP2', fee: 25000 },
        { name: 'BT1 Comptabilité', category: 'TECHNIQUE_BT', level: 'BT1', fee: 30000 },
        { name: 'BT2 Comptabilité', category: 'TECHNIQUE_BT', level: 'BT2', fee: 35000 },
        { name: 'BT1 Secrétariat', category: 'TECHNIQUE_BT', level: 'BT1', fee: 30000 },
        { name: 'BT2 Secrétariat', category: 'TECHNIQUE_BT', level: 'BT2', fee: 35000 },
        { name: 'BT1 Électricité', category: 'TECHNIQUE_BT', level: 'BT1', fee: 30000 },
        { name: 'BT2 Électricité', category: 'TECHNIQUE_BT', level: 'BT2', fee: 35000 },
      ];
    }
    return [
      { name: '1ère Année A', category: 'FONDAMENTAL_1', level: '1ère', fee: 15000 },
      { name: '2ème Année A', category: 'FONDAMENTAL_1', level: '2ème', fee: 15000 },
      { name: '3ème Année A', category: 'FONDAMENTAL_1', level: '3ème', fee: 15000 },
      { name: '4ème Année A', category: 'FONDAMENTAL_1', level: '4ème', fee: 15000 },
      { name: '5ème Année A', category: 'FONDAMENTAL_1', level: '5ème', fee: 15000 },
      { name: '6ème Année A', category: 'FONDAMENTAL_1', level: '6ème', fee: 15000 },
      { name: '7ème Année A', category: 'FONDAMENTAL_2', level: '7ème', fee: 20000 },
      { name: '8ème Année A', category: 'FONDAMENTAL_2', level: '8ème', fee: 20000 },
      { name: '9ème Année DEF', category: 'FONDAMENTAL_2', level: '9ème', fee: 25000 },
    ];
  }, [settings.schoolCategory]);

  const [formData, setFormData] = useState<Partial<SchoolClass>>({
    name: '',
    category: getDefaultCategory(),
    level: getDefaultLevel(),
    monthlyFee: settings.schoolCategory === 'LYCEE' ? 30000 : 20000,
    inscriptionFee: settings.schoolCategory === 'LYCEE' ? 25000 : 15000,
    classroom: 'Salle 01',
    passingGrade: 10
  });

  const handleOpenAdd = () => {
    setSelectedClass(null);
    const cat = getDefaultCategory();
    setFormData({
      name: '',
      category: cat,
      level: getDefaultLevel(),
      monthlyFee: settings.schoolCategory === 'LYCEE' ? 30000 : 20000,
      inscriptionFee: settings.schoolCategory === 'LYCEE' ? 25000 : 15000,
      classroom: 'Salle 01',
      passingGrade: cat === 'FONDAMENTAL_1' ? 5 : 10
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const autoPassing = formData.category === 'FONDAMENTAL_1' ? 5 : 10;
    saveClass({
      ...formData,
      passingGrade: autoPassing
    });
    setIsModalOpen(false);
  };

  // Catégories de cycle disponibles selon le type d'établissement sélectionné
  const availableLevelCategories = useMemo(() => {
    if (settings.schoolCategory === 'ECOLE_FONDAMENTALE') {
      return MALI_SCHOOL_LEVEL_CATEGORIES.filter(c => c.id === 'FONDAMENTAL_1' || c.id === 'FONDAMENTAL_2');
    }
    if (settings.schoolCategory === 'LYCEE') {
      return MALI_SCHOOL_LEVEL_CATEGORIES.filter(c => c.id === 'LYCEE');
    }
    if (settings.schoolCategory === 'PROFESSIONNEL') {
      return MALI_SCHOOL_LEVEL_CATEGORIES.filter(c => c.id === 'TECHNIQUE_BT' || c.id === 'PROFESSIONNEL_CAP');
    }
    return MALI_SCHOOL_LEVEL_CATEGORIES;
  }, [settings.schoolCategory]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      // Filtrage strict par type d'établissement (ex: Fondamental ne voit pas Lycée / BT)
      if (settings.schoolCategory === 'ECOLE_FONDAMENTALE' && c.category !== 'FONDAMENTAL_1' && c.category !== 'FONDAMENTAL_2') {
        return false;
      }
      if (settings.schoolCategory === 'LYCEE' && c.category !== 'LYCEE') {
        return false;
      }
      if (settings.schoolCategory === 'PROFESSIONNEL' && c.category !== 'TECHNIQUE_BT' && c.category !== 'PROFESSIONNEL_CAP') {
        return false;
      }

      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.classroom && c.classroom.toLowerCase().includes(q))
      );
    });
  }, [classes, settings.schoolCategory, search]);

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* Entête & Recherche Unifiés Ultra-Compacts */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Title + Inlined Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
            <GraduationCap className="w-4 h-4 text-blue-900 shrink-0" />
            <span>Classes</span>
            <span className="text-[11px] text-slate-400 font-normal">({filteredClasses.length}/{classes.length})</span>
          </div>

          <div className="relative flex-1 min-w-[170px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher classe, niveau, salle..."
              className="w-full pl-8 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-slate-400 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {canManageClasses && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {classes.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-lg border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                title="Générer automatiquement les classes et matières d'un type d'établissement"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>⚡ Auto-Générer selon Type</span>
              </button>
            )}

            {classes.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Supprimer Tout ({classes.length})</span>
              </button>
            )}

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Créer une Classe</span>
            </button>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bannière de démarrage si aucune classe */}
      {classes.length === 0 && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-sm border border-blue-800 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Génération Automatique Rapide des Classes & Matières</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Sélectionnez votre type d'établissement : KalanGest créera instantanément toutes les classes et matières officielles du Mali. Il vous suffira ensuite de rentrer dans une classe pour choisir ses matières !
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleAutoGenerateClassesForCategory('ECOLE_FONDAMENTALE')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-left border border-white/20 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-lg">🏫</span>
                <span className="font-bold text-xs block text-white mt-1">École Fondamentale</span>
                <span className="text-[11px] text-blue-200">1ère à 6ème Année + 7ème à 9ème DEF</span>
              </div>
              <span className="text-[10px] font-bold text-amber-300 mt-2 flex items-center gap-1">
                Générer les classes fondamentales →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAutoGenerateClassesForCategory('LYCEE')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-left border border-white/20 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-lg">🎓</span>
                <span className="font-bold text-xs block text-white mt-1">Lycée Général</span>
                <span className="text-[11px] text-blue-200">10ème Commune + 11ème & 12ème BAC</span>
              </div>
              <span className="text-[10px] font-bold text-amber-300 mt-2 flex items-center gap-1">
                Générer les classes de lycée →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAutoGenerateClassesForCategory('PROFESSIONNEL')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-left border border-white/20 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-lg">⚙️</span>
                <span className="font-bold text-xs block text-white mt-1">Professionnel & BT</span>
                <span className="text-[11px] text-blue-200">CAP 1 & 2 + BT 1 & 2 Tertiaire/Technique</span>
              </div>
              <span className="text-[10px] font-bold text-amber-300 mt-2 flex items-center gap-1">
                Générer les classes pros →
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {filteredClasses.map((cls) => {
          const teacher = teachers.find(t => t.id === cls.mainTeacherId);
          const assignedCount = cls.subjectIds && cls.subjectIds.length > 0
            ? cls.subjectIds.length
            : subjects.filter(s => s.classCategory === cls.category).length;

          return (
            <div key={cls.id} className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {cls.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Passage : {cls.passingGrade ?? (cls.category === 'FONDAMENTAL_1' ? 5 : 10)}/{cls.category === 'FONDAMENTAL_1' ? '10' : '20'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {cls.name}
                    </h3>
                  </div>
                  {canManageClasses && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          setFormData(cls);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Modifier les informations de la classe"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingClass(cls)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Supprimer la classe"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 mt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effectif</span>
                    <p className="font-bold text-slate-900 text-xs mt-0.5 flex items-center gap-1 font-mono">
                      <Users className="w-3.5 h-3.5 text-slate-500 font-sans" />
                      <span>{cls.studentCount || 0} inscrits</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salle</span>
                    <p className="font-semibold text-slate-700 text-xs mt-0.5 truncate">
                      {cls.classroom || 'Non attribuée'}
                    </p>
                  </div>
                </div>

                {/* Bloc d'accès direct et personnalisation des matières de la classe */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenClassSubjects(cls)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/90 text-blue-950 transition-all cursor-pointer group"
                    title="Cliquer pour choisir les matières enseignées dans cette classe"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BookOpen className="w-4 h-4 text-blue-700 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold truncate">
                        {assignedCount} matière{assignedCount > 1 ? 's' : ''} active{assignedCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs shrink-0 flex items-center gap-1">
                      <span>Choisir les matières</span>
                      <ArrowRight className="w-3 h-3 text-blue-600" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensualité</span>
                  <p className="font-bold text-emerald-700 text-xs sm:text-sm font-mono">
                    {formatFCFA(cls.monthlyFee)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePrintClassList(cls)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                    title="Télécharger Liste PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE : CHOISIR LES MATIÈRES ENSEIGNÉES DANS LA CLASSE */}
      {classForSubjects && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <BookOpen className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold truncate">Matières de la classe : {classForSubjects.name}</h2>
                    <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded">
                      {classForSubjects.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 truncate mt-0.5">
                    Cochez les matières au programme. Les notes, devoirs, examens et bulletins s'adapteront automatiquement.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClassForSubjects(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de Stats & Récapitulatif Direct */}
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>{selectedSubjectIds.length} matière(s) active(s)</span>
                  <span className="text-slate-400 font-normal">sur {subjects.length} disponibles</span>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-900 font-mono font-bold text-[11px]">
                  Total Coeffs : {
                    selectedSubjectIds.reduce((sum, sId) => {
                      const sub = subjects.find(s => s.id === sId);
                      const coeff = (customCoeffs[sId] !== undefined) ? customCoeffs[sId] : (sub?.coefficient || 1);
                      return sum + coeff;
                    }, 0)
                  }
                </div>
              </div>

              {/* Boutons d'action rapide */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const cycleIds = subjects.filter(s => s.classCategory === classForSubjects.category).map(s => s.id);
                    setSelectedSubjectIds(cycleIds);
                  }}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-[11px] transition-colors cursor-pointer"
                  title="Activer uniquement les matières officielles de ce cycle"
                >
                  ⚡ Matières officielles du cycle
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectIds(subjects.map(s => s.id))}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Tout Cocher
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectIds([])}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Tout Décocher
                </button>
              </div>
            </div>

            {/* Filtres & Recherche de Matières */}
            <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={e => setSubjectSearch(e.target.value)}
                  placeholder="Filtrer une matière (ex: Mathématiques, Français, PC...)"
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-slate-400 font-medium text-slate-900"
                />
                {subjectSearch && (
                  <button
                    type="button"
                    onClick={() => setSubjectSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSubjectFilterTab('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    subjectFilterTab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Toutes ({subjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubjectFilterTab('SELECTED')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    subjectFilterTab === 'SELECTED' ? 'bg-white text-blue-900 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Actives pour la classe ({selectedSubjectIds.length})
                </button>
              </div>
            </div>

            {/* Liste des matières avec checkboxes & ajustement coefficient */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {subjects
                .filter(sub => {
                  if (subjectFilterTab === 'SELECTED' && !selectedSubjectIds.includes(sub.id)) return false;
                  if (subjectSearch.trim()) {
                    const q = subjectSearch.toLowerCase().trim();
                    return sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q);
                  }
                  return true;
                })
                .sort((a, b) => {
                  // Mettre en premier les matières du même cycle que la classe
                  const aSameCycle = a.classCategory === classForSubjects.category ? 1 : 0;
                  const bSameCycle = b.classCategory === classForSubjects.category ? 1 : 0;
                  if (aSameCycle !== bSameCycle) return bSameCycle - aSameCycle;
                  return a.name.localeCompare(b.name, 'fr');
                })
                .map(sub => {
                  const isChecked = selectedSubjectIds.includes(sub.id);
                  const effectiveCoeff = customCoeffs[sub.id] !== undefined ? customCoeffs[sub.id] : sub.coefficient;
                  const isCustom = customCoeffs[sub.id] !== undefined && customCoeffs[sub.id] !== sub.coefficient;
                  const isNativeCycle = sub.classCategory === classForSubjects.category;

                  return (
                    <div
                      key={sub.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300/40 shadow-2xs'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      {/* Checkbox & Nom de matière */}
                      <div 
                        onClick={() => handleToggleSubject(sub.id)}
                        className="flex items-center gap-3 flex-1 min-w-[200px] cursor-pointer select-none"
                      >
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                          isChecked 
                            ? 'bg-blue-900 border-blue-900 text-white' 
                            : 'bg-white border-slate-300 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">
                              {sub.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {sub.code}
                            </span>
                            {isNativeCycle && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Cycle Officiel
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Catégorie : {sub.classCategory.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Sélecteur de coefficient pour cette classe */}
                      {isChecked && (
                        <div className="flex items-center gap-2 shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Coefficient :
                          </span>
                          <div className="flex items-center gap-1 font-mono">
                            <button
                              type="button"
                              onClick={() => handleCustomCoeffChange(sub.id, effectiveCoeff - 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                              title="Diminuer le coefficient"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={effectiveCoeff}
                              onChange={e => handleCustomCoeffChange(sub.id, Number(e.target.value))}
                              className="w-8 text-center font-bold text-xs text-blue-950 bg-slate-50 border border-slate-200 rounded py-0.5 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleCustomCoeffChange(sub.id, effectiveCoeff + 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                              title="Augmenter le coefficient"
                            >
                              +
                            </button>
                          </div>
                          {isCustom && (
                            <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                              Modifié
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {subjects.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-medium text-xs">
                  Aucune matière dans le système. Créez des matières dans l'onglet Matières ou utilisez le bouton Auto-Générer.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-600 font-medium">
                {selectedSubjectIds.length} matière(s) retenue(s) pour <strong>{classForSubjects.name}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClassForSubjects(null)}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveClassSubjects}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Enregistrer les Matières ({selectedSubjectIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : AUTO-GÉNÉRATION SELON TYPE D'ÉCOLE */}
      {isAutoGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Générateur Automatique de Classes & Matières
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Sélectionnez le type d'établissement pour charger automatiquement toutes les classes et matières officielles maliennes avec leurs coefficients. Les matières seront directement liées à chaque classe créée !
            </p>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => handleAutoGenerateClassesForCategory('ECOLE_FONDAMENTALE')}
                className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🏫</span>
                    <span className="font-bold text-slate-900 text-xs">École Fondamentale (1ère - 9ème DEF)</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 block mt-0.5">
                    9 classes (1ère à 9ème DEF) + matières fondamentales (Français, Maths, PC, SVT, Anglais, etc.)
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                  Générer →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAutoGenerateClassesForCategory('LYCEE')}
                className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🎓</span>
                    <span className="font-bold text-slate-900 text-xs">Lycée Général (10ème - 12ème BAC)</span>
                  </div>
                  <span className="text-[11px] text-blue-800 block mt-0.5">
                    6 classes (10ème CG, 11ème S, 11ème L, TSE, TSS, TAL) + matières avancées
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
                  Générer →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAutoGenerateClassesForCategory('PROFESSIONNEL')}
                className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⚙️</span>
                    <span className="font-bold text-slate-900 text-xs">Formation Professionnelle & Technique</span>
                  </div>
                  <span className="text-[11px] text-amber-800 block mt-0.5">
                    CAP 1 & 2 + BT 1 & 2 (Comptabilité, Secrétariat, Électricité) + matières pro
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-700 group-hover:translate-x-1 transition-transform">
                  Générer →
                </span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / ÉDITION DE CLASSE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900">
                {selectedClass ? 'Modifier la Classe' : 'Nouvelle Classe'}
              </h2>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                Type : {settings.schoolCategory === 'LYCEE' ? 'Lycée' : settings.schoolCategory === 'PROFESSIONNEL' ? 'Professionnel' : 'École Fondamentale'}
              </span>
            </div>

            {/* Suggestions en 1 clic pour accélérer la saisie */}
            {!selectedClass && (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Remplissage Rapide ({settings.schoolCategory === 'LYCEE' ? 'Lycée' : settings.schoolCategory === 'PROFESSIONNEL' ? 'Professionnel' : 'École Fondamentale'}) :</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {classSuggestions.map(sug => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          name: sug.name,
                          category: sug.category as any,
                          level: sug.level,
                          passingGrade: sug.category === 'FONDAMENTAL_1' ? 5 : 10,
                          monthlyFee: sug.fee
                        }));
                      }}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-800 text-[10px] font-semibold border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                      {sug.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Nom de la Classe *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 9ème Année A, TSS 1, BT1..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Cycle / Catégorie *</label>
                <select
                  value={formData.category}
                  onChange={e => {
                    const newCat = e.target.value as SchoolLevelCategory;
                    setFormData({
                      ...formData,
                      category: newCat,
                      passingGrade: newCat === 'FONDAMENTAL_1' ? 5 : 10
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                >
                  {availableLevelCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Salle d'Étude</label>
                  <input
                    type="text"
                    placeholder="Ex: Salle 01, Bâtiment B..."
                    value={formData.classroom || ''}
                    onChange={e => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Frais Mensuels FCFA *</label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyFee}
                    onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Note de passage automatique selon le cycle */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-950 block text-xs">Note de passage automatique</span>
                  <span className="text-[11px] text-amber-800">
                    {formData.category === 'FONDAMENTAL_1'
                      ? 'Barème officiel Fondamental 1 (Moyenne requise ≥ 5.00 / 10)'
                      : 'Barème officiel Secondaire & Lycée (Moyenne requise ≥ 10.00 / 20)'}
                  </span>
                </div>
                <span className="px-3 py-1 bg-amber-200 text-amber-950 rounded-lg font-black font-mono text-xs shrink-0">
                  {formData.category === 'FONDAMENTAL_1' ? '5.00 / 10' : '10.00 / 20'}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-7 space-y-5 text-center border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Supprimer la Classe
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1.5">
                Êtes-vous sûr de vouloir supprimer la classe <strong className="text-slate-900">{deletingClass.name}</strong> ?
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeletingClass(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteClass}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllClasses}
        title="Supprimer Toutes les Classes"
        itemCount={classes.length}
        description="Attention ! Cette action supprimera définitivement TOUTES les classes créées."
      />
    </div>
  );
};
