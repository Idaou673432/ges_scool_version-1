/**
 * SomaSikolo - Classes & Niveaux Module
 */

import React, { useState, useMemo } from 'react';
import { GraduationCap, Plus, Edit3, Trash2, Users, Building2, BookOpen, Printer, FileText, Search, X, CheckCircle2, Sparkles } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { SchoolClass, SchoolLevelCategory } from '../../types';
import { formatFCFA, MALI_SCHOOL_LEVEL_CATEGORIES } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';

export const ClassesModule: React.FC = () => {
  const { classes, teachers, students, settings, saveClass, deleteClass, deleteAllClasses } = useSchool();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        <div className="flex items-center gap-1.5 shrink-0">
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
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {filteredClasses.map((cls) => {
            const teacher = teachers.find(t => t.id === cls.mainTeacherId);
            return (
              <div key={cls.id} className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2 flex flex-col justify-between">
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          setFormData(cls);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Modifier la classe"
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
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                      title="Télécharger Liste PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Liste PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal */}
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
