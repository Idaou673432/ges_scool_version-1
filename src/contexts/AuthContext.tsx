/**
 * SomaSikolo - Context d'Authentification React
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { AuthService } from '../services/authService';
import { secureLocalStorage } from '../services/secureStorage';
import { cloudSyncService } from '../services/cloudSyncService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  loginAsUser: (userId: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  canAccessTab: (tab: string) => boolean;
  switchRoleSimulated: (role: UserRole) => void;
  saveUser: (user: Partial<User>) => User;
  deleteUser: (userId: string) => boolean;
  reloadUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const reloadUsers = () => {
    const loadedUsers = storageService.getUsers();
    setUsers(loadedUsers);
    const savedActiveId = secureLocalStorage.getItem('somasikolo_active_user_id');
    const defaultUser = loadedUsers.find(u => u.id === savedActiveId && u.active) || loadedUsers.find(u => u.active) || loadedUsers[0];
    if (defaultUser) {
      setCurrentUser(defaultUser);
    }
  };

  useEffect(() => {
    storageService.initDatabase();
    reloadUsers();

    const handleRemoteUsersUpdate = () => {
      reloadUsers();
    };
    window.addEventListener('somasikolo_users_updated', handleRemoteUsersUpdate);
    return () => {
      window.removeEventListener('somasikolo_users_updated', handleRemoteUsersUpdate);
    };
  }, []);

  const loginAsUser = (userId: string) => {
    const found = users.find(u => u.id === userId && u.active);
    if (found) {
      setCurrentUser(found);
      secureLocalStorage.setItem('somasikolo_active_user_id', userId);
      storageService.addAuditLog('CONNEXION', 'AUTHENTIFICATION', `Connexion de ${found.fullName} (${found.role})`);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    secureLocalStorage.removeItem('somasikolo_active_user_id');
  };

  const switchRoleSimulated = (role: UserRole) => {
    if (!currentUser || !AuthService.isAdmin(currentUser.role)) return;
    const found = users.find(u => u.role === role && u.active);
    if (found) {
      loginAsUser(found.id);
    }
  };

  const saveUser = (user: Partial<User>): User => {
    if (!currentUser || !AuthService.hasPermission(currentUser.role, 'users:manage')) {
      throw new Error('Action non autorisée : gestion des utilisateurs réservée à l\'administrateur.');
    }
    const saved = storageService.saveUser(user);
    const updatedUsers = storageService.getUsers();
    setUsers(updatedUsers);
    if (currentUser && currentUser.id === saved.id) {
      setCurrentUser(saved);
    }
    cloudSyncService.syncDoc('users', saved);
    return saved;
  };

  const deleteUser = (userId: string): boolean => {
    if (!currentUser || !AuthService.hasPermission(currentUser.role, 'users:manage')) {
      return false;
    }
    const res = storageService.deleteUser(userId);
    if (res) {
      cloudSyncService.deleteCloudDoc('users', userId);
      const updatedUsers = storageService.getUsers();
      setUsers(updatedUsers);
      if (currentUser && currentUser.id === userId) {
        const nextUser = updatedUsers[0] || null;
        setCurrentUser(nextUser);
        if (nextUser) {
          secureLocalStorage.setItem('somasikolo_active_user_id', nextUser.id);
        } else {
          secureLocalStorage.removeItem('somasikolo_active_user_id');
        }
      }
    }
    return res;
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    return AuthService.hasPermission(currentUser.role, permission);
  };

  const canAccessTab = (tab: string): boolean => {
    if (!currentUser) return false;
    return AuthService.canAccessTab(currentUser.role, tab);
  };

  const isAdmin = AuthService.isAdmin(currentUser?.role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAdmin,
        loginAsUser,
        logout,
        hasPermission,
        canAccessTab,
        switchRoleSimulated,
        saveUser,
        deleteUser,
        reloadUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
