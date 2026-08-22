/**
 * Constantes et Données Métier de l'Éducation Nationale du Mali
 */

import { EvaluationTerm } from '../types';

export const MALI_ACADEMIES = [
  "Académie d'Enseignement de Bamako Rive Gauche",
  "Académie d'Enseignement de Bamako Rive Droite",
  "Académie d'Enseignement de Kati",
  "Académie d'Enseignement de Koulikoro",
  "Académie d'Enseignement de Sikasso",
  "Académie d'Enseignement de Koutiala",
  "Académie d'Enseignement de Ségou",
  "Académie d'Enseignement de San",
  "Académie d'Enseignement de Mopti",
  "Académie d'Enseignement de Douentza",
  "Académie d'Enseignement de Tombouctou",
  "Académie d'Enseignement de Gao",
  "Académie d'Enseignement de Kayes",
  "Académie d'Enseignement de Kita",
  "Académie d'Enseignement de Bougouni",
  "Académie d'Enseignement de Nioro du Sahel"
];

export const MALI_SCHOOL_LEVEL_CATEGORIES = [
  { id: 'FONDAMENTAL_1', label: '1er Cycle Fondamental (1ère - 6ème Année)' },
  { id: 'FONDAMENTAL_2', label: '2ème Cycle Fondamental (7ème - 9ème DEF)' },
  { id: 'LYCEE', label: 'Lycée Général (10ème, 11ème, 12ème BAC)' },
  { id: 'TECHNIQUE_BT', label: 'Enseignement Technique & BT (Brevet de Technicien)' },
  { id: 'PROFESSIONNEL_CAP', label: 'Formation Professionnelle CAP (1 & 2)' },
];

export const MALI_DEFAULT_CLASSES = [
  { name: '1ère Année A', category: 'FONDAMENTAL_1', level: '1ère', fee: 15000, insFee: 10000 },
  { name: '6ème Année A', category: 'FONDAMENTAL_1', level: '6ème', fee: 18000, insFee: 10000 },
  { name: '7ème Année A', category: 'FONDAMENTAL_2', level: '7ème', fee: 20000, insFee: 15000 },
  { name: '8ème Année B', category: 'FONDAMENTAL_2', level: '8ème', fee: 22000, insFee: 15000 },
  { name: '9ème Année A (DEF)', category: 'FONDAMENTAL_2', level: '9ème', fee: 25000, insFee: 20000 },
  { name: '10ème CG 1', category: 'LYCEE', level: '10ème', fee: 30000, insFee: 25000 },
  { name: '11ème Sciences (11ème S)', category: 'LYCEE', level: '11ème', fee: 32000, insFee: 25000 },
  { name: '12ème TSS (Terminales Sciences Sociales)', category: 'LYCEE', level: '12ème', fee: 35000, insFee: 30000 },
  { name: '12ème TSE (Terminales Sciences Exactes)', category: 'LYCEE', level: '12ème', fee: 35000, insFee: 30000 },
  { name: 'BT1 Comptabilité & Gestion', category: 'TECHNIQUE_BT', level: 'BT1', fee: 35000, insFee: 30000 },
];

