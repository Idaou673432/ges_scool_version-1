/**
 * SomaSikolo - Context d'Authentification React
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { AuthService } from '../services/authService';
import { secureLocalStorage } from '../services/secureStorage';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loginAsUser: (userId: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
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
    const defaultUser = loadedUsers.find(u => u.id === savedActiveId) || loadedUsers[0];
    if (defaultUser) {
      setCurrentUser(defaultUser);
    }
  };

  useEffect(() => {
    storageService.initDatabase();
    reloadUsers();
  }, []);

  const loginAsUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
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
    const found = users.find(u => u.role === role);
    if (found) {
      loginAsUser(found.id);
    } else if (currentUser) {
      const updated = { ...currentUser, role };
      setCurrentUser(updated);
    }
  };

  const saveUser = (user: Partial<User>): User => {
    const saved = storageService.saveUser(user);
    const updatedUsers = storageService.getUsers();
    setUsers(updatedUsers);
    if (currentUser && currentUser.id === saved.id) {
      setCurrentUser(saved);
    }
    return saved;
  };

  const deleteUser = (userId: string): boolean => {
    const res = storageService.deleteUser(userId);
    if (res) {
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        loginAsUser,
        logout,
        hasPermission,
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
