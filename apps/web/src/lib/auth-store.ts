/**
 * Anagu — Auth store (Zustand)
 * Persists JWT token and user profile in localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id:       string;
  email:    string;
  fullName: string;
  role:     string;
}

interface AuthState {
  token:   string | null;
  user:    AuthUser | null;
  isAuthenticated: boolean;
  setAuth:  (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      user:            null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        localStorage.setItem("anagu_token", token);
        set({ token, user, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem("anagu_token");
        localStorage.removeItem("anagu_user");
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: "anagu_auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
