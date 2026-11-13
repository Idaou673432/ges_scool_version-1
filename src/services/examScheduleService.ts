/**
 * SomaSikolo - Service de Gestion des Plannings d'Examens & Compositions Scolaires
 * Stockage persistant, générateur intelligent d'emplois du temps et exports officiels (Mali)
 */

import { ExamSession, ExamSlot, SchoolClass, Subject, Teacher, SchoolSettings, ExamTermType } from '../types';
import { secureLocalStorage } from './secureStorage';
import { cloudSyncService } from './cloudSyncService';

const SESSIONS_STORAGE_KEY = 'soma_exam_sessions';
const SLOTS_STORAGE_KEY = 'soma_exam_slots';

export class ExamScheduleService {
  /**
   * Sessions par défaut initiales si le stockage est vide
   */
  private static getDefaultSessions(currentYear: string): ExamSession[] {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    return [
      {
        id: 'sess-t1',
        title: `Compositions du 1er Trimestre (${currentYear || '2026-2027'})`,
        term: 'TRIMESTRE_1',
        startDate: todayStr,
        endDate: todayStr,
        academicYear: currentYear || '2026-2027',
        status: 'PUBLIE',
        generalInstructions: '1. Présence obligatoire 15 minutes avant le début de chaque épreuve.\n2. Carte d\'identité scolaire obligatoire sur la table.\n3. Téléphones portables et montres connectées formellement interdits dans les salles d\'examen.\n4. Toute fraude ou tentative de fraude entraîne l\'exclusion immédiate de la session.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sess-def-blanc',
        title: `Examen Blanc Régional DEF (${currentYear || '2026-2027'})`,
        term: 'DEF_BLANC',
        startDate: todayStr,
        endDate: todayStr,
        academicYear: currentYear || '2026-2027',
        status: 'BROUILLON',
        generalInstructions: 'Épreuves types DEF conformes aux directives du Ministère de l\'Éducation Nationale.',
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Récupère toutes les sessions d'examens enregistrées
   */
  public static getSessions(currentYear: string = '2026-2027'): ExamSession[] {
    const stored = secureLocalStorage.getJSON<ExamSession[]>(SESSIONS_STORAGE_KEY, []);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      const defaults = this.getDefaultSessions(currentYear);
      secureLocalStorage.setJSON(SESSIONS_STORAGE_KEY, defaults);
      return defaults;
    }
    return stored;
  }

  /**
   * Sauvegarde une session d'examen (création ou mise à jour)
   */
  public static saveSession(session: Partial<ExamSession>, currentYear: string = '2026-2027'): ExamSession {
    const sessions = this.getSessions(currentYear);
    let saved: ExamSession;

    if (session.id) {
      const idx = sessions.findIndex(s => s.id === session.id);
      if (idx >= 0) {
        saved = { ...sessions[idx], ...session, updatedAt: new Date().toISOString() } as ExamSession;
        sessions[idx] = saved;
      } else {
        saved = {
          id: session.id,
          title: session.title || 'Nouvelle Session de Composition',
          term: session.term || 'TRIMESTRE_1',
          startDate: session.startDate || new Date().toISOString().slice(0, 10),
          endDate: session.endDate || new Date().toISOString().slice(0, 10),
          academicYear: session.academicYear || currentYear,
          status: session.status || 'BROUILLON',
          generalInstructions: session.generalInstructions || 'Consignes officielles aux candidats.',
          createdAt: new Date().toISOString()
        };
        sessions.unshift(saved);
      }
    } else {
      saved = {
        id: `sess-${Date.now()}`,
        title: session.title || 'Nouvelle Session de Composition',
        term: session.term || 'TRIMESTRE_1',
        startDate: session.startDate || new Date().toISOString().slice(0, 10),
        endDate: session.endDate || new Date().toISOString().slice(0, 10),
        academicYear: session.academicYear || currentYear,
        status: session.status || 'BROUILLON',
        generalInstructions: session.generalInstructions || 'Consignes officielles aux candidats.',
        createdAt: new Date().toISOString()
      };
      sessions.unshift(saved);
    }

    secureLocalStorage.setJSON(SESSIONS_STORAGE_KEY, sessions);
    try {
      cloudSyncService.syncDoc('exam_sessions', saved);
    } catch {}
    return saved;
  }

  /**
   * Supprime une session d'examen et tous ses créneaux associés
   */
  public static deleteSession(sessionId: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    secureLocalStorage.setJSON(SESSIONS_STORAGE_KEY, filtered);

    // Supprimer aussi les créneaux associés
    const slots = this.getSlots();
    const remainingSlots = slots.filter(sl => sl.sessionId !== sessionId);
    secureLocalStorage.setJSON(SLOTS_STORAGE_KEY, remainingSlots);

    try {
      cloudSyncService.deleteCloudDoc('exam_sessions', sessionId);
    } catch {}

    return true;
  }

  /**
   * Récupère tous les créneaux d'épreuves
   */
  public static getSlots(): ExamSlot[] {
    const stored = secureLocalStorage.getJSON<ExamSlot[]>(SLOTS_STORAGE_KEY, []);
    return Array.isArray(stored) ? stored : [];
  }

  /**
   * Récupère les créneaux d'une session donnée, optionnellement filtrés par classe
   */
  public static getSlotsForSession(sessionId: string, classId?: string): ExamSlot[] {
    const all = this.getSlots();
    return all.filter(slot => {
      if (slot.sessionId !== sessionId) return false;
      if (classId && slot.classId !== classId) return false;
      return true;
    }).sort((a, b) => {
      // Tri par date puis par heure de début
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  /**
   * Sauvegarde un créneau d'examen (création ou mise à jour)
   */
  public static saveSlot(slot: Partial<ExamSlot>): ExamSlot {
    const slots = this.getSlots();
    let saved: ExamSlot;

    // Calcul automatique de la durée en minutes si non fournie
    let dur = slot.durationMinutes || 120;
    if (slot.startTime && slot.endTime) {
      const [h1, m1] = slot.startTime.split(':').map(Number);
      const [h2, m2] = slot.endTime.split(':').map(Number);
      dur = Math.max(30, (h2 * 60 + m2) - (h1 * 60 + m1));
    }

    if (slot.id) {
      const idx = slots.findIndex(s => s.id === slot.id);
      if (idx >= 0) {
        saved = { ...slots[idx], ...slot, durationMinutes: dur } as ExamSlot;
        slots[idx] = saved;
      } else {
        saved = {
          id: slot.id,
          sessionId: slot.sessionId || '',
          classId: slot.classId || '',
          className: slot.className || 'Classe',
          subjectId: slot.subjectId || '',
          subjectName: slot.subjectName || 'Matière',
          coefficient: slot.coefficient ?? 1,
          date: slot.date || new Date().toISOString().slice(0, 10),
          startTime: slot.startTime || '08:00',
          endTime: slot.endTime || '10:00',
          durationMinutes: dur,
          classroom: slot.classroom || 'Salle 01',
          supervisorTeacherId: slot.supervisorTeacherId,
          supervisorName: slot.supervisorName,
          supervisorTeacherId2: slot.supervisorTeacherId2,
          supervisorName2: slot.supervisorName2,
          notes: slot.notes
        };
        slots.push(saved);
      }
    } else {
      saved = {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sessionId: slot.sessionId || '',
        classId: slot.classId || '',
        className: slot.className || 'Classe',
        subjectId: slot.subjectId || '',
        subjectName: slot.subjectName || 'Matière',
        coefficient: slot.coefficient ?? 1,
        date: slot.date || new Date().toISOString().slice(0, 10),
        startTime: slot.startTime || '08:00',
        endTime: slot.endTime || '10:00',
        durationMinutes: dur,
        classroom: slot.classroom || 'Salle 01',
        supervisorTeacherId: slot.supervisorTeacherId,
        supervisorName: slot.supervisorName,
        supervisorTeacherId2: slot.supervisorTeacherId2,
        supervisorName2: slot.supervisorName2,
        notes: slot.notes
      };
      slots.push(saved);
    }

    secureLocalStorage.setJSON(SLOTS_STORAGE_KEY, slots);
    try {
      cloudSyncService.syncDoc('exam_slots', saved);
    } catch {}
    return saved;
  }

  /**
   * Supprime un créneau d'examen individuel
   */
  public static deleteSlot(slotId: string): boolean {
    const slots = this.getSlots();
    const filtered = slots.filter(s => s.id !== slotId);
    secureLocalStorage.setJSON(SLOTS_STORAGE_KEY, filtered);
    try {
      cloudSyncService.deleteCloudDoc('exam_slots', slotId);
    } catch {}
    return true;
  }

  /**
   * Supprime tous les créneaux d'une classe pour une session
   */
  public static clearSlotsForClass(sessionId: string, classId: string): void {
    const slots = this.getSlots();
    const filtered = slots.filter(s => !(s.sessionId === sessionId && s.classId === classId));
    secureLocalStorage.setJSON(SLOTS_STORAGE_KEY, filtered);
  }

  /**
   * GÉNÉRATEUR AUTOMATIQUE INTELLIGENT DE PLANNING (1-CLIC)
   * Répartit harmonieusement toutes les matières d'une classe sur les jours d'examen.
   */
  public static autoGenerateClassSchedule(params: {
    sessionId: string;
    cls: SchoolClass;
    subjects: Subject[];
    teachers: Teacher[];
    startDate: string; // YYYY-MM-DD
    daysCount?: number; // Par défaut 3 à 4 jours
    examsPerDay?: number; // Par défaut 2 épreuves par jour (Matin 1: 08:00-10:00, Matin 2: 10:30-12:30)
  }): ExamSlot[] {
    const { sessionId, cls, subjects, teachers, startDate, daysCount = 3, examsPerDay = 2 } = params;

    // Filtrer les matières appropriées pour cette classe
    const classSubjects = subjects.filter(s => {
      if (cls.subjectIds && cls.subjectIds.length > 0) {
        return cls.subjectIds.includes(s.id);
      }
      if (!s.classCategory) return true;
      return s.classCategory === cls.category;
    });

    const subjectsToSchedule = classSubjects.length > 0 ? classSubjects : subjects.slice(0, 8);
    if (subjectsToSchedule.length === 0) return [];

    // Trier les matières en mettant les gros coefficients le matin
    const sorted = [...subjectsToSchedule].sort((a, b) => {
      const coeffA = (cls.customCoefficients && cls.customCoefficients[a.id] !== undefined) ? cls.customCoefficients[a.id] : (a.coefficient || 1);
      const coeffB = (cls.customCoefficients && cls.customCoefficients[b.id] !== undefined) ? cls.customCoefficients[b.id] : (b.coefficient || 1);
      return coeffB - coeffA;
    });

    // Supprimer les anciens créneaux pour cette classe dans cette session
    this.clearSlotsForClass(sessionId, cls.id);

    const generatedSlots: ExamSlot[] = [];
    const baseDate = new Date(startDate);

    // Définition des plages horaires standard au Mali
    const timeSlots = [
      { start: '08:00', end: '10:00', dur: 120 },
      { start: '10:30', end: '12:30', dur: 120 },
      { start: '15:00', end: '17:00', dur: 120 },
      { start: '17:15', end: '18:45', dur: 90 }
    ];

    let subjectIdx = 0;
    let dayOffset = 0;

    while (subjectIdx < sorted.length) {
      // Calcul de la date du jour (en sautant les dimanches)
      const currentDay = new Date(baseDate);
      currentDay.setDate(baseDate.getDate() + dayOffset);

      // Si dimanche (0), sauter au lundi
      if (currentDay.getDay() === 0) {
        dayOffset++;
        continue;
      }

      const dateStr = currentDay.toISOString().slice(0, 10);

      for (let slotOfDay = 0; slotOfDay < examsPerDay && subjectIdx < sorted.length; slotOfDay++) {
        const sub = sorted[subjectIdx];
        const slotTime = timeSlots[slotOfDay] || timeSlots[0];

        // Rotation de surveillant parmi les enseignants
        const supervisor = teachers.length > 0 ? teachers[subjectIdx % teachers.length] : undefined;
        const supervisor2 = teachers.length > 1 ? teachers[(subjectIdx + 1) % teachers.length] : undefined;

        const newSlot: ExamSlot = {
          id: `slot-${Date.now()}-${subjectIdx}-${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          classId: cls.id,
          className: cls.name,
          subjectId: sub.id,
          subjectName: sub.name,
          coefficient: (cls.customCoefficients && cls.customCoefficients[sub.id] !== undefined) ? cls.customCoefficients[sub.id] : (sub.coefficient || 1),
          date: dateStr,
          startTime: slotTime.start,
          endTime: slotTime.end,
          durationMinutes: slotTime.dur,
          classroom: cls.classroom || 'Salle Principale',
          supervisorTeacherId: supervisor?.id,
          supervisorName: supervisor ? `${supervisor.lastName.toUpperCase()} ${supervisor.firstName}` : 'Surveillant Titulaire',
          supervisorTeacherId2: supervisor2?.id,
          supervisorName2: supervisor2 ? `${supervisor2.lastName.toUpperCase()} ${supervisor2.firstName}` : undefined,
          notes: sub.coefficient && sub.coefficient >= 3 ? 'Épreuve majeure à fort coefficient' : undefined
        };

        generatedSlots.push(newSlot);
        this.saveSlot(newSlot);
        subjectIdx++;
      }

      dayOffset++;
    }

    return generatedSlots;
  }

  /**
   * Libellé lisible pour les types de composition
   */
  public static getTermLabel(term: ExamTermType): string {
    switch (term) {
      case 'TRIMESTRE_1':
        return '1ère Composition (1er Trimestre)';
      case 'TRIMESTRE_2':
        return '2ème Composition (2ème Trimestre)';
      case 'TRIMESTRE_3':
        return '3ème Composition (3ème Trimestre)';
      case 'DEF_BLANC':
        return 'Examen Blanc DEF';
      case 'BAC_BLANC':
        return 'Examen Blanc Baccalauréat';
      case 'BT_BLANC':
        return 'Examen Blanc Brevet de Technicien (BT)';
      case 'DEVOIR_SURVEILLE':
        return 'Devoir Surveillé Commun';
      case 'AUTRE':
      default:
        return 'Session d\'Évaluation Spécifique';
    }
  }
}
