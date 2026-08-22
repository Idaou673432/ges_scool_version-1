/**
 * SomaSikolo - Types Domain & Architecture pour la Gestion Scolaire au Mali
 */

export type UserRole = 
  | 'ADMIN' 
  | 'DIRECTEUR' 
  | 'SECRETAIRE' 
  | 'COMPTABLE' 
  | 'ENSEIGNANT' 
  | 'LECTURE_SEULE';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Permission {
  code: string;
  label: string;
  module: string;
}

export type Gender = 'M' | 'F';

export type StudentStatus = 'ACTIF' | 'ABANDON' | 'EXCLU' | 'TRANSFERE' | 'DIPLOME';

export interface ParentInfo {
  fatherName: string;
  fatherPhone: string;
  fatherProfession?: string;
  motherName: string;
  motherPhone: string;
  motherProfession?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  email?: string;
}

export interface Student {
  id: string;
  matricule: string; // Ex: MLE-2024-8932
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthPlace: string;
  nationality: string; // Default 'Mali'
  address: string;
  phone?: string;
  photoUrl?: string;
  qrCodeUrl?: string;
  classId: string;
  status: StudentStatus;
  parent: ParentInfo;
  observations?: string;
  admissionDate: string;
  academicYear: string; // Ex: '2025-2026'
  reductionPercent?: number; // Réduction exceptionnelle scolarité
}

export type SchoolLevelCategory = 
  | 'FONDAMENTAL_1'   // 1ere a 6eme annee
  | 'FONDAMENTAL_2'   // 7eme a 9eme annee (DEF)
  | 'LYCEE'           // 10eme, 11eme, 12eme (TSE, TSECO, TSS, TSExp, LCO, TAL)
  | 'TECHNIQUE_BT'    // Brevet de Technicien (BT1, BT2)
  | 'PROFESSIONNEL_CAP'; // Certificat d'Aptitude Professionnelle (CAP1, CAP2)

export interface SchoolClass {
  id: string;
  name: string; // Ex: '9ème Année A', 'TSS 1', '10ème CG'
  category: SchoolLevelCategory;
  level: string; // Ex: '9ème', 'TSS'
  section?: string; // Ex: 'A', 'B'
  capacity: number;
  mainTeacherId?: string;
  classroom?: string; // Ex: 'Salle 04'
  monthlyFee: number; // Frais mensuels FCFA
  inscriptionFee: number; // Frais d'inscription FCFA
  studentCount?: number;
  passingGrade?: number; // Note de passage / moyenne d'admission (ex: 10/20 ou 5/10)
}

export interface Subject {
  id: string;
  code: string; // Ex: 'MATH', 'FRAN', 'ECM', 'PC'
  name: string; // Ex: 'Mathématiques', 'Français / Expression Écrite', 'Éducation à la Citoyenneté'
  coefficient: number;
  classCategory: SchoolLevelCategory;
  order: number;
  isOptional?: boolean;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  phone: string;
  email?: string;
  address: string;
  diploma: string; // Ex: 'Master ENSup', 'Licence DER Sciences', 'CAP'
  specialty: string;
  subjectsHandled: string[]; // Subject IDs
  monthlySalary: number; // FCFA
  photoUrl?: string;
  status: 'ACTIF' | 'INACTIF';
  hireDate: string;
}

export type EvaluationType = 'INTERROGATION' | 'DEVOIR' | 'COMPOSITION' | 'EXAMEN' | 'TP';

export type EvaluationTerm = 
  | 'TRIMESTRE_1' 
  | 'TRIMESTRE_2' 
  | 'TRIMESTRE_3' 
  | 'SEMESTRE_1' 
  | 'SEMESTRE_2'
  | 'EVALUATION_1'
  | 'EVALUATION_2'
  | 'EVALUATION_3'
  | 'EVALUATION_4'
  | 'EVALUATION_5'
  | 'EVALUATION_6'
  | 'EVALUATION_7'
  | 'EVALUATION_8'
  | 'EVALUATION_9'
  | 'EVALUATION_10'
  | 'EVALUATION_11'
  | 'EVALUATION_12'
  | string;

