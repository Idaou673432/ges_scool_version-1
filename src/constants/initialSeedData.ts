/**
 * SomaSikolo - Base de Données Initiale Référence (Mali)
 * Fournit les données scolaires réelles complètes par défaut
 * partagées entre le serveur Express (server.ts) et le client React (storageService.ts).
 */

import {
  Student,
  SchoolClass,
  Subject,
  Teacher,
  EvaluationGrade,
  Payment,
  AttendanceRecord,
  SchoolSettings,
  User,
  ExamSession,
  ExamSlot
} from '../types';
import {
  MALI_DEFAULT_CLASSES,
  MALI_DEFAULT_SUBJECTS,
  DEFAULT_EVALUATION_MONTHS
} from './maliEducation';

export const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: "Établissement Scolaire",
  schoolType: "PRIVE",
  schoolCategory: "ECOLE_FONDAMENTALE",
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
  modulesSecurityPin: "0000",
  primaryColor: "#059669",
  enableSmsAlerts: true,
  evaluationMonths: { ...DEFAULT_EVALUATION_MONTHS },
  evaluationCount: 9,
  evaluationsPerTrimester1stCycle: 3,
  evaluationsPerTrimester2ndCycle: 2,
  calculationFormula1stCycle: "MALI_OFFICIAL",
  calculationFormula2ndCycle: "MALI_OFFICIAL",
  classScoreWeight1st: 1,
  compScoreWeight1st: 1,
  enabledFeatures: {
    students: true,
    classes: true,
    subjects: true,
    teachers: true,
    grades: true,
    attendance: true,
    bulletins: true,
    cards: true,
    payments: true,
    qrScanner: true,
    examSchedule: true
  }
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'Moh&IB',
    email: 'admin@ecole.edu.ml',
    role: 'ADMIN',
    password: '0022390070321',
    phone: '+223 76 00 11 22',
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'u-directeur',
    username: 'directeur',
    fullName: 'Dr. Ousmane COULIBALY',
    email: 'directeur@ecole.edu.ml',
    role: 'DIRECTEUR',
    password: 'directeur123',
    phone: '+223 66 33 44 55',
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'u-secretaire',
    username: 'secretaire',
    fullName: 'Mme. Fatoumata SISSOKO',
    email: 'secretaire@ecole.edu.ml',
    role: 'SECRETAIRE',
    password: 'secretaire123',
    phone: '+223 75 88 99 00',
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'u-comptable',
    username: 'comptable',
    fullName: 'M. Ibrahim TRAORÉ',
    email: 'comptable@ecole.edu.ml',
    role: 'COMPTABLE',
    password: 'comptable123',
    phone: '+223 65 11 22 33',
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'u-enseignant',
    username: 'enseignant',
    fullName: 'Prof. Bakary KANÉ',
    email: 'bakary.kane@ecole.edu.ml',
    role: 'ENSEIGNANT',
    password: 'enseignant123',
    phone: '+223 70 44 55 66',
    active: true,
    createdAt: '2025-09-01T08:00:00.000Z',
  }
];

