"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  Tag,
  Users2,
  Calendar,
  Layers,
  GitBranch,
  FolderOpen,
  FolderTree,
  Grid3X3,
  Ruler,
  ShoppingBag,
  Barcode,
  QrCode,
  Building2,
  Store,
  Package,
  ClipboardPlus,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  ArrowLeftRight,
  Lock,
  FileText,
  PackageCheck,
  Send,
  ShoppingCart,
  BarChart3,
  UserCog,
  Shield,
  ScrollText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building,
  Key,
  ScanLine,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/* =============================================================
   Sidebar Context — shared between Sidebar, Header, and Layout
   ============================================================= */

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
  isMobileOpen: false,
  setMobileOpen: () => {},
  toggleMobile: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  // Close mobile sidebar on route change
  const pathname = usePathname();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen, toggleMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

/* =============================================================
   Navigation Data
   ============================================================= */

interface NavChild {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavChild[];
}

const navigation: NavGroup[] = [
  {
    section: "",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: "Masters",
    items: [
      {
        label: "Masters",
        icon: Tag,
        children: [
          { label: "Brands", href: "/dashboard/masters/brands", icon: Tag },
          { label: "Genders", href: "/dashboard/masters/genders", icon: Users2 },
          { label: "Seasons", href: "/dashboard/masters/seasons", icon: Calendar },
          { label: "Segments", href: "/dashboard/masters/segments", icon: Layers },
          { label: "Sub Segments", href: "/dashboard/masters/sub-segments", icon: GitBranch },
          { label: "Categories", href: "/dashboard/masters/categories", icon: FolderOpen },
          { label: "Sub Categories", href: "/dashboard/masters/sub-categories", icon: FolderTree },
          { label: "Groups", href: "/dashboard/masters/groups", icon: Grid3X3 },
          { label: "Sizes", href: "/dashboard/masters/sizes", icon: Ruler },
          { label: "Articles", href: "/dashboard/masters/articles", icon: ShoppingBag },
          { label: "SKUs", href: "/dashboard/masters/skus", icon: Barcode },
          { label: "Barcode Labels", href: "/dashboard/masters/barcode-labels", icon: QrCode },
        ],
      },
      {
        label: "Customers",
        icon: Building2,
        children: [
          { label: "Clients", href: "/dashboard/customers/clients", icon: Building2 },
          { label: "Stores", href: "/dashboard/customers/stores", icon: Store },
        ],
      },
    ],
  },
  {
    section: "Inventory",
    items: [
      {
        label: "Inventory",
        icon: Package,
        children: [
          { label: "Stock Overview", href: "/dashboard/inventory/stock", icon: Package },
          { label: "Receipt (GRN)", href: "/dashboard/inventory/receipt", icon: ClipboardPlus },
          { label: "Dispatch", href: "/dashboard/inventory/dispatch", icon: Truck },
          { label: "Returns", href: "/dashboard/inventory/returns", icon: RotateCcw },
          { label: "Adjustment", href: "/dashboard/inventory/adjustment", icon: SlidersHorizontal },
          { label: "Transactions", href: "/dashboard/inventory/transactions", icon: ArrowLeftRight },
          { label: "Stock Freeze", href: "/dashboard/inventory/stock-freeze", icon: Lock },
        ],
      },
    ],
  },
  {
    section: "Orders",
    items: [
      {
        label: "Orders",
        icon: ShoppingCart,
        children: [
          { label: "Scan Entry", href: "/dashboard/orders/scan", icon: ScanLine },
          { label: "Manual Entry", href: "/dashboard/orders/manual", icon: ClipboardList },
          { label: "Customer Orders", href: "/dashboard/orders", icon: ShoppingCart },
          { label: "Sales Channels", href: "/dashboard/orders/channels", icon: ShoppingCart },
        ],
      },
    ],
  },
  {
    section: "Billing",
    items: [
      {
        label: "Billing",
        icon: FileText,
        children: [
          { label: "Invoices", href: "/dashboard/billing/invoices", icon: FileText },
          { label: "Packing", href: "/dashboard/billing/packing", icon: PackageCheck },
          { label: "Delivery", href: "/dashboard/billing/delivery", icon: Send },
        ],
      },
    ],
  },
  {
    section: "Reports",
    items: [
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    section: "Administration",
    items: [
      {
        label: "Administration",
        icon: UserCog,
        children: [
          { label: "Users", href: "/dashboard/admin/users", icon: UserCog },
          { label: "Roles", href: "/dashboard/admin/roles", icon: Shield },
          { label: "Audit", href: "/dashboard/admin/audit", icon: ScrollText },
          { label: "Company Master", href: "/dashboard/admin/company", icon: Building },
          { label: "License", href: "/dashboard/admin/license", icon: Key },
        ],
      },
    ],
  },
];

/* =============================================================
   Tooltip Component (for collapsed mode)
   ============================================================= */

function Tooltip({
  children,
  label,
  show,
}: {
  children: ReactNode;
  label: string;
  show: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleEnter = () => {
    if (!show) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), 200);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show && isVisible && (
        <div
          className={cn(
            "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100]",
            "px-2.5 py-1.5 text-xs font-medium text-white",
            "bg-[hsl(222,47%,20%)] rounded-md shadow-lg",
            "whitespace-nowrap pointer-events-none",
            "animate-fadeIn"
          )}
        >
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[hsl(222,47%,20%)]" />
        </div>
      )}
    </div>
  );
}