export const MALI_DEFAULT_SUBJECTS = [
  { code: 'FRAN', name: 'Français / Rédaction', coefficient: 3, classCategory: 'FONDAMENTAL_2', order: 1 },
  { code: 'MATH', name: 'Mathématiques', coefficient: 3, classCategory: 'FONDAMENTAL_2', order: 2 },
  { code: 'PHYS', name: 'Physique - Chimie', coefficient: 2, classCategory: 'FONDAMENTAL_2', order: 3 },
  { code: 'SVT', name: 'Sciences de la Vie et de la Terre', coefficient: 2, classCategory: 'FONDAMENTAL_2', order: 4 },
  { code: 'HIST_GEO', name: 'Histoire - Géographie', coefficient: 2, classCategory: 'FONDAMENTAL_2', order: 5 },
  { code: 'ECM', name: 'Éducation à la Citoyenneté (ECM)', coefficient: 1, classCategory: 'FONDAMENTAL_2', order: 6 },
  { code: 'ANGL', name: 'Anglais', coefficient: 2, classCategory: 'FONDAMENTAL_2', order: 7 },
  { code: 'EPS', name: 'Éducation Physique & Sportive', coefficient: 1, classCategory: 'FONDAMENTAL_2', order: 8 },
  
  // Lycée TSE
  { code: 'MATH_SE', name: 'Mathématiques Supérieures', coefficient: 5, classCategory: 'LYCEE', order: 1 },
  { code: 'PHYS_SE', name: 'Physique - Chimie Avancée', coefficient: 4, classCategory: 'LYCEE', order: 2 },
  { code: 'PHIL', name: 'Philosophie', coefficient: 2, classCategory: 'LYCEE', order: 3 },
  { code: 'FRAN_LYC', name: 'Français / Littérature', coefficient: 3, classCategory: 'LYCEE', order: 4 },
  { code: 'ANGL_LYC', name: 'Anglais Général', coefficient: 2, classCategory: 'LYCEE', order: 5 },
];

