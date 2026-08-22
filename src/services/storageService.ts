/**
 * SomaSikolo - Clean Repository Pattern & Storage Service Engine
 * Provides persistent local database storage, seed data, and export/backup tools.
 */

import {
  Student,
  SchoolClass,
  Subject,
  Teacher,
  EvaluationGrade,
  Payment,
  SchoolSettings,
  User,
  AuditLog,
  AttendanceRecord
} from '../types';
import { MALI_ACADEMIES, MALI_DEFAULT_CLASSES, MALI_DEFAULT_SUBJECTS, DEFAULT_EVALUATION_MONTHS } from '../constants/maliEducation';

const STORAGE_KEYS = {
  SETTINGS: 'somasikolo_settings',
  USERS: 'somasikolo_users',
  STUDENTS: 'somasikolo_students',
  CLASSES: 'somasikolo_classes',
  SUBJECTS: 'somasikolo_subjects',
  TEACHERS: 'somasikolo_teachers',
  GRADES: 'somasikolo_grades',
  PAYMENTS: 'somasikolo_payments',
  ATTENDANCE: 'somasikolo_attendance',
  LOGS: 'somasikolo_audit_logs',
  SESSION: 'somasikolo_active_user',
};

// Default Settings for Malian School
const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: "Établissement Scolaire",
  schoolType: "PRIVE",
  academyName: "Académie d'Enseignement",
  capName: "Centre d'Animation Pédagogique (CAP)",
  registrationNumber: "N° 0000/MEN-SG",
  address: "Adresse de l'Établissement",
  city: "Bamako",
  phone: "+223 20 00 00 00",
  email: "contact@ecole.edu.ml",
  directorName: "Moh&IB",
  currency: "FCFA",
  currentAcademicYear: "2025-2026",
  activeTerm: "TRIMESTRE_1",
  adminPassword: "0022390070321",
  primaryColor: "#059669",
  enableSmsAlerts: true,
  evaluationMonths: { ...DEFAULT_EVALUATION_MONTHS }
};

// Initial Default Users (RBAC)
const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'Moh&IB',
    email: 'admin@ecole.edu.ml',
    role: 'ADMIN',
    phone: '+223 76 00 11 22',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-directeur',
    username: 'directeur',
    fullName: 'Dr. Ousmane COULIBALY',
    email: 'directeur@ecole.edu.ml',
    role: 'DIRECTEUR',
    phone: '+223 66 33 44 55',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-secretaire',
    username: 'secretaire',
    fullName: 'Mme. Fatoumata SISSOKO',
    email: 'secretaire@ecole.edu.ml',
    role: 'SECRETAIRE',
    phone: '+223 75 88 99 00',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-comptable',
    username: 'comptable',
    fullName: 'M. Ibrahim TRAORÉ',
    email: 'comptable@ecole.edu.ml',
    role: 'COMPTABLE',
    phone: '+223 65 11 22 33',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-enseignant',
    username: 'enseignant',
    fullName: 'Prof. Bakary KANÉ',
    email: 'bakary.kane@ecole.edu.ml',
    role: 'ENSEIGNANT',
    phone: '+223 70 44 55 66',
    active: true,
    createdAt: new Date().toISOString(),
  }
];

// Initial Default Classes
const INITIAL_CLASSES: SchoolClass[] = MALI_DEFAULT_CLASSES.map((c, i) => ({
  id: `cls-${i + 1}`,
  name: c.name,
  category: c.category as any,
  level: c.level,
  capacity: 45,
  monthlyFee: c.fee,
  inscriptionFee: c.insFee,
  classroom: `Salle B0${i + 1}`,
  passingGrade: c.category === 'FONDAMENTAL_1' ? 5 : 10
}));

// Initial Default Subjects
const INITIAL_SUBJECTS: Subject[] = MALI_DEFAULT_SUBJECTS.map((s, i) => ({
  id: `subj-${i + 1}`,
  code: s.code,
  name: s.name,
  coefficient: s.coefficient,
  classCategory: s.classCategory as any,
  order: s.order
}));

