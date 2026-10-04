/**
 * SomaSikolo / KalanGest - Service d'Historique des Scans QR
 * Gère les 10 derniers profils d'élèves scannés avec persistance localStorage
 * et synchronisation temps-réel via événements locaux.
 */

import { Student } from '../types';

export interface ScanHistoryEntry {
  id: string; // unique entry id
  scannedAt: string; // ISO date string
  student: Student;
  className?: string;
  source?: 'CAMERA' | 'JSON' | 'MANUEL' | 'RECHERCHE';
}

const STORAGE_KEY = 'somasikolo_scan_history_v1';
const MAX_HISTORY = 10;
const EVENT_NAME = 'somasikolo_scan_history_changed';

export class ScanHistoryService {
  /**
   * Récupère la liste des 10 derniers scans
   */
  static getHistory(): ScanHistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, MAX_HISTORY);
    } catch (e) {
      console.error('Erreur lecture historique des scans:', e);
      return [];
    }
  }

  /**
   * Enregistre un scan d'élève dans l'historique (max 10, dédoublonné sur l'élève)
   */
  static recordScan(
    student: Student, 
    className?: string, 
    source: 'CAMERA' | 'JSON' | 'MANUEL' | 'RECHERCHE' = 'CAMERA'
  ): ScanHistoryEntry[] {
    if (typeof window === 'undefined' || !student) return [];
    try {
      const current = this.getHistory();
      
      // Retirer l'élève s'il existe déjà dans l'historique pour le replacer en #1
      const filtered = current.filter(item => 
        item.student.id !== student.id && 
        item.student.matricule?.toLowerCase() !== student.matricule?.toLowerCase()
      );

      const newEntry: ScanHistoryEntry = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        scannedAt: new Date().toISOString(),
        student,
        className: className || '',
        source
      };

      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Émettre l'événement pour mettre à jour l'interface instantanément
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
      return updated;
    } catch (e) {
      console.error('Erreur enregistrement scan dans historique:', e);
      return [];
    }
  }

  /**
   * Supprime un élément précis de l'historique
   */
  static removeEntry(entryId: string): ScanHistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const current = this.getHistory();
      const updated = current.filter(item => item.id !== entryId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
      return updated;
    } catch (e) {
      console.error('Erreur suppression entrée historique:', e);
      return [];
    }
  }

  /**
   * Vide complètement l'historique des scans
   */
  static clearHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
    } catch (e) {
      console.error('Erreur vidage historique des scans:', e);
    }
  }

  /**
   * S'abonne aux changements de l'historique
   */
  static subscribe(callback: (history: ScanHistoryEntry[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ScanHistoryEntry[]>;
      callback(customEvent.detail || this.getHistory());
    };

    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        callback(this.getHistory());
      }
    });

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }
}
