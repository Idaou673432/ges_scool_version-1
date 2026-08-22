/**
 * SomaSikolo - Service d'Authentification & Contrôle d'Accès basé sur les Rôles (RBAC)
 */

import { UserRole, Permission } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'], // Full access
  DIRECTEUR: [
    'dashboard:view',
    'students:view', 'students:create', 'students:edit', 'students:delete',
    'classes:view', 'classes:manage',
    'subjects:view', 'subjects:manage',
    'teachers:view', 'teachers:manage',
    'grades:view', 'grades:entry',
    'bulletins:generate', 'bulletins:print',
    'payments:view', 'payments:record',
    'settings:view', 'settings:edit',
    'reports:view', 'backup:manage'
  ],
  SECRETAIRE: [
    'dashboard:view',
    'students:view', 'students:create', 'students:edit',
    'classes:view',
    'teachers:view',
    'cards:generate',
    'reports:view'
  ],
  COMPTABLE: [
    'dashboard:view',
    'students:view',
    'payments:view', 'payments:record', 'payments:reports',
    'reports:financial'
  ],
  ENSEIGNANT: [
    'dashboard:view',
    'students:view',
    'classes:view',
    'grades:view', 'grades:entry',
    'bulletins:view'
  ],
  LECTURE_SEULE: [
    'dashboard:view',
    'students:view',
    'classes:view',
    'subjects:view',
    'reports:view'
  ]
};

export class AuthService {
  public static hasPermission(role: UserRole, permission: string): boolean {
    const userPerms = ROLE_PERMISSIONS[role] || [];
    if (userPerms.includes('*')) return true;
    return userPerms.includes(permission);
  }

  public static getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      ADMIN: 'Administrateur Système',
      DIRECTEUR: 'Directeur d\'Établissement',
      SECRETAIRE: 'Secrétaire Général(e)',
      COMPTABLE: 'Chef Comptable',
      ENSEIGNANT: 'Enseignant / Professeur',
      LECTURE_SEULE: 'Consultation (Lecture Seule)'
    };
    return labels[role] || role;
  }
}