// Initial Teachers
const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-1',
    firstName: 'Bakary',
    lastName: 'KANÉ',
    gender: 'M',
    phone: '+223 76 12 34 56',
    email: 'bakary.kane@soundiatakeita.edu.ml',
    address: 'Sogoniko, Bamako',
    diploma: 'Master ENSup Bamako',
    specialty: 'Mathématiques & Physique',
    subjectsHandled: ['subj-2', 'subj-3'],
    monthlySalary: 250000,
    status: 'ACTIF',
    hireDate: '2021-09-01',
  },
  {
    id: 'tch-2',
    firstName: 'Aminata',
    lastName: 'SANOGO',
    gender: 'F',
    phone: '+223 66 98 76 54',
    email: 'aminata.sanogo@soundiatakeita.edu.ml',
    address: 'Lafiabougou, Bamako',
    diploma: 'Licence Lettres Modernes ULSHB',
    specialty: 'Français & Rédaction',
    subjectsHandled: ['subj-1'],
    monthlySalary: 220000,
    status: 'ACTIF',
    hireDate: '2022-10-15',
  },
  {
    id: 'tch-3',
    firstName: 'Modibo',
    lastName: 'KEÏTA',
    gender: 'M',
    phone: '+223 78 45 67 89',
    email: 'modibo.keita@soundiatakeita.edu.ml',
    address: 'Kalaban Coro, Bamako',
    diploma: 'Master Histoire-Géo DER SHS',
    specialty: 'Histoire, Géographie & ECM',
    subjectsHandled: ['subj-5', 'subj-6'],
    monthlySalary: 200000,
    status: 'ACTIF',
    hireDate: '2020-01-10',
  }
];

// Initial Students (Realistic Malian names and records)
const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-1',
    matricule: 'MLE-2025-001',
    firstName: 'Aïssata',
    lastName: 'COULIBALY',
    gender: 'F',
    birthDate: '2010-04-12',
    birthPlace: 'Bamako',
    nationality: 'Mali',
    address: 'Hippodrome, Rue 214',
    phone: '+223 74 11 22 33',
    classId: 'cls-5', // 9ème DEF
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    parent: {
      fatherName: 'M. Adama COULIBALY',
      fatherPhone: '+223 76 00 44 11',
      fatherProfession: 'Ingénieur BTP',
      motherName: 'Mme. Oumou SYLLA',
      motherPhone: '+223 66 11 22 33',
      motherProfession: 'Commerçante'
    },
    observations: 'Excellente élève, très assidue.'
  },
  {
    id: 'std-2',
    matricule: 'MLE-2025-002',
    firstName: 'Sekou',
    lastName: 'DIABATÉ',
    gender: 'M',
    birthDate: '2009-11-28',
    birthPlace: 'Ségou',
    nationality: 'Mali',
    address: 'Badalabougou',
    phone: '+223 79 55 66 77',
    classId: 'cls-5', // 9ème DEF
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    parent: {
      fatherName: 'M. Nouhoum DIABATÉ',
      fatherPhone: '+223 78 99 00 11',
      fatherProfession: 'Enseignant Chercheur',
      motherName: 'Mme. Mariam SANGARE',
      motherPhone: '+223 65 44 33 22'
    },
    observations: 'Participation active en cours.'
  },
  {
    id: 'std-3',
    matricule: 'MLE-2025-003',
    firstName: 'Fatoumata Bintou',
    lastName: 'TOURE',
    gender: 'F',
    birthDate: '2008-07-03',
    birthPlace: 'Sikasso',
    nationality: 'Mali',
    address: 'ACI 2000',
    phone: '+223 70 88 77 66',
    classId: 'cls-8', // 12ème TSS
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    parent: {
      fatherName: 'Dr. Cheick Oumar TOURE',
      fatherPhone: '+223 76 55 44 33',
      fatherProfession: 'Médecin',
      motherName: 'Mme. Djénéba DIARRA',
      motherPhone: '+223 66 99 88 77'
    }
  },
  {
    id: 'std-4',
    matricule: 'MLE-2025-004',
    firstName: 'Moussa',
    lastName: 'SISSOKO',
    gender: 'M',
    birthDate: '2011-02-19',
    birthPlace: 'Kayes',
    nationality: 'Mali',
    address: 'Hamdallaye ACI',
    classId: 'cls-3', // 7ème Année
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    parent: {
      fatherName: 'M. Brehima SISSOKO',
      fatherPhone: '+223 72 33 44 55',
      motherName: 'Mme. Assetou SAMAKÉ',
      motherPhone: '+223 62 11 00 99'
    }
  },
  {
    id: 'std-5',
    matricule: 'MLE-2025-005',
    firstName: 'Kadiatou',
    lastName: 'KONATÉ',
    gender: 'F',
    birthDate: '2008-09-14',
    birthPlace: 'Mopti',
    nationality: 'Mali',
    address: 'Niamakoro',
    classId: 'cls-9', // 12ème TSE
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    parent: {
      fatherName: 'M. Salif KONATÉ',
      fatherPhone: '+223 75 12 34 56',
      motherName: 'Mme. Hawa BA',
      motherPhone: '+223 65 98 76 54'
    }
  }
];

