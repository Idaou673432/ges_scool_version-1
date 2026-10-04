/**
 * SomaSikolo - Élèves & Inscriptions Module
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  UserCheck, 
  QrCode, 
  Phone, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  FileSpreadsheet, 
  Download,
  Calendar,
  MapPin,
  CheckCircle,
  Sparkles,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Student, Gender, StudentStatus } from '../../types';
import { PdfService } from '../../services/pdfService';
import { DeleteAllModal } from '../../components/common/DeleteAllModal';
import { ExcelImportModal } from '../../components/students/ExcelImportModal';

export const StudentsModule: React.FC = () => {
  const { students, classes, saveStudent, deleteStudent, deleteAllStudents, settings } = useSchool();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [qrModalStudent, setQrModalStudent] = useState<{ student: Student; qrUrl: string } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    gender: 'M',
    birthDate: '2010-01-01',
    birthPlace: 'Bamako',
    nationality: 'Mali',
    address: 'Bamako',
    phone: '',
    photoUrl: '',
    classId: classes[0]?.id || '',
    status: 'ACTIF',
    academicYear: settings.currentAcademicYear,
    parent: {
      fatherName: '',
      fatherPhone: '',
      motherName: '',
      motherPhone: ''
    },
    observations: ''
  });

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.matricule.toLowerCase().includes(search.toLowerCase());
    
    const matchesClass = classFilter === 'ALL' || s.classId === classFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setSelectedStudent(null);
    setFormData({
      firstName: '',
      lastName: '',
      gender: 'M',
      birthDate: '2010-05-15',
      birthPlace: 'Bamako',
      nationality: 'Mali',
      address: 'Bamako',
      phone: '',
      photoUrl: '',
      classId: classes[0]?.id || '',
      status: 'ACTIF',
      academicYear: settings.currentAcademicYear,
      parent: {
        fatherName: '',
        fatherPhone: '',
        motherName: '',
        motherPhone: ''
      },
      observations: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStudent(formData);
    setIsModalOpen(false);
  };

  const [deletingStudent, setDeletingStudent] = useState<{ id: string; name: string } | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const confirmDeleteStudent = () => {
    if (deletingStudent) {
      deleteStudent(deletingStudent.id);
      setDeleteToast(`L'élève ${deletingStudent.name} a été supprimé avec succès.`);
      setDeletingStudent(null);
      setTimeout(() => setDeleteToast(null), 3000);
    }
  };

  const handleShowQrCode = async (student: Student) => {
    const qrUrl = await PdfService.generateStudentCardQr(student);
    setQrModalStudent({ student, qrUrl });
  };

  const handleBatchImport = (importedStudents: Partial<Student>[]) => {
    importedStudents.forEach(std => {
      saveStudent(std);
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-slate-900" />
            <span>Corps Étudiant & Inscriptions</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Répertoire national des élèves • Photos officielles • QR Codes • Homologué MEN Mali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer Tout ({students.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExcelImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importer Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Inscrire un Élève</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, Prénom, Matricule (MLE)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 focus:bg-white transition-all"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="py-2 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition-all"
        >
          <option value="ALL">Toutes les Classes ({classes.length})</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition-all"
        >
          <option value="ALL">Tous les Statuts</option>
          <option value="ACTIF">Inscrit (Actif)</option>
          <option value="ABANDON">Abandon</option>
          <option value="EXCLU">Exclu</option>
          <option value="TRANSFERE">Transféré</option>
        </select>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-6">Photo</th>
                <th className="py-3 px-4">Matricule MLE</th>
                <th className="py-3 px-4">Nom & Prénom</th>
                <th className="py-3 px-4">Sexe</th>
                <th className="py-3 px-4">Classe</th>
                <th className="py-3 px-4">Contact Tuteur</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Aucun élève trouvé avec les critères indiqués.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const studentClass = classes.find(c => c.id === std.classId);
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6">
                        {std.photoUrl ? (
                          <img
                            src={std.photoUrl}
                            alt={std.firstName}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-200">
                            {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {std.matricule}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{std.lastName.toUpperCase()} {std.firstName}</span>
                        <span className="block text-[10px] text-slate-400">
                          Né(e) le {new Date(std.birthDate).toLocaleDateString('fr-FR')} • {std.birthPlace}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          std.gender === 'F' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {std.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {studentClass?.name || 'Non assigné'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="block truncate">{std.parent.fatherName || std.parent.motherName || 'Tuteur'}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {std.parent.fatherPhone || std.parent.motherPhone || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          std.status === 'ACTIF' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {std.status}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setViewingStudent(std)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Dossier Élève"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShowQrCode(std)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Carte Scolaire QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(std)}
                          className="p-1.5 text-slate-400 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent({ id: std.id, name: `${std.firstName} ${std.lastName}` })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-2xl shadow-xl border border-slate-200/80 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {selectedStudent ? 'Modifier le Dossier Élève' : 'Inscription d\'un Nouvel Élève'}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              {/* Photo Upload Section */}
              <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                <div className="relative shrink-0">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Aperçu"
                      className="w-18 h-18 rounded-xl object-cover border-2 border-slate-900 shadow-2xs"
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-xl bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xl border border-slate-300">
                      <Camera className="w-7 h-7" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Photo d'Identité Officielle
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 font-normal">Format JPG ou PNG pour la carte scolaire</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-slate-800 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nom de Famille *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-slate-800 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sexe *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
                  >
                    <option value="M">Masculin (Garçon)</option>
                    <option value="F">Féminin (Fille)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Classe *</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date de Naissance *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-slate-800 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lieu de Naissance *</label>
                  <input
                    type="text"
                    required
                    value={formData.birthPlace}
                    onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-slate-800 focus:bg-white text-xs"
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Informations du Parent / Tuteur</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nom du Père / Tuteur *</label>
                    <input
                      type="text"
                      required
                      value={formData.parent?.fatherName}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherName: e.target.value }
                      })}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-slate-800 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Téléphone Père / Tuteur *</label>
                    <input
                      type="text"
                      required
                      placeholder="+223 76 ..."
                      value={formData.parent?.fatherPhone}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherPhone: e.target.value }
                      })}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-slate-800 focus:bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Enregistrer l'Élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dossier Student Preview Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-xl border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Fiche Individuelle Élève</h2>
              <button 
                type="button"
                onClick={() => setViewingStudent(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              {viewingStudent.photoUrl ? (
                <img
                  src={viewingStudent.photoUrl}
                  alt={viewingStudent.firstName}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-lg shadow-2xs">
                  {viewingStudent.firstName.charAt(0)}{viewingStudent.lastName.charAt(0)}
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewingStudent.lastName} {viewingStudent.firstName}
                </h3>
                <p className="font-mono text-xs font-bold text-slate-600 mt-0.5">
                  Matricule: {viewingStudent.matricule}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                  Statut: {viewingStudent.status}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Date & Lieu de Naissance:</span> {new Date(viewingStudent.birthDate).toLocaleDateString('fr-FR')} à {viewingStudent.birthPlace}</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Père / Tuteur:</span> {viewingStudent.parent.fatherName} ({viewingStudent.parent.fatherPhone})</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Mère / Tuteur:</span> {viewingStudent.parent.motherName || 'Non renseigné'}</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Adresse Résidence:</span> {viewingStudent.address}</p>
            </div>

            <button
              type="button"
              onClick={() => setViewingStudent(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Fermer le Dossier
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal Preview */}
      {/* Delete Toast Banner */}
      {deleteToast && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-between shadow-lg animate-fadeIn">
          <span>{deleteToast}</span>
          <button onClick={() => setDeleteToast(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 sm:p-7 space-y-5 text-center border border-slate-200/80">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Confirmer la suppression
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-1.5">
                Voulez-vous vraiment supprimer définitivement l'élève <strong className="text-slate-900 font-bold">{deletingStudent.name}</strong> ?
              </p>
              <p className="text-[11px] text-rose-600 font-medium mt-1">
                Cette action supprimera également son historique de notes et de scolarité.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-2xs transition-all"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {qrModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 space-y-6 text-center">
            <h2 className="text-xl font-black text-slate-900 uppercase">
              Carte Scolaire QR
            </h2>
            <div className="p-4 bg-slate-50 rounded-2xl inline-block border border-slate-200">
              <img src={qrModalStudent.qrUrl} alt="QR Code Élève" className="w-48 h-48 mx-auto" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {qrModalStudent.student.firstName} {qrModalStudent.student.lastName}
              </p>
              <p className="font-mono text-blue-900 font-black text-xs mt-0.5">
                {qrModalStudent.student.matricule}
              </p>
            </div>
            <button
              onClick={() => setQrModalStudent(null)}
              className="w-full py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        classes={classes}
        currentAcademicYear={settings.currentAcademicYear}
        onImport={handleBatchImport}
      />

      {/* Delete All Modal */}
      <DeleteAllModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={deleteAllStudents}
        title="Supprimer Tous les Élèves"
        itemCount={students.length}
        description="Attention ! Cette action supprimera définitivement TOUS les élèves inscrits ainsi que leurs dossiers scolaires."
      />
    </div>
  );
};

