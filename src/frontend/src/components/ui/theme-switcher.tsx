"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sun, Moon, Monitor, Check, Palette } from "lucide-react";
import {
  useThemeStore,
  COLOR_THEMES,
  THEME_MODES,
  type ThemeMode,
  type ColorTheme,
} from "@/store/theme-store";

/* ============================================================
   ThemeSwitcher — dropdown control for mode + color theme
   ============================================================ */

const MODE_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Monitor className="h-4 w-4" />,
};

export function ThemeSwitcher() {
  const { mode, colorTheme, setMode, setColorTheme, initTheme } =
    useThemeStore();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);

  // Determine the trigger icon based on resolved state
  const triggerIcon =
    mode === "system" ? MODE_ICONS.system : MODE_ICONS[mode];

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="
          inline-flex items-center justify-center
          h-9 w-9 rounded-lg
          text-muted-foreground
          hover:text-foreground hover:bg-accent
          focus-ring
          transition-colors duration-200
        "
        aria-label="Toggle theme"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {triggerIcon}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="
            absolute right-0 top-full mt-2 z-50
            w-56 rounded-xl
            bg-card border border-border
            shadow-xl
            p-1.5
            animate-scaleIn
            origin-top-right
          "
          role="menu"
        >
          {/* --- Mode section --- */}
          <div className="px-2 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Appearance
            </span>
          </div>

          {THEME_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setMode(m.value);
              }}
              className={`
                w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm
                transition-colors duration-150
                ${
                  mode === m.value
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }
              `}
            >
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {MODE_ICONS[m.value]}
              </span>
              <span className="flex-1 text-left">{m.label}</span>
              {mode === m.value && (
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </button>
          ))}

          {/* --- Divider --- */}
          <div className="my-1.5 mx-2 h-px bg-border" />

          {/* --- Color theme section --- */}
          <div className="px-2 py-1.5 flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Accent Color
            </span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-2">
            {COLOR_THEMES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setColorTheme(ct.value);
                }}
                className="
                  relative flex items-center justify-center
                  h-7 w-7 rounded-full
                  transition-transform duration-150
                  hover:scale-110
                  focus-ring
                "
                style={{ backgroundColor: `hsl(${ct.hsl})` }}
                aria-label={`${ct.label} theme`}
                title={ct.label}
              >
                {colorTheme === ct.value && (
                  <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                )}
                {/* Selection ring */}
                {colorTheme === ct.value && (
                  <span
                    className="absolute inset-[-3px] rounded-full border-2 pointer-events-none"
                    style={{ borderColor: `hsl(${ct.hsl})` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
