/**
 * SomaSikolo / KalanGest - Real-time Multi-tenant Multi-Device Synchronization Service
 * Enables seamless instant synchronization across all devices (PC, mobile, tablet)
 * using Server-Sent Events (SSE), HTTP Sync Engine, BroadcastChannel, and Cloud Firestore.
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
import { secureLocalStorage } from './secureStorage';
import { getPublicBaseUrl } from './urlService';

/**
 * Strips undefined values recursively so that serialization and Firestore never crash
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

// Generate unique device/tab id to filter out self-echoes
const DEVICE_CLIENT_ID = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

class CloudSyncService {
  private activeSchoolCode: string = '';
  private firestoreUnsubscribers: Unsubscribe[] = [];
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentListeners: CloudSyncListeners | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private sseReconnectTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.reconnectAll();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.currentListeners?.onSyncStatusChange?.('OFFLINE', 'Mode hors-ligne local');
      });
    }
  }

  public getActiveSchoolCode(): string {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('school') || urlParams.get('code') || urlParams.get('ecole');
        if (codeFromUrl) {
          const clean = codeFromUrl.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          if (clean) {
            this.activeSchoolCode = clean;
            secureLocalStorage.setItem('kalangest_cloud_school_code', clean);
            return clean;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!this.activeSchoolCode) {
      if (typeof window !== 'undefined') {
        this.activeSchoolCode = secureLocalStorage.getItem('kalangest_cloud_school_code') || 'ECOLE-PRINCIPALE';
      } else {
        this.activeSchoolCode = 'ECOLE-PRINCIPALE';
      }
    }
    return this.activeSchoolCode;
  }

  public getShareableLink(schoolCode?: string): string {
    const code = schoolCode || this.getActiveSchoolCode();
    const baseUrl = getPublicBaseUrl();
    return `${baseUrl}?school=${encodeURIComponent(code)}`;
  }

  public setActiveSchoolCode(code: string): void {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'ECOLE-PRINCIPALE';
    this.activeSchoolCode = cleanCode;
    if (typeof window !== 'undefined') {
      secureLocalStorage.setItem('kalangest_cloud_school_code', cleanCode);
    }
  }

  /**
   * Connect or register school
   */
  public async connectOrRegisterSchool(
    schoolCode: string,
    schoolName: string,
    pinCode: string = '00223'
  ): Promise<boolean> {
    try {
      const cleanCode = schoolCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!cleanCode) return false;

      this.setActiveSchoolCode(cleanCode);

      // Register with Server Sync
      try {
        await fetch('/api/sync/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolCode: cleanCode,
            mutationType: 'SYNC_SETTINGS',
            payload: { schoolName, adminPassword: pinCode, schoolCode: cleanCode },
            senderId: DEVICE_CLIENT_ID
          })
        });
      } catch {}

      // Try Firestore directory in parallel
      try {
        const schoolRef = doc(db, 'school_directory', cleanCode);
        await setDoc(schoolRef, {
          schoolCode: cleanCode,
          schoolName: schoolName || 'Établissement Scolaire',
          pinCode: pinCode || '00223',
          lastSyncAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        // Firestore permission notice, handled gracefully
      }

      return true;
    } catch (e) {
      console.error('Failed to register/connect school:', e);
      return false;
    }
  }

  /**
   * Check if server/cloud database has data for this school; if empty, initialize with local seed.
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
    const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();

    try {
      // 1. Bootstrap Server Store
      const response = await fetch('/api/sync/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolCode: code, seedData })
      });
      if (response.ok) {
        const resJson = await response.json();
        // If server already had fresh data, update current listeners with it
        if (!resJson.bootstrapped && resJson.currentStore) {
          this.applyFullServerStore(resJson.currentStore);
        }
      }
    } catch (e) {
      console.info('[SyncService] Local server bootstrap ping:', e);
    }

    // 2. Also attempt Firestore bootstrap in parallel if available
    try {
      const settingsRef = doc(db, `schools/${code}/settings`, 'config');
      const snap = await getDoc(settingsRef);
      if (!snap.exists()) {
        await this.pushAllDataToCloud(code, seedData);
      }
    } catch (e) {
      // Ignore Firestore permission errors
    }

    return true;
  }

  /**
   * Start real-time sync across all devices (PC, mobile, tablet)
   */
  public startRealtimeSync(schoolCode: string, listeners: CloudSyncListeners): void {
    this.stopRealtimeSync();
    this.setActiveSchoolCode(schoolCode);
    const code = this.getActiveSchoolCode();
    this.currentListeners = listeners;

    listeners.onSyncStatusChange?.('SYNCING', `Connexion en cours [${code}]...`);

    // 1. Fetch latest server state immediately
    this.fetchServerState(code);

    // 2. Connect to Server-Sent Events (SSE) for instant cross-device updates
    this.connectSSE(code);

    // 3. Connect to BroadcastChannel for instant intra-browser tab sync
    this.connectBroadcastChannel(code);

    // 4. Connect Firestore listeners if available
    this.connectFirestoreListeners(code);
  }

  private fetchServerState(code: string): void {
    fetch(`/api/sync/state?school=${encodeURIComponent(code)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.store) {
          this.applyFullServerStore(data.store);
          this.currentListeners?.onSyncStatusChange?.('CONNECTED', `En direct avec [${code}]`);
        }
      })
      .catch(err => {
        console.info('[SyncService] Server state fetch notice:', err);
      });
  }

  private applyFullServerStore(store: any): void {
    if (!this.currentListeners || !store) return;

    if (store.settings) {
      this.currentListeners.onSettingsChange?.(store.settings);
    }
    if (Array.isArray(store.students)) {
      this.currentListeners.onStudentsChange?.(store.students);
    }
    if (Array.isArray(store.classes)) {
      this.currentListeners.onClassesChange?.(store.classes);
    }
    if (Array.isArray(store.subjects)) {
      this.currentListeners.onSubjectsChange?.(store.subjects);
    }
    if (Array.isArray(store.teachers)) {
      this.currentListeners.onTeachersChange?.(store.teachers);
    }
    if (Array.isArray(store.grades)) {
      this.currentListeners.onGradesChange?.(store.grades);
    }
    if (Array.isArray(store.payments)) {
      this.currentListeners.onPaymentsChange?.(store.payments);
    }
    if (Array.isArray(store.attendance)) {
      this.currentListeners.onAttendanceChange?.(store.attendance);
    }
    if (Array.isArray(store.expenses)) {
      this.currentListeners.onExpensesChange?.(store.expenses);
    }
  }

  private connectSSE(code: string): void {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(`/api/sync/events?school=${encodeURIComponent(code)}`);

      this.eventSource.addEventListener('connected', (e: MessageEvent) => {
        this.currentListeners?.onSyncStatusChange?.('CONNECTED', `En direct avec [${code}] (Multi-appareils actif)`);
      });

      this.eventSource.addEventListener('mutation', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          // Ignore echo from this exact device/tab
          if (data.senderId === DEVICE_CLIENT_ID) return;

          this.handleIncomingMutation(data.mutationType, data.payload, code);
          this.currentListeners?.onSyncStatusChange?.('CONNECTED', `En direct avec [${code}]`);
        } catch (err) {
          console.warn('[SyncService] Error parsing SSE mutation:', err);
        }
      });

      this.eventSource.addEventListener('state_updated', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.senderId === DEVICE_CLIENT_ID) return;
          if (data.store) {
            this.applyFullServerStore(data.store);
          }
        } catch {}
      });

      this.eventSource.addEventListener('state_reset', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.store) {
            this.applyFullServerStore(data.store);
          }
        } catch {}
      });

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto reconnect after 3 seconds
        clearTimeout(this.sseReconnectTimeout);
        this.sseReconnectTimeout = setTimeout(() => {
          if (this.isOnline) {
            this.connectSSE(code);
          }
        }, 3000);
      };
    } catch (e) {
      console.warn('[SyncService] SSE init error:', e);
    }
  }

  private connectBroadcastChannel(code: string): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      this.broadcastChannel = new BroadcastChannel(`somasikolo_sync_${code}`);
      this.broadcastChannel.onmessage = (event) => {
        const { mutationType, payload, senderId } = event.data || {};
        if (senderId === DEVICE_CLIENT_ID) return;
        this.handleIncomingMutation(mutationType, payload, code);
      };
    } catch {}
  }

  private handleIncomingMutation(mutationType: string, payload: any, code: string): void {
    if (!this.currentListeners || !payload) return;

    switch (mutationType) {
      case 'SYNC_SETTINGS':
        this.currentListeners.onSettingsChange?.(payload);
        break;

      case 'SYNC_PAYMENT':
        // Re-fetch all fresh payments from server to ensure perfect list ordering
        this.fetchAllCloudPayments(code).then(payments => {
          if (payments.length > 0) {
            this.currentListeners?.onPaymentsChange?.(payments);
          }
        });
        break;

      case 'SYNC_EXPENSE':
      case 'DELETE_EXPENSE':
        fetch(`/api/sync/state?school=${encodeURIComponent(code)}`)
          .then(r => r.json())
          .then(res => {
            if (res.store?.expenses) {
              this.currentListeners?.onExpensesChange?.(res.store.expenses);
            }
          });
        break;

      case 'SYNC_DOC':
      case 'DELETE_DOC':
      case 'CLEAR_COLLECTION':
        // Re-fetch state for collection
        fetch(`/api/sync/state?school=${encodeURIComponent(code)}`)
          .then(r => r.json())
          .then(res => {
            if (res.store) {
              this.applyFullServerStore(res.store);
            }
          });
        break;
    }
  }

  private connectFirestoreListeners(code: string): void {
    try {
      // 1. Settings Listener
      const settingsDocRef = doc(db, `schools/${code}/settings`, 'config');
      const unsubSettings = onSnapshot(settingsDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SchoolSettings;
          this.currentListeners?.onSettingsChange?.(data);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubSettings);

      // 2. Students Collection
      const studentsCollRef = collection(db, `schools/${code}/students`);
      const unsubStudents = onSnapshot(studentsCollRef, (snapshot) => {
        const list: Student[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Student);
        });
        if (list.length > 0) {
          this.currentListeners?.onStudentsChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubStudents);

      // 3. Classes Collection
      const classesCollRef = collection(db, `schools/${code}/classes`);
      const unsubClasses = onSnapshot(classesCollRef, (snapshot) => {
        const list: SchoolClass[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as SchoolClass);
        });
        if (list.length > 0) {
          this.currentListeners?.onClassesChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubClasses);

      // 4. Subjects Collection
      const subjectsCollRef = collection(db, `schools/${code}/subjects`);
      const unsubSubjects = onSnapshot(subjectsCollRef, (snapshot) => {
        const list: Subject[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Subject);
        });
        if (list.length > 0) {
          this.currentListeners?.onSubjectsChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubSubjects);

      // 5. Teachers Collection
      const teachersCollRef = collection(db, `schools/${code}/teachers`);
      const unsubTeachers = onSnapshot(teachersCollRef, (snapshot) => {
        const list: Teacher[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Teacher);
        });
        if (list.length > 0) {
          this.currentListeners?.onTeachersChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubTeachers);

      // 6. Grades Collection
      const gradesCollRef = collection(db, `schools/${code}/grades`);
      const unsubGrades = onSnapshot(gradesCollRef, (snapshot) => {
        const list: EvaluationGrade[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as EvaluationGrade);
        });
        if (list.length > 0) {
          this.currentListeners?.onGradesChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubGrades);

      // 7. Payments Collection
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
        if (list.length > 0) {
          list.sort((a, b) => 
            (b.paymentDate || '').localeCompare(a.paymentDate || '') ||
            (b.receiptNumber || '').localeCompare(a.receiptNumber || '') ||
            (b.id || '').localeCompare(a.id || '')
          );
          this.currentListeners?.onPaymentsChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubPayments);

      // 8. Attendance Collection
      const attendanceCollRef = collection(db, `schools/${code}/attendance`);
      const unsubAttendance = onSnapshot(attendanceCollRef, (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as AttendanceRecord);
        });
        if (list.length > 0) {
          this.currentListeners?.onAttendanceChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubAttendance);

      // 9. Expenses Collection
      const expensesCollRef = collection(db, `schools/${code}/expenses`);
      const unsubExpenses = onSnapshot(expensesCollRef, (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Expense);
        });
        if (list.length > 0) {
          list.sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
          this.currentListeners?.onExpensesChange?.(list);
        }
      }, () => {});
      this.firestoreUnsubscribers.push(unsubExpenses);
    } catch {}
  }

  private reconnectAll(): void {
    const code = this.getActiveSchoolCode();
    if (this.currentListeners) {
      this.fetchServerState(code);
      this.connectSSE(code);
    }
  }

  public stopRealtimeSync(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    clearTimeout(this.sseReconnectTimeout);
    this.firestoreUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
    this.firestoreUnsubscribers = [];
  }

  /**
   * Broadcast a mutation across the network to all other devices in real-time
   */
  private async dispatchMutation(mutationType: string, payload: any, schoolCode?: string): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();

    // 1. Intra-browser tab broadcast
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ mutationType, payload, senderId: DEVICE_CLIENT_ID });
      }
    } catch {}

    // 2. Server API mutation for cross-device broadcast
    try {
      await fetch('/api/sync/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: code,
          mutationType,
          payload,
          senderId: DEVICE_CLIENT_ID
        })
      });
    } catch (e) {
      console.warn('[SyncService] Server mutation post notice:', e);
    }
  }

  /**
   * Push an entire local database to Cloud & Server for this school
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
    const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();

    // 1. Send to server sync store
    try {
      await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolCode: code, data, senderId: DEVICE_CLIENT_ID })
      });
    } catch (e) {
      console.warn('[SyncService] Server push notice:', e);
    }

    // 2. Try Firestore batch write
    try {
      const batch = writeBatch(db);

      const settingsRef = doc(db, `schools/${code}/settings`, 'config');
      batch.set(settingsRef, cleanForFirestore(data.settings), { merge: true });

      data.students.forEach((s) => {
        if (!s.id) return;
        batch.set(doc(db, `schools/${code}/students`, s.id), cleanForFirestore(s), { merge: true });
      });

      data.classes.forEach((c) => {
        if (!c.id) return;
        batch.set(doc(db, `schools/${code}/classes`, c.id), cleanForFirestore(c), { merge: true });
      });

      data.subjects.forEach((subj) => {
        if (!subj.id) return;
        batch.set(doc(db, `schools/${code}/subjects`, subj.id), cleanForFirestore(subj), { merge: true });
      });

      data.teachers.forEach((t) => {
        if (!t.id) return;
        batch.set(doc(db, `schools/${code}/teachers`, t.id), cleanForFirestore(t), { merge: true });
      });

      data.grades.forEach((g) => {
        if (!g.id) return;
        batch.set(doc(db, `schools/${code}/grades`, g.id), cleanForFirestore(g), { merge: true });
      });

      data.payments.forEach((p) => {
        if (!p.id) return;
        batch.set(doc(db, `schools/${code}/payments`, p.id), cleanForFirestore(p), { merge: true });
      });

      data.attendance.forEach((att) => {
        if (!att.id) return;
        batch.set(doc(db, `schools/${code}/attendance`, att.id), cleanForFirestore(att), { merge: true });
      });

      if (data.expenses && data.expenses.length > 0) {
        data.expenses.forEach((e) => {
          if (!e.id) return;
          batch.set(doc(db, `schools/${code}/expenses`, e.id), cleanForFirestore(e), { merge: true });
        });
      }

      await batch.commit();

      await setDoc(doc(db, 'school_directory', code), cleanForFirestore({
        schoolCode: code,
        schoolName: data.settings.schoolName || 'Établissement Scolaire',
        pinCode: data.settings.adminPassword || '00223',
        lastSyncAt: new Date().toISOString(),
        totalStudents: data.students.length,
        totalClasses: data.classes.length,
        totalPayments: data.payments.length
      }), { merge: true });
    } catch (e) {
      // Handled gracefully
    }

    return true;
  }

  // --- Dedicated Payment Realtime Cloud Sync ---
  public async syncPayment(payment: Payment, schoolCode?: string): Promise<boolean> {
    const code = schoolCode || this.getActiveSchoolCode();
    if (!payment.id) return false;

    const cleanPayment = cleanForFirestore({
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

    // 1. Broadcast mutation to all devices via server
    await this.dispatchMutation('SYNC_PAYMENT', cleanPayment, code);

    // 2. Also try Firestore
    try {
      const docRef = doc(db, `schools/${code}/payments`, payment.id);
      await setDoc(docRef, cleanPayment, { merge: true });
    } catch {}

    return true;
  }

  // --- Dedicated Expense Realtime Cloud Sync ---
  public async syncExpense(expense: Expense, schoolCode?: string): Promise<boolean> {
    const code = schoolCode || this.getActiveSchoolCode();
    if (!expense.id) return false;

    const cleanData = cleanForFirestore({
      ...expense,
      amount: Number(expense.amount) || 0,
      updatedAt: new Date().toISOString()
    });

    await this.dispatchMutation('SYNC_EXPENSE', cleanData, code);

    try {
      const docRef = doc(db, `schools/${code}/expenses`, expense.id);
      await setDoc(docRef, cleanData, { merge: true });
    } catch {}

    return true;
  }

  public async deleteExpense(expenseId: string, schoolCode?: string): Promise<boolean> {
    const code = schoolCode || this.getActiveSchoolCode();
    if (!expenseId) return false;

    await this.dispatchMutation('DELETE_EXPENSE', { id: expenseId }, code);

    try {
      const docRef = doc(db, `schools/${code}/expenses`, expenseId);
      await deleteDoc(docRef);
    } catch {}

    return true;
  }

  /**
   * Fetch all cloud payments directly for the given school
   */
  public async fetchAllCloudPayments(schoolCode?: string): Promise<Payment[]> {
    const code = schoolCode || this.getActiveSchoolCode();

    // 1. Try server state first
    try {
      const res = await fetch(`/api/sync/state?school=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.store?.payments && Array.isArray(data.store.payments)) {
          return data.store.payments;
        }
      }
    } catch {}

    // 2. Fallback to Firestore
    try {
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
      return [];
    }
  }

  // --- Cloud item level operations ---
  public async syncDoc<T extends { id: string }>(
    collectionName: string,
    item: T,
    schoolCode?: string
  ): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();
    const cleanData = cleanForFirestore(item);

    await this.dispatchMutation('SYNC_DOC', { collectionName, item: cleanData }, code);

    try {
      const docRef = doc(db, `schools/${code}/${collectionName}`, item.id);
      await setDoc(docRef, cleanData, { merge: true });
    } catch {}
  }

  public async deleteCloudDoc(
    collectionName: string,
    id: string,
    schoolCode?: string
  ): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();

    await this.dispatchMutation('DELETE_DOC', { collectionName, id }, code);

    try {
      const docRef = doc(db, `schools/${code}/${collectionName}`, id);
      await deleteDoc(docRef);
    } catch {}
  }

  public async clearCloudCollection(
    collectionName: string,
    schoolCode?: string
  ): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();

    await this.dispatchMutation('CLEAR_COLLECTION', { collectionName }, code);

    try {
      const collRef = collection(db, `schools/${code}/${collectionName}`);
      const snap = await getDocs(collRef);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {}
  }

  public async syncSettings(settings: SchoolSettings, schoolCode?: string): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();
    const cleanData = cleanForFirestore(settings);

    await this.dispatchMutation('SYNC_SETTINGS', cleanData, code);

    try {
      const docRef = doc(db, `schools/${code}/settings`, 'config');
      await setDoc(docRef, cleanData, { merge: true });
    } catch {}
  }
}

export const cloudSyncService = new CloudSyncService();
