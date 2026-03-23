import { create } from "zustand";
import api, { type ApiResponse } from "@/lib/api";

interface LicenseState {
  daysRemaining: number | null;
  validUntil: string | null;
  plan: string | null;
  status: string | null;
  isLoaded: boolean;
  fetchLicense: () => Promise<void>;
  reset: () => void;
}

interface LicenseInfo {
  validUntil: string;
  plan: string;
  status: string;
}

export const useLicenseStore = create<LicenseState>((set) => ({
  daysRemaining: null,
  validUntil: null,
  plan: null,
  status: null,
  isLoaded: false,

  fetchLicense: async () => {
    try {
      const { data } = await api.get<ApiResponse<LicenseInfo>>("/api/auth/tenant/license");
      if (data.success && data.data) {
        const license = data.data;
        const diff = new Date(license.validUntil).getTime() - Date.now();
        const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        set({
          daysRemaining,
          validUntil: license.validUntil,
          plan: license.plan,
          status: license.status,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  reset: () => set({ daysRemaining: null, validUntil: null, plan: null, status: null, isLoaded: false }),
}));
