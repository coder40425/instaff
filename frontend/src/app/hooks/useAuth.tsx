import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read synchronously ONCE at module load — before first render.
// This eliminates the flicker where user is null for one tick on refresh.
function getInitialAuth(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (token && raw) {
      return { token, user: JSON.parse(raw) };
    }
  } catch {
    // corrupted storage — clear it
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return { token: null, user: null };
}

const initial = getInitialAuth();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  // loading is false immediately because we read synchronously above
  const [loading, setLoading] = useState(false);

  // Keep localStorage in sync whenever token/user changes
  useEffect(() => {
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [token, user]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((currentUser) => currentUser ? { ...currentUser, ...updates } : currentUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        updateUser,
        logout,
        isAuthenticated: !!token && !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
