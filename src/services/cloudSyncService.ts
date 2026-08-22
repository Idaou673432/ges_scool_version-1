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
  SchoolSettings,
  AuditLog,
  AttendanceRecord
} from '../types';

export interface CloudSyncListeners {
  onSettingsChange?: (settings: SchoolSettings) => void;
  onStudentsChange?: (students: Student[]) => void;
  onClassesChange?: (classes: SchoolClass[]) => void;
  onSubjectsChange?: (subjects: Subject[]) => void;
  onTeachersChange?: (teachers: Teacher[]) => void;
  onGradesChange?: (grades: EvaluationGrade[]) => void;
  onPaymentsChange?: (payments: Payment[]) => void;
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
    if (!this.activeSchoolCode) {
      if (typeof localStorage !== 'undefined') {
        this.activeSchoolCode = localStorage.getItem('kalangest_cloud_school_code') || 'ECOLE-PRINCIPALE';
      } else {
        this.activeSchoolCode = 'ECOLE-PRINCIPALE';
      }
    }
    return this.activeSchoolCode;
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

      // 7. Payments Collection
      const paymentsCollRef = collection(db, `schools/${code}/payments`);
      const unsubPayments = onSnapshot(paymentsCollRef, (snapshot) => {
        const list: Payment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Payment);
        });
        listeners.onPaymentsChange?.(list);
      }, (err) => {
        console.warn('Payments sync error:', err);
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
    }
  ): Promise<boolean> {
    try {
      const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();
      const batch = writeBatch(db);

      // 1. Settings
      const settingsRef = doc(db, `schools/${code}/settings`, 'config');
      batch.set(settingsRef, data.settings, { merge: true });

      // 2. Students
      data.students.forEach((s) => {
        if (!s.id) return;
        const ref = doc(db, `schools/${code}/students`, s.id);
        batch.set(ref, s, { merge: true });
      });

      // 3. Classes
      data.classes.forEach((c) => {
        if (!c.id) return;
        const ref = doc(db, `schools/${code}/classes`, c.id);
        batch.set(ref, c, { merge: true });
      });

      // 4. Subjects
      data.subjects.forEach((subj) => {
        if (!subj.id) return;
        const ref = doc(db, `schools/${code}/subjects`, subj.id);
        batch.set(ref, subj, { merge: true });
      });

      // 5. Teachers
      data.teachers.forEach((t) => {
        if (!t.id) return;
        const ref = doc(db, `schools/${code}/teachers`, t.id);
        batch.set(ref, t, { merge: true });
      });

      // 6. Grades
      data.grades.forEach((g) => {
        if (!g.id) return;
        const ref = doc(db, `schools/${code}/grades`, g.id);
        batch.set(ref, g, { merge: true });
      });

      // 7. Payments
      data.payments.forEach((p) => {
        if (!p.id) return;
        const ref = doc(db, `schools/${code}/payments`, p.id);
        batch.set(ref, p, { merge: true });
      });

      // 8. Attendance
      data.attendance.forEach((att) => {
        if (!att.id) return;
        const ref = doc(db, `schools/${code}/attendance`, att.id);
        batch.set(ref, att, { merge: true });
      });

      await batch.commit();

      // Update school directory metadata
      await setDoc(doc(db, 'school_directory', code), {
        schoolCode: code,
        schoolName: data.settings.schoolName || 'Établissement Scolaire',
        pinCode: data.settings.adminPassword || '00223',
        lastSyncAt: new Date().toISOString(),
        totalStudents: data.students.length,
        totalClasses: data.classes.length
      }, { merge: true });

      return true;
    } catch (e) {
      console.error('Failed to push all data to cloud:', e);
      return false;
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
      await setDoc(docRef, item, { merge: true });
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
      await setDoc(docRef, settings, { merge: true });
    } catch (e) {
      console.warn('Failed to sync settings to cloud:', e);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
