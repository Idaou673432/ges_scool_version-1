/**
 * SomaSikolo / KalanGest - Service de File d'Attente des Scans Hors-Ligne (Offline Scan Queue)
 * Permet l'enregistrement, la persistance locale et la resynchronisation automatique
 * de tous les scans effectués sans connexion internet (présences, badges, cartes scolaires).
 */

import { Student, AttendanceRecord } from '../types';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { cleanForFirestore } from './cloudSyncService';

export type ScanActionType = 'ATTENDANCE_CHECKIN' | 'BADGE_VERIFY' | 'CARD_SCAN';
export type ScanQueueStatus = 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface QueuedScanItem {
  id: string;
  scannedAt: string;
  studentId?: string;
  studentMatricule: string;
  studentName: string;
  className?: string;
  scanPayload: string;
  scanSource: 'CAMERA' | 'IMAGE' | 'JSON' | 'MANUEL' | 'ATTENDANCE';
  action: ScanActionType;
  attendanceDetails?: {
    date: string;
    status: 'PRESENT' | 'LATE' | 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED';
    reason?: string;
    lateMinutes?: number;
    markedBy?: string;
  };
  syncStatus: ScanQueueStatus;
  syncAttempts: number;
  lastAttemptAt?: string;
  syncError?: string;
}

const QUEUE_STORAGE_KEY = 'somasikolo_offline_scan_queue_v1';
const QUEUE_EVENT_NAME = 'somasikolo_scan_queue_updated';

