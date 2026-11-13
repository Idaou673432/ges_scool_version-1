/**
 * SomaSikolo - Matières & Coefficients Module
 */

import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Edit3, Trash2, Search, X } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { Subject, SchoolLevelCategory } from '../../types';
import { MALI_SCHOOL_LEVEL_CATEGORIES } from '../../constants/maliEducation';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';

export const SubjectsModule: React.FC = () => {
  const { settings, subjects, saveSubject, deleteSubject, deleteAllSubjects } = useSchool();
  const { hasPermission } = useAuth();
  const canManageSubjects = hasPermission('subjects:manage');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubj, setSelectedSubj] = useState<Subject | null>(null);
  const [deletingSubjId, setDeletingSubjId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getDefaultCategory = (): Subject['classCategory'] => {
    if (settings.schoolCategory === 'LYCEE') return 'LYCEE';
    if (settings.schoolCategory === 'PROFESSIONNEL') return 'TECHNIQUE_BT';
    return 'FONDAMENTAL_2';
  };

  const [formData, setFormData] = useState<Partial<Subject>>({
    code: '',
    name: '',
    coefficient: 2,
    classCategory: getDefaultCategory(),
    order: 1
  });

  // Catégories disponibles selon le niveau de l'établissement
  const availableCategories = useMemo(() => {
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

  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      // Filtrage strict par type d'établissement
      if (settings.schoolCategory === 'ECOLE_FONDAMENTALE' && sub.classCategory !== 'FONDAMENTAL_1' && sub.classCategory !== 'FONDAMENTAL_2') {
        return false;
      }
      if (settings.schoolCategory === 'LYCEE' && sub.classCategory !== 'LYCEE') {
        return false;
      }
      if (settings.schoolCategory === 'PROFESSIONNEL' && sub.classCategory !== 'TECHNIQUE_BT' && sub.classCategory !== 'PROFESSIONNEL_CAP') {
        return false;
      }

      const matchesCat = selectedCategory === 'ALL' || sub.classCategory === selectedCategory;
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || sub.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [subjects, settings.schoolCategory, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setSelectedSubj(null);
    setFormData({
      code: '',
      name: '',
      coefficient: 2,
      classCategory: getDefaultCategory(),
      order: subjects.length + 1
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSubject(formData);
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteSubject(id);
    setDeletingSubjId(null);
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* Entête, Filtre de Cycle & Recherche Unifiés Ultra-Compacts */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Title + Cycle select + Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
            <BookOpen className="w-4 h-4 text-blue-900 shrink-0" />
            <span>Matières</span>
            <span className="text-[11px] text-slate-400 font-normal">({filteredSubjects.length}/{subjects.length})</span>
          </div>

          {/* Cycle Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-2 py-1 transition-colors shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cycle</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
            >
              <option value="ALL">
                {settings.schoolCategory === 'ECOLE_FONDAMENTALE' 
                  ? 'Fondamental (Toutes matières)' 
                  : settings.schoolCategory === 'LYCEE'
                  ? 'Lycée (Toutes matières)'
                  : 'Tous les cycles'} ({filteredSubjects.length})
              </option>
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Search Field */}
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher matière..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {canManageSubjects && (
          <div className="flex items-center gap-1.5 shrink-0">
            {subjects.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Supprimer Tout ({subjects.length})</span>
              </button>
            )}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Ajouter Matière</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 font-bold text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-2 px-3 sm:px-4">Code</th>
                <th className="py-2 px-3">Intitulé de la Matière</th>
                <th className="py-2 px-2.5">Coefficient</th>
                <th className="py-2 px-2.5">Cycle Appliqué</th>
                <th className="py-2 px-3 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Aucune matière trouvée.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-1.5 sm:py-2 px-3 sm:px-4 font-mono font-bold text-slate-900">{sub.code}</td>
                    <td className="py-1.5 sm:py-2 px-3 font-semibold text-slate-900">{sub.name}</td>
                    <td className="py-1.5 sm:py-2 px-2.5 font-bold text-slate-800 font-mono">Coef {sub.coefficient}</td>
                    <td className="py-1.5 sm:py-2 px-2.5 text-slate-500">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200">
                        {sub.classCategory.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 sm:px-4 text-right">
                      {canManageSubjects ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedSubj(sub);
                              setFormData(sub);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSubjId(sub.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Lecture seule</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              {selectedSubj ? 'Modifier la Matière' : 'Nouvelle Matière'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Code (Ex: MATH, FRAN) *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Intitulé Complet *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Coefficient *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={formData.coefficient}
                    onChange={e => setFormData({ ...formData, coefficient: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Cycle *</label>
                  <select
                    value={formData.classCategory}
                    onChange={e => setFormData({ ...formData, classCategory: e.target.value as SchoolLevelCategory })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
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

      {/* Modal: Delete Confirmation */}
      {deletingSubjId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-5 text-center border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supprimer cette Matière ?</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Cette action supprimera définitivement cette matière du programme scolaire.
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-1">
              <button
                onClick={() => setDeletingSubjId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingSubjId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete All Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllSubjects}
        title="Supprimer Toutes les Matières"
        itemCount={subjects.length}
        description="Attention ! Cette action supprimera définitivement TOUTES les matières du programme scolaire."
      />
    </div>
  );
};