export const INITIAL_CLASSES: SchoolClass[] = MALI_DEFAULT_CLASSES.map((c, i) => ({
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

export const INITIAL_SUBJECTS: Subject[] = MALI_DEFAULT_SUBJECTS.map((s, i) => ({
  id: `subj-${i + 1}`,
  code: s.code,
  name: s.name,
  coefficient: s.coefficient,
  classCategory: s.classCategory as any,
  order: s.order
}));

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-1',
    firstName: 'Bakary',
    lastName: 'KANÉ',
    gender: 'M',
    phone: '+223 76 12 34 56',
    email: 'bakary.kane@ecole.edu.ml',
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
    email: 'aminata.sanogo@ecole.edu.ml',
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
    email: 'modibo.keita@ecole.edu.ml',
    address: 'Kalaban Coro, Bamako',
    diploma: 'Master Histoire-Géo DER SHS',
    specialty: 'Histoire, Géographie & ECM',
    subjectsHandled: ['subj-5', 'subj-6'],
    monthlySalary: 200000,
    status: 'ACTIF',
    hireDate: '2020-01-10',
  }
];

export const INITIAL_STUDENTS: Student[] = [
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
    classId: 'cls-9', // 9ème Année A (DEF)
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    bloodType: 'O+',
    allergies: 'Aucune allergie connue',
    emergencyContact: '+223 76 00 44 11 (Père - Adama COULIBALY)',
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
    classId: 'cls-9', // 9ème Année A (DEF)
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    bloodType: 'A+',
    allergies: 'Intolérance légère au lactose',
    emergencyContact: '+223 78 99 00 11 (Père - Nouhoum DIABATÉ)',
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
    classId: 'cls-14', // 12ème Terminales Sciences Sociales (TSS)
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    bloodType: 'B+',
    allergies: 'Aucune allergie connue',
    emergencyContact: '+223 76 55 44 33 (Dr. Cheick Oumar TOURE)',
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
    classId: 'cls-7', // 7ème Année A
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    bloodType: 'AB+',
    allergies: 'Sensibilité poussière / asthme modéré',
    emergencyContact: '+223 72 33 44 55 (Père - Brehima SISSOKO)',
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
    classId: 'cls-13', // 12ème Terminales Sciences Exactes (TSE)
    status: 'ACTIF',
    academicYear: '2025-2026',
    admissionDate: '2025-09-15',
    bloodType: 'O-',
    allergies: 'Aucune allergie connue',
    emergencyContact: '+223 75 12 34 56 (Père - Salif KONATÉ)',
    parent: {
      fatherName: 'M. Salif KONATÉ',
      fatherPhone: '+223 75 12 34 56',
      motherName: 'Mme. Hawa BA',
      motherPhone: '+223 65 98 76 54'
    }
  }
];

export const INITIAL_GRADES: EvaluationGrade[] = [
  { id: 'grd-1', studentId: 'std-1', classId: 'cls-9', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'DEVOIR', score: 16.5, maxScore: 20, coefficient: 1, date: '2025-10-15' },
  { id: 'grd-2', studentId: 'std-1', classId: 'cls-9', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 17, maxScore: 20, coefficient: 2, date: '2025-11-20' },
  { id: 'grd-3', studentId: 'std-1', classId: 'cls-9', subjectId: 'subj-2', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'DEVOIR', score: 18, maxScore: 20, coefficient: 1, date: '2025-10-18' },
  { id: 'grd-4', studentId: 'std-1', classId: 'cls-9', subjectId: 'subj-2', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 18.5, maxScore: 20, coefficient: 2, date: '2025-11-22' },
  { id: 'grd-5', studentId: 'std-1', classId: 'cls-9', subjectId: 'subj-3', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 15, maxScore: 20, coefficient: 2, date: '2025-11-25' },
  { id: 'grd-6', studentId: 'std-2', classId: 'cls-9', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'DEVOIR', score: 13, maxScore: 20, coefficient: 1, date: '2025-10-15' },
  { id: 'grd-7', studentId: 'std-2', classId: 'cls-9', subjectId: 'subj-1', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 14, maxScore: 20, coefficient: 2, date: '2025-11-20' },
  { id: 'grd-8', studentId: 'std-2', classId: 'cls-9', subjectId: 'subj-2', term: 'TRIMESTRE_1', academicYear: '2025-2026', type: 'COMPOSITION', score: 12.5, maxScore: 20, coefficient: 2, date: '2025-11-22' }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-2025-0001',
    studentId: 'std-1',
    studentMatricule: 'MLE-2025-001',
    studentName: 'Aïssata COULIBALY',
    className: '9ème Année A (DEF)',
    category: 'INSCRIPTION',
    monthCovered: 'Septembre 2025',
    amountPaid: 20000,
    expectedAmount: 20000,
    remainingAmount: 0,
    paymentDate: '2025-09-15',
    method: 'ESPECES',
    referenceNumber: '',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026',
    notes: 'Paiement intégral des frais d\'inscription'
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
    referenceNumber: 'OM-882-99104',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026',
    notes: 'Règlement mensuel par Orange Money'
  },
  {
    id: 'pay-3',
    receiptNumber: 'REC-2025-0003',
    studentId: 'std-2',
    studentMatricule: 'MLE-2025-002',
    studentName: 'Sekou DIABATÉ',
    className: '9ème Année A (DEF)',
    category: 'INSCRIPTION',
    monthCovered: 'Septembre 2025',
    amountPaid: 20000,
    expectedAmount: 20000,
    remainingAmount: 0,
    paymentDate: '2025-09-16',
    method: 'ESPECES',
    referenceNumber: '',
    cashierName: 'M. Ibrahim TRAORÉ',
    academicYear: '2025-2026',
    notes: 'Inscription payée au guichet'
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

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: new Date().toISOString().split('T')[0],
    studentId: 'std-1',
    studentMatricule: 'MLE-2025-001',
    studentName: 'Aïssata COULIBALY',
    classId: 'cls-9',
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
    studentName: 'Sekou DIABATÉ',
    classId: 'cls-9',
    className: '9ème Année A (DEF)',
    status: 'ABSENT_UNJUSTIFIED',
    reason: 'Absence non justifiée',
    markedBy: 'M. Ousmane DIARRA',
    academicYear: '2025-2026'
  }
];