/* =============================================================
   Submenu Item
   ============================================================= */

function SubMenuItem({
  child,
  isActive,
  isCollapsed,
}: {
  child: NavChild;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = child.icon;
  return (
    <Tooltip label={child.label} show={isCollapsed}>
      <Link
        href={child.href}
        className={cn(
          "group flex items-center gap-2.5 py-1.5 text-[13px] rounded-md transition-all duration-150",
          isCollapsed
            ? "justify-center px-0 mx-auto w-10 h-9"
            : "px-3 ml-[22px] border-l-2",
          isActive
            ? cn(
                "text-white font-medium",
                isCollapsed
                  ? "bg-[hsl(var(--sidebar-active)/_0.15)]"
                  : "border-l-[hsl(var(--sidebar-active))] bg-[hsl(var(--sidebar-active)/_0.1)]"
              )
            : cn(
                "text-[hsl(var(--sidebar-foreground)/_0.6)]",
                isCollapsed
                  ? "hover:bg-white/5"
                  : "border-l-[hsl(var(--sidebar-border))] hover:border-l-[hsl(var(--sidebar-foreground)/_0.3)] hover:text-[hsl(var(--sidebar-foreground)/_0.85)] hover:bg-white/[0.03]"
              )
        )}
      >
        {isCollapsed ? (
          <Icon size={16} />
        ) : (
          <span className="truncate">{child.label}</span>
        )}
      </Link>
    </Tooltip>
  );
}

/* =============================================================
   Nav Item (top level)
   ============================================================= */

function NavMenuItem({
  item,
  isCollapsed,
  isExpanded,
  onToggle,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const Icon = item.icon;

  // For items with direct href (no children)
  if (!item.children && item.href) {
    const isActive = pathname === item.href;
    return (
      <Tooltip label={item.label} show={isCollapsed}>
        <Link
          href={item.href}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
            isCollapsed
              ? "justify-center w-11 h-11 mx-auto"
              : "px-3 py-2.5",
            isActive
              ? "bg-[hsl(var(--sidebar-active)/_0.12)] text-white"
              : "text-[hsl(var(--sidebar-foreground)/_0.65)] hover:text-[hsl(var(--sidebar-foreground)/_0.9)] hover:bg-white/[0.04]"
          )}
        >
          {/* Active indicator bar */}
          {isActive && (
            <div
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[hsl(var(--sidebar-active))]",
                isCollapsed ? "h-5" : "h-6"
              )}
            />
          )}
          <Icon
            size={isCollapsed ? 20 : 18}
            className={cn(
              "shrink-0 transition-colors",
              isActive
                ? "text-[hsl(var(--sidebar-active))]"
                : "text-[hsl(var(--sidebar-foreground)/_0.5)] group-hover:text-[hsl(var(--sidebar-foreground)/_0.8)]"
            )}
          />
          {!isCollapsed && (
            <span className="truncate">{item.label}</span>
          )}
          {!isCollapsed && item.badge && (
            <span className="ml-auto text-[10px] font-semibold bg-[hsl(var(--sidebar-active))] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {item.badge}
            </span>
          )}
        </Link>
      </Tooltip>
    );
  }

  // For items with children (expandable)
  const hasActiveChild = item.children?.some((c) => pathname === c.href);
  const isOpen = isExpanded || (isCollapsed && false); // Don't show children inline when collapsed

  return (
    <div>
      <Tooltip label={item.label} show={isCollapsed}>
        <button
          onClick={onToggle}
          className={cn(
            "group relative w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
            isCollapsed
              ? "justify-center w-11 h-11 mx-auto"
              : "px-3 py-2.5",
            hasActiveChild
              ? "bg-white/[0.04] text-white"
              : "text-[hsl(var(--sidebar-foreground)/_0.65)] hover:text-[hsl(var(--sidebar-foreground)/_0.9)] hover:bg-white/[0.04]"
          )}
        >
          {hasActiveChild && (
            <div
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[hsl(var(--sidebar-active))]",
                isCollapsed ? "h-5" : "h-6"
              )}
            />
          )}
          <Icon
            size={isCollapsed ? 20 : 18}
            className={cn(
              "shrink-0 transition-colors",
              hasActiveChild
                ? "text-[hsl(var(--sidebar-active))]"
                : "text-[hsl(var(--sidebar-foreground)/_0.5)] group-hover:text-[hsl(var(--sidebar-foreground)/_0.8)]"
            )}
          />
          {!isCollapsed && (
            <>
              <span className="truncate flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-semibold bg-[hsl(var(--sidebar-active))] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
              <ChevronDown
                size={14}
                className={cn(
                  "shrink-0 text-[hsl(var(--sidebar-foreground)/_0.35)] transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </>
          )}
        </button>
      </Tooltip>

      {/* Submenu */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className={cn("py-1 space-y-0.5", isCollapsed ? "px-1" : "pl-2")}>
          {item.children?.map((child) => (
            <SubMenuItem
              key={child.href}
              child={child}
              isActive={pathname === child.href}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   Sidebar Component
   ============================================================= */

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen } =
    useSidebar();

  // Touch swipe to close mobile sidebar (swipe left to close)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      // Swipe left: negative deltaX, and horizontal movement exceeds vertical
      if (deltaX < -60 && Math.abs(deltaX) > Math.abs(deltaY)) {
        setMobileOpen(false);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [setMobileOpen]
  );

  // Auto-expand groups that contain the active route
  const getDefaultExpanded = (): string[] => {
    const expanded: string[] = [];
    navigation.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((c) => pathname.startsWith(c.href))) {
          expanded.push(item.label);
        }
      });
    });
    return expanded.length > 0 ? expanded : ["Masters"];
  };

  const [expandedItems, setExpandedItems] = useState<string[]>(
    getDefaultExpanded
  );

  // Re-expand the active section whenever the route changes
  useEffect(() => {
    const active = getDefaultExpanded();
    if (active.length > 0) {
      setExpandedItems((prev) => {
        const merged = [...prev];
        for (const label of active) {
          if (!merged.includes(label)) merged.push(label);
        }
        return merged;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : [...prev, label]
    );
  }, []);

  // User initials
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const sidebarContent = (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]",
        "border-r border-[hsl(var(--sidebar-border))]",
        "transition-[width] duration-300 ease-in-out will-change-[width]",
        "no-theme-transition",
        // Desktop
        "max-md:w-[260px]",
        // Width
        isCollapsed ? "md:w-[72px]" : "md:w-[260px]"
      )}
    >
      {/* ---- Header / Logo ---- */}
      <div
        className={cn(
          "flex items-center border-b border-[hsl(var(--sidebar-border))]",
          "shrink-0",
          isCollapsed ? "justify-center px-2 py-4 h-[64px]" : "px-5 py-4 h-[64px]"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark */}
          <div className="w-9 h-9 bg-[hsl(var(--sidebar-active))] rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <span className="text-white font-bold text-sm tracking-tight">
              EC
            </span>
          </div>
          {/* Logo text */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              isCollapsed
                ? "w-0 opacity-0"
                : "w-auto opacity-100"
            )}
          >
            <h1 className="font-bold text-sm tracking-wide whitespace-nowrap text-[hsl(var(--sidebar-foreground))]">
              EL CURIO
            </h1>
            <p className="text-[11px] text-[hsl(var(--sidebar-foreground)/_0.4)] whitespace-nowrap">
              Retail Distribution
            </p>
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "hidden md:flex items-center justify-center",
            "w-7 h-7 rounded-md",
            "text-[hsl(var(--sidebar-foreground)/_0.4)] hover:text-[hsl(var(--sidebar-foreground)/_0.8)]",
            "hover:bg-white/[0.06] transition-all duration-150",
            isCollapsed ? "mx-auto" : "ml-auto shrink-0"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </div>

      {/* ---- Navigation ---- */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-3",
          isCollapsed ? "px-2" : "px-3"
        )}
      >
        {navigation.map((group, groupIdx) => (
          <div key={group.section || `group-${groupIdx}`} className="mb-1">
            {/* Section header */}
            {group.section && !isCollapsed && (
              <div className="px-3 pt-4 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sidebar-foreground)/_0.3)]">
                  {group.section}
                </span>
              </div>
            )}
            {group.section && isCollapsed && (
              <div className="my-2 mx-3 h-px bg-[hsl(var(--sidebar-border))]" />
            )}

            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavMenuItem
                  key={item.label}
                  item={item}
                  isCollapsed={isCollapsed}
                  isExpanded={expandedItems.includes(item.label)}
                  onToggle={() => toggleExpand(item.label)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ---- Footer / User ---- */}
      <div
        className={cn(
          "shrink-0 border-t border-[hsl(var(--sidebar-border))]",
          isCollapsed ? "p-2" : "p-3"
        )}
      >
        <div
          className={cn(
            "flex items-center rounded-lg transition-colors",
            isCollapsed
              ? "justify-center p-2"
              : "gap-3 px-3 py-2.5"
          )}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--sidebar-active)/_0.2)] flex items-center justify-center text-xs font-semibold text-[hsl(var(--sidebar-active))] shrink-0">
            {initials}
          </div>

          {/* User info */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-[hsl(var(--sidebar-foreground)/_0.9)]">
                {user?.fullName || "User"}
              </p>
              <p className="text-[11px] text-[hsl(var(--sidebar-foreground)/_0.4)] truncate">
                {user?.role || "Admin"}
              </p>
            </div>
          )}

          {/* Logout */}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-[hsl(var(--sidebar-foreground)/_0.35)] hover:text-[hsl(var(--sidebar-foreground)/_0.8)] hover:bg-white/[0.06] transition-all duration-150"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

        {/* Collapsed mode: logout icon below avatar */}
        {isCollapsed && (
          <Tooltip label="Logout" show={true}>
            <button
              onClick={logout}
              className="w-full flex justify-center p-2 mt-1 rounded-md text-[hsl(var(--sidebar-foreground)/_0.35)] hover:text-[hsl(var(--sidebar-foreground)/_0.8)] hover:bg-white/[0.06] transition-all duration-150"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </Tooltip>
        )}

        {/* Version tag */}
        {!isCollapsed && (
          <p className="text-center text-[10px] text-[hsl(var(--sidebar-foreground)/_0.2)] mt-1">
            v1.0.0
          </p>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* ---- Desktop Sidebar ---- */}
      <div className="hidden md:block h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* ---- Mobile Backdrop ---- */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---- Mobile Sidebar (overlay) ---- */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50",
          "transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {sidebarContent}
      </div>
    </>
  );
}
