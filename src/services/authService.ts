/**
 * SomaSikolo - Service d'Authentification & Contrôle d'Accès basé sur les Rôles (RBAC)
 */

import { UserRole, Permission } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'], // Full access (includes users:manage, modules:manage, security:admin)
  DIRECTEUR: [
    'dashboard:view',
    'students:view', 'students:create', 'students:edit', 'students:delete',
    'attendance:view', 'attendance:manage',
    'classes:view', 'classes:manage',
    'subjects:view', 'subjects:manage',
    'teachers:view', 'teachers:manage',
    'grades:view', 'grades:entry',
    'bulletins:generate', 'bulletins:print', 'bulletins:view',
    'cards:generate',
    'payments:view', 'payments:record', 'payments:reports',
    'settings:view', 'settings:edit',
    'reports:view', 'reports:financial', 'backup:manage'
  ],
  SECRETAIRE: [
    'dashboard:view',
    'students:view', 'students:create', 'students:edit',
    'attendance:view', 'attendance:manage',
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
    'attendance:view', 'attendance:manage',
    'classes:view',
    'subjects:view',
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

export const TAB_PERMISSIONS: Record<string, string | string[]> = {
  dashboard: 'dashboard:view',
  inscription: 'students:create',
  students: 'students:view',
  classes: 'classes:view',
  subjects: 'subjects:view',
  teachers: 'teachers:view',
  grades: 'grades:view',
  attendance: 'attendance:view',
  examSchedule: 'bulletins:generate',
  bulletins: ['bulletins:generate', 'bulletins:view'],
  cards: 'cards:generate',
  payments: 'payments:view',
  cashier: 'payments:view',
  modules: 'modules:manage',
  settings: 'settings:view',
  backup: 'backup:manage'
};

export class AuthService {
  public static hasPermission(role: UserRole | undefined | null, permission: string): boolean {
    if (!role) return false;
    const userPerms = ROLE_PERMISSIONS[role] || [];
    if (userPerms.includes('*')) return true;
    return userPerms.includes(permission);
  }

  public static hasAnyPermission(role: UserRole | undefined | null, permissions: string[]): boolean {
    if (!role) return false;
    return permissions.some(p => this.hasPermission(role, p));
  }

  public static canAccessTab(role: UserRole | undefined | null, tab: string): boolean {
    if (!role) return false;
    const req = TAB_PERMISSIONS[tab];
    if (!req) return true;
    return Array.isArray(req) ? this.hasAnyPermission(role, req) : this.hasPermission(role, req);
  }

  public static isAdmin(role: UserRole | undefined | null): boolean {
    return role === 'ADMIN';
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
