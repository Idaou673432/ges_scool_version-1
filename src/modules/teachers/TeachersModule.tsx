/**
 * SomaSikolo - Enseignants & Corps Professeurs Module
 */

import React, { useState } from 'react';
import { Briefcase, Plus, Phone, Mail, Award, Edit3, Trash2, Printer, FileText } from 'lucide-react';
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
    diploma: 'Master ENSup',
    specialty: 'Mathématiques',
    monthlySalary: 200000,
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
      diploma: 'Master ENSup',
      specialty: 'Mathématiques',
      monthlySalary: 200000,
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
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-blue-900" />
            <span>Gestion du Corps Enseignant</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Professeurs • Spécialités académiques • Traitements salariaux FCFA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {teachers.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer Tout ({teachers.length})</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Enseignant</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((tch) => (
          <div key={tch.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white font-black text-base flex items-center justify-center shrink-0">
                  {tch.firstName.charAt(0)}{tch.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {tch.firstName} {tch.lastName.toUpperCase()}
                  </h3>
                  <span className="text-xs text-blue-900 font-bold">{tch.specialty}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePrintSalarySlip(tch)}
                  className="p-2 text-slate-400 hover:text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all cursor-pointer"
                  title="Télécharger Fiche de Paie PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTeacher(tch);
                    setFormData(tch);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  title="Modifier"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingTeacherId(tch.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 font-bold">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{tch.diploma}</span>
              </div>
              <div className="flex items-center gap-2 font-bold">
                <Phone className="w-4 h-4 text-blue-900 shrink-0" />
                <span className="font-mono">{tch.phone}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salaire Mensuel</span>
              <span className="font-black text-emerald-700 text-sm">{formatFCFA(tch.monthlySalary)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add / Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-xl font-black text-slate-900 uppercase">
              {selectedTeacher ? 'Modifier l\'Enseignant' : 'Nouvel Enseignant'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone Mobile *</label>
                <input
                  type="text"
                  required
                  placeholder="+223 76 ..."
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diplôme Académique *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Master ENSup, Licence ULSHB"
                  value={formData.diploma}
                  onChange={e => setFormData({ ...formData, diploma: e.target.value })}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Spécialité *</label>
                  <input
                    type="text"
                    required
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salaire FCFA *</label>
                  <input
                    type="number"
                    required
                    value={formData.monthlySalary}
                    onChange={e => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full font-mono font-black outline-none focus:ring-2 focus:ring-blue-900"
                  />
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

      {/* Modal: Delete Teacher Confirmation */}
      {deletingTeacherId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">Supprimer cet Enseignant ?</h2>
              <p className="text-xs text-slate-500 mt-2 font-semibold">
                Cette action retirera cet enseignant du registre.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingTeacherId(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingTeacherId)}
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
        onConfirm={deleteAllTeachers}
        title="Supprimer Tous les Enseignants"
        itemCount={teachers.length}
        description="Attention ! Cette action supprimera définitivement TOUS les enseignants enregistrés."
      />
    </div>
  );
};

