import { create } from "zustand";

/* ============================================================
   Theme Store — Zustand-powered theme management
   Persists mode and color theme to localStorage.
   Applies classes to <html> for CSS variable resolution.
   ============================================================ */

export type ThemeMode = "light" | "dark" | "system";
export type ColorTheme = "blue" | "indigo" | "emerald" | "purple" | "orange";

export const COLOR_THEMES: { value: ColorTheme; label: string; hsl: string }[] = [
  { value: "blue", label: "Blue", hsl: "217 91% 60%" },
  { value: "indigo", label: "Indigo", hsl: "239 84% 67%" },
  { value: "emerald", label: "Emerald", hsl: "160 84% 39%" },
  { value: "purple", label: "Purple", hsl: "271 91% 65%" },
  { value: "orange", label: "Orange", hsl: "24 100% 50%" },
];

export const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const STORAGE_KEY_MODE = "theme-mode";
const STORAGE_KEY_COLOR = "color-theme";

interface ThemeState {
  mode: ThemeMode;
  colorTheme: ColorTheme;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  initTheme: () => void;
}

/** Resolve the effective mode (light/dark) from the selected mode. */
function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }
  return mode;
}

/** Apply the dark class and theme class to <html>. */
function applyToDocument(resolved: "light" | "dark", colorTheme: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Dark / light
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Remove all theme-* classes then add the active one
  root.classList.remove(
    "theme-blue",
    "theme-indigo",
    "theme-emerald",
    "theme-purple",
    "theme-orange"
  );
  root.classList.add(`theme-${colorTheme}`);
}

/** Read a value from localStorage safely (handles SSR + errors). */
function readStorage<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return (value as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Write to localStorage safely. */
function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

// ---- MediaQuery listener reference (singleton cleanup) ----
let mediaQueryCleanup: (() => void) | null = null;

function setupSystemThemeListener(store: { getState: () => ThemeState }) {
  if (typeof window === "undefined") return;

  // Clean up previous listener
  if (mediaQueryCleanup) {
    mediaQueryCleanup();
    mediaQueryCleanup = null;
  }

  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  const handler = () => {
    const state = store.getState();
    if (state.mode === "system") {
      const resolved = mq.matches ? "dark" : "light";
      applyToDocument(resolved, state.colorTheme);

      // We use setState from the raw store (accessed via `useThemeStore`)
      // to avoid circular deps. The cast is safe because Zustand exposes
      // `setState` on the store object.
      (store as unknown as { setState: (partial: Partial<ThemeState>) => void }).setState({
        resolvedMode: resolved,
      });
    }
  };

  mq.addEventListener("change", handler);
  mediaQueryCleanup = () => mq.removeEventListener("change", handler);
}

export const useThemeStore = create<ThemeState>((set, get, store) => ({
  mode: "system",
  colorTheme: "orange",
  resolvedMode: "light",

  setMode: (mode: ThemeMode) => {
    writeStorage(STORAGE_KEY_MODE, mode);
    const resolved = resolveMode(mode);
    applyToDocument(resolved, get().colorTheme);
    set({ mode, resolvedMode: resolved });
  },

  setColorTheme: (colorTheme: ColorTheme) => {
    writeStorage(STORAGE_KEY_COLOR, colorTheme);
    applyToDocument(get().resolvedMode, colorTheme);
    set({ colorTheme });
  },

  initTheme: () => {
    const savedMode = readStorage<ThemeMode>(STORAGE_KEY_MODE, "system");
    const savedColor = readStorage<ColorTheme>(STORAGE_KEY_COLOR, "orange");
    const resolved = resolveMode(savedMode);

    applyToDocument(resolved, savedColor);
    set({ mode: savedMode, colorTheme: savedColor, resolvedMode: resolved });

    // Listen for system theme changes
    setupSystemThemeListener(store);
  },
}));