export interface EvaluationGrade {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  term: EvaluationTerm;
  academicYear: string;
  type: EvaluationType;
  score: number; // Sur 20 (ou sur 10 au 1er cycle)
  maxScore: number; // 20 par defaut (10 pour 1er cycle)
  coefficient: number;
  date: string;
  comment?: string;
}

export interface StudentSubjectAverage {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  coefficient: number;
  classAverage: number;
  classScore?: number;
  interrogationAvg?: number;
  devoirAvg?: number;
  compositionScore?: number;
  finalScore: number; // Note finale sur maxScore (10 ou 20)
  maxScore?: number; // 10 pour 1er cycle, 20 pour 2eme cycle / lycee
  weightedScore: number; // finalScore * coefficient
  appreciation: string;
  teacherName?: string;
}

export interface ReportCard {
  studentId: string;
  studentMatricule: string;
  studentName: string;
  className: string;
  classId: string;
  term: EvaluationTerm;
  academicYear: string;
  maxScore?: number; // 10 pour 1er cycle, 20 pour 2eme cycle / lycee
  subjectAverages: StudentSubjectAverage[];
  totalPoints: number;
  totalCoefficients: number;
  generalAverage: number; // Sur 10 ou 20
  rankInClass: number;
  totalClassStudents: number;
  classMinAverage: number;
  classMaxAverage: number;
  classOverallAverage: number;
  absencesCount: number;
  lateCount: number;
  disciplineComment?: string;
  principalTeacherComment?: string;
  directorDecision?: 'ADMIS' | 'A_AVERTISSEMENT' | 'BLAME' | 'REDOUBLE' | 'EXCLU' | 'EN_ATTENTE';
}

export type ExpenseCategory = 
  | 'SALAIRE' 
  | 'EQUIPEMENT' 
  | 'FOURNITURES' 
  | 'ELECTRICITE_EAU' 
  | 'MAINTENANCE' 
  | 'CARBURANT' 
  | 'EVENEMENT'
  | 'AUTRES';

export interface Expense {
  id: string;
  reference: string;
  category: ExpenseCategory;
  description: string;
  amount: number; // FCFA
  expenseDate: string;
  beneficiary: string;
  paymentMethod: PaymentMethod;
  approvedBy: string;
}

export type InvoiceStatus = 'PAYE' | 'PARTIEL' | 'IMPAYE' | 'EN_RETARD';

export interface TuitionInvoice {
  id: string;
  invoiceNumber: string; // Ex: 'FAC-2025-001'
  studentId: string;
  studentMatricule: string;
  studentName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  issueDate: string;
  dueDate: string;
  academicYear: string;
  description: string; // Ex: 'Appel de Scolarité Annuelle 2025-2026'
  totalAmount: number; // FCFA
  paidAmount: number; // FCFA
  remainingAmount: number; // FCFA
  status: InvoiceStatus;
  notes?: string;
  lastReminderSentAt?: string;
}

export type PaymentCategory = 
  | 'INSCRIPTION' 
  | 'MENSUALITE' 
  | 'CANTINE' 
  | 'TRANSPORT' 
  | 'UNIFORME' 
  | 'LIVRES' 
  | 'AUTRES';

export type AttendanceStatus = 'PRESENT' | 'ABSENT_UNJUSTIFIED' | 'ABSENT_JUSTIFIED' | 'LATE';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentMatricule: string;
  studentName: string;
  classId: string;
  className: string;
  status: AttendanceStatus;
  reason?: string; // Motif d'absence ou précision retard
  lateMinutes?: number;
  markedBy: string;
  academicYear: string;
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  studentMatricule: string;
  className: string;
  totalDaysRecorded: number;
  presents: number;
  absencesUnjustified: number;
  absencesJustified: number;
  lates: number;
  attendanceRate: number; // %
}