// Initial Grades
const INITIAL_GRADES: EvaluationGrade[] = [
  // Aïssata Coulibaly (std-1) - 9ème DEF
  { id: 'grd-1', studentId: 'std-1', classId: 'cls-5', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'DEVOIR', score: 16.5, maxScore: 20, coefficient: 1, date: '2025-10-15' },
  { id: 'grd-2', studentId: 'std-1', classId: 'cls-5', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 17, maxScore: 20, coefficient: 2, date: '2025-11-20' },
  { id: 'grd-3', studentId: 'std-1', classId: 'cls-5', subjectId: 'subj-2', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'DEVOIR', score: 18, maxScore: 20, coefficient: 1, date: '2025-10-18' },
  { id: 'grd-4', studentId: 'std-1', classId: 'cls-5', subjectId: 'subj-2', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 18.5, maxScore: 20, coefficient: 2, date: '2025-11-22' },
  { id: 'grd-5', studentId: 'std-1', classId: 'cls-5', subjectId: 'subj-3', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 15, maxScore: 20, coefficient: 2, date: '2025-11-25' },

  // Sekou Diabaté (std-2) - 9ème DEF
  { id: 'grd-6', studentId: 'std-2', classId: 'cls-5', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'DEVOIR', score: 13, maxScore: 20, coefficient: 1, date: '2025-10-15' },
  { id: 'grd-7', studentId: 'std-2', classId: 'cls-5', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 14, maxScore: 20, coefficient: 2, date: '2025-11-20' },
  { id: 'grd-8', studentId: 'std-2', classId: 'cls-5', subjectId: 'subj-2', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 12.5, maxScore: 20, coefficient: 2, date: '2025-11-22' },
];

// Initial Payments (FCFA)
const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-2025-0001',
    studentId: 'std-1',
    studentMatricule: 'MLE-2025-001',
    studentName: 'Aïssata COULIBALY',
    className: '9ème Année A (DEF)',
    category: 'INSCRIPTION',
    amountPaid: 20000,
    expectedAmount: 20000,
    remainingAmount: 0,
    paymentDate: '2025-09-15',
    method: 'ESPECES',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026',
    notes: 'Inscription intégrale acquittée'
  },
  {
    id: 'pay-2',
    receiptNumber: 'REC-2025-0002',
    studentId: 'std-1',
    studentMatricule: 'MLE-2025-001',
    studentName: 'Aïssata COULIBALY',
    className: '9ème Année A (DEF)',
    category: 'MENSUALITE',
    monthCovered: 'Octobre 2025',
    amountPaid: 25000,
    expectedAmount: 25000,
    remainingAmount: 0,
    paymentDate: '2025-10-02',
    method: 'ORANGE_MONEY',
    referenceNumber: 'OM-223-984321',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026'
  },
  {
    id: 'pay-3',
    receiptNumber: 'REC-2025-0003',
    studentId: 'std-2',
    studentMatricule: 'MLE-2025-002',
    studentName: 'Sekou DIABATÉ',
    className: '9ème Année A (DEF)',
    category: 'INSCRIPTION',
    amountPaid: 20000,
    expectedAmount: 20000,
    remainingAmount: 0,
    paymentDate: '2025-09-16',
    method: 'ESPECES',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026'
  },
  {
    id: 'pay-4',
    receiptNumber: 'REC-2025-0004',
    studentId: 'std-2',
    studentMatricule: 'MLE-2025-002',
    studentName: 'Sekou DIABATÉ',
    className: '9ème Année A (DEF)',
    category: 'MENSUALITE',
    monthCovered: 'Octobre 2025',
    amountPaid: 15000,
    expectedAmount: 25000,
    remainingAmount: 10000,
    paymentDate: '2025-10-05',
    method: 'MOOV_MONEY',
    referenceNumber: 'MM-772-00431',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026',
    notes: 'Acompte scolarité - Solde 10 000 FCFA restant'
  }
];

