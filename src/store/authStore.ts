import { create } from 'zustand';
import type { User } from '../../shared/types';
import { authApi } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  initializeAuth: () => void;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      if (response.success && response.data) {
        const { token, user } = response.data;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  initializeAuth: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  },
}));
