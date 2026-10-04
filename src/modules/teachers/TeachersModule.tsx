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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-blue-900" />
            <span>Gestion du Corps Enseignant</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Professeurs • Spécialités académiques • Traitements salariaux FCFA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {teachers.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Supprimer Tout ({teachers.length})</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Ajouter un Enseignant</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((tch) => (
          <div key={tch.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {tch.firstName.charAt(0)}{tch.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {tch.firstName} {tch.lastName.toUpperCase()}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">{tch.specialty}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePrintSalarySlip(tch)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
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
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTeacherId(tch.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-4 mt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 font-medium">
                  <Award className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{tch.diploma}</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{tch.phone}</span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salaire Mensuel</span>
              <span className="font-bold text-emerald-700 text-sm font-mono">{formatFCFA(tch.monthlySalary)}</span>
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
                <label className="font-semibold text-slate-700">Diplôme Académique *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Master ENSup, Licence ULSHB"
                  value={formData.diploma}
                  onChange={e => setFormData({ ...formData, diploma: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Spécialité *</label>
                  <input
                    type="text"
                    required
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Salaire FCFA *</label>
                  <input
                    type="number"
                    required
                    value={formData.monthlySalary}
                    onChange={e => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
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

