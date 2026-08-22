/**
 * SomaSikolo - Context d'Authentification React
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { AuthService } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loginAsUser: (userId: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  switchRoleSimulated: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    storageService.initDatabase();
    const loadedUsers = storageService.getUsers();
    setUsers(loadedUsers);

    // Default to Admin or Directeur for initial view
    const savedActiveId = localStorage.getItem('somasikolo_active_user_id');
    const defaultUser = loadedUsers.find(u => u.id === savedActiveId) || loadedUsers[0];
    setCurrentUser(defaultUser);
  }, []);

  const loginAsUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('somasikolo_active_user_id', userId);
      storageService.addAuditLog('CONNEXION', 'AUTHENTIFICATION', `Connexion de ${found.fullName} (${found.role})`);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('somasikolo_active_user_id');
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
        switchRoleSimulated
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