export const INITIAL_EXAM_SESSIONS: ExamSession[] = [
  {
    id: 'sess-t1',
    title: 'Compositions du 1er Trimestre (2025-2026)',
    term: 'TRIMESTRE_1',
    startDate: '2025-12-10',
    endDate: '2025-12-14',
    academicYear: '2025-2026',
    status: 'PUBLIE',
    generalInstructions: '1. Présence obligatoire 15 minutes avant le début de chaque épreuve.\n2. Carte d\'identité scolaire obligatoire sur la table.\n3. Téléphones portables et montres connectées formellement interdits dans les salles d\'examen.\n4. Toute fraude ou tentative de fraude entraîne l\'exclusion immédiate de la session.',
    createdAt: '2025-11-01T08:00:00.000Z'
  },
  {
    id: 'sess-def-blanc',
    title: 'Examen Blanc Régional DEF (2025-2026)',
    term: 'DEF_BLANC',
    startDate: '2026-03-20',
    endDate: '2026-03-22',
    academicYear: '2025-2026',
    status: 'BROUILLON',
    generalInstructions: 'Épreuves types DEF conformes aux directives du Ministère de l\'Éducation Nationale.',
    createdAt: '2025-11-01T08:00:00.000Z'
  }
];

export const INITIAL_EXAM_SLOTS: ExamSlot[] = [];

/**
 * Construit un état complet et riche pour une nouvelle école ou pour la restauration
 */
export function createDefaultSchoolStore(): {
  settings: SchoolSettings;
  students: Student[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  grades: EvaluationGrade[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  expenses: any[];
  exam_sessions: ExamSession[];
  exam_slots: ExamSlot[];
  updatedAt: string;
} {
  return {
    settings: { ...INITIAL_SETTINGS },
    students: JSON.parse(JSON.stringify(INITIAL_STUDENTS)),
    classes: JSON.parse(JSON.stringify(INITIAL_CLASSES)),
    subjects: JSON.parse(JSON.stringify(INITIAL_SUBJECTS)),
    teachers: JSON.parse(JSON.stringify(INITIAL_TEACHERS)),
    grades: JSON.parse(JSON.stringify(INITIAL_GRADES)),
    payments: JSON.parse(JSON.stringify(INITIAL_PAYMENTS)),
    attendance: JSON.parse(JSON.stringify(INITIAL_ATTENDANCE)),
    expenses: [],
    exam_sessions: JSON.parse(JSON.stringify(INITIAL_EXAM_SESSIONS)),
    exam_slots: JSON.parse(JSON.stringify(INITIAL_EXAM_SLOTS)),
    updatedAt: new Date().toISOString()
  };
}
