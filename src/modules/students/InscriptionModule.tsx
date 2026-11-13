/**
 * SomaSikolo / KalanGest - Module Inscription d'un Nouvel Élève
 * Ergonomie optimisée : saisie rapide au clavier, conservation de la classe en série,
 * synchronisation âge/date, inscription fratrie en 1 clic et aperçu en direct.
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  RotateCcw,
  Trash2,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Student, Gender, SchoolLevelCategory } from '../../types';
import { compressImageToDataUrl } from '../../utils/imageCompression';

interface InscriptionModuleProps {
  onNavigateToStudents?: () => void;
}

const CATEGORY_LABELS: Record<SchoolLevelCategory, string> = {
  FONDAMENTAL_1: 'Fondamental · 1er cycle',
  FONDAMENTAL_2: 'Fondamental · 2ème cycle (DEF)',
  LYCEE: 'Enseignement secondaire (Lycée)',
  TECHNIQUE_BT: 'Enseignement technique (BT)',
  PROFESSIONNEL_CAP: 'Formation professionnelle (CAP)'
};

function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age <= 99 ? age : null;
}

function formatMaliPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00223')) digits = digits.slice(5);
  else if (digits.startsWith('223') && digits.length > 8) digits = digits.slice(3);
  digits = digits.slice(0, 8);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export const InscriptionModule: React.FC<InscriptionModuleProps> = ({ onNavigateToStudents }) => {
  const { classes, students, settings, saveStudent } = useSchool();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);

  const createInitialFormState = (keepClassId?: string, keepBirthPlace?: string): Partial<Student> => ({
    firstName: '',
    lastName: '',
    gender: 'M',
    birthDate: '2010-05-15',
    birthPlace: keepBirthPlace || 'Bamako',
    nationality: 'Mali',
    address: 'Bamako',
    phone: '',
    photoUrl: '',
    classId: keepClassId || classes[0]?.id || '',
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

  const [formData, setFormData] = useState<Partial<Student>>(() => createInitialFormState());
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [enrolledStudent, setEnrolledStudent] = useState<Student | null>(null);
  const [recentEnrolled, setRecentEnrolled] = useState<Student[]>([]);

  useEffect(() => {
    firstNameInputRef.current?.focus();
  }, []);

  const selectedClass = useMemo(() => {
    const id = formData.classId || classes[0]?.id;
    return classes.find(c => c.id === id) || null;
  }, [classes, formData.classId]);

  const classLiveCount = useMemo(() => {
    if (!selectedClass) return 0;
    const activeCount = students.filter(s => s.classId === selectedClass.id && s.status === 'ACTIF').length;
    return activeCount || selectedClass.studentCount || 0;
  }, [selectedClass, students]);

  const studentAge = useMemo(() => calculateAge(formData.birthDate), [formData.birthDate]);

  const initials = useMemo(() => {
    const f = formData.firstName?.trim().charAt(0) || '';
    const l = formData.lastName?.trim().charAt(0) || '';
    return (l + f).toUpperCase() || 'EL';
  }, [formData.firstName, formData.lastName]);

  const readiness = useMemo(() => {
    const hasIdentity = Boolean(
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.birthDate &&
      formData.birthPlace?.trim()
    );
    const hasClass = Boolean(formData.classId || classes[0]?.id);
    const hasGuardian = Boolean(
      formData.parent?.fatherName?.trim() &&
      formData.parent?.fatherPhone?.trim()
    );
    return {
      hasIdentity,
      hasClass,
      hasGuardian,
      isComplete: hasIdentity && hasClass && hasGuardian
    };
  }, [formData, classes]);

  const handleAgeQuickChange = (ageVal: string) => {
    const parsed = parseInt(ageVal, 10);
    if (Number.isNaN(parsed) || parsed < 2 || parsed > 40) return;
    const today = new Date();
    const targetYear = today.getFullYear() - parsed;
    const currentParts = (formData.birthDate || '2010-05-15').split('-');
    const month = currentParts[1] || '05';
    const day = currentParts[2] || '15';
    setFormData(prev => ({ ...prev, birthDate: `${targetYear}-${month}-${day}` }));
  };

  const processPhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setValidationError('Format non pris en charge. Veuillez choisir une image JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('La photo dépasse 10 Mo. Veuillez choisir un fichier plus léger.');
      return;
    }

    setValidationError(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.82
      });
      setFormData(prev => ({ ...prev, photoUrl: compressedDataUrl }));
    } catch {
      setValidationError('Impossible de traiter cette image. Veuillez réessayer avec un autre fichier.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
    e.target.value = '';
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processPhotoFile(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setFormData(createInitialFormState());
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    firstNameInputRef.current?.focus();
  };

  const handleEnrollSibling = () => {
    if (!enrolledStudent) return;
    setFormData({
      ...createInitialFormState(formData.classId, enrolledStudent.birthPlace),
      lastName: enrolledStudent.lastName,
      address: enrolledStudent.address || 'Bamako',
      nationality: enrolledStudent.nationality || 'Mali',
      parent: {
        fatherName: enrolledStudent.parent?.fatherName || '',
        fatherPhone: enrolledStudent.parent?.fatherPhone || '',
        motherName: enrolledStudent.parent?.motherName || '',
        motherPhone: enrolledStudent.parent?.motherPhone || ''
      }
    });
    setValidationError(null);
    setTimeout(() => firstNameInputRef.current?.focus(), 50);
  };

  const submitForm = () => {
    setValidationError(null);

    const firstName = formData.firstName?.trim() || '';
    const lastName = formData.lastName?.trim() || '';
    const birthPlace = formData.birthPlace?.trim() || '';
    const fatherName = formData.parent?.fatherName?.trim() || '';
    const fatherPhone = formData.parent?.fatherPhone?.trim() || '';
    const targetClassId = formData.classId || classes[0]?.id || '';

    if (!firstName || !lastName) {
      setValidationError("Veuillez renseigner le prénom et le nom de famille de l'élève.");
      firstNameInputRef.current?.focus();
      return;
    }
    if (!formData.birthDate || !birthPlace) {
      setValidationError('Veuillez indiquer la date et le lieu de naissance.');
      return;
    }
    if (!targetClassId) {
      setValidationError("Veuillez d'abord créer ou sélectionner une classe d'affectation.");
      return;
    }
    if (!fatherName || !fatherPhone) {
      setValidationError('Veuillez indiquer le nom complet et le numéro de téléphone du responsable légal.');
      return;
    }

    const saved = saveStudent({
      ...formData,
      firstName,
      lastName: lastName.toUpperCase(),
      birthPlace,
      nationality: formData.nationality?.trim() || 'Mali',
      address: formData.address?.trim() || 'Bamako',
      classId: targetClassId,
      parent: {
        ...formData.parent!,
        fatherName,
        fatherPhone,
        motherName: formData.parent?.motherName?.trim() || '',
        motherPhone: formData.parent?.motherPhone?.trim() || ''
      },
      observations: formData.observations?.trim() || ''
    });

    setEnrolledStudent(saved);
    setRecentEnrolled(prev => [saved, ...prev].slice(0, 4));

    // Conserver la classe et le lieu de naissance pour enchaîner rapidement les inscriptions
    setFormData(createInitialFormState(targetClassId, birthPlace));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTimeout(() => firstNameInputRef.current?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-4">
      {/* En-tête compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span>Élèves</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-800 font-semibold">Nouvelle inscription</span>
            <span className="mx-1 text-slate-300" aria-hidden="true">·</span>
            <span className="tabular-nums">{settings.currentAcademicYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Inscription d&apos;un nouvel élève
          </h1>
        </div>

        {onNavigateToStudents && (
          <button
            type="button"
            onClick={onNavigateToStudents}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Liste des élèves</span>
          </button>
        )}
      </div>

      {/* Confirmation post-inscription avec action fratrie en 1 clic */}
      {enrolledStudent && (
        <div
          role="status"
          className="bg-emerald-50/90 border border-emerald-200 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            {enrolledStudent.photoUrl ? (
              <img
                src={enrolledStudent.photoUrl}
                alt={`${enrolledStudent.firstName} ${enrolledStudent.lastName}`}
                className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shrink-0"
              />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div className="text-xs sm:text-sm text-emerald-950 min-w-0">
              <p className="font-bold truncate">
                {enrolledStudent.lastName} {enrolledStudent.firstName} inscrit(e)
                <span className="mx-1.5 text-emerald-400" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{enrolledStudent.matricule}</span>
              </p>
              <p className="text-emerald-800 text-xs">
                Vous pouvez saisir directement l&apos;élève suivant ou reprendre les infos du même parent.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleEnrollSibling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100/70 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Même parent (frère / sœur)</span>
            </button>
            {onNavigateToStudents && (
              <button
                type="button"
                onClick={onNavigateToStudents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Voir la liste</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setEnrolledStudent(null)}
              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Erreur de validation */}
      {validationError && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-900"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="p-1 text-rose-600 hover:bg-rose-100 rounded-md cursor-pointer"
            aria-label="Fermer l'erreur"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grille 12 colonnes : Formulaire rapide (8) + Aperçu & action directe (4) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="xl:col-span-8 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100"
        >
          {/* 01. Identité — Champs essentiels immédiatement en haut */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                01. Identité et affectation
              </h2>
              <span className="text-[11px] font-medium text-slate-400">
                * Champs obligatoires
              </span>
            </div>

            {/* Ligne supérieure : Photo compacte + Prénom & Nom côte à côte */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
              {/* Avatar photo cliquable + glisser-déposer */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDraggingPhoto(true);
                }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={handlePhotoDrop}
                className="flex items-center gap-2.5 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-16 h-16 rounded-xl border flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 ${
                    isDraggingPhoto
                      ? 'border-blue-900 bg-blue-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Importer une photo d'identité (optionnelle)"
                >
                  {formData.photoUrl ? (
                    <>
                      <img
                        src={formData.photoUrl}
                        alt="Photo élève"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera className="w-4 h-4" />
                      </span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">Photo</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {formData.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Retirer la photo"
                    aria-label="Retirer la photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Prénom + Nom immédiatement accessibles */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="insc-firstName" className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénom de l&apos;élève <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={firstNameInputRef}
                      id="insc-firstName"
                      type="text"
                      required
                      value={formData.firstName || ''}
                      onChange={e => {
                        setValidationError(null);
                        setFormData({ ...formData, firstName: e.target.value });
                      }}
                      placeholder="Ex. Ibrahim"
                      className="w-full h-10 pl-3.5 pr-8 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                    />
                    {formData.firstName && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, firstName: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Effacer le prénom"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="insc-lastName" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de famille <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="insc-lastName"
                      type="text"
                      required
                      value={formData.lastName || ''}
                      onChange={e => {
                        setValidationError(null);
                        setFormData({ ...formData, lastName: e.target.value });
                      }}
                      placeholder="Ex. TRAORÉ"
                      className="w-full h-10 pl-3.5 pr-8 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium uppercase placeholder:normal-case text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                    />
                    {formData.lastName && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lastName: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Effacer le nom"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sexe, Classe, Date/Âge, Lieu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  Sexe <span className="text-rose-600">*</span>
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg h-10">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'M' as Gender })}
                    className={`rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      formData.gender === 'M'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Garçon (M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'F' as Gender })}
                    className={`rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      formData.gender === 'F'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Fille (F)
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="insc-classId" className="block text-xs font-semibold text-slate-700 mb-1">
                  Classe d&apos;affectation <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select
                    id="insc-classId"
                    value={formData.classId || classes[0]?.id || ''}
                    onChange={e => {
                      setValidationError(null);
                      setFormData({ ...formData, classId: e.target.value });
                    }}
                    className="w-full h-10 pl-3.5 pr-9 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 cursor-pointer appearance-none transition-all"
                  >
                    {classes.length === 0 ? (
                      <option value="">Aucune classe configurée</option>
                    ) : (
                      classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Date de naissance + saisie rapide par âge */}
              <div>
                <label htmlFor="insc-birthDate" className="block text-xs font-semibold text-slate-700 mb-1">
                  Date de naissance <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="insc-birthDate"
                    type="date"
                    required
                    value={formData.birthDate || ''}
                    onChange={e => {
                      setValidationError(null);
                      setFormData({ ...formData, birthDate: e.target.value });
                    }}
                    className="flex-1 min-w-0 h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 tabular-nums outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                  />
                  <div
                    className="flex items-center h-10 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-blue-900 transition-all shrink-0"
                    title="Saisir directement l'âge pour calculer l'année"
                  >
                    <input
                      type="number"
                      min={2}
                      max={40}
                      value={studentAge ?? ''}
                      onChange={e => handleAgeQuickChange(e.target.value)}
                      onFocus={e => e.target.select()}
                      aria-label="Âge de l'élève"
                      className="w-9 text-center bg-transparent text-sm font-semibold text-slate-900 tabular-nums outline-none"
                    />
                    <span className="text-xs text-slate-500">ans</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="insc-birthPlace" className="block text-xs font-semibold text-slate-700 mb-1">
                  Lieu de naissance <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="insc-birthPlace"
                    type="text"
                    required
                    value={formData.birthPlace || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      setValidationError(null);
                      setFormData({ ...formData, birthPlace: e.target.value });
                    }}
                    placeholder="Ex. Bamako"
                    className="w-full h-10 pl-9 pr-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 02. Responsable légal */}
          <div className="p-4 sm:p-5 space-y-3.5">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              02. Responsable légal et contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="insc-parentName" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom complet du parent ou tuteur <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="insc-parentName"
                    type="text"
                    required
                    value={formData.parent?.fatherName || ''}
                    onChange={e => {
                      setValidationError(null);
                      setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherName: e.target.value }
                      });
                    }}
                    placeholder="Nom et prénom du tuteur"
                    className="w-full h-10 pl-9 pr-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="insc-parentPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Téléphone de contact <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-stretch h-10 rounded-lg border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-blue-900 focus-within:ring-3 focus-within:ring-blue-900/10 overflow-hidden transition-all">
                  <span className="inline-flex items-center gap-1.5 px-3 bg-slate-100/80 border-r border-slate-200 text-xs font-semibold text-slate-600 font-mono tabular-nums shrink-0">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    +223
                  </span>
                  <input
                    id="insc-parentPhone"
                    type="tel"
                    required
                    value={formData.parent?.fatherPhone || ''}
                    onChange={e => {
                      setValidationError(null);
                      const formatted = formatMaliPhoneInput(e.target.value);
                      setFormData({
                        ...formData,
                        parent: { ...formData.parent!, fatherPhone: formatted }
                      });
                    }}
                    placeholder="76 00 00 00"
                    className="w-full px-3 bg-transparent text-sm font-mono font-medium text-slate-900 placeholder:text-slate-400 outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Informations complémentaires optionnelles */}
            <div>
              <button
                type="button"
                onClick={() => setShowOptionalDetails(prev => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-950 transition-colors cursor-pointer"
              >
                {showOptionalDetails ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Masquer les détails complémentaires</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Adresse, nationalité, second contact ou observations (optionnel)</span>
                  </>
                )}
              </button>

              {showOptionalDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3.5 mt-3 border-t border-slate-100">
                  <div>
                    <label htmlFor="insc-address" className="block text-xs font-semibold text-slate-700 mb-1">
                      Quartier / Adresse
                    </label>
                    <input
                      id="insc-address"
                      type="text"
                      value={formData.address || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ex. Badalabougou"
                      className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="insc-nationality" className="block text-xs font-semibold text-slate-700 mb-1">
                      Nationalité
                    </label>
                    <input
                      id="insc-nationality"
                      type="text"
                      value={formData.nationality || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Mali"
                      className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="insc-motherName" className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom de la mère / 2e contact
                    </label>
                    <input
                      id="insc-motherName"
                      type="text"
                      value={formData.parent?.motherName || ''}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, motherName: e.target.value }
                      })}
                      placeholder="Optionnel"
                      className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="insc-motherPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Téléphone secondaire
                    </label>
                    <input
                      id="insc-motherPhone"
                      type="tel"
                      value={formData.parent?.motherPhone || ''}
                      onChange={e => setFormData({
                        ...formData,
                        parent: { ...formData.parent!, motherPhone: formatMaliPhoneInput(e.target.value) }
                      })}
                      placeholder="66 00 00 00"
                      className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all tabular-nums"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="insc-observations" className="block text-xs font-semibold text-slate-700 mb-1">
                      Observations administratives ou médicales
                    </label>
                    <textarea
                      id="insc-observations"
                      rows={2}
                      value={formData.observations || ''}
                      onChange={e => setFormData({ ...formData, observations: e.target.value })}
                      placeholder="Note particulière, transfert d'école, allergie..."
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-900 focus:ring-3 focus:ring-blue-900/10 transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barre d'actions directe */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 rounded-b-xl">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Tout effacer</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer l&apos;élève</span>
            </button>
          </div>
        </form>

        {/* Colonne droite : Aperçu en direct + Bouton validation rapide + Historique récent */}
        <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 xl:sticky xl:top-4">
          {/* Aperçu identité & action directe */}
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-3">
              {formData.photoUrl ? (
                <img
                  src={formData.photoUrl}
                  alt="Aperçu profil élève"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {formData.lastName?.trim() || formData.firstName?.trim()
                    ? `${(formData.lastName || '').trim().toUpperCase()} ${(formData.firstName || '').trim()}`.trim()
                    : "Nom complet de l'élève"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {formData.gender === 'F' ? 'Fille' : 'Garçon'}
                  {studentAge !== null && (
                    <>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span className="tabular-nums">{studentAge} ans</span>
                    </>
                  )}
                  {formData.birthPlace?.trim() && (
                    <>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span>{formData.birthPlace.trim()}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {selectedClass && (
              <dl className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Classe</dt>
                  <dd className="font-bold text-slate-900 truncate">{selectedClass.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Cycle</dt>
                  <dd className="text-slate-700 truncate">
                    {CATEGORY_LABELS[selectedClass.category] || selectedClass.level}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Effectif actuel</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    {classLiveCount} élève{classLiveCount > 1 ? 's' : ''}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Inscription / Mensualité</dt>
                  <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                    {(selectedClass.inscriptionFee || 0).toLocaleString('fr-FR')} / {(selectedClass.monthlyFee || 0).toLocaleString('fr-FR')} F
                  </dd>
                </div>
              </dl>
            )}

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Statut de saisie</span>
                <span className={`font-semibold ${readiness.isComplete ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {readiness.isComplete ? 'Dossier prêt' : 'Champs requis manquants'}
                </span>
              </div>

              <button
                type="button"
                onClick={submitForm}
                className="w-full h-10 inline-flex items-center justify-center gap-2 px-4 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Valider et inscrire</span>
              </button>
            </div>
          </div>

          {/* Dernières inscriptions enregistrées pendant la session */}
          {recentEnrolled.length > 0 && (
            <div className="p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Inscrits à l&apos;instant</span>
                <span className="text-slate-400 tabular-nums">{recentEnrolled.length}</span>
              </div>
              <ul className="space-y-2">
                {recentEnrolled.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={`${item.firstName} ${item.lastName}`}
                          className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
                        </div>
                      )}
                      <span className="font-medium text-slate-800 truncate">
                        {item.lastName} {item.firstName}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 tabular-nums shrink-0">
                      {item.matricule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