class OfflineScanQueueService {
  private isSyncing: boolean = false;
  private autoSyncRegistered: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && !this.autoSyncRegistered) {
      this.autoSyncRegistered = true;
      // Auto-sync as soon as internet connection is restored
      window.addEventListener('online', () => {
        console.info('[OfflineScanQueue] Connexion rétablie ! Lancement synchronisation des scans en attente...');
        this.syncQueue();
      });
    }
  }

  /**
   * Récupère tous les scans enregistrés en file d'attente locale
   */
  public getQueue(): QueuedScanItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Erreur lecture queue des scans hors-ligne:', e);
      return [];
    }
  }

  /**
   * Sauvegarde l'état de la file d'attente et émet l'événement de mise à jour UI
   */
  private saveQueue(queue: QueuedScanItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent(QUEUE_EVENT_NAME, { detail: queue }));
    } catch (e) {
      console.error('Erreur sauvegarde queue des scans hors-ligne:', e);
    }
  }

  /**
   * Nombre de scans actuellement en attente de synchronisation
   */
  public getPendingCount(): number {
    return this.getQueue().filter(item => item.syncStatus === 'QUEUED' || item.syncStatus === 'FAILED').length;
  }

  /**
   * Ajoute un nouveau scan dans la file d'attente hors-ligne
   */
  public enqueueScan(item: Omit<QueuedScanItem, 'id' | 'scannedAt' | 'syncStatus' | 'syncAttempts'>): QueuedScanItem {
    const queue = this.getQueue();
    const newItem: QueuedScanItem = {
      ...item,
      id: `scan_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      scannedAt: new Date().toISOString(),
      syncStatus: 'QUEUED',
      syncAttempts: 0
    };

    // Insérer en début de file
    const updated = [newItem, ...queue];
    this.saveQueue(updated);

    // Si nous sommes déjà connectés, tenter une synchronisation en arrière-plan
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.syncQueue(), 300);
    }

    return newItem;
  }

  /**
   * Ajoute rapidement un pointage de présence hors-ligne
   */
  public enqueueAttendanceScan(
    student: Student,
    className?: string,
    attendanceDate?: string,
    status: 'PRESENT' | 'LATE' = 'PRESENT',
    source: 'CAMERA' | 'IMAGE' | 'JSON' | 'MANUEL' = 'CAMERA'
  ): QueuedScanItem {
    const today = attendanceDate || new Date().toISOString().split('T')[0];
    return this.enqueueScan({
      studentId: student.id,
      studentMatricule: student.matricule,
      studentName: `${student.lastName.toUpperCase()} ${student.firstName}`,
      className: className || '',
      scanPayload: JSON.stringify({ matricule: student.matricule, name: `${student.lastName} ${student.firstName}`, id: student.id }),
      scanSource: source,
      action: 'ATTENDANCE_CHECKIN',
      attendanceDetails: {
        date: today,
        status,
        markedBy: 'Pointage QR Hors-Ligne',
        lateMinutes: status === 'LATE' ? 15 : 0
      }
    });
  }

  /**
   * Supprime un élément de la file d'attente
   */
  public removeScan(id: string): void {
    const current = this.getQueue();
    const updated = current.filter(item => item.id !== id);
    this.saveQueue(updated);
  }

  /**
   * Supprime tous les éléments déjà synchronisés
   */
  public clearSynced(): void {
    const current = this.getQueue();
    const updated = current.filter(item => item.syncStatus !== 'SYNCED');
    this.saveQueue(updated);
  }

  /**
   * Vide totalement la file
   */
  public clearAll(): void {
    this.saveQueue([]);
  }

  /**
   * S'abonne aux modifications de la file d'attente
   */
  public subscribe(callback: (queue: QueuedScanItem[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<QueuedScanItem[]>;
      callback(customEvent.detail || this.getQueue());
    };

    window.addEventListener(QUEUE_EVENT_NAME, handler);
    window.addEventListener('storage', (e) => {
      if (e.key === QUEUE_STORAGE_KEY) {
        callback(this.getQueue());
      }
    });

    return () => {
      window.removeEventListener(QUEUE_EVENT_NAME, handler);
    };
  }

  /**
   * Synchronise tous les scans en attente avec Firebase et la base locale
   */
  public async syncQueue(
    onAttendanceSynced?: (record: Partial<AttendanceRecord>) => void
  ): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.info('[OfflineScanQueue] Pas de connexion internet, synchronisation reportée.');
      return { syncedCount: 0, failedCount: this.getPendingCount() };
    }

    this.isSyncing = true;
    const queue = this.getQueue();
    let syncedCount = 0;
    let failedCount = 0;

    const schoolCode = typeof localStorage !== 'undefined' 
      ? localStorage.getItem('kalangest_cloud_school_code') || 'ECOLE-PRINCIPALE'
      : 'ECOLE-PRINCIPALE';

    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.syncStatus === 'SYNCED') continue;

      item.syncStatus = 'SYNCING';
      item.syncAttempts += 1;
      item.lastAttemptAt = new Date().toISOString();

      try {
        // Traitement selon le type d'action
        if (item.action === 'ATTENDANCE_CHECKIN' && item.attendanceDetails && item.studentId) {
          const recordId = `att_${item.attendanceDetails.date}_${item.studentId}`;
          const attendanceDocRef = doc(db, `schools/${schoolCode}/attendance`, recordId);

          const recordData: Partial<AttendanceRecord> = {
            id: recordId,
            date: item.attendanceDetails.date,
            studentId: item.studentId,
            studentMatricule: item.studentMatricule,
            studentName: item.studentName,
            classId: '',
            className: item.className || '',
            status: item.attendanceDetails.status,
            reason: item.attendanceDetails.reason || 'Pointage QR Hors-Ligne',
            lateMinutes: item.attendanceDetails.lateMinutes || 0,
            markedBy: item.attendanceDetails.markedBy || 'Scanner QR',
            academicYear: '2025-2026'
          };

          await setDoc(attendanceDocRef, cleanForFirestore(recordData), { merge: true });
          
          if (onAttendanceSynced) {
            onAttendanceSynced(recordData);
          }
        }

        // Journaliser le scan dans l'audit cloud
        const auditDocRef = doc(db, `schools/${schoolCode}/audit_logs`, `audit_${Date.now()}_${item.id}`);
        await setDoc(auditDocRef, cleanForFirestore({
          id: `audit_${Date.now()}_${item.id}`,
          action: 'SCAN_QR_OFFLINE_SYNC',
          module: 'CARTE_QR',
          description: `Synchronisation du scan de ${item.studentName} (${item.studentMatricule}) - ${item.action}`,
          user: 'Système Hors-Ligne',
          timestamp: new Date().toISOString()
        }), { merge: true });

        item.syncStatus = 'SYNCED';
        item.syncError = undefined;
        syncedCount++;
      } catch (err: any) {
        console.warn(`[OfflineScanQueue] Échec synchro item ${item.id}:`, err);
        item.syncStatus = 'FAILED';
        item.syncError = err?.message || 'Erreur réseau';
        failedCount++;
      }
    }

    this.saveQueue(updatedQueue);
    this.isSyncing = false;

    // Émettre un son ou une notification si au moins un élément a été synchronisé
    if (syncedCount > 0) {
      console.info(`[OfflineScanQueue] ${syncedCount} scan(s) synchronisé(s) avec succès dans le Cloud !`);
    }

    return { syncedCount, failedCount };
  }
}

export const offlineScanQueueService = new OfflineScanQueueService();