export function getMaliScoreAppreciation(score: number, maxScore: number = 20): { appreciation: string; badgeColor: string } {
  const normScore = maxScore === 10 ? score * 2 : score;
  if (normScore === 0) return { appreciation: "N'a pas composé", badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300" };
  if (normScore >= 18) return { appreciation: "Excellent", badgeColor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400" };
  if (normScore >= 16) return { appreciation: "Très bien", badgeColor: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300" };
  if (normScore >= 14) return { appreciation: "Bien", badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300" };
  if (normScore >= 12) return { appreciation: "Assez bien", badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300" };
  if (normScore >= 10) return { appreciation: "Passable", badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300" };
  if (normScore >= 8) return { appreciation: "Insuffisant", badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300" };
  return { appreciation: "Médiocre", badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300" };
}

export interface TermOption {
  id: EvaluationTerm;
  label: string;
  shortLabel: string;
  category: 'TRIMESTRE' | 'SEMESTRE' | 'EVALUATION_MENSUELLE';
  month?: string;
}

export const DEFAULT_EVALUATION_MONTHS: Record<string, string> = {
  EVALUATION_1: 'Octobre',
  EVALUATION_2: 'Novembre',
  EVALUATION_3: 'Décembre',
  EVALUATION_4: 'Janvier',
  EVALUATION_5: 'Février',
  EVALUATION_6: 'Mars',
  EVALUATION_7: 'Avril',
  EVALUATION_8: 'Mai',
  EVALUATION_9: 'Juin',
  EVALUATION_10: 'Juillet',
  EVALUATION_11: 'Août',
  EVALUATION_12: 'Septembre',
  TRIMESTRE_1: 'Octobre - Décembre',
  TRIMESTRE_2: 'Janvier - Mars',
  TRIMESTRE_3: 'Avril - Juin',
  SEMESTRE_1: 'Octobre - Février',
  SEMESTRE_2: 'Mars - Juin',
};

export function getEvaluationsPerTrimesterForClass(
  clsCategory: string | undefined,
  settings?: {
    evaluationsPerTrimester1stCycle?: number;
    evaluationsPerTrimester2ndCycle?: number;
    evaluationCount1stCycle?: number;
    evaluationCount2ndCycle?: number;
    evaluationCount?: number;
  }
): number {
  if (!settings) return 3;
  const cat = clsCategory || '';
  const is1st = cat === 'PREMIER_CYCLE' || cat === 'PRIMAIRE' || cat === 'MATERNELLE';
  const is2nd = cat === 'SECOND_CYCLE' || cat === 'LYCEE';

  if (is1st) {
    if (settings.evaluationsPerTrimester1stCycle !== undefined && settings.evaluationsPerTrimester1stCycle > 0) {
      return settings.evaluationsPerTrimester1stCycle;
    }
    if (settings.evaluationCount1stCycle !== undefined && settings.evaluationCount1stCycle > 0) {
      return Math.max(1, Math.ceil(settings.evaluationCount1stCycle / 3));
    }
    return 3;
  }

  if (is2nd) {
    if (settings.evaluationsPerTrimester2ndCycle !== undefined && settings.evaluationsPerTrimester2ndCycle > 0) {
      return settings.evaluationsPerTrimester2ndCycle;
    }
    if (settings.evaluationCount2ndCycle !== undefined && settings.evaluationCount2ndCycle > 0) {
      return Math.max(1, Math.ceil(settings.evaluationCount2ndCycle / 3));
    }
    return 2;
  }

  return Math.max(1, Math.ceil((settings.evaluationCount || 9) / 3));
}

export function getEvaluationCountForClass(
  clsCategory: string | undefined,
  settings?: {
    evaluationCount?: number;
    evaluationCount1stCycle?: number;
    evaluationCount2ndCycle?: number;
    evaluationsPerTrimester1stCycle?: number;
    evaluationsPerTrimester2ndCycle?: number;
  }
): number {
  if (!settings) return 9;
  const cat = clsCategory || '';
  const is1st = cat === 'PREMIER_CYCLE' || cat === 'PRIMAIRE' || cat === 'MATERNELLE';
  const is2nd = cat === 'SECOND_CYCLE' || cat === 'LYCEE';

  if (is1st) {
    if (settings.evaluationCount1stCycle !== undefined && settings.evaluationCount1stCycle > 0) {
      return settings.evaluationCount1stCycle;
    }
    if (settings.evaluationsPerTrimester1stCycle !== undefined && settings.evaluationsPerTrimester1stCycle > 0) {
      return settings.evaluationsPerTrimester1stCycle * 3;
    }
    return 9;
  }

  if (is2nd) {
    if (settings.evaluationCount2ndCycle !== undefined && settings.evaluationCount2ndCycle > 0) {
      return settings.evaluationCount2ndCycle;
    }
    if (settings.evaluationsPerTrimester2ndCycle !== undefined && settings.evaluationsPerTrimester2ndCycle > 0) {
      return settings.evaluationsPerTrimester2ndCycle * 3;
    }
    return 6;
  }

  return settings.evaluationCount || 9;
}

export function getAnnualTuitionFee(
  cls?: { monthlyFee?: number; category?: string },
  settings?: { evaluationCount?: number; evaluationCount1stCycle?: number; evaluationCount2ndCycle?: number }
): number {
  const monthlyFee = cls?.monthlyFee || 25000;
  const count = getEvaluationCountForClass(cls?.category, settings);
  return monthlyFee * count;
}

export function getMaliEvaluationTerms(customMonths?: Record<string, string>, evaluationCount: number = 9): TermOption[] {
  const months = { ...DEFAULT_EVALUATION_MONTHS, ...(customMonths || {}) };
  const count = Math.max(1, Math.min(12, evaluationCount || 9));
  const perTrimester = Math.max(1, Math.ceil(count / 3));

  const monthlyEvals: TermOption[] = [];
  for (let i = 1; i <= count; i++) {
    const key = `EVALUATION_${i}`;
    const m = months[key] || `Mois ${i}`;
    const trimNum = Math.min(3, Math.ceil(i / perTrimester));
    const devNumInTrim = i - (trimNum - 1) * perTrimester;
    const trimLabelText = trimNum === 1 ? '1er Trim.' : `${trimNum}ème Trim.`;

    let displayLabel = `Évaluation N°${i} (${m}) — [${trimLabelText}]`;
    if (count === 6) {
      displayLabel = `Évaluation N°${i} (${m}) — [${trimLabelText} : Devoir ${devNumInTrim}/2]`;
    } else if (count === 3) {
      displayLabel = `Évaluation N°${i} (${m}) — [${trimLabelText} : Devoir Unique]`;
    }

    monthlyEvals.push({
      id: key as EvaluationTerm,
      label: displayLabel,
      shortLabel: `Éval ${i} (${m})`,
      category: 'EVALUATION_MENSUELLE',
      month: m
    });
  }

  return [
    ...monthlyEvals,
    { id: 'TRIMESTRE_1', label: `1er Trimestre (${months.TRIMESTRE_1})`, shortLabel: 'Trimestre 1', category: 'TRIMESTRE' },
    { id: 'TRIMESTRE_2', label: `2ème Trimestre (${months.TRIMESTRE_2})`, shortLabel: 'Trimestre 2', category: 'TRIMESTRE' },
    { id: 'TRIMESTRE_3', label: `3ème Trimestre (${months.TRIMESTRE_3})`, shortLabel: 'Trimestre 3', category: 'TRIMESTRE' },

    { id: 'SEMESTRE_1', label: `1er Semestre (${months.SEMESTRE_1})`, shortLabel: 'Semestre 1', category: 'SEMESTRE' },
    { id: 'SEMESTRE_2', label: `2ème Semestre (${months.SEMESTRE_2})`, shortLabel: 'Semestre 2', category: 'SEMESTRE' },
  ];
}

export const MALI_EVALUATION_TERMS: TermOption[] = getMaliEvaluationTerms();

export function getRelatedTermsForPeriod(term: string, evaluationCount: number = 9): string[] {
  if (!term.startsWith('TRIMESTRE_') && !term.startsWith('SEMESTRE_')) {
    return [term];
  }

  const count = Math.max(1, Math.min(12, evaluationCount || 9));
  const perTrimester = Math.max(1, Math.ceil(count / 3));

  if (term === 'TRIMESTRE_1') {
    const terms = ['TRIMESTRE_1'];
    for (let i = 1; i <= Math.min(perTrimester, count); i++) {
      terms.push(`EVALUATION_${i}`);
    }
    return terms;
  }

  if (term === 'TRIMESTRE_2') {
    const terms = ['TRIMESTRE_2'];
    const start = perTrimester + 1;
    const end = Math.min(perTrimester * 2, count);
    for (let i = start; i <= end; i++) {
      terms.push(`EVALUATION_${i}`);
    }
    return terms;
  }

  if (term === 'TRIMESTRE_3') {
    const terms = ['TRIMESTRE_3'];
    const start = perTrimester * 2 + 1;
    for (let i = start; i <= count; i++) {
      terms.push(`EVALUATION_${i}`);
    }
    return terms;
  }

  if (term === 'SEMESTRE_1') {
    const terms = ['SEMESTRE_1'];
    const mid = Math.ceil(count / 2);
    for (let i = 1; i <= mid; i++) {
      terms.push(`EVALUATION_${i}`);
    }
    return terms;
  }

  if (term === 'SEMESTRE_2') {
    const terms = ['SEMESTRE_2'];
    const mid = Math.ceil(count / 2);
    for (let i = mid + 1; i <= count; i++) {
      terms.push(`EVALUATION_${i}`);
    }
    return terms;
  }

  return [term];
}

export function getTermLabel(term: string, customMonths?: Record<string, string>, evaluationCount: number = 9): string {
  const months = { ...DEFAULT_EVALUATION_MONTHS, ...(customMonths || {}) };
  const monthName = months[term];

  if (term?.startsWith('EVALUATION_')) {
    const num = term.replace('EVALUATION_', '');
    return monthName ? `Évaluation N°${num} (${monthName})` : `Évaluation N°${num}`;
  }

  if (term?.startsWith('TRIMESTRE_')) {
    const num = term.replace('TRIMESTRE_', '');
    const ord = num === '1' ? '1er' : `${num}ème`;
    return monthName ? `${ord} Trimestre (${monthName})` : `${ord} Trimestre`;
  }

  if (term?.startsWith('SEMESTRE_')) {
    const num = term.replace('SEMESTRE_', '');
    const ord = num === '1' ? '1er' : `${num}ème`;
    return monthName ? `${ord} Semestre (${monthName})` : `${ord} Semestre`;
  }

  const found = getMaliEvaluationTerms(customMonths, evaluationCount).find(t => t.id === term);
  if (found) return found.label;
  return term ? term.replace('_', ' ') : '1er Trimestre';
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0
  }).format(amount).replace('XOF', 'FCFA');
}
