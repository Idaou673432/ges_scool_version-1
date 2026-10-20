/**
 * SomaSikolo / KalanGest - Module Élèves & Inscriptions
 * Interface simplifiée, ultra-facile, intuitive et rapide pour la gestion du corps étudiant.
 * 100% des fonctions conservées : inscriptions, modifications, photos d'identité,
 * import Excel, export CSV, QR codes, fiches individuelles et filtres par classe.
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  QrCode, 
  Phone, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  FileSpreadsheet, 
  Download,
  Calendar,
  Camera,
  CheckCircle2,
  AlertCircle
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
  const [deletingStudent, setDeletingStudent] = useState<{ id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state pour inscription / modification
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
    bloodType: undefined,
    allergies: '',
    emergencyContact: '',
    parent: {
      fatherName: '',
      fatherPhone: '',
      motherName: '',
      motherPhone: ''
    },
    observations: ''
  });

  // Calculs rapides d'effectif
  const activeStudents = useMemo(() => students.filter(s => s.status === 'ACTIF'), [students]);
  const maleCount = useMemo(() => students.filter(s => s.gender === 'M').length, [students]);
  const femaleCount = useMemo(() => students.filter(s => s.gender === 'F').length, [students]);

  // Filtrage des élèves
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        (s.parent?.fatherPhone && s.parent.fatherPhone.includes(q)) ||
        (s.parent?.motherPhone && s.parent.motherPhone.includes(q));
      
      const matchesClass = classFilter === 'ALL' || s.classId === classFilter;
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchesSearch && matchesClass && matchesStatus;
    }).sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, search, classFilter, statusFilter]);

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
      bloodType: undefined,
      allergies: '',
      emergencyContact: '',
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
    if (!formData.firstName || !formData.lastName) return;

    saveStudent(formData);
    setIsModalOpen(false);
    setToastMessage(`L'élève ${formData.lastName?.toUpperCase()} ${formData.firstName} a été enregistré avec succès.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const confirmDeleteStudent = () => {
    if (deletingStudent) {
      deleteStudent(deletingStudent.id);
      setToastMessage(`L'élève ${deletingStudent.name} a été supprimé.`);
      setDeletingStudent(null);
      setTimeout(() => setToastMessage(null), 3000);
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
    setToastMessage(`${importedStudents.length} élève(s) importé(s) depuis le fichier Excel.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportCsv = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Sexe', 'Classe', 'Date Naissance', 'Lieu Naissance', 'Téléphone Parent', 'Statut'];
    const rows = filteredStudents.map(s => {
      const cls = classes.find(c => c.id === s.classId);
      return [
        `"${s.matricule}"`,
        `"${s.lastName.replace(/"/g, '""')}"`,
        `"${s.firstName.replace(/"/g, '""')}"`,
        `"${s.gender}"`,
        `"${cls?.name || ''}"`,
        `"${s.birthDate}"`,
        `"${s.birthPlace}"`,
        `"${s.parent?.fatherPhone || s.parent?.motherPhone || ''}"`,
        `"${s.status}"`
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Repertoire_Eleves_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Entête Épuré du Répertoire des Élèves */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Répertoire des Élèves
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Inscriptions scolaires · Fiches d'identité · Classes · Badges QR
              </p>
            </div>
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Inscrire Élève */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Inscrire un Élève</span>
          </button>

          {/* Importer Excel */}
          <button
            type="button"
            onClick={() => setIsExcelImportOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importer Excel</span>
          </button>

          {/* Exporter CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            title="Exporter la liste actuelle en fichier CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Supprimer tout (discret) */}
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Supprimer tous les élèves"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message de confirmation Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. 4 Indicateurs Clairs d'Effectif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Total Inscrits</span>
          <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-1">
            {students.length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Élèves enregistrés</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Élèves Actifs</span>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums font-mono mt-1">
            {activeStudents.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Fréquentation régulière</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Garçons / Filles</span>
          <p className="text-lg font-bold text-slate-800 tabular-nums font-mono mt-1">
            {maleCount} G · {femaleCount} F
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            {students.length > 0 ? Math.round((femaleCount / students.length) * 100) : 0}% de filles
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Classes Assignées</span>
          <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-1">
            {classes.length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Salles de classe</span>
        </div>
      </div>

      {/* 3. Barre de Recherche et Filtres par Classe */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Recherche instantanée */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom, matricule ou téléphone..."
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtres Classe & Statut */}
        <div className="flex items-center gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">Toutes les classes ({classes.length})</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIF">Inscrit (Actif)</option>
            <option value="ABANDON">Abandon</option>
            <option value="EXCLU">Exclu</option>
            <option value="TRANSFERE">Transféré</option>
          </select>
        </div>
      </div>

      {/* 4. Tableau Simplifié et Lisible des Élèves */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Élève & Matricule</th>
                <th className="py-3 px-3">Classe</th>
                <th className="py-3 px-3">Sexe</th>
                <th className="py-3 px-3">Date de Naissance</th>
                <th className="py-3 px-3">Parent / Contact</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Aucun élève trouvé avec les critères indiqués.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const studentClass = classes.find(c => c.id === std.classId);
                  const isActif = std.status === 'ACTIF';

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Élève */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {std.photoUrl ? (
                            <img
                              src={std.photoUrl}
                              alt={std.firstName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {std.firstName.charAt(0)}{std.lastName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">
                              {std.lastName.toUpperCase()} {std.firstName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Mat: {std.matricule}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Classe */}
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {studentClass?.name || 'Non assigné'}
                      </td>

                      {/* Sexe */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          std.gender === 'F' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {std.gender === 'F' ? 'Fille' : 'Garçon'}
                        </span>
                      </td>

                      {/* Date de Naissance */}
                      <td className="py-3 px-3 text-slate-600">
                        <p>{new Date(std.birthDate).toLocaleDateString('fr-FR')}</p>
                        <p className="text-[10px] text-slate-400">{std.birthPlace}</p>
                      </td>

                      {/* Parent / Contact */}
                      <td className="py-3 px-3">
                        <p className="text-slate-800 font-medium truncate max-w-[140px]">
                          {std.parent?.fatherName || std.parent?.motherName || 'Tuteur'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {std.parent?.fatherPhone || std.parent?.motherPhone || '—'}
                        </p>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isActif 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : 'bg-rose-50 text-rose-800'
                        }`}>
                          {std.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Fiche */}
                          <button
                            type="button"
                            onClick={() => setViewingStudent(std)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Consulter le dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* QR Code */}
                          <button
                            type="button"
                            onClick={() => handleShowQrCode(std)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Badge & QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Modifier */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(std)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={() => setDeletingStudent({ id: std.id, name: `${std.lastName.toUpperCase()} ${std.firstName}` })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer l'élève"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1 : FORMULAIRE D'INSCRIPTION / MODIFICATION D'UN ÉLÈVE
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStudent ? 'Modifier le Dossier Élève' : 'Inscription d\'un Nouvel Élève'}
                  </h3>
                  <p className="text-xs text-slate-500">Informations scolaires et administratives</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold">
              {/* Photo d'identité */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative shrink-0">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Aperçu"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 text-slate-400 font-bold flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-slate-500 block">
                    Photo d'Identité (Optionnelle)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Identité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prénom de l'Élève *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Ibrahim"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom de Famille *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: TRAORÉ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sexe *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="M">Masculin (Garçon)</option>
                    <option value="F">Féminin (Fille)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Classe d'Affectation *</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date de Naissance *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lieu de Naissance *</label>
                  <input
                    type="text"
                    required
                    value={formData.birthPlace}
                    onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                    placeholder="Ex: Bamako, Ségou, Sikasso..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Parents / Tuteur */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="font-bold text-slate-800 text-xs">Parent / Tuteur Légal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Nom du Parent *</label>
                    <input
                      type="text"
                      required
                      value={formData.parent?.fatherName}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherName: e.target.value }
                      })}
                      placeholder="Nom complet du tuteur"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Téléphone de Contact *</label>
                    <input
                      type="text"
                      required
                      value={formData.parent?.fatherPhone}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherPhone: e.target.value }
                      })}
                      placeholder="Ex: +223 76 00 00 00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pied de formulaire */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Enregistrer l'Élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2 : FICHE INDIVIDUELLE DE L'ÉLÈVE
          ========================================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Dossier de l'Élève</h3>
              <button 
                type="button"
                onClick={() => setViewingStudent(null)} 
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {viewingStudent.photoUrl ? (
                <img
                  src={viewingStudent.photoUrl}
                  alt={viewingStudent.firstName}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-lg shrink-0">
                  {viewingStudent.firstName.charAt(0)}{viewingStudent.lastName.charAt(0)}
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {viewingStudent.lastName.toUpperCase()} {viewingStudent.firstName}
                </h4>
                <p className="font-mono text-xs font-bold text-slate-500 mt-0.5">
                  Matricule : {viewingStudent.matricule}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                  Statut : {viewingStudent.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Classe</span> {classes.find(c => c.id === viewingStudent.classId)?.name || 'Non assigné'}</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Date & Lieu de Naissance</span> {new Date(viewingStudent.birthDate).toLocaleDateString('fr-FR')} à {viewingStudent.birthPlace}</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Parent / Tuteur</span> {viewingStudent.parent.fatherName || viewingStudent.parent.motherName} ({viewingStudent.parent.fatherPhone || viewingStudent.parent.motherPhone || '—'})</p>
              <p><span className="text-slate-400 uppercase text-[10px] font-bold block">Adresse de Résidence</span> {viewingStudent.address}</p>
            </div>

            <button
              type="button"
              onClick={() => setViewingStudent(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Fermer le Dossier
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3 : CARTE SCOLAIRE & QR CODE
          ========================================================================= */}
      {qrModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-6 space-y-4 text-center border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">QR Code de l'Élève</h3>
            <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-200">
              <img src={qrModalStudent.qrUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {qrModalStudent.student.lastName.toUpperCase()} {qrModalStudent.student.firstName}
              </p>
              <p className="font-mono text-slate-500 font-bold text-xs mt-0.5">
                {qrModalStudent.student.matricule}
              </p>
            </div>
            <button
              onClick={() => setQrModalStudent(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4 : CONFIRMATION DE SUPPRESSION
          ========================================================================= */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-center border border-slate-200">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supprimer cet élève ?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Voulez-vous supprimer le dossier de <strong>{deletingStudent.name}</strong> ?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'import Excel */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        classes={classes}
        currentAcademicYear={settings.currentAcademicYear}
        onImport={handleBatchImport}
      />

      {/* Modal de suppression groupée */}
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
