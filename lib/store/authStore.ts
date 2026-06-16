import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'guest';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  hasInvite: boolean;

  setHasInvite: (val: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  enterGuestMode: () => void;
  restore: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isGuest: false,
  hasInvite: false,

  setHasInvite: (val) => set({ hasInvite: val }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      await AsyncStorage.setItem('modysole_token', data.token);
      await AsyncStorage.setItem('modysole_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isGuest: false, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (name, email, password, phone, invite_code) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password, phone, invite_code });
      await AsyncStorage.setItem('modysole_token', data.token);
      await AsyncStorage.setItem('modysole_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isGuest: false, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('modysole_token');
    await AsyncStorage.removeItem('modysole_user');
    set({ user: null, token: null, isGuest: false });
  },

  enterGuestMode: () => {
    set({
      user: { id: 'guest', name: 'Guest', email: '', role: 'guest' },
      isGuest: true,
      isLoading: false,
    });
  },

  restore: async () => {
    try {
      const token = await AsyncStorage.getItem('modysole_token');
      const userStr = await AsyncStorage.getItem('modysole_user');
      const inviteCode = await AsyncStorage.getItem('modysole_invite_verified');
      
      const hasInvite = !!inviteCode;
      const user = userStr ? JSON.parse(userStr) : null;

      if (token) {
        if (user) {
          // Optimistically load cached user profile and allow navigation instantly
          set({ user, token, isLoading: false, hasInvite });
          
          // Verify & refresh profile in the background
          api.get('/api/auth/me')
            .then(async ({ data }) => {
              await AsyncStorage.setItem('modysole_user', JSON.stringify(data.user));
              set({ user: data.user });
            })
            .catch(async (err) => {
              // Only log out if it is an authentication failure (401/403)
              if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                await AsyncStorage.removeItem('modysole_token');
                await AsyncStorage.removeItem('modysole_user');
                set({ user: null, token: null });
              }
            });
        } else {
          // Fallback if user profile wasn't cached yet (first load on updated version)
          const { data } = await api.get('/api/auth/me');
          await AsyncStorage.setItem('modysole_user', JSON.stringify(data.user));
          set({ user: data.user, token, isLoading: false, hasInvite });
        }
      } else {
        set({ isLoading: false, hasInvite });
      }
    } catch {
      await AsyncStorage.removeItem('modysole_token');
      await AsyncStorage.removeItem('modysole_user');
      set({ user: null, token: null, isLoading: false });
    }
  },
  
  updateProfile: async (payload) => {
    const { data } = await api.put('/api/auth/profile', payload);
    await AsyncStorage.setItem('modysole_user', JSON.stringify(data.user));
    set({ user: data.user });
  },
}));
