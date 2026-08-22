/**
 * SomaSikolo - Import d'Élèves via Fichier Excel (.xlsx / .xls / .csv)
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Sparkles,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SchoolClass, Student, Gender } from '../../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  currentAcademicYear: string;
  onImport: (importedStudents: Partial<Student>[]) => void;
}

interface ParsedRow {
  matricule?: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string;
  birthPlace: string;
  className: string;
  matchedClassId: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  phone?: string;
  address?: string;
  isValid: boolean;
  errors: string[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  classes,
  currentAcademicYear,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultClassId, setDefaultClassId] = useState<string>(classes[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  // Generate and download sample Excel file
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Matricule (Optionnel)": "MLE-2026-001",
        "Prénom": "Amadou",
        "Nom": "Coulibaly",
        "Genre (M/F)": "M",
        "Date de Naissance (AAAA-MM-JJ)": "2010-04-12",
        "Lieu de Naissance": "Bamako",
        "Classe": classes[0]?.name || "9ème Année A",
        "Nom du Père / Tuteur": "Ousmane Coulibaly",
        "Téléphone Parent": "76123456",
        "Nom de la Mère": "Fatoumata Diallo",
        "Téléphone Élève": "66001122",
        "Adresse": "Niamakoro, Bamako"
      },
      {
        "Matricule (Optionnel)": "MLE-2026-002",
        "Prénom": "Aïssata",
        "Nom": "Traoré",
        "Genre (M/F)": "F",
        "Date de Naissance (AAAA-MM-JJ)": "2011-09-20",
        "Lieu de Naissance": "Sikasso",
        "Classe": classes[0]?.name || "9ème Année A",
        "Nom du Père / Tuteur": "Ibrahima Traoré",
        "Téléphone Parent": "70998877",
        "Nom de la Mère": "Mariam Keïta",
        "Téléphone Élève": "",
        "Adresse": "Lafiabougou, Bamako"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Auto-fit column width
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
      { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 25 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modele_Import_Eleves");

    // Also append reference Sheet with available classes
    const classesListSheet = XLSX.utils.json_to_sheet(
      classes.map(c => ({ "Nom de la Classe": c.name, "Cycle": c.category, "Niveau": c.level }))
    );
    XLSX.utils.book_append_sheet(workbook, classesListSheet, "Classes_Disponibles");

    XLSX.writeFile(workbook, "Modele_Import_Eleves_SomaSikolo.xlsx");
  };

  // Handle File Upload & Excel Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to raw json objects
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        const rows: ParsedRow[] = rawJson.map((row) => {
          // Normalize column headers flexibility
          const findVal = (keys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u06ff]/g, "");
              if (keys.some(k => cleanKey.includes(k))) {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const firstName = findVal(['prenom', 'first', 'first_name']);
          const lastName = findVal(['nom', 'last', 'last_name', 'family']);
          let rawGender = findVal(['genre', 'sexe', 'gender']);
          let gender: Gender = rawGender.toUpperCase().startsWith('F') ? 'F' : 'M';

          const birthDate = findVal(['date', 'naissance', 'birth']) || '2010-01-01';
          const birthPlace = findVal(['lieu', 'place']) || 'Bamako';
          const classNameInput = findVal(['classe', 'class', 'niveau']);
          const matricule = findVal(['matricule', 'id', 'code']);

          const fatherName = findVal(['pere', 'tuteur', 'father', 'parent']);
          const fatherPhone = findVal(['tel', 'phone', 'contact', 'telephone']);
          const motherName = findVal(['mere', 'mother']);
          const motherPhone = findVal(['tel_mere', 'mother_phone']);
          const phone = findVal(['eleve_tel', 'student_phone']);
          const address = findVal(['adresse', 'quartier', 'address']) || 'Bamako';

          // Match Class ID from class name or use default class
          let matchedClassId = '';
          if (classNameInput) {
            const matched = classes.find(c => 
              c.name.toLowerCase().trim() === classNameInput.toLowerCase().trim() ||
              c.name.toLowerCase().includes(classNameInput.toLowerCase()) ||
              classNameInput.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matched) matchedClassId = matched.id;
          }

          if (!matchedClassId) {
            matchedClassId = defaultClassId;
          }

          const errors: string[] = [];
          if (!firstName) errors.push('Prénom manquant');
          if (!lastName) errors.push('Nom manquant');

          return {
            matricule,
            firstName,
            lastName,
            gender,
            birthDate,
            birthPlace,
            className: classNameInput,
            matchedClassId,
            fatherName,
            fatherPhone,
            motherName,
            motherPhone,
            phone,
            address,
            isValid: errors.length === 0,
            errors
          };
        });

        setParsedRows(rows);
      } catch (err) {
        console.error('Erreur de lecture du fichier Excel:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleApplyGlobalClass = (classId: string) => {
    setDefaultClassId(classId);
    setParsedRows(prev => prev.map(r => ({
      ...r,
      matchedClassId: classId
    })));
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    const studentsToImport: Partial<Student>[] = validRows.map(row => ({
      ...(row.matricule ? { matricule: row.matricule } : {}),
      firstName: row.firstName,
      lastName: row.lastName,
      gender: row.gender,
      birthDate: row.birthDate || '2010-01-01',
      birthPlace: row.birthPlace || 'Bamako',
      nationality: 'Mali',
      address: row.address || 'Bamako',
      phone: row.phone || '',
      classId: row.matchedClassId || defaultClassId,
      status: 'ACTIF',
      academicYear: currentAcademicYear,
      parent: {
        fatherName: row.fatherName || 'Tuteur Légal',
        fatherPhone: row.fatherPhone || '',
        motherName: row.motherName || '',
        motherPhone: row.motherPhone || ''
      }
    }));

    onImport(studentsToImport);
    setImportSuccessCount(studentsToImport.length);
    setTimeout(() => {
      onClose();
      setParsedRows([]);
      setFile(null);
      setImportSuccessCount(null);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Importation Excel d'Élèves</h2>
              <p className="text-xs text-slate-400 font-medium">Inscrivez plusieurs élèves en un seul clic via fichier .xlsx ou .csv</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {importSuccessCount !== null ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">
                {importSuccessCount} Élèves Importés avec Succès !
              </h3>
              <p className="text-sm font-semibold text-slate-500">
                Les dossiers scolaires et matricules ont été automatiquement créés.
              </p>
            </div>
          ) : (
            <>
              {/* Template Download Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-blue-50 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-200">
                      Vous n'avez pas encore le modèle de fichier ?
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Téléchargez notre fichier modèle pré-formaté pour remplir facilement les informations des élèves.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Modèle Excel (.xlsx)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {!file ? (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-900 dark:hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 transition-all text-center">
                  <Upload className="w-12 h-12 text-slate-400 mb-3" />
                  <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Cliquez pour sélectionner un fichier Excel (.xlsx, .xls) ou CSV
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mt-1">
                    Glissez-déposez le fichier ici
                  </span>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  {/* File status bar & Global Class Assign */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-6 h-6 text-emerald-600" />
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{file.name}</span>
                        <div className="text-[10px] font-bold text-slate-500">
                          {parsedRows.filter(r => r.isValid).length} / {parsedRows.length} lignes valides détectées
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">Classe par défaut :</label>
                      <select
                        value={defaultClassId}
                        onChange={e => handleApplyGlobalClass(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => { setFile(null); setParsedRows([]); }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Changer de fichier"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-3">Statut</th>
                          <th className="p-3">Matricule</th>
                          <th className="p-3">Prénom & Nom</th>
                          <th className="p-3">Sexe</th>
                          <th className="p-3">Date Nais.</th>
                          <th className="p-3">Classe</th>
                          <th className="p-3">Tuteur / Téléphone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedRows.map((row, idx) => {
                          const matchedClass = classes.find(c => c.id === row.matchedClassId);
                          return (
                            <tr key={idx} className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                              <td className="p-3">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800" title={row.errors.join(', ')}>
                                    <AlertTriangle className="w-3 h-3" /> Erreur
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-[10px] text-slate-500">
                                {row.matricule || <span className="italic text-slate-400">Auto</span>}
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                {row.firstName} {row.lastName}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  row.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {row.gender}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">{row.birthDate}</td>
                              <td className="p-3">
                                <select
                                  value={row.matchedClassId}
                                  onChange={e => {
                                    const newClassId = e.target.value;
                                    setParsedRows(prev => {
                                      const updated = [...prev];
                                      updated[idx].matchedClassId = newClassId;
                                      return updated;
                                    });
                                  }}
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                                >
                                  {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">
                                {row.fatherName || 'Parent'} ({row.fatherPhone || 'N/A'})
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {importSuccessCount === null && file && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500">
              Total à inscrire : <span className="text-blue-900 dark:text-blue-400 font-black">{parsedRows.filter(r => r.isValid).length} élèves</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedRows.filter(r => r.isValid).length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <span>Valider & Importer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
