import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SocialLinks {
  whatsapp?: string;
  facebook?: string;
  linkedin?: string;
}

interface PrivacySettings {
  blur_photo: boolean;
  hide_online_status: boolean;
  anonymous_browsing: boolean;
  disappearing_messages: boolean;
  read_receipts: boolean;
}

interface User {
  _id: string;
  email: string;
  name: string;
  age: number;
  gender: string;
  bio?: string;
  location?: string;
  photo?: string;
  is_premium: boolean;
  is_verified: boolean;
  subscription_end: string;
  questionnaire_completed: boolean;
  preferences?: any;
  social_links?: SocialLinks;
  privacy_settings?: PrivacySettings;
  orientation?: string;
  connection_types?: string[];
  interests?: string[];
  last_active?: string;
  super_likes_remaining?: number;
  coins?: number;
  referral_code?: string;
  referred_by?: string;
  referral_count?: number;
  email_verified?: boolean;
  verification_status?: string; // unverified, pending, verified
  verification_type?: string;
  subscription_plan?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  detectLocation: () => Promise<{ city: string; country: string; country_code: string; detected: boolean }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  login: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });

      const { access_token, user_id } = response.data;
      await AsyncStorage.setItem('token', access_token);
      set({ token: access_token });

      // Load user data
      await get().loadUser();
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  register: async (data: any) => {
    try {
      set({ loading: true });
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, data);

      const { access_token } = response.data;
      await AsyncStorage.setItem('token', access_token);
      set({ token: access_token });

      // Load user data
      await get().loadUser();
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    try {
      const token = get().token || (await AsyncStorage.getItem('token'));
      if (!token) {
        set({ user: null, token: null });
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      set({ user: response.data, token });
    } catch (error) {
      console.error('Load user error:', error);
      set({ user: null, token: null });
      await AsyncStorage.removeItem('token');
    }
  },

  updateUser: async (data: any) => {
    try {
      const token = get().token;
      const response = await axios.put(`${BACKEND_URL}/api/profile/update`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      set({ user: response.data });
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  sendOTP: async (email: string) => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/send-otp`, { email });
    } catch (error: any) {
      console.error('Send OTP error:', error.response?.data || error.message);
      throw error;
    }
  },

  verifyOTP: async (email: string, otp: string) => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/verify-otp`, { email, otp });
      // Reload user to get updated email_verified status
      await get().loadUser();
    } catch (error: any) {
      console.error('Verify OTP error:', error.response?.data || error.message);
      throw error;
    }
  },

  detectLocation: async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/auth/detect-location`);
      return response.data;
    } catch (error) {
      console.error('Detect location error:', error);
      return { city: '', country: '', country_code: '', detected: false };
    }
  },
}));
