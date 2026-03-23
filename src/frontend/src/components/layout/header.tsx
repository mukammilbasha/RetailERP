"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import {
  Search,
  Bell,
  Menu,
  ChevronRight,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";

/* =============================================================
   Route Label Map — for human-readable breadcrumbs
   ============================================================= */

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  masters: "Masters",
  brands: "Brands",
  genders: "Genders",
  seasons: "Seasons",
  segments: "Segments",
  "sub-segments": "Sub Segments",
  categories: "Categories",
  "sub-categories": "Sub Categories",
  groups: "Groups",
  sizes: "Sizes",
  articles: "Articles",
  skus: "SKUs",
  hsn: "HSN",
  customers: "Customers",
  clients: "Clients",
  stores: "Stores",
  inventory: "Inventory",
  stock: "Stock Overview",
  receipt: "Receipt (GRN)",
  dispatch: "Dispatch",
  returns: "Returns",
  adjustment: "Adjustment",
  transactions: "Transactions",
  billing: "Billing",
  invoices: "Invoices",
  packing: "Packing",
  delivery: "Delivery",
  reports: "Reports",
  admin: "Administration",
  users: "Users",
  roles: "Roles",
  audit: "Audit Log",
  warehouse: "Warehouse",
  production: "Production",
  orders: "Orders",
};

/* =============================================================
   Breadcrumb Component
   ============================================================= */

function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "dashboard"); // Remove "dashboard" since we show its icon

  const crumbs = segments.map((segment, index) => {
    const href =
      "/dashboard" +
      (segments.slice(0, index + 1).length > 0
        ? "/" + segments.slice(0, index + 1).join("/")
        : "");
    const label =
      ROUTE_LABELS[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        Dashboard
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight
            size={14}
            className="text-muted-foreground/50"
          />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

/* =============================================================
   Search Modal (Cmd+K)
   ============================================================= */

function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    setQuery("");
  }, [isOpen]);

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[15vh]">
        <div
          className={cn(
            "w-full max-w-[560px] mx-4",
            "bg-card border border-border rounded-xl shadow-2xl",
            "animate-scaleIn overflow-hidden"
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, records, actions..."
              className="flex-1 py-4 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            <kbd className="hidden sm:inline-flex items-center text-[11px] text-muted-foreground/60 border border-border rounded px-1.5 py-0.5 font-mono">
              ESC
            </kbd>
          </div>

          {/* Results area */}
          <div className="px-2 py-2 max-h-[320px] overflow-y-auto">
            {query.length === 0 ? (
              <div className="px-3 py-8 text-center text-muted-foreground/60 text-sm">
                Start typing to search across the application...
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-muted-foreground/60 text-sm">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground/50">
            <span className="flex items-center gap-1">
              <kbd className="border border-border rounded px-1 py-0.5 font-mono">
                &uarr;&darr;
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-border rounded px-1 py-0.5 font-mono">
                &crarr;
              </kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-border rounded px-1 py-0.5 font-mono">
                Esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* =============================================================
   User Dropdown
   ============================================================= */

function UserDropdown() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 p-1 rounded-lg transition-colors",
          "hover:bg-muted focus-ring",
          isOpen && "bg-muted"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
          {initials}
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-64 rounded-xl border border-border bg-card shadow-xl",
            "animate-slideDown overflow-hidden"
          )}
        >
          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.fullName || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "user@elcurio.com"}
                </p>
                <span className="inline-flex items-center mt-1 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  {user?.role || "Admin"}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted transition-colors"
            >
              <User size={15} className="text-muted-foreground" />
              Profile Settings
            </Link>
            <Link
              href="/dashboard/admin/users"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted transition-colors"
            >
              <Settings size={15} className="text-muted-foreground" />
              Preferences
            </Link>
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-border py-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   Header Component
   ============================================================= */

function MobilePageName() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).filter((s) => s !== "dashboard");
  const lastSegment = segments[segments.length - 1] || "dashboard";
  const label =
    ROUTE_LABELS[lastSegment] ||
    lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ");

  return (
    <span className="sm:hidden text-sm font-medium text-foreground truncate max-w-[140px]">
      {label}
    </span>
  );
}

export function Header() {
  const { toggleMobile } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 h-14",
          "bg-card/80 backdrop-blur-xl",
          "border-b border-border",
          "flex items-center justify-between gap-4",
          "px-4 md:px-6"
        )}
      >
        {/* ---- Left section ---- */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={toggleMobile}
            className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          {/* Mobile: current page name only */}
          <MobilePageName />

          {/* Desktop/Tablet: full breadcrumbs */}
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* ---- Center: Search bar (hidden on mobile, shown on sm+) ---- */}
        <div className="hidden sm:flex flex-1 justify-center max-w-md mx-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex items-center gap-2.5 w-full max-w-xs",
              "px-3 py-2 rounded-lg",
              "bg-muted/50 border border-transparent",
              "hover:border-border hover:bg-muted",
              "text-muted-foreground/60 text-sm",
              "transition-all duration-150 focus-ring"
            )}
            aria-label="Search (Ctrl+K)"
          >
            <Search size={15} className="shrink-0" />
            <span className="hidden sm:inline truncate">Search...</span>
            <kbd className="hidden md:inline-flex items-center ml-auto text-[11px] text-muted-foreground/40 border border-border/60 rounded px-1.5 py-0.5 font-mono bg-background/50">
              {typeof navigator !== "undefined" &&
              /Mac|iPod|iPhone|iPad/.test(navigator.platform)
                ? "\u2318K"
                : "Ctrl+K"}
            </kbd>
          </button>
        </div>

        {/* ---- Mobile: Search icon only ---- */}
        <div className="sm:hidden flex-1" />
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* ---- Right section ---- */}
        <div className="flex items-center gap-1.5">
          {/* Theme switcher */}
          <ThemeSwitcher />

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {/* Notification indicator dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
          </button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-border mx-1" />

          {/* User dropdown */}
          <UserDropdown />
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
