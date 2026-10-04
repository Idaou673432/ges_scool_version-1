/**
 * SomaSikolo - Matières & Coefficients Module
 */

import React, { useState } from 'react';
import { BookOpen, Plus, Edit3, Trash2, Search } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Subject, SchoolLevelCategory } from '../../types';
import { MALI_SCHOOL_LEVEL_CATEGORIES } from '../../constants/maliEducation';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';

export const SubjectsModule: React.FC = () => {
  const { subjects, saveSubject, deleteSubject, deleteAllSubjects } = useSchool();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubj, setSelectedSubj] = useState<Subject | null>(null);
  const [deletingSubjId, setDeletingSubjId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Subject>>({
    code: '',
    name: '',
    coefficient: 2,
    classCategory: 'FONDAMENTAL_2',
    order: 1
  });

  const filteredSubjects = subjects.filter(sub => {
    const matchesCat = selectedCategory === 'ALL' || sub.classCategory === selectedCategory;
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || sub.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenAdd = () => {
    setSelectedSubj(null);
    setFormData({
      code: '',
      name: '',
      coefficient: 2,
      classCategory: 'FONDAMENTAL_2',
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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-blue-900" />
            <span>Matières, Coefficients & Programme</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Définition des coefficients d'évaluation par cycle d'enseignement au Mali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {subjects.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Supprimer Tout ({subjects.length})</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Ajouter une Matière</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Tous les Cycles ({subjects.length})
          </button>
          {MALI_SCHOOL_LEVEL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher matière..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 font-bold text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-6">Code</th>
                <th className="py-3.5 px-4">Intitulé de la Matière</th>
                <th className="py-3.5 px-4">Coefficient</th>
                <th className="py-3.5 px-4">Cycle Appliqué</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Aucune matière trouvée.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">{sub.code}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{sub.name}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">Coef {sub.coefficient}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200">
                        {sub.classCategory.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSubj(sub);
                            setFormData(sub);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingSubjId(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
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
                    {MALI_SCHOOL_LEVEL_CATEGORIES.map(cat => (
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

