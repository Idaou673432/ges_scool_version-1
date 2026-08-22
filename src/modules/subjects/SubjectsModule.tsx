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
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-blue-900" />
            <span>Matières, Coefficients & Programme</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Définition des coefficients d'évaluation par cycle d'enseignement au Mali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {subjects.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer Tout ({subjects.length})</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Matière</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              selectedCategory === 'ALL' ? 'bg-blue-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Tous les Cycles ({subjects.length})
          </button>
          {MALI_SCHOOL_LEVEL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                selectedCategory === cat.id ? 'bg-blue-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher matière..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-50">
            <tr>
              <th className="py-4 px-8">Code</th>
              <th className="py-4 px-4">Intitulé de la Matière</th>
              <th className="py-4 px-4">Coefficient</th>
              <th className="py-4 px-4">Cycle Appliqué</th>
              <th className="py-4 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-50">
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                  Aucune matière trouvée.
                </td>
              </tr>
            ) : (
              filteredSubjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-8 font-mono font-black text-blue-900">{sub.code}</td>
                  <td className="py-4 px-4 font-bold text-slate-900">{sub.name}</td>
                  <td className="py-4 px-4 font-black text-slate-800">Coef {sub.coefficient}</td>
                  <td className="py-4 px-4 text-slate-500 font-bold">
                    <span className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      {sub.classCategory.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedSubj(sub);
                          setFormData(sub);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-900 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSubjId(sub.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add/Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-xl font-black text-slate-900 uppercase">
              {selectedSubj ? 'Modifier la Matière' : 'Nouvelle Matière'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Code (Ex: MATH, FRAN) *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intitulé Complet *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coefficient *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={formData.coefficient}
                    onChange={e => setFormData({ ...formData, coefficient: Number(e.target.value) })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle *</label>
                  <select
                    value={formData.classCategory}
                    onChange={e => setFormData({ ...formData, classCategory: e.target.value as SchoolLevelCategory })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    {MALI_SCHOOL_LEVEL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">Supprimer cette Matière ?</h2>
              <p className="text-xs text-slate-500 mt-2 font-semibold">
                Cette action supprimera définitivement cette matière du programme scolaire.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingSubjId(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingSubjId)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
              >
                Confirmer Suppression
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

