import { create } from "zustand";
import api from "@/lib/api";

interface User {
  userId: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: string;
  tenantName: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    if (data.success) {
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    } else {
      throw new Error(data.message || "Login failed");
    }
  },

  logout: () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      api.post("/api/auth/revoke", { refreshToken }).catch(() => {});
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, isAuthenticated: false, isLoading: false });
    window.location.href = "/login";
  },

  updateUser: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : state.user,
    }));
  },

  checkAuth: () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        if (!isExpired) {
          set({
            user: {
              userId: payload.sub,
              tenantId: payload.tenantId,
              fullName: payload.fullName || payload.name || payload.email,
              email: payload.email,
              role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
              tenantName: payload.tenantName,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {}
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
