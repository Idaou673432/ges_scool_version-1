/**
 * SomaSikolo - Enseignants & Corps Professeurs Module
 */

import React, { useState, useMemo } from 'react';
import { Briefcase, Plus, Phone, Mail, Award, Edit3, Trash2, Printer, FileText, Search, X } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Teacher } from '../../types';
import { formatFCFA } from '../../constants/maliEducation';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';

export const TeachersModule: React.FC = () => {
  const { teachers, subjects, settings, saveTeacher, deleteTeacher, deleteAllTeachers } = useSchool();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter(t => 
      t.firstName.toLowerCase().includes(q) ||
      t.lastName.toLowerCase().includes(q) ||
      t.specialty.toLowerCase().includes(q) ||
      (t.phone && t.phone.includes(q))
    );
  }, [teachers, searchQuery]);

  const handlePrintSalarySlip = (teacher: Teacher) => {
    PdfService.generateTeacherSalarySlipPdf(teacher, settings);
  };

  const [formData, setFormData] = useState<Partial<Teacher>>({
    firstName: '',
    lastName: '',
    gender: 'M',
    phone: '',
    email: '',
    address: 'Bamako',
    specialty: 'Mathématiques',
    monthlySalary: undefined,
    status: 'ACTIF',
    subjectsHandled: []
  });

  const handleOpenAdd = () => {
    setSelectedTeacher(null);
    setFormData({
      firstName: '',
      lastName: '',
      gender: 'M',
      phone: '',
      email: '',
      address: 'Bamako',
      specialty: 'Mathématiques',
      monthlySalary: undefined,
      status: 'ACTIF',
      subjectsHandled: []
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTeacher(formData);
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteTeacher(id);
    setDeletingTeacherId(null);
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4">
      {/* Entête & Recherche Unifiés Ultra-Compacts */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Title + Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 pr-1 shrink-0">
            <Briefcase className="w-4 h-4 text-blue-900 shrink-0" />
            <span>Enseignants</span>
            <span className="text-[11px] text-slate-400 font-normal">({filteredTeachers.length}/{teachers.length})</span>
          </div>

          <div className="relative flex-1 min-w-[170px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher nom, spécialité, tél..."
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
        <div className="flex items-center gap-1.5 shrink-0">
          {teachers.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Supprimer Tout ({teachers.length})</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Ajouter Enseignant</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {filteredTeachers.map((tch) => (
          <div key={tch.id} className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {tch.firstName.charAt(0)}{tch.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      {tch.firstName} {tch.lastName.toUpperCase()}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">{tch.specialty}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePrintSalarySlip(tch)}
                    className="p-1 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Télécharger Fiche de Paie PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTeacher(tch);
                      setFormData(tch);
                      setIsModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingTeacherId(tch.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-2 mt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px]">{tch.phone}</span>
                </div>
                {tch.email && (
                  <div className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-[11px]">{tch.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salaire Mensuel</span>
              <span className="font-bold text-emerald-700 text-xs sm:text-sm font-mono">
                {tch.monthlySalary && tch.monthlySalary > 0 ? formatFCFA(tch.monthlySalary) : 'Non défini'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add / Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              {selectedTeacher ? 'Modifier l\'Enseignant' : 'Nouvel Enseignant'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Téléphone Mobile *</label>
                  <input
                    type="text"
                    required
                    placeholder="+223 76 ..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Spécialité *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mathématiques, SVT..."
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Salaire Mensuel FCFA</label>
                  <span className="text-[10px] text-slate-400 font-medium">(Optionnel)</span>
                </div>
                <input
                  type="number"
                  placeholder="Ex: 150000 (ou laisser vide)"
                  value={formData.monthlySalary ?? ''}
                  onChange={e => setFormData({ ...formData, monthlySalary: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
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

      {/* Modal: Delete Teacher Confirmation */}
      {deletingTeacherId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-5 text-center border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supprimer cet Enseignant ?</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Cette action retirera cet enseignant du registre.
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-1">
              <button
                onClick={() => setDeletingTeacherId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingTeacherId)}
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
        onConfirm={deleteAllTeachers}
        title="Supprimer Tous les Enseignants"
        itemCount={teachers.length}
        description="Attention ! Cette action supprimera définitivement TOUS les enseignants enregistrés."
      />
    </div>
  );
};

