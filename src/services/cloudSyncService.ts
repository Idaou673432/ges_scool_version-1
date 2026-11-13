/**
 * SomaSikolo / KalanGest - Real-time Multi-tenant Multi-Device Synchronization Service
 * Permanent persistence backed by Cloud Firestore, Server JSON Store + SSE, BroadcastChannel, and Encrypted LocalStorage.
 */

import {
  collection,
  doc,
  setDoc,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Student,
  SchoolClass,
  Subject,
  Teacher,
  EvaluationGrade,
  Payment,
  Expense,
  DailyCashClosure,
  SchoolSettings,
  User,
  AuditLog,
  AttendanceRecord,
  ExamSession,
  ExamSlot
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

export interface FullSchoolSeedPayload {
  settings: SchoolSettings;
  users?: User[];
  students: Student[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  grades: EvaluationGrade[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  expenses?: Expense[];
  cash_closures?: DailyCashClosure[];
  exam_sessions?: ExamSession[];
  exam_slots?: ExamSlot[];
}

export interface CloudSyncListeners {
  onSettingsChange?: (settings: SchoolSettings) => void;
  onUsersChange?: (users: User[]) => void;
  onStudentsChange?: (students: Student[]) => void;
  onClassesChange?: (classes: SchoolClass[]) => void;
  onSubjectsChange?: (subjects: Subject[]) => void;
  onTeachersChange?: (teachers: Teacher[]) => void;
  onGradesChange?: (grades: EvaluationGrade[]) => void;
  onPaymentsChange?: (payments: Payment[]) => void;
  onExpensesChange?: (expenses: Expense[]) => void;
  onClosuresChange?: (closures: DailyCashClosure[]) => void;
  onAttendanceChange?: (attendance: AttendanceRecord[]) => void;
  onExamSessionsChange?: (sessions: ExamSession[]) => void;
  onExamSlotsChange?: (slots: ExamSlot[]) => void;
  onAuditLogsChange?: (logs: AuditLog[]) => void;
  onSyncStatusChange?: (status: 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'ERROR', msg?: string) => void;
}

const DEVICE_CLIENT_ID = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
const USER_DATA_FLAG_PREFIX = 'kalangest_has_user_data_';

class CloudSyncService {
  private activeSchoolCode: string = '';
  private firestoreUnsubscribers: Unsubscribe[] = [];
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentListeners: CloudSyncListeners | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private sseReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private firestoreHydratedCode: string | null = null;

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

  public markHasUserData(schoolCode?: string): void {
    const code = schoolCode || this.getActiveSchoolCode();
    try {
      secureLocalStorage.setItem(`${USER_DATA_FLAG_PREFIX}${code}`, 'true');
    } catch {}
  }

  public hasLocalUserData(schoolCode?: string): boolean {
    const code = schoolCode || this.getActiveSchoolCode();
    try {
      return secureLocalStorage.getItem(`${USER_DATA_FLAG_PREFIX}${code}`) === 'true';
    } catch {
      return false;
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
      } catch {
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
        handleFirestoreError(e, OperationType.WRITE, `school_directory/${cleanCode}`);
      }

      return true;
    } catch (e) {
      console.error('Failed to register/connect school:', e);
      return false;
    }
  }

  /**
   * Commit array of Firestore write operations safely in chunks of max 350 ops (below Firestore's 500-op batch cap)
   */
  private async commitInChunks(
    operations: Array<{ ref: ReturnType<typeof doc>; data: any }>
  ): Promise<void> {
    const CHUNK_SIZE = 350;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const slice = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of slice) {
        batch.set(op.ref, op.data, { merge: true });
      }
      await batch.commit();
    }
  }

  /**
   * Fetch all permanent data from Cloud Firestore for the given school.
   * Explicitly separates FOUND, EMPTY, and ERROR so a read error never triggers an accidental factory-seed overwrite.
   */
  private async fetchAllFromFirestore(
    code: string
  ): Promise<
    | { status: 'FOUND'; data: Partial<FullSchoolSeedPayload> }
    | { status: 'EMPTY' }
    | { status: 'ERROR' }
  > {
    try {
      const settingsSnap = await getDocFromServer(doc(db, `schools/${code}/settings`, 'config'));

      const [
        usersSnap,
        studentsSnap,
        classesSnap,
        subjectsSnap,
        teachersSnap,
        gradesSnap,
        paymentsSnap,
        expensesSnap,
        closuresSnap,
        attendanceSnap,
        examSessionsSnap,
        examSlotsSnap
      ] = await Promise.all([
        getDocs(collection(db, `schools/${code}/users`)),
        getDocs(collection(db, `schools/${code}/students`)),
        getDocs(collection(db, `schools/${code}/classes`)),
        getDocs(collection(db, `schools/${code}/subjects`)),
        getDocs(collection(db, `schools/${code}/teachers`)),
        getDocs(collection(db, `schools/${code}/grades`)),
        getDocs(collection(db, `schools/${code}/payments`)),
        getDocs(collection(db, `schools/${code}/expenses`)),
        getDocs(collection(db, `schools/${code}/cash_closures`)),
        getDocs(collection(db, `schools/${code}/attendance`)),
        getDocs(collection(db, `schools/${code}/exam_sessions`)),
        getDocs(collection(db, `schools/${code}/exam_slots`))
      ]);

      const hasAnyCloudDocs =
        settingsSnap.exists() ||
        !usersSnap.empty ||
        !studentsSnap.empty ||
        !classesSnap.empty ||
        !subjectsSnap.empty ||
        !teachersSnap.empty ||
        !gradesSnap.empty ||
        !paymentsSnap.empty ||
        !expensesSnap.empty ||
        !closuresSnap.empty ||
        !attendanceSnap.empty ||
        !examSessionsSnap.empty ||
        !examSlotsSnap.empty;

      if (!hasAnyCloudDocs) {
        return { status: 'EMPTY' };
      }

      const mapSnap = <T,>(snap: Awaited<ReturnType<typeof getDocs>>): T[] => {
        const arr: T[] = [];
        snap.forEach(d => arr.push({ ...(d.data() as Record<string, any>), id: d.id } as T));
        return arr;
      };

      const payments = mapSnap<Payment>(paymentsSnap).sort((a, b) =>
        (b.paymentDate || '').localeCompare(a.paymentDate || '') ||
        (b.receiptNumber || '').localeCompare(a.receiptNumber || '') ||
        (b.id || '').localeCompare(a.id || '')
      );
      const expenses = mapSnap<Expense>(expensesSnap).sort((a, b) =>
        (b.expenseDate || '').localeCompare(a.expenseDate || '')
      );
      const closures = mapSnap<DailyCashClosure>(closuresSnap).sort((a, b) =>
        (b.date || '').localeCompare(a.date || '')
      );

      this.firestoreHydratedCode = code;
      this.markHasUserData(code);

      return {
        status: 'FOUND',
        data: {
          settings: settingsSnap.exists() ? (settingsSnap.data() as SchoolSettings) : undefined,
          users: mapSnap<User>(usersSnap),
          students: mapSnap<Student>(studentsSnap),
          classes: mapSnap<SchoolClass>(classesSnap),
          subjects: mapSnap<Subject>(subjectsSnap),
          teachers: mapSnap<Teacher>(teachersSnap),
          grades: mapSnap<EvaluationGrade>(gradesSnap),
          payments,
          expenses,
          cash_closures: closures,
          attendance: mapSnap<AttendanceRecord>(attendanceSnap),
          exam_sessions: mapSnap<ExamSession>(examSessionsSnap),
          exam_slots: mapSnap<ExamSlot>(examSlotsSnap)
        }
      };
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `schools/${code}`);
      return { status: 'ERROR' };
    }
  }

  /**
   * Check Cloud Firestore & Node Server on startup so existing permanent database records
   * are ALWAYS preserved across code updates, Git pushes, and restarts.
   */
  public async bootstrapCloudIfEmpty(
    schoolCode: string,
    seedData: FullSchoolSeedPayload
  ): Promise<boolean> {
    const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();

    // 1. Check permanent Cloud Firestore first
    const firestoreResult = await this.fetchAllFromFirestore(code);
    if (firestoreResult.status === 'FOUND') {
      const firestoreData = firestoreResult.data;
      this.applyFullServerStore(firestoreData);
      // Only heal the Node server store if the server is currently on factory seed
      try {
        const stateRes = await fetch(`/api/sync/state?school=${encodeURIComponent(code)}`);
        const stateJson = stateRes.ok ? await stateRes.json() : null;
        if (!stateJson?.store || stateJson.store.isSeed === true) {
          await fetch('/api/sync/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schoolCode: code,
              data: firestoreData,
              senderId: DEVICE_CLIENT_ID
            })
          });
        }
      } catch {}
      this.currentListeners?.onSyncStatusChange?.('CONNECTED', `Données permanentes restaurées [${code}]`);
      return true;
    }

    // 2. Consult local/Node server store (without overwriting real persisted server data)
    let authoritativeData: FullSchoolSeedPayload = seedData;
    try {
      const response = await fetch('/api/sync/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: code,
          seedData
        })
      });
      if (response.ok) {
        const resJson = await response.json();
        if (!resJson.bootstrapped && resJson.currentStore && !resJson.currentStore.isSeed) {
          this.applyFullServerStore(resJson.currentStore);
          authoritativeData = {
            settings: resJson.currentStore.settings || seedData.settings,
            users: resJson.currentStore.users || seedData.users,
            students: resJson.currentStore.students || seedData.students,
            classes: resJson.currentStore.classes || seedData.classes,
            subjects: resJson.currentStore.subjects || seedData.subjects,
            teachers: resJson.currentStore.teachers || seedData.teachers,
            grades: resJson.currentStore.grades || seedData.grades,
            payments: resJson.currentStore.payments || seedData.payments,
            attendance: resJson.currentStore.attendance || seedData.attendance,
            expenses: resJson.currentStore.expenses || seedData.expenses,
            cash_closures: resJson.currentStore.cash_closures || seedData.cash_closures,
            exam_sessions: resJson.currentStore.exam_sessions || seedData.exam_sessions,
            exam_slots: resJson.currentStore.exam_slots || seedData.exam_slots
          };
        }
      }
    } catch (e) {
      console.info('[SyncService] Local server bootstrap ping:', e);
    }

    // 3. CRITICAL PROTECTION: Only seed Firestore when confirmed genuinely EMPTY (never on ERROR!)
    if (firestoreResult.status === 'EMPTY') {
      await this.pushAllDataToCloud(code, authoritativeData);
      this.firestoreHydratedCode = code;
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

    this.fetchServerState(code);
    this.connectSSE(code);
    this.connectBroadcastChannel(code);
    this.connectFirestoreListeners(code);
  }

  private fetchServerState(code: string): void {
    fetch(`/api/sync/state?school=${encodeURIComponent(code)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.store) {
          // NEVER overwrite real Firestore or local user data with a restarted server's factory seed!
          if (data.store.isSeed && (this.firestoreHydratedCode === code || this.hasLocalUserData(code))) {
            return;
          }
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
    if (Array.isArray(store.users) && store.users.length > 0) {
      this.currentListeners.onUsersChange?.(store.users);
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
    if (Array.isArray(store.cash_closures)) {
      this.currentListeners.onClosuresChange?.(store.cash_closures);
    }
    if (Array.isArray(store.exam_sessions)) {
      try {
        secureLocalStorage.setJSON('soma_exam_sessions', store.exam_sessions);
        window.dispatchEvent(new CustomEvent('soma_exam_updated'));
      } catch {}
      this.currentListeners.onExamSessionsChange?.(store.exam_sessions);
    }
    if (Array.isArray(store.exam_slots)) {
      try {
        secureLocalStorage.setJSON('soma_exam_slots', store.exam_slots);
        window.dispatchEvent(new CustomEvent('soma_exam_updated'));
      } catch {}
      this.currentListeners.onExamSlotsChange?.(store.exam_slots);
    }
  }

  private connectSSE(code: string): void {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(`/api/sync/events?school=${encodeURIComponent(code)}`);

      this.eventSource.addEventListener('connected', () => {
        this.currentListeners?.onSyncStatusChange?.('CONNECTED', `En direct avec [${code}] (Multi-appareils actif)`);
      });

      this.eventSource.addEventListener('mutation', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
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
          if (data.senderId === DEVICE_CLIENT_ID) return;
          if (data.store && !data.store.isSeed) {
            this.applyFullServerStore(data.store);
          }
        } catch {}
      });

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        if (this.sseReconnectTimeout) clearTimeout(this.sseReconnectTimeout);
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
        this.fetchAllCloudPayments(code).then(payments => {
          this.currentListeners?.onPaymentsChange?.(payments);
        });
        break;

      case 'SYNC_EXPENSE':
      case 'DELETE_EXPENSE':
        fetch(`/api/sync/state?school=${encodeURIComponent(code)}`)
          .then(r => r.json())
          .then(res => {
            if (Array.isArray(res.store?.expenses)) {
              this.currentListeners?.onExpensesChange?.(res.store.expenses);
            }
          });
        break;

      case 'SYNC_DOC':
      case 'DELETE_DOC':
      case 'CLEAR_COLLECTION':
        fetch(`/api/sync/state?school=${encodeURIComponent(code)}`)
          .then(r => r.json())
          .then(res => {
            if (res.store && !res.store.isSeed) {
              this.applyFullServerStore(res.store);
            }
          });
        break;
    }
  }

  private connectFirestoreListeners(code: string): void {
    try {
      // 1. Settings Listener
      const settingsPath = `schools/${code}/settings`;
      const settingsDocRef = doc(db, settingsPath, 'config');
      const unsubSettings = onSnapshot(settingsDocRef, (snapshot) => {
        if (snapshot.exists()) {
          this.firestoreHydratedCode = code;
          this.markHasUserData(code);
          const data = snapshot.data() as SchoolSettings;
          this.currentListeners?.onSettingsChange?.(data);
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `${settingsPath}/config`));
      this.firestoreUnsubscribers.push(unsubSettings);

      // 2. Users Collection
      const usersPath = `schools/${code}/users`;
      const unsubUsers = onSnapshot(collection(db, usersPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: User[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as User);
        });
        if (list.length > 0) {
          this.currentListeners?.onUsersChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, usersPath));
      this.firestoreUnsubscribers.push(unsubUsers);

      // 3. Students Collection
      const studentsPath = `schools/${code}/students`;
      const unsubStudents = onSnapshot(collection(db, studentsPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: Student[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Student);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          this.currentListeners?.onStudentsChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, studentsPath));
      this.firestoreUnsubscribers.push(unsubStudents);

      // 4. Classes Collection
      const classesPath = `schools/${code}/classes`;
      const unsubClasses = onSnapshot(collection(db, classesPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: SchoolClass[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as SchoolClass);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          this.currentListeners?.onClassesChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, classesPath));
      this.firestoreUnsubscribers.push(unsubClasses);

      // 5. Subjects Collection
      const subjectsPath = `schools/${code}/subjects`;
      const unsubSubjects = onSnapshot(collection(db, subjectsPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: Subject[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Subject);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          this.currentListeners?.onSubjectsChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, subjectsPath));
      this.firestoreUnsubscribers.push(unsubSubjects);

      // 6. Teachers Collection
      const teachersPath = `schools/${code}/teachers`;
      const unsubTeachers = onSnapshot(collection(db, teachersPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: Teacher[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Teacher);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          this.currentListeners?.onTeachersChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, teachersPath));
      this.firestoreUnsubscribers.push(unsubTeachers);

      // 7. Grades Collection
      const gradesPath = `schools/${code}/grades`;
      const unsubGrades = onSnapshot(collection(db, gradesPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: EvaluationGrade[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as EvaluationGrade);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          this.currentListeners?.onGradesChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, gradesPath));
      this.firestoreUnsubscribers.push(unsubGrades);

      // 8. Payments Collection
      const paymentsPath = `schools/${code}/payments`;
      const unsubPayments = onSnapshot(collection(db, paymentsPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
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
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          list.sort((a, b) =>
            (b.paymentDate || '').localeCompare(a.paymentDate || '') ||
            (b.receiptNumber || '').localeCompare(a.receiptNumber || '') ||
            (b.id || '').localeCompare(a.id || '')
          );
          this.currentListeners?.onPaymentsChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, paymentsPath));
      this.firestoreUnsubscribers.push(unsubPayments);

      // 9. Attendance Collection
      const attendancePath = `schools/${code}/attendance`;
      const unsubAttendance = onSnapshot(collection(db, attendancePath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as AttendanceRecord);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          this.currentListeners?.onAttendanceChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, attendancePath));
      this.firestoreUnsubscribers.push(unsubAttendance);

      // 10. Expenses Collection
      const expensesPath = `schools/${code}/expenses`;
      const unsubExpenses = onSnapshot(collection(db, expensesPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: Expense[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Expense);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          list.sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
          this.currentListeners?.onExpensesChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, expensesPath));
      this.firestoreUnsubscribers.push(unsubExpenses);

      // 11. Cash Closures Collection
      const closuresPath = `schools/${code}/cash_closures`;
      const unsubClosures = onSnapshot(collection(db, closuresPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: DailyCashClosure[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as DailyCashClosure);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          this.currentListeners?.onClosuresChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, closuresPath));
      this.firestoreUnsubscribers.push(unsubClosures);

      // 12. Exam Sessions & Slots Collections
      const examSessionsPath = `schools/${code}/exam_sessions`;
      const unsubExamSessions = onSnapshot(collection(db, examSessionsPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: ExamSession[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as ExamSession);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          try {
            secureLocalStorage.setJSON('soma_exam_sessions', list);
            window.dispatchEvent(new CustomEvent('soma_exam_updated'));
          } catch {}
          this.currentListeners?.onExamSessionsChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, examSessionsPath));
      this.firestoreUnsubscribers.push(unsubExamSessions);

      const examSlotsPath = `schools/${code}/exam_slots`;
      const unsubExamSlots = onSnapshot(collection(db, examSlotsPath), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        const list: ExamSlot[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as ExamSlot);
        });
        if (list.length > 0 || this.firestoreHydratedCode === code) {
          try {
            secureLocalStorage.setJSON('soma_exam_slots', list);
            window.dispatchEvent(new CustomEvent('soma_exam_updated'));
          } catch {}
          this.currentListeners?.onExamSlotsChange?.(list);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, examSlotsPath));
      this.firestoreUnsubscribers.push(unsubExamSlots);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, `schools/${code}`);
    }
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
    if (this.sseReconnectTimeout) {
      clearTimeout(this.sseReconnectTimeout);
      this.sseReconnectTimeout = null;
    }
    this.firestoreUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.firestoreUnsubscribers = [];
  }

  /**
   * Broadcast a mutation across the network to all other devices in real-time
   */
  private async dispatchMutation(mutationType: string, payload: any, schoolCode?: string): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();
    this.markHasUserData(code);

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ mutationType, payload, senderId: DEVICE_CLIENT_ID });
      }
    } catch {}

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
   * Push an entire local database to Cloud Firestore & Server for this school
   */
  public async pushAllDataToCloud(
    schoolCode: string,
    data: FullSchoolSeedPayload
  ): Promise<boolean> {
    const code = schoolCode.trim().toUpperCase() || this.getActiveSchoolCode();
    this.markHasUserData(code);

    const examSessions = data.exam_sessions ?? secureLocalStorage.getJSON<ExamSession[]>('soma_exam_sessions', []);
    const examSlots = data.exam_slots ?? secureLocalStorage.getJSON<ExamSlot[]>('soma_exam_slots', []);
    const expenses = data.expenses ?? secureLocalStorage.getJSON<Expense[]>('soma_expenses', []);
    const closures = data.cash_closures ?? secureLocalStorage.getJSON<DailyCashClosure[]>('kalangest_cash_closures', []);
    const users = data.users ?? secureLocalStorage.getJSON<User[]>('somasikolo_users', []);

    // 1. Send to server sync store
    try {
      await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: code,
          data: {
            ...data,
            users,
            expenses,
            cash_closures: closures,
            exam_sessions: examSessions,
            exam_slots: examSlots
          },
          senderId: DEVICE_CLIENT_ID
        })
      });
    } catch (e) {
      console.warn('[SyncService] Server push notice:', e);
    }

    // 2. Write to Cloud Firestore using safe chunked batches
    try {
      const ops: Array<{ ref: ReturnType<typeof doc>; data: any }> = [];

      ops.push({
        ref: doc(db, `schools/${code}/settings`, 'config'),
        data: cleanForFirestore({ ...data.settings, updatedAt: new Date().toISOString() })
      });

      const enqueueList = (collName: string, list: any[]) => {
        list.forEach((item) => {
          if (!item?.id) return;
          ops.push({
            ref: doc(db, `schools/${code}/${collName}`, item.id),
            data: cleanForFirestore(item)
          });
        });
      };

      enqueueList('users', users);
      enqueueList('students', data.students || []);
      enqueueList('classes', data.classes || []);
      enqueueList('subjects', data.subjects || []);
      enqueueList('teachers', data.teachers || []);
      enqueueList('grades', data.grades || []);
      enqueueList('payments', data.payments || []);
      enqueueList('attendance', data.attendance || []);
      enqueueList('expenses', expenses);
      enqueueList('cash_closures', closures);
      enqueueList('exam_sessions', examSessions);
      enqueueList('exam_slots', examSlots);

      await this.commitInChunks(ops);

      await setDoc(doc(db, 'school_directory', code), cleanForFirestore({
        schoolCode: code,
        schoolName: data.settings.schoolName || 'Établissement Scolaire',
        pinCode: data.settings.adminPassword || '00223',
        lastSyncAt: new Date().toISOString(),
        totalStudents: (data.students || []).length,
        totalClasses: (data.classes || []).length,
        totalPayments: (data.payments || []).length
      }), { merge: true });

      this.firestoreHydratedCode = code;
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `schools/${code}`);
      return false;
    }
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

    await this.dispatchMutation('SYNC_PAYMENT', cleanPayment, code);

    const path = `schools/${code}/payments`;
    try {
      await setDoc(doc(db, path, payment.id), cleanPayment, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/${payment.id}`);
      return false;
    }
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

    const path = `schools/${code}/expenses`;
    try {
      await setDoc(doc(db, path, expense.id), cleanData, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/${expense.id}`);
      return false;
    }
  }

  public async deleteExpense(expenseId: string, schoolCode?: string): Promise<boolean> {
    const code = schoolCode || this.getActiveSchoolCode();
    if (!expenseId) return false;

    await this.dispatchMutation('DELETE_EXPENSE', { id: expenseId }, code);

    const path = `schools/${code}/expenses`;
    try {
      await deleteDoc(doc(db, path, expenseId));
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${expenseId}`);
      return false;
    }
  }

  // --- Dedicated Cash Closure Cloud Sync ---
  public async syncClosure(closure: DailyCashClosure, schoolCode?: string): Promise<boolean> {
    await this.syncDoc('cash_closures', closure, schoolCode);
    return true;
  }

  public async deleteClosure(closureId: string, schoolCode?: string): Promise<boolean> {
    await this.deleteCloudDoc('cash_closures', closureId, schoolCode);
    return true;
  }

  /**
   * Fetch all cloud payments directly for the given school
   */
  public async fetchAllCloudPayments(schoolCode?: string): Promise<Payment[]> {
    const code = schoolCode || this.getActiveSchoolCode();

    try {
      const res = await fetch(`/api/sync/state?school=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.store && !data.store.isSeed && Array.isArray(data.store.payments)) {
          return data.store.payments;
        }
      }
    } catch {}

    const paymentsPath = `schools/${code}/payments`;
    try {
      const snap = await getDocs(collection(db, paymentsPath));
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
      handleFirestoreError(e, OperationType.LIST, paymentsPath);
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

    const path = `schools/${code}/${collectionName}`;
    try {
      await setDoc(doc(db, path, item.id), cleanData, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/${item.id}`);
    }
  }

  public async deleteCloudDoc(
    collectionName: string,
    id: string,
    schoolCode?: string
  ): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();

    await this.dispatchMutation('DELETE_DOC', { collectionName, id }, code);

    const path = `schools/${code}/${collectionName}`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${id}`);
    }
  }

  public async clearCloudCollection(
    collectionName: string,
    schoolCode?: string
  ): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();

    await this.dispatchMutation('CLEAR_COLLECTION', { collectionName }, code);

    const path = `schools/${code}/${collectionName}`;
    try {
      const snap = await getDocs(collection(db, path));
      const docs = snap.docs;
      const CHUNK_SIZE = 350;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + CHUNK_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  public async syncSettings(settings: SchoolSettings, schoolCode?: string): Promise<void> {
    const code = schoolCode || this.getActiveSchoolCode();
    const cleanData = cleanForFirestore({ ...settings, updatedAt: new Date().toISOString() });

    await this.dispatchMutation('SYNC_SETTINGS', cleanData, code);

    const path = `schools/${code}/settings`;
    try {
      await setDoc(doc(db, path, 'config'), cleanData, { merge: true });
      await setDoc(doc(db, 'school_directory', code), cleanForFirestore({
        schoolCode: code,
        schoolName: settings.schoolName || 'Établissement Scolaire',
        pinCode: settings.adminPassword || '00223',
        lastSyncAt: new Date().toISOString()
      }), { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/config`);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
