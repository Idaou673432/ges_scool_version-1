/**
 * SomaSikolo - Classes & Niveaux Module
 */

import React, { useState } from 'react';
import { GraduationCap, Plus, Edit3, Trash2, Users, Building2, BookOpen, Printer, FileText, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
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

  const [formData, setFormData] = useState<Partial<SchoolClass>>({
    name: '',
    category: 'FONDAMENTAL_2',
    level: '7ème',
    capacity: 45,
    monthlyFee: 20000,
    inscriptionFee: 15000,
    classroom: 'Salle 01'
  });

  const handleOpenAdd = () => {
    setSelectedClass(null);
    setFormData({
      name: '',
      category: 'FONDAMENTAL_2',
      level: '7ème',
      capacity: 45,
      monthlyFee: 20000,
      inscriptionFee: 15000,
      classroom: 'Salle 01',
      passingGrade: 10
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveClass(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-blue-900" />
            <span>Gestion des Classes & Niveaux</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Effectifs • Capacités des salles • Frais de scolarité FCFA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {classes.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Supprimer Tout ({classes.length})</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Créer une Classe</span>
          </button>
        </div>
      </div>

      {/* Category Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            categoryFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Toutes les Classes ({classes.length})
        </button>
        {MALI_SCHOOL_LEVEL_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === cat.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes
          .filter(c => categoryFilter === 'ALL' || c.category === categoryFilter)
          .map((cls) => {
            const teacher = teachers.find(t => t.id === cls.mainTeacherId);
            return (
              <div key={cls.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                          {cls.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                          Passage : {cls.passingGrade ?? (cls.category === 'FONDAMENTAL_1' ? 5 : 10)}/{cls.category === 'FONDAMENTAL_1' ? '10' : '20'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2.5">
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
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Modifier la classe"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingClass(cls)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Supprimer la classe"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-4 mt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effectif Inscrit</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1 font-mono">
                        <Users className="w-3.5 h-3.5 text-slate-500 font-sans" />
                        <span>{cls.studentCount || 0} / {cls.capacity}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salle d'Étude</span>
                      <p className="font-semibold text-slate-700 text-xs mt-0.5 truncate">
                        {cls.classroom || 'Non attribuée'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensualité</span>
                    <p className="font-bold text-emerald-700 text-sm font-mono">
                      {formatFCFA(cls.monthlyFee)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintClassList(cls)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-slate-200"
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
            <h2 className="text-base font-bold text-slate-900">
              {selectedClass ? 'Modifier la Classe' : 'Nouvelle Classe'}
            </h2>

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
                  onChange={e => setFormData({ ...formData, category: e.target.value as SchoolLevelCategory })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                >
                  {MALI_SCHOOL_LEVEL_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Capacité *</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Frais Mensuels FCFA *</label>
                  <input
                    type="number"
                    value={formData.monthlyFee}
                    onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  Note de Passage / Moyenne d'Admission *
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={formData.category === 'FONDAMENTAL_1' ? 10 : 20}
                    value={formData.passingGrade ?? (formData.category === 'FONDAMENTAL_1' ? 5 : 10)}
                    onChange={e => setFormData({ ...formData, passingGrade: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-bold font-mono"
                  />
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    / {formData.category === 'FONDAMENTAL_1' ? '10' : '20'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Moyenne générale minimale requise pour qu'un élève soit promu en classe supérieure.
                </p>
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
