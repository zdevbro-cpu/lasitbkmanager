import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';
import apiClient from '../services/api.client';

export type StaffRole = 'system_admin' | 'store_manager' | 'young_creator';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  phone?: string;
  store_id?: string | null;
  store_code?: string | null;
  store_name?: string | null;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  system_admin: '시스템관리자',
  store_manager: '점장',
  young_creator: '영크리에이터',
};

interface AuthContextValue {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user ?? null, session?.access_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleUserChange(session?.user ?? null, session?.access_token);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUserChange = async (u: User | null, accessToken?: string) => {
    setUser(u);
    if (u) {
      try {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const res = await apiClient.get<AdminUser>('/staff/me', { headers });
        setAdminUser(res.data);
      } catch (err) {
        console.error('staff/me fetch failed:', err);
        setAdminUser(null);
      }
    } else {
      setAdminUser(null);
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAdminUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
