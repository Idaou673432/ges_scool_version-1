/**
 * SomaSikolo / KalanGest - Cloud Real-time Database & Multi-tenant Synchronization Service
 * Enables multi-school separation and seamless real-time syncing between computers, phones, and tablets.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Student,
  SchoolClass,
  Subject,
  Teacher,
  EvaluationGrade,
  Payment,
  Expense,
  SchoolSettings,
  AuditLog,
  AttendanceRecord
} from '../types';

/**
 * Strips undefined values recursively so that Firestore setDoc and writeBatch never crash
 */
export function cleanForFirestore<T>(data: T): any {
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item));
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = cleanForFirestore(value);
    }
  }
  return cleanObj;
}

export interface CloudSyncListeners {
  onSettingsChange?: (settings: SchoolSettings) => void;
  onStudentsChange?: (students: Student[]) => void;
  onClassesChange?: (classes: SchoolClass[]) => void;
  onSubjectsChange?: (subjects: Subject[]) => void;
  onTeachersChange?: (teachers: Teacher[]) => void;
  onGradesChange?: (grades: EvaluationGrade[]) => void;
  onPaymentsChange?: (payments: Payment[]) => void;
  onExpensesChange?: (expenses: Expense[]) => void;
  onAttendanceChange?: (attendance: AttendanceRecord[]) => void;
  onAuditLogsChange?: (logs: AuditLog[]) => void;
  onSyncStatusChange?: (status: 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'ERROR', msg?: string) => void;
}

class CloudSyncService {
  private activeSchoolCode: string = '';
  private unsubscribers: Unsubscribe[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  public getActiveSchoolCode(): string {
    // 1. Check URL parameters for direct link connection (e.g. ?school=ECOLE-MALI-01)
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('school') || urlParams.get('code') || urlParams.get('ecole');
        if (codeFromUrl) {
          const clean = codeFromUrl.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          if (clean) {
            this.activeSchoolCode = clean;
            localStorage.setItem('kalangest_cloud_school_code', clean);
            return clean;
          }
        }
      } catch (e) {
        // ignore URL search params parse errors
      }
    }