// Initial Attendance Records
const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: new Date().toISOString().split('T')[0],
    studentId: 'std-1',
    studentMatricule: 'MLE-2025-001',
    studentName: 'Aïssata COULIBALY',
    classId: 'cls-5',
    className: '9ème Année A (DEF)',
    status: 'PRESENT',
    markedBy: 'M. Ousmane DIARRA',
    academicYear: '2025-2026'
  },
  {
    id: 'att-2',
    date: new Date().toISOString().split('T')[0],
    studentId: 'std-2',
    studentMatricule: 'MLE-2025-002',
    studentName: 'Sékou DIABATÉ',
    classId: 'cls-5',
    className: '9ème Année A (DEF)',
    status: 'ABSENT_UNJUSTIFIED',
    reason: 'Absence non justifiée',
    markedBy: 'M. Ousmane DIARRA',
    academicYear: '2025-2026'
  },
  {
    id: 'att-3',
    date: new Date().toISOString().split('T')[0],
    studentId: 'std-3',
    studentMatricule: 'MLE-2025-003',
    studentName: 'Fatoumata KEÏTA',
    classId: 'cls-6',
    className: 'Tle TSS (Sciences Sociales)',
    status: 'LATE',
    lateMinutes: 15,
    reason: 'Transport en retard',
    markedBy: 'Mme Aminata SISSOKO',
    academicYear: '2025-2026'
  },
  {
    id: 'att-4',
    date: new Date().toISOString().split('T')[0],
    studentId: 'std-4',
    studentMatricule: 'MLE-2025-004',
    studentName: 'Mamadou SISSOKO',
    classId: 'cls-6',
    className: 'Tle TSS (Sciences Sociales)',
    status: 'ABSENT_JUSTIFIED',
    reason: 'Rendez-vous médical (Mot du parent)',
    markedBy: 'Mme Aminata SISSOKO',
    academicYear: '2025-2026'
  }
];