export type PaymentMethod = 'ESPECES' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'CHEQUE' | 'VIREMENT';

export interface Payment {
  id: string;
  receiptNumber: string; // Ex: 'REC-2025-0042'
  studentId: string;
  studentMatricule: string;
  studentName: string;
  className: string;
  category: PaymentCategory;
  monthCovered?: string; // Ex: 'Octobre 2025', 'Novembre 2025'
  amountPaid: number; // FCFA
  expectedAmount: number; // FCFA
  remainingAmount: number; // FCFA
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string; // Ex: ID transaction Orange Money
  cashierName: string;
  academicYear: string;
  notes?: string;
}

export interface SchoolSettings {
  schoolName: string; // Nom officiel de l'établissement
  schoolType: 'PRIVE' | 'PUBLIC' | 'CONFESSIONNEL';
  academyName: string; // Académie d'Enseignement de rattachement
  capName: string; // Centre d'Animation Pédagogique (CAP)
  registrationNumber: string; // N° Autorisation / Agrément MEN
  address: string;
  city: string; // Ex: 'Bamako', 'Sikasso', 'Ségou'
  phone: string;
  email: string;
  website?: string;
  directorName: string;
  currency: string; // 'FCFA' / 'XOF'
  currentAcademicYear: string; // '2025-2026'
  activeTerm: EvaluationTerm;
  logoUrl?: string;
  stampUrl?: string;
  adminPassword?: string; // Mot de passe / Code PIN de sécurité (par défaut '00223')
  primaryColor: string;
  enableSmsAlerts: boolean;
  evaluationMonths?: Record<string, string>; // Configuration personnalisée des mois d'évaluation (ex: EVALUATION_1 -> 'Octobre')
  evaluationCount?: number; // Nombre d'évaluations mensuelles / devoirs par an par défaut (ex: 3, 6, 9, 10, 12)
  evaluationCount1stCycle?: number; // Nombre d'évaluations / mensualités dues au 1er Cycle (ex: 2, 3, 6, 9)
  evaluationCount2ndCycle?: number; // Nombre d'évaluations / mensualités dues au 2ème Cycle / Lycée (ex: 6, 9)
  evaluationsPerTrimester1stCycle?: number; // Nombre d'évaluations / devoirs par trimestre au Cycle Fondamental (ex: 1, 2, 3)
  evaluationsPerTrimester2ndCycle?: number; // Nombre d'évaluations / devoirs par trimestre au Cycle Secondaire / Lycée (ex: 1, 2, 3)
  calculationFormula1stCycle?: 'MALI_OFFICIAL' | 'EQUAL_WEIGHT' | 'CLASS_ONLY' | 'COMP_ONLY' | 'CUSTOM';
  calculationFormula2ndCycle?: 'MALI_OFFICIAL' | 'EQUAL_WEIGHT' | 'CLASS_ONLY' | 'COMP_ONLY' | 'CUSTOM';
  classScoreWeight1st?: number; // Poids note de classe 1er cycle (par défaut 1)
  compScoreWeight1st?: number;  // Poids comp 1er cycle (par défaut 1)
  classScoreWeight2nd?: number; // Poids note de classe 2ème cycle/lycée (par défaut 1)
  compScoreWeight2nd?: number;  // Poids comp 2ème cycle/lycée (par défaut 2)
  missingClassScoreBehavior?: 'USE_COMP_ONLY' | 'ZERO'; // Si pas de note de devoirs
  missingCompScoreBehavior?: 'USE_CLASS_ONLY' | 'ZERO';  // Si pas de note de composition
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
}

export interface SystemStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalRevenueFCFA: number;
  totalPendingFeesFCFA: number;
  totalExpensesFCFA: number;
  attendanceRatePercent: number;
  defSuccessRatePercent: number;
  bacSuccessRatePercent: number;
}