    if (!this.activeSchoolCode) {
      if (typeof localStorage !== 'undefined') {
        this.activeSchoolCode = localStorage.getItem('kalangest_cloud_school_code') || 'ECOLE-PRINCIPALE';
      } else {
        this.activeSchoolCode = 'ECOLE-PRINCIPALE';
      }
    }
    return this.activeSchoolCode;
  }

  public getShareableLink(schoolCode?: string): string {
    const code = schoolCode || this.getActiveSchoolCode();
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}?school=${encodeURIComponent(code)}`;
    }
    return `https://somasikolo.vercel.app/?school=${encodeURIComponent(code)}`;
  }

  public setActiveSchoolCode(code: string): void {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'ECOLE-PRINCIPALE';
    this.activeSchoolCode = cleanCode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kalangest_cloud_school_code', cleanCode);
    }
  }

  /**
   * Register or verify a School Code in the directory
   */
  public async connectOrRegisterSchool(
    schoolCode: string,
    schoolName: string,
    pinCode: string = '00223'
  ): Promise<boolean> {
    try {
      const cleanCode = schoolCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!cleanCode) return false;

      const schoolRef = doc(db, 'school_directory', cleanCode);
      await setDoc(schoolRef, {
        schoolCode: cleanCode,
        schoolName: schoolName || 'Établissement Scolaire',
        pinCode: pinCode || '00223',
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      this.setActiveSchoolCode(cleanCode);
      return true;
    } catch (e) {
      console.error('Failed to register/connect school:', e);
      return false;
    }
  }

  /**
   * Check if Cloud database has data for this school; if empty, initialize with local seed.
   */
  public async bootstrapCloudIfEmpty(
    schoolCode: string,
    seedData: {
      settings: SchoolSettings;
      students: Student[];
      classes: SchoolClass[];
      subjects: Subject[];
      teachers: Teacher[];
      grades: EvaluationGrade[];
      payments: Payment[];
      attendance: AttendanceRecord[];
    }
  ): Promise<boolean> {
    try {
      const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();
      const settingsRef = doc(db, `schools/${code}/settings`, 'config');
      const snap = await getDoc(settingsRef);

      if (!snap.exists()) {
        console.info(`[CloudSync] Initializing empty cloud school [${code}] with seed data...`);
        return await this.pushAllDataToCloud(code, seedData);
      }
      return true;
    } catch (e) {
      console.warn('[CloudSync] Bootstrap check notice:', e);
      return false;
    }
  }

  /**
   * Subscribe to real-time updates for the current active school
   */
  public startRealtimeSync(schoolCode: string, listeners: CloudSyncListeners): void {
    this.stopRealtimeSync();
    this.setActiveSchoolCode(schoolCode);
    const code = this.getActiveSchoolCode();

    listeners.onSyncStatusChange?.('SYNCING', `Connexion Cloud [${code}]...`);

    try {
      // 1. Settings Listener
      const settingsDocRef = doc(db, `schools/${code}/settings`, 'config');
      const unsubSettings = onSnapshot(settingsDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SchoolSettings;
          listeners.onSettingsChange?.(data);
        }
      }, (err) => {
        console.warn('Settings sync error:', err);
        listeners.onSyncStatusChange?.('OFFLINE', 'Mode hors-ligne');
      });
      this.unsubscribers.push(unsubSettings);

      // 2. Students Collection
      const studentsCollRef = collection(db, `schools/${code}/students`);
      const unsubStudents = onSnapshot(studentsCollRef, (snapshot) => {
        const list: Student[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Student);
        });
        listeners.onStudentsChange?.(list);
        listeners.onSyncStatusChange?.('CONNECTED', `En direct avec [${code}]`);
      }, (err) => {
        console.warn('Students sync error:', err);
      });
      this.unsubscribers.push(unsubStudents);

      // 3. Classes Collection
      const classesCollRef = collection(db, `schools/${code}/classes`);
      const unsubClasses = onSnapshot(classesCollRef, (snapshot) => {
        const list: SchoolClass[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as SchoolClass);
        });
        listeners.onClassesChange?.(list);
      }, (err) => {
        console.warn('Classes sync error:', err);
      });
      this.unsubscribers.push(unsubClasses);

      // 4. Subjects Collection
      const subjectsCollRef = collection(db, `schools/${code}/subjects`);
      const unsubSubjects = onSnapshot(subjectsCollRef, (snapshot) => {
        const list: Subject[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Subject);
        });
        listeners.onSubjectsChange?.(list);
      }, (err) => {
        console.warn('Subjects sync error:', err);
      });
      this.unsubscribers.push(unsubSubjects);

      // 5. Teachers Collection
      const teachersCollRef = collection(db, `schools/${code}/teachers`);
      const unsubTeachers = onSnapshot(teachersCollRef, (snapshot) => {
        const list: Teacher[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Teacher);
        });
        listeners.onTeachersChange?.(list);
      }, (err) => {
        console.warn('Teachers sync error:', err);
      });
      this.unsubscribers.push(unsubTeachers);

      // 6. Grades Collection
      const gradesCollRef = collection(db, `schools/${code}/grades`);
      const unsubGrades = onSnapshot(gradesCollRef, (snapshot) => {
        const list: EvaluationGrade[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as EvaluationGrade);
        });
        listeners.onGradesChange?.(list);
      }, (err) => {
        console.warn('Grades sync error:', err);
      });
      this.unsubscribers.push(unsubGrades);

      // 7. Payments Collection - Realtime Instant Sync across Phone & PC
      const paymentsCollRef = collection(db, `schools/${code}/payments`);
      const unsubPayments = onSnapshot(paymentsCollRef, (snapshot) => {
        const list: Payment[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            receiptNumber: d.receiptNumber || `REC-${docSnap.id.slice(-4)}`,
            studentId: d.studentId || '',
            studentMatricule: d.studentMatricule || '',
            studentName: d.studentName || 'Élève',
            className: d.className || '',
            category: d.category || 'MENSUALITE',
            monthCovered: d.monthCovered || '',
            amountPaid: Number(d.amountPaid) || 0,
            expectedAmount: Number(d.expectedAmount) || 0,
            remainingAmount: Number(d.remainingAmount) || 0,
            paymentDate: d.paymentDate || '',
            method: d.method || 'ESPECES',
            referenceNumber: d.referenceNumber || '',
            cashierName: d.cashierName || 'Comptable',
            academicYear: d.academicYear || '2025-2026',
            notes: d.notes || ''
          } as Payment);
        });
        // Sort newest payments first by date, then receiptNumber or ID
        list.sort((a, b) => 
          (b.paymentDate || '').localeCompare(a.paymentDate || '') ||
          (b.receiptNumber || '').localeCompare(a.receiptNumber || '') ||
          (b.id || '').localeCompare(a.id || '')
        );
        listeners.onPaymentsChange?.(list);
      }, (err) => {
        console.warn('[CloudSync] Payments listener notice:', err);
      });
      this.unsubscribers.push(unsubPayments);

      // 8. Attendance Collection
      const attendanceCollRef = collection(db, `schools/${code}/attendance`);
      const unsubAttendance = onSnapshot(attendanceCollRef, (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as AttendanceRecord);
        });
        listeners.onAttendanceChange?.(list);
      }, (err) => {
        console.warn('Attendance sync error:', err);
      });
      this.unsubscribers.push(unsubAttendance);

      // 9. Expenses Collection
      const expensesCollRef = collection(db, `schools/${code}/expenses`);
      const unsubExpenses = onSnapshot(expensesCollRef, (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Expense);
        });
        list.sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
        listeners.onExpensesChange?.(list);
      }, (err) => {
        console.warn('Expenses sync error:', err);
      });
      this.unsubscribers.push(unsubExpenses);

      listeners.onSyncStatusChange?.('CONNECTED', `Synchronisé en direct avec [${code}]`);
    } catch (e) {
      console.error('Error starting realtime sync:', e);
      listeners.onSyncStatusChange?.('OFFLINE', 'Mode hors-ligne');
    }
  }

  public stopRealtimeSync(): void {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
    this.unsubscribers = [];
  }

  /**
   * Push an entire local database to Cloud Firestore for this school
   */
  public async pushAllDataToCloud(
    schoolCode: string,
    data: {
      settings: SchoolSettings;
      students: Student[];
      classes: SchoolClass[];
      subjects: Subject[];
      teachers: Teacher[];
      grades: EvaluationGrade[];
      payments: Payment[];
      attendance: AttendanceRecord[];
      expenses?: Expense[];
    }
  ): Promise<boolean> {
    try {
      const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();
      const batch = writeBatch(db);

      // 1. Settings
      const settingsRef = doc(db, `schools/${code}/settings`, 'config');
      batch.set(settingsRef, cleanForFirestore(data.settings), { merge: true });

      // 2. Students
      data.students.forEach((s) => {
        if (!s.id) return;
        const ref = doc(db, `schools/${code}/students`, s.id);
        batch.set(ref, cleanForFirestore(s), { merge: true });
      });

      // 3. Classes
      data.classes.forEach((c) => {
        if (!c.id) return;
        const ref = doc(db, `schools/${code}/classes`, c.id);
        batch.set(ref, cleanForFirestore(c), { merge: true });
      });

      // 4. Subjects
      data.subjects.forEach((subj) => {
        if (!subj.id) return;
        const ref = doc(db, `schools/${code}/subjects`, subj.id);
        batch.set(ref, cleanForFirestore(subj), { merge: true });
      });

      // 5. Teachers
      data.teachers.forEach((t) => {
        if (!t.id) return;
        const ref = doc(db, `schools/${code}/teachers`, t.id);
        batch.set(ref, cleanForFirestore(t), { merge: true });
      });

      // 6. Grades
      data.grades.forEach((g) => {
        if (!g.id) return;
        const ref = doc(db, `schools/${code}/grades`, g.id);
        batch.set(ref, cleanForFirestore(g), { merge: true });
      });

      // 7. Payments - guaranteed clean and complete
      data.payments.forEach((p) => {
        if (!p.id) return;
        const ref = doc(db, `schools/${code}/payments`, p.id);
        const cleanP = cleanForFirestore({
          ...p,
          monthCovered: p.monthCovered || '',
          referenceNumber: p.referenceNumber || '',
          notes: p.notes || '',
          amountPaid: Number(p.amountPaid) || 0,
          expectedAmount: Number(p.expectedAmount) || 0,
          remainingAmount: Number(p.remainingAmount) || 0,
          paymentDate: p.paymentDate || new Date().toISOString().split('T')[0],
          method: p.method || 'ESPECES',
          cashierName: p.cashierName || 'Comptable',
          academicYear: p.academicYear || '2025-2026'
        });
        batch.set(ref, cleanP, { merge: true });
      });

      // 8. Attendance
      data.attendance.forEach((att) => {
        if (!att.id) return;
        const ref = doc(db, `schools/${code}/attendance`, att.id);
        batch.set(ref, cleanForFirestore(att), { merge: true });
      });

      // 9. Expenses (if available)
      if (data.expenses && data.expenses.length > 0) {
        data.expenses.forEach((e) => {
          if (!e.id) return;
          const ref = doc(db, `schools/${code}/expenses`, e.id);
          batch.set(ref, cleanForFirestore(e), { merge: true });
        });
      }

      await batch.commit();

      // Update school directory metadata
      await setDoc(doc(db, 'school_directory', code), cleanForFirestore({
        schoolCode: code,
        schoolName: data.settings.schoolName || 'Établissement Scolaire',
        pinCode: data.settings.adminPassword || '00223',
        lastSyncAt: new Date().toISOString(),
        totalStudents: data.students.length,
        totalClasses: data.classes.length,
        totalPayments: data.payments.length
      }), { merge: true });

      return true;
    } catch (e) {
      console.error('Failed to push all data to cloud:', e);
      return false;
    }
  }

  // --- Dedicated Payment Realtime Cloud Sync ---
  public async syncPayment(payment: Payment, schoolCode?: string): Promise<boolean> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      if (!payment.id) return false;

      const docRef = doc(db, `schools/${code}/payments`, payment.id);
      const cleanData = cleanForFirestore({
        id: payment.id,
        receiptNumber: payment.receiptNumber || '',
        studentId: payment.studentId || '',
        studentMatricule: payment.studentMatricule || '',
        studentName: payment.studentName || 'Élève',
        className: payment.className || '',
        category: payment.category || 'MENSUALITE',
        monthCovered: payment.monthCovered || '',
        amountPaid: Number(payment.amountPaid) || 0,
        expectedAmount: Number(payment.expectedAmount) || 0,
        remainingAmount: Number(payment.remainingAmount) || 0,
        paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
        method: payment.method || 'ESPECES',
        referenceNumber: payment.referenceNumber || '',
        cashierName: payment.cashierName || 'Comptable',
        academicYear: payment.academicYear || '2025-2026',
        notes: payment.notes || '',
        updatedAt: new Date().toISOString()
      });

      await setDoc(docRef, cleanData, { merge: true });
      return true;
    } catch (e) {
      console.error(`[CloudSync] Error syncing payment ${payment.id} to cloud:`, e);
      return false;
    }
  }

  // --- Dedicated Expense Realtime Cloud Sync ---
  public async syncExpense(expense: Expense, schoolCode?: string): Promise<boolean> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      if (!expense.id) return false;

      const docRef = doc(db, `schools/${code}/expenses`, expense.id);
      const cleanData = cleanForFirestore({
        ...expense,
        amount: Number(expense.amount) || 0,
        updatedAt: new Date().toISOString()
      });

      await setDoc(docRef, cleanData, { merge: true });
      return true;
    } catch (e) {
      console.warn(`[CloudSync] Error syncing expense ${expense.id}:`, e);
      return false;
    }
  }

  /**
   * Fetch all cloud payments directly from Firestore for the given school
   */
  public async fetchAllCloudPayments(schoolCode?: string): Promise<Payment[]> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      const paymentsCollRef = collection(db, `schools/${code}/payments`);
      const snap = await getDocs(paymentsCollRef);
      const list: Payment[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          receiptNumber: d.receiptNumber || `REC-${docSnap.id.slice(-4)}`,
          studentId: d.studentId || '',
          studentMatricule: d.studentMatricule || '',
          studentName: d.studentName || 'Élève',
          className: d.className || '',
          category: d.category || 'MENSUALITE',
          monthCovered: d.monthCovered || '',
          amountPaid: Number(d.amountPaid) || 0,
          expectedAmount: Number(d.expectedAmount) || 0,
          remainingAmount: Number(d.remainingAmount) || 0,
          paymentDate: d.paymentDate || '',
          method: d.method || 'ESPECES',
          referenceNumber: d.referenceNumber || '',
          cashierName: d.cashierName || 'Comptable',
          academicYear: d.academicYear || '2025-2026',
          notes: d.notes || ''
        } as Payment);
      });
      list.sort((a, b) => 
        (b.paymentDate || '').localeCompare(a.paymentDate || '') ||
        (b.receiptNumber || '').localeCompare(a.receiptNumber || '') ||
        (b.id || '').localeCompare(a.id || '')
      );
      return list;
    } catch (e) {
      console.warn('[CloudSync] Error fetching cloud payments:', e);
      return [];
    }
  }

  // --- Cloud item level operations ---
  public async syncDoc<T extends { id: string }>(
    collectionName: string,
    item: T,
    schoolCode?: string
  ): Promise<void> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      const docRef = doc(db, `schools/${code}/${collectionName}`, item.id);
      const cleanData = cleanForFirestore(item);
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.warn(`Failed to sync document to ${collectionName}:`, e);
    }
  }

  public async deleteCloudDoc(
    collectionName: string,
    id: string,
    schoolCode?: string
  ): Promise<void> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      const docRef = doc(db, `schools/${code}/${collectionName}`, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn(`Failed to delete cloud document from ${collectionName}:`, e);
    }
  }

  public async clearCloudCollection(
    collectionName: string,
    schoolCode?: string
  ): Promise<void> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      const collRef = collection(db, `schools/${code}/${collectionName}`);
      const snap = await getDocs(collRef);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn(`Failed to clear cloud collection ${collectionName}:`, e);
    }
  }

  public async syncSettings(settings: SchoolSettings, schoolCode?: string): Promise<void> {
    try {
      const code = schoolCode || this.getActiveSchoolCode();
      const docRef = doc(db, `schools/${code}/settings`, 'config');
      await setDoc(docRef, cleanForFirestore(settings), { merge: true });
    } catch (e) {
      console.warn('Failed to sync settings to cloud:', e);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
