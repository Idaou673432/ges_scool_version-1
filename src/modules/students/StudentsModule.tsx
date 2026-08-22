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
    <div className="space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-900" />
            <span>Corps Étudiant & Inscriptions</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Répertoire national des élèves • Photos de profil • Modification & Suppression • Homologué MEN Mali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {students.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer Tout ({students.length})</span>
            </button>
          )}
          <button
            onClick={() => setIsExcelImportOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importer Excel</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Inscrire un Élève</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, Prénom, Matricule (MLE)..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
        >
          <option value="ALL">Toutes les Classes ({classes.length})</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
        >
          <option value="ALL">Tous les Statuts</option>
          <option value="ACTIF">Inscrit (Actif)</option>
          <option value="ABANDON">Abandon</option>
          <option value="EXCLU">Exclu</option>
          <option value="TRANSFERE">Transféré</option>
        </select>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                <th className="py-4 px-8">Photo</th>
                <th className="py-4 px-4">Matricule MLE</th>
                <th className="py-4 px-4">Nom & Prénom</th>
                <th className="py-4 px-4">Sexe</th>
                <th className="py-4 px-4">Classe</th>
                <th className="py-4 px-4">Contact Tuteur</th>
                <th className="py-4 px-4">Statut</th>
                <th className="py-4 px-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    Aucun élève trouvé avec les critères indiqués.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const studentClass = classes.find(c => c.id === std.classId);
                  return (
                    <tr key={std.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-8">
                        {std.photoUrl ? (
                          <img
                            src={std.photoUrl}
                            alt={std.firstName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-900 shadow-xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-xs border border-blue-200">
                            {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-blue-900">
                        {std.matricule}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {std.lastName.toUpperCase()} {std.firstName}
                        <span className="block text-[10px] text-slate-400 font-bold">
                          Né(e) le {new Date(std.birthDate).toLocaleDateString('fr-FR')} à {std.birthPlace}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                          std.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {std.gender}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {studentClass?.name || 'Non assigné'}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {std.parent.fatherName || std.parent.motherName}
                        <span className="block text-[10px] text-emerald-700 font-mono font-black">
                          {std.parent.fatherPhone || std.parent.motherPhone}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                          std.status === 'ACTIF' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {std.status}
                        </span>
                      </td>
                      <td className="py-4 px-8 text-right space-x-2">
                        <button
                          onClick={() => setViewingStudent(std)}
                          className="p-2 text-slate-400 hover:text-blue-900 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Dossier Élève"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShowQrCode(std)}
                          className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Carte Scolaire QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(std)}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingStudent({ id: std.id, name: `${std.firstName} ${std.lastName}` })}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 uppercase">
                {selectedStudent ? 'Modifier le Dossier Élève' : 'Inscription d\'un Nouvel Élève'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              {/* Photo Upload Section */}
              <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="relative">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Aperçu"
                      className="w-20 h-20 rounded-full object-cover border-4 border-blue-900 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-500 font-black flex items-center justify-center text-xl border-2 border-slate-300">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Photo d'Identité de l'Élève
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:bg-blue-900 file:text-white hover:file:bg-blue-950 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 font-normal">Format conseillé: JPG/PNG, photo d'identité officielle</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom de Famille *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sexe *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="M">Masculin (Garçon)</option>
                    <option value="F">Féminin (Fille)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe *</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date de Naissance *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lieu de Naissance *</label>
                  <input
                    type="text"
                    required
                    value={formData.birthPlace}
                    onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-900">Informations du Parent / Tuteur</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom du Père / Tuteur *</label>
                    <input
                      type="text"
                      required
                      value={formData.parent?.fatherName}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherName: e.target.value }
                      })}
                      className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone Père / Tuteur *</label>
                    <input
                      type="text"
                      required
                      placeholder="+223 76 ..."
                      value={formData.parent?.fatherPhone}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherPhone: e.target.value }
                      })}
                      className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-full outline-none"
                    />
                  </div>
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
                  Enregistrer l'Élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dossier Student Preview Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 uppercase">Fiche Individuelle Élève</h2>
              <button onClick={() => setViewingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-6 bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
              {viewingStudent.photoUrl ? (
                <img
                  src={viewingStudent.photoUrl}
                  alt={viewingStudent.firstName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-blue-900 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-900 text-white font-black flex items-center justify-center text-xl shadow-md">
                  {viewingStudent.firstName.charAt(0)}{viewingStudent.lastName.charAt(0)}
                </div>
              )}

              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  {viewingStudent.lastName} {viewingStudent.firstName}
                </h3>
                <p className="font-mono text-xs font-black text-blue-900 mt-1">
                  Matricule: {viewingStudent.matricule}
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Statut: {viewingStudent.status}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700 bg-slate-50 p-6 rounded-[2rem]">
              <p><span className="text-slate-400 uppercase text-[10px] font-black block">Date & Lieu de Naissance:</span> {new Date(viewingStudent.birthDate).toLocaleDateString('fr-FR')} à {viewingStudent.birthPlace}</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-black block">Père / Tuteur:</span> {viewingStudent.parent.fatherName} ({viewingStudent.parent.fatherPhone})</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-black block">Mère / Tuteur:</span> {viewingStudent.parent.motherName || 'Non renseigné'}</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-black block">Adresse Residence:</span> {viewingStudent.address}</p>
            </div>

            <button
              onClick={() => setViewingStudent(null)}
              className="w-full py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer"
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6 text-center border border-slate-100">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">
                Confirmer la suppression
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-2">
                Voulez-vous vraiment supprimer définitivement l'élève <strong className="text-slate-900">{deletingStudent.name}</strong> ?
              </p>
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                Cette action supprimera également son historique de notes et de scolarité.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingStudent(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteStudent}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full cursor-pointer shadow-lg shadow-rose-600/30 transition-all"
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

