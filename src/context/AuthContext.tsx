import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Teacher } from '../types';
import { getMe } from '../api/auth';

interface AuthContextValue {
  user: Teacher | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: Teacher) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Teacher | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then(u => setUser(u))
      .catch(() => {
        localStorage.removeItem('access_token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const setAuth = (newToken: string, newUser: Teacher) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