class StorageService {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
    }
  }

  public initDatabase(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
      this.setItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      this.setItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEACHERS)) {
      this.setItem(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      this.setItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.GRADES)) {
      this.setItem(STORAGE_KEYS.GRADES, INITIAL_GRADES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
      this.setItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      this.setItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      const initialLogs: AuditLog[] = [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          userId: 'u-admin',
          userName: 'Moh&IB',
          action: 'INIT_SYSTEM',
          module: 'SYSTEME',
          details: 'Initialisation de la base de données KalanGest Mali'
        }
      ];
      this.setItem(STORAGE_KEYS.LOGS, initialLogs);
    }
  }

  // --- SETTINGS ---
  public getSettings(): SchoolSettings {
    const s = this.getItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    let updated = false;

    if (s.schoolName?.includes("Soundiata Keïta")) {
      s.schoolName = "Établissement Scolaire";
      updated = true;
    }
    if (s.academyName?.includes("Bamako Rive Gauche")) {
      s.academyName = "Académie d'Enseignement";
      updated = true;
    }
    if (s.capName?.includes("Lafiabougou")) {
      s.capName = "CAP";
      updated = true;
    }
    if (s.email?.includes("soundiatakeita.edu.ml")) {
      s.email = "contact@ecole.edu.ml";
      updated = true;
    }
    if (!s.directorName || s.directorName === "Le Directeur") {
      s.directorName = "Moh&IB";
      updated = true;
    }
    if (!s.adminPassword || s.adminPassword === "00223") {
      s.adminPassword = "0022390070321";
      updated = true;
    }
    if (!s.evaluationMonths) {
      s.evaluationMonths = { ...DEFAULT_EVALUATION_MONTHS };
      updated = true;
    }

    if (updated) {
      this.setItem(STORAGE_KEYS.SETTINGS, s);
    }
    return s;
  }

  public updateSettings(settings: SchoolSettings): void {
    this.setItem(STORAGE_KEYS.SETTINGS, settings);
    this.addAuditLog('MISE_A_JOUR_PARAMETRES', 'PARAMETRES', 'Modifications des informations de l\'établissement');
  }

  // --- USERS ---
  public getUsers(): User[] {
    const users = this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    let updated = false;
    const sanitized = users.map(u => {
      if ((u.username === 'admin' || u.role === 'ADMIN') && (u.fullName === 'M. Amadou DIARRA' || u.fullName === 'Administrateur')) {
        updated = true;
        return { ...u, fullName: 'Moh&IB' };
      }
      return u;
    });
    if (updated) {
      this.setItem(STORAGE_KEYS.USERS, sanitized);
    }
    return sanitized;
  }

  // --- STUDENTS ---
  public getStudents(): Student[] {
    const students = this.getItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const seen = new Set<string>();
    let hasDuplicates = false;
    const sanitized = students.map((s, idx) => {
      if (!s.id || seen.has(s.id)) {
        hasDuplicates = true;
        const newId = `std-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        return { ...s, id: newId };
      }
      seen.add(s.id);
      return s;
    });
    if (hasDuplicates) {
      this.setItem(STORAGE_KEYS.STUDENTS, sanitized);
    }
    return sanitized;
  }

  public saveStudent(student: Partial<Student>): Student {
    const students = this.getStudents();
    const isEdit = Boolean(student.id);

    let savedStudent: Student;

    if (isEdit) {
      const index = students.findIndex(s => s.id === student.id);
      if (index === -1) throw new Error("Élève non trouvé");
      savedStudent = { ...students[index], ...student } as Student;
      students[index] = savedStudent;
    } else {
      const count = students.length + 1;
      const year = new Date().getFullYear();
      const formattedCount = String(count).padStart(3, '0');
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      
      savedStudent = {
        id: `std-${Date.now()}-${uniqueSuffix}`,
        matricule: student.matricule || `MLE-${year}-${formattedCount}`,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        gender: student.gender || 'M',
        birthDate: student.birthDate || '2012-01-01',
        birthPlace: student.birthPlace || 'Bamako',
        nationality: student.nationality || 'Mali',
        address: student.address || 'Bamako',
        phone: student.phone,
        classId: student.classId || 'cls-1',
        status: student.status || 'ACTIF',
        academicYear: student.academicYear || '2025-2026',
        admissionDate: student.admissionDate || new Date().toISOString().split('T')[0],
        parent: student.parent || {
          fatherName: '',
          fatherPhone: '',
          motherName: '',
          motherPhone: ''
        },
        observations: student.observations
      };
      students.unshift(savedStudent);
    }

    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.addAuditLog(isEdit ? 'MODIFICATION_ELEVE' : 'CREATION_ELEVE', 'ELEVES', `Élève ${savedStudent.firstName} ${savedStudent.lastName} (${savedStudent.matricule})`);
    return savedStudent;
  }

  public deleteStudent(studentId: string): void {
    const students = this.getStudents().filter(s => s.id !== studentId);
    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.addAuditLog('SUPPRESSION_ELEVE', 'ELEVES', `Suppression élève ID: ${studentId}`);
  }

  public clearAllStudents(): void {
    this.setItem(STORAGE_KEYS.STUDENTS, []);
    this.addAuditLog('SUPPRESSION_TOUS_ELEVES', 'ELEVES', 'Suppression de TOUS les élèves de la base de données');
  }

  // --- CLASSES ---
  public getClasses(): SchoolClass[] {
    const classes = this.getItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const students = this.getStudents();
    return classes.map(c => ({
      ...c,
      studentCount: students.filter(s => s.classId === c.id && s.status === 'ACTIF').length
    }));
  }

  public deleteClass(classId: string): void {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES).filter(c => c.id !== classId);
    this.setItem(STORAGE_KEYS.CLASSES, classes);
    this.addAuditLog('SUPPRESSION_CLASSE', 'CLASSES', `Suppression classe ID: ${classId}`);
  }

  public clearAllClasses(): void {
    this.setItem(STORAGE_KEYS.CLASSES, []);
    this.addAuditLog('SUPPRESSION_TOUTES_CLASSES', 'CLASSES', 'Suppression de TOUTES les classes de la base de données');
  }

  public saveClass(cls: Partial<SchoolClass>): SchoolClass {
    const classes = this.getItem<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    const isEdit = Boolean(cls.id);
    let saved: SchoolClass;

    if (isEdit) {
      const idx = classes.findIndex(c => c.id === cls.id);
      saved = { ...classes[idx], ...cls } as SchoolClass;
      classes[idx] = saved;
    } else {
      saved = {
        id: `cls-${Date.now()}`,
        name: cls.name || 'Nouvelle Classe',
        category: cls.category || 'FONDAMENTAL_2',
        level: cls.level || '7ème',
        capacity: cls.capacity || 40,
        monthlyFee: cls.monthlyFee || 20000,
        inscriptionFee: cls.inscriptionFee || 15000,
        classroom: cls.classroom || 'Salle 01',
        passingGrade: cls.passingGrade ?? (cls.category === 'FONDAMENTAL_1' ? 5 : 10)
      };
      classes.push(saved);
    }

    this.setItem(STORAGE_KEYS.CLASSES, classes);
    return saved;
  }

  // --- SUBJECTS ---
  public getSubjects(): Subject[] {
    return this.getItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  }

  public saveSubject(subj: Partial<Subject>): Subject {
    const subjects = this.getSubjects();
    const isEdit = Boolean(subj.id);
    let saved: Subject;

    if (isEdit) {
      const idx = subjects.findIndex(s => s.id === subj.id);
      saved = { ...subjects[idx], ...subj } as Subject;
      subjects[idx] = saved;
    } else {
      saved = {
        id: `subj-${Date.now()}`,
        code: subj.code || 'MAT',
        name: subj.name || 'Nouvelle Matière',
        coefficient: subj.coefficient || 1,
        classCategory: subj.classCategory || 'FONDAMENTAL_2',
        order: subjects.length + 1
      };
      subjects.push(saved);
    }

    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    return saved;
  }

  public deleteSubject(subjectId: string): void {
    const subjects = this.getSubjects().filter(s => s.id !== subjectId);
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
    this.addAuditLog('SUPPRESSION_MATIERE', 'MATIERES', `Suppression matière ID: ${subjectId}`);
  }

  public clearAllSubjects(): void {
    this.setItem(STORAGE_KEYS.SUBJECTS, []);
    this.addAuditLog('SUPPRESSION_TOUTES_MATIERES', 'MATIERES', 'Suppression de TOUTES les matières');
  }

  // --- TEACHERS ---
  public getTeachers(): Teacher[] {
    return this.getItem(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
  }

  public saveTeacher(teacher: Partial<Teacher>): Teacher {
    const teachers = this.getTeachers();
    const isEdit = Boolean(teacher.id);
    let saved: Teacher;

    if (isEdit) {
      const idx = teachers.findIndex(t => t.id === teacher.id);
      saved = { ...teachers[idx], ...teacher } as Teacher;
      teachers[idx] = saved;
    } else {
      saved = {
        id: `tch-${Date.now()}`,
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        gender: teacher.gender || 'M',
        phone: teacher.phone || '',
        email: teacher.email,
        address: teacher.address || 'Bamako',
        diploma: teacher.diploma || 'Licence',
        specialty: teacher.specialty || 'Général',
        subjectsHandled: teacher.subjectsHandled || [],
        monthlySalary: teacher.monthlySalary || 150000,
        status: teacher.status || 'ACTIF',
        hireDate: new Date().toISOString().split('T')[0]
      };
      teachers.push(saved);
    }

    this.setItem(STORAGE_KEYS.TEACHERS, teachers);
    return saved;
  }

  public deleteTeacher(teacherId: string): void {
    const teachers = this.getTeachers().filter(t => t.id !== teacherId);
    this.setItem(STORAGE_KEYS.TEACHERS, teachers);
    this.addAuditLog('SUPPRESSION_ENSEIGNANT', 'ENSEIGNANTS', `Suppression enseignant ID: ${teacherId}`);
  }

  public clearAllTeachers(): void {
    this.setItem(STORAGE_KEYS.TEACHERS, []);
    this.addAuditLog('SUPPRESSION_TOUS_ENSEIGNANTS', 'ENSEIGNANTS', 'Suppression de TOUS les enseignants');
  }

  // --- GRADES ---
  public getGrades(): EvaluationGrade[] {
    return this.getItem(STORAGE_KEYS.GRADES, INITIAL_GRADES);
  }

  public deleteGrade(gradeId: string): void {
    const grades = this.getGrades().filter(g => g.id !== gradeId);
    this.setItem(STORAGE_KEYS.GRADES, grades);
    this.addAuditLog('SUPPRESSION_NOTE', 'NOTES', `Suppression note ID: ${gradeId}`);
  }

  public clearAllGrades(): void {
    this.setItem(STORAGE_KEYS.GRADES, []);
    this.addAuditLog('SUPPRESSION_TOUTES_NOTES', 'NOTES', 'Suppression de TOUTES les notes');
  }

  public saveGrade(grade: Partial<EvaluationGrade>): EvaluationGrade {
    const grades = this.getGrades();
    const isEdit = Boolean(grade.id);
    let saved: EvaluationGrade;

    if (isEdit) {
      const idx = grades.findIndex(g => g.id === grade.id);
      saved = { ...grades[idx], ...grade } as EvaluationGrade;
      grades[idx] = saved;
    } else {
      saved = {
        id: `grd-${Date.now()}`,
        studentId: grade.studentId || '',
        classId: grade.classId || '',
        subjectId: grade.subjectId || '',
        term: grade.term || 'TRIMESTRE_1',
        academicYear: grade.academicYear || '2025-2026',
        type: grade.type || 'COMPOSITION',
        score: grade.score || 0,
        maxScore: 20,
        coefficient: grade.coefficient || 1,
        date: new Date().toISOString().split('T')[0],
        comment: grade.comment
      };
      grades.unshift(saved);
    }

    this.setItem(STORAGE_KEYS.GRADES, grades);
    return saved;
  }

  // --- PAYMENTS ---
  public getPayments(): Payment[] {
    return this.getItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  }

  public recordPayment(pay: Partial<Payment>): Payment {
    const payments = this.getPayments();
    const count = payments.length + 1;
    const year = new Date().getFullYear();

    const expected = pay.expectedAmount || 25000;
    const paid = pay.amountPaid || 0;
    const remaining = Math.max(0, expected - paid);

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      receiptNumber: `REC-${year}-${String(count).padStart(4, '0')}`,
      studentId: pay.studentId || '',
      studentMatricule: pay.studentMatricule || '',
      studentName: pay.studentName || 'Élève',
      className: pay.className || 'Classe',
      category: pay.category || 'MENSUALITE',
      monthCovered: pay.monthCovered,
      amountPaid: paid,
      expectedAmount: expected,
      remainingAmount: remaining,
      paymentDate: pay.paymentDate || new Date().toISOString().split('T')[0],
      method: pay.method || 'ESPECES',
      referenceNumber: pay.referenceNumber,
      cashierName: pay.cashierName || 'Comptable',
      academicYear: pay.academicYear || '2025-2026',
      notes: pay.notes
    };

    payments.unshift(newPayment);
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);
    this.addAuditLog('ENREGISTREMENT_PAIEMENT', 'PAIEMENTS', `Reçu N° ${newPayment.receiptNumber} - ${newPayment.amountPaid} FCFA pour ${newPayment.studentName}`);
    return newPayment;
  }

  public updatePayment(payment: Payment): Payment {
    const existing = this.getPayments();
    const index = existing.findIndex(p => p.id === payment.id);
    if (index !== -1) {
      existing[index] = payment;
      this.setItem(STORAGE_KEYS.PAYMENTS, existing);
      this.addAuditLog(
        'MODIFICATION_PAIEMENT',
        'PAIEMENTS',
        `Modification du reçu ${payment.receiptNumber} - ${payment.amountPaid} FCFA pour ${payment.studentName}`
      );
    }
    return payment;
  }

  public deletePayment(id: string): void {
    const existing = this.getPayments();
    const paymentToDelete = existing.find(p => p.id === id);
    const updated = existing.filter(p => p.id !== id);
    this.setItem(STORAGE_KEYS.PAYMENTS, updated);
    this.addAuditLog(
      'SUPPRESSION_PAIEMENT',
      'PAIEMENTS',
      `Suppression du reçu ${paymentToDelete?.receiptNumber || id} de ${paymentToDelete?.amountPaid || 0} FCFA (${paymentToDelete?.studentName || 'Élève'})`
    );
  }

  public clearAllPayments(): void {
    this.setItem(STORAGE_KEYS.PAYMENTS, []);
    this.addAuditLog('SUPPRESSION_TOUS_PAIEMENTS', 'PAIEMENTS', 'Suppression de TOUS les paiements');
  }

  // --- ATTENDANCE ---
  public getAttendanceRecords(): AttendanceRecord[] {
    return this.getItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  }

  public saveAttendanceBatch(records: Partial<AttendanceRecord>[]): AttendanceRecord[] {
    const existing = this.getAttendanceRecords();
    const updated = [...existing];

    records.forEach(rec => {
      if (!rec.studentId || !rec.date) return;
      const index = updated.findIndex(r => r.studentId === rec.studentId && r.date === rec.date);
      const fullRecord: AttendanceRecord = {
        id: rec.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: rec.date,
        studentId: rec.studentId,
        studentMatricule: rec.studentMatricule || '',
        studentName: rec.studentName || '',
        classId: rec.classId || '',
        className: rec.className || '',
        status: rec.status || 'PRESENT',
        reason: rec.reason || '',
        lateMinutes: rec.lateMinutes || 0,
        markedBy: rec.markedBy || 'Surveillant Général',
        academicYear: rec.academicYear || '2025-2026'
      };

      if (index >= 0) {
        updated[index] = fullRecord;
      } else {
        updated.push(fullRecord);
      }
    });

    this.setItem(STORAGE_KEYS.ATTENDANCE, updated);
    this.addAuditLog('SAISIE_PRESENCES', 'ATTENDANCE', `Enregistrement des présences pour ${records.length} élève(s)`);
    return updated;
  }

  public deleteAttendanceRecord(id: string): void {
    const records = this.getAttendanceRecords().filter(r => r.id !== id);
    this.setItem(STORAGE_KEYS.ATTENDANCE, records);
    this.addAuditLog('SUPPRESSION_PRESENCE', 'ATTENDANCE', `Suppression fiche de présence ${id}`);
  }

  public clearAllAttendanceRecords(): void {
    this.setItem(STORAGE_KEYS.ATTENDANCE, []);
    this.addAuditLog('SUPPRESSION_TOUTES_PRESENCES', 'ATTENDANCE', 'Suppression de TOUTES les fiches de présence');
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem(STORAGE_KEYS.LOGS, []);
  }

  public addAuditLog(action: string, module: string, details: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'u-current',
      userName: 'Utilisateur Actif',
      action,
      module,
      details
    };
    logs.unshift(newLog);
    this.setItem(STORAGE_KEYS.LOGS, logs.slice(0, 200)); // Keep last 200 logs
  }

  // --- BACKUP & RESTORE (JSON/SQLite Export) ---
  public exportFullBackupJSON(): string {
    const backup = {
      version: '1.0.0',
      system: 'SomaSikolo Mali',
      exportDate: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getUsers(),
      students: this.getStudents(),
      classes: this.getClasses(),
      subjects: this.getSubjects(),
      teachers: this.getTeachers(),
      grades: this.getGrades(),
      payments: this.getPayments(),
      attendance: this.getAttendanceRecords(),
      logs: this.getAuditLogs()
    };
    return JSON.stringify(backup, null, 2);
  }

  public restoreFullBackupJSON(jsonContent: string): boolean {
    try {
      const data = JSON.parse(jsonContent);
      if (data.settings) this.setItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.users) this.setItem(STORAGE_KEYS.USERS, data.users);
      if (data.students) this.setItem(STORAGE_KEYS.STUDENTS, data.students);
      if (data.classes) this.setItem(STORAGE_KEYS.CLASSES, data.classes);
      if (data.subjects) this.setItem(STORAGE_KEYS.SUBJECTS, data.subjects);
      if (data.teachers) this.setItem(STORAGE_KEYS.TEACHERS, data.teachers);
      if (data.grades) this.setItem(STORAGE_KEYS.GRADES, data.grades);
      if (data.payments) this.setItem(STORAGE_KEYS.PAYMENTS, data.payments);
      if (data.attendance) this.setItem(STORAGE_KEYS.ATTENDANCE, data.attendance);
      if (data.logs) this.setItem(STORAGE_KEYS.LOGS, data.logs);
      
      this.addAuditLog('RESTAURATION_DATABASE', 'SYSTEME', 'Restauration complète de la base de données SQLite/JSON');
      return true;
    } catch (e) {
      console.error("Backup restore failed:", e);
      return false;
    }
  }
}

export const storageService = new StorageService();
