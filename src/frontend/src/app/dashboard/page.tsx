"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Users,
  ClipboardList,
  Receipt,
  Warehouse,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  PackageOpen,
  Activity,
  ChevronRight,
} from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/ui/chart-card";
import { formatCurrency, formatDate } from "@/lib/utils";

/* =================================================================
   TYPES
   ================================================================= */
interface DashboardStats {
  totalArticles: number;
  totalClients: number;
  openOrders: number;
  revenue: number;
  warehouseStock: number;
  pendingInvoices: number;
}

interface RecentOrder {
  orderId: string;
  orderNo: string;
  orderDate: string;
  clientName: string;
  storeName: string;
  totalQuantity: number;
  totalAmount: number;
  status: string;
}

interface StatCardDef {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: number;
  trendLabel: string;
  color: string;
  bgColor: string;
}

/* =================================================================
   SAMPLE DATA — used when API is unreachable
   ================================================================= */
const SAMPLE_SALES_DATA = [45000, 52000, 48000, 61000, 55000, 67000];
const SAMPLE_MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const INVENTORY_DISTRIBUTION = [
  { label: "Footwear", value: 45, color: "hsl(24, 100%, 50%)" },
  { label: "Bags", value: 30, color: "hsl(217, 91%, 60%)" },
  { label: "Belts", value: 25, color: "hsl(142, 76%, 36%)" },
];

const PRODUCTION_STATUS = [
  { label: "Draft", count: 12, color: "hsl(var(--muted-foreground))", bg: "bg-muted" },
  { label: "Approved", count: 8, color: "hsl(217, 91%, 60%)", bg: "bg-blue-500" },
  { label: "In Progress", count: 15, color: "hsl(38, 92%, 50%)", bg: "bg-amber-500" },
  { label: "Completed", count: 23, color: "hsl(142, 76%, 36%)", bg: "bg-green-500" },
];

const RECENT_ACTIVITY = [
  {
    text: "New order #ORD-001 created",
    time: "2 hours ago",
    dotColor: "bg-blue-500",
  },
  {
    text: "Invoice #INV-005 issued",
    time: "5 hours ago",
    dotColor: "bg-green-500",
  },
  {
    text: "Stock receipt at Mumbai Warehouse",
    time: "8 hours ago",
    dotColor: "bg-amber-500",
  },
  {
    text: "Article ART-112 updated",
    time: "12 hours ago",
    dotColor: "bg-purple-500",
  },
  {
    text: "Client Rajesh Traders added",
    time: "1 day ago",
    dotColor: "bg-primary",
  },
  {
    text: "Production order #PO-034 completed",
    time: "1 day ago",
    dotColor: "bg-green-500",
  },
];

/* =================================================================
   SVG CHART COMPONENTS
   ================================================================= */

/** ---------- Area Chart ---------- */
function SalesAreaChart({ data, labels }: { data: number[]; labels: string[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const width = 520;
  const height = 200;
  const padX = 44;
  const padY = 20;
  const padBottom = 32;

  const chartW = width - padX * 2;
  const chartH = height - padY - padBottom;

  const maxVal = Math.max(...data);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + chartH - ((d - minVal) / range) * chartH,
    val: d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (range / yTicks) * i);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Sales analytics area chart"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTickValues.map((val, i) => {
        const y = padY + chartH - ((val - minVal) / range) * chartH;
        return (
          <g key={i}>
            <line
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={padX - 8}
              y={y + 4}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
              fontSize={10}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {val >= 1000 ? `${Math.round(val / 1000)}K` : val}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path
        d={areaPath}
        fill="url(#areaGrad)"
        className={mounted ? "animate-fadeIn" : "opacity-0"}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={mounted ? "animate-fadeIn" : "opacity-0"}
      />

      {/* Data points & labels */}
      {points.map((p, i) => (
        <g key={i}>
          {/* X-axis label */}
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={11}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {labels[i]}
          </text>

          {/* Hover zone */}
          <rect
            x={p.x - 24}
            y={padY}
            width={48}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          />

          {/* Data point */}
          <circle
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 5 : 3.5}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--card))"
            strokeWidth={2}
            className="transition-all duration-150"
          />

          {/* Tooltip */}
          {hoveredIdx === i && (
            <g>
              <line
                x1={p.x}
                y1={p.y + 6}
                x2={p.x}
                y2={padY + chartH}
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.4}
              />
              <rect
                x={p.x - 36}
                y={p.y - 30}
                width={72}
                height={22}
                rx={6}
                fill="hsl(var(--foreground))"
                opacity={0.9}
              />
              <text
                x={p.x}
                y={p.y - 15}
                textAnchor="middle"
                fill="hsl(var(--card))"
                fontSize={11}
                fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {formatCurrency(p.val)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

/** ---------- Donut Chart ---------- */
function DonutChart({
  segments,
  totalItems,
}: {
  segments: { label: string; value: number; color: string }[];
  totalItems: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 52;
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  let cumAngle = -90; // start from top

  const arcs = segments.map((seg, i) => {
    const angle = (seg.value / total) * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const r = hoveredIdx === i ? outerR + 4 : outerR;

    const x1Outer = cx + r * Math.cos(startRad);
    const y1Outer = cy + r * Math.sin(startRad);
    const x2Outer = cx + r * Math.cos(endRad);
    const y2Outer = cy + r * Math.sin(endRad);

    const x1Inner = cx + innerR * Math.cos(endRad);
    const y1Inner = cy + innerR * Math.sin(endRad);
    const x2Inner = cx + innerR * Math.cos(startRad);
    const y2Inner = cy + innerR * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const d = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
      "Z",
    ].join(" ");

    return { ...seg, d, idx: i };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-44 h-44"
        role="img"
        aria-label="Inventory distribution donut chart"
      >
        {arcs.map((arc) => (
          <path
            key={arc.idx}
            d={arc.d}
            fill={arc.color}
            stroke="hsl(var(--card))"
            strokeWidth={2}
            onMouseEnter={() => setHoveredIdx(arc.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="transition-all duration-200 cursor-pointer"
            opacity={hoveredIdx !== null && hoveredIdx !== arc.idx ? 0.6 : 1}
          />
        ))}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize={20}
          fontWeight={700}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {totalItems.toLocaleString("en-IN")}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
        >
          Total Items
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-muted-foreground">
              {seg.label}{" "}
              <span className="font-medium text-foreground">{seg.value}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ---------- Horizontal Bar Chart ---------- */
function ProductionBars({
  items,
}: {
  items: { label: string; count: number; color: string; bg: string }[];
}) {
  const maxCount = Math.max(...items.map((i) => i.count));

  return (
    <div className="space-y-3.5">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground">
              {item.label}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {item.count}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${item.bg} transition-all duration-700 ease-out`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** ---------- Activity Timeline ---------- */
function ActivityTimeline({
  items,
}: {
  items: { text: string; time: string; dotColor: string }[];
}) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 group">
          {/* Timeline column */}
          <div className="flex flex-col items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${item.dotColor} flex-shrink-0 mt-1.5 ring-4 ring-card`}
            />
            {i < items.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[28px]" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4">
            <p className="text-sm text-foreground leading-snug">
              {item.text}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =================================================================
   STAT CARD SKELETON
   ================================================================= */
function StatCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-start justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

/* =================================================================
   MAIN DASHBOARD PAGE
   ================================================================= */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    totalClients: 0,
    openOrders: 0,
    revenue: 0,
    warehouseStock: 0,
    pendingInvoices: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setOrdersLoading(true);

    try {
      const [salesRes, inventoryRes, articlesRes, clientsRes, ordersRes, invoicesRes] =
        await Promise.allSettled([
          api.get<ApiResponse<any>>("/api/reports/sales"),
          api.get<ApiResponse<any>>("/api/reports/inventory"),
          api.get<ApiResponse<any>>("/api/articles", { params: { pageSize: 1 } }),
          api.get<ApiResponse<any>>("/api/clients", { params: { pageSize: 1 } }),
          api.get<ApiResponse<any>>("/api/orders", { params: { pageSize: 5 } }),
          api.get<ApiResponse<any>>("/api/invoices", {
            params: { pageSize: 1, status: "PENDING" },
          }),
        ]);

      const newStats: DashboardStats = {
        totalArticles: 0,
        totalClients: 0,
        openOrders: 0,
        revenue: 0,
        warehouseStock: 0,
        pendingInvoices: 0,
      };

      if (salesRes.status === "fulfilled" && salesRes.value.data.success) {
        newStats.revenue =
          salesRes.value.data.data?.totalRevenue ||
          salesRes.value.data.data?.revenue ||
          0;
      }

      if (inventoryRes.status === "fulfilled" && inventoryRes.value.data.success) {
        newStats.warehouseStock =
          inventoryRes.value.data.data?.totalStock ||
          inventoryRes.value.data.data?.totalQuantity ||
          0;
      }

      if (articlesRes.status === "fulfilled" && articlesRes.value.data.success) {
        newStats.totalArticles = articlesRes.value.data.data?.totalCount || 0;
      }

      if (clientsRes.status === "fulfilled" && clientsRes.value.data.success) {
        newStats.totalClients = clientsRes.value.data.data?.totalCount || 0;
      }

      if (ordersRes.status === "fulfilled" && ordersRes.value.data.success) {
        newStats.openOrders = ordersRes.value.data.data?.totalCount || 0;
        setRecentOrders(ordersRes.value.data.data?.items || []);
      }

      if (invoicesRes.status === "fulfilled" && invoicesRes.value.data.success) {
        newStats.pendingInvoices = invoicesRes.value.data.data?.totalCount || 0;
      }

      setStats(newStats);
    } catch {
      // Keep defaults (zeros) — graceful degradation
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ---- Stat card definitions ---- */
  const statCards: StatCardDef[] = useMemo(
    () => [
      {
        label: "Total Articles",
        value: stats.totalArticles.toLocaleString("en-IN"),
        icon: <Package size={20} />,
        trend: 12,
        trendLabel: "vs last month",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        label: "Active Clients",
        value: stats.totalClients.toLocaleString("en-IN"),
        icon: <Users size={20} />,
        trend: 8,
        trendLabel: "vs last month",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        label: "Open Orders",
        value: stats.openOrders.toLocaleString("en-IN"),
        icon: <ClipboardList size={20} />,
        trend: -5,
        trendLabel: "vs last month",
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
      },
      {
        label: "Revenue",
        value: formatCurrency(stats.revenue),
        icon: <TrendingUp size={20} />,
        trend: 18,
        trendLabel: "vs last month",
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      },
      {
        label: "Warehouse Stock",
        value: stats.warehouseStock.toLocaleString("en-IN"),
        icon: <Warehouse size={20} />,
        trend: 3,
        trendLabel: "vs last month",
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
      },
      {
        label: "Pending Invoices",
        value: stats.pendingInvoices.toLocaleString("en-IN"),
        icon: <Receipt size={20} />,
        trend: -12,
        trendLabel: "vs last month",
        color: "text-rose-500",
        bgColor: "bg-rose-500/10",
      },
    ],
    [stats]
  );

  /* ---- Quick actions ---- */
  const quickActions = [
    {
      label: "New Order",
      icon: <Plus size={16} />,
      href: "/dashboard/orders",
    },
    {
      label: "New Article",
      icon: <Package size={16} />,
      href: "/dashboard/masters/articles",
    },
    {
      label: "Stock Receipt",
      icon: <PackageOpen size={16} />,
      href: "/dashboard/inventory/receipt",
    },
    {
      label: "Generate Invoice",
      icon: <FileText size={16} />,
      href: "/dashboard/billing/invoices",
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ---- Header ---- */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here is your business overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity size={14} className="text-green-500" />
            System online
          </span>
        </div>
      </div>

      {/* ---- Stats Cards (6 cards) ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-card border rounded-xl p-5 flex flex-col justify-between gap-3 card-hover cursor-default group"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <div
                    className={`p-2 rounded-xl ${stat.bgColor} ${stat.color} transition-transform duration-200 group-hover:scale-110`}
                  >
                    {stat.icon}
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {stat.trend > 0 ? (
                      <ArrowUpRight size={14} className="text-green-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.trend > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {Math.abs(stat.trend)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stat.trendLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* ---- Charts Section (2x2 grid) ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Sales Analytics */}
        <ChartCard
          title="Sales Analytics"
          subtitle="Monthly revenue trends"
          className="lg:col-span-1"
        >
          <SalesAreaChart data={SAMPLE_SALES_DATA} labels={SAMPLE_MONTHS} />
        </ChartCard>

        {/* Chart 2: Inventory Distribution */}
        <ChartCard
          title="Inventory by Category"
          subtitle="Distribution across product lines"
        >
          <DonutChart
            segments={INVENTORY_DISTRIBUTION}
            totalItems={4850}
          />
        </ChartCard>

        {/* Chart 3: Production Status */}
        <ChartCard
          title="Production Orders"
          subtitle="Current pipeline overview"
        >
          <ProductionBars items={PRODUCTION_STATUS} />
        </ChartCard>

        {/* Chart 4: Recent Activity */}
        <ChartCard
          title="Recent Activity"
          subtitle="Latest operations across the system"
        >
          <ActivityTimeline items={RECENT_ACTIVITY} />
        </ChartCard>
      </div>

      {/* ---- Quick Actions ---- */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="
              inline-flex items-center gap-2 px-4 py-2.5
              text-sm font-medium
              border rounded-lg
              text-foreground bg-card
              hover:bg-accent hover:border-primary/30
              transition-all duration-200
              focus-ring
              card-hover
            "
          >
            <span className="text-primary">{action.icon}</span>
            {action.label}
          </Link>
        ))}
      </div>

      {/* ---- Recent Orders Table ---- */}
      <div className="bg-card border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest customer orders across all clients
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="
              inline-flex items-center gap-1 text-xs font-medium
              text-primary hover:text-primary/80
              transition-colors duration-200
            "
          >
            View All
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Order No
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Client
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList
                        size={32}
                        className="text-muted-foreground/40"
                      />
                      <p className="text-sm text-muted-foreground">
                        No recent orders found
                      </p>
                      <Link
                        href="/dashboard/orders"
                        className="text-xs text-primary hover:underline"
                      >
                        Create your first order
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="hover:bg-muted/20 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-medium">
                      {order.orderNo}
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium">{order.clientName}</p>
                        {order.storeName && (
                          <p className="text-xs text-muted-foreground">
                            {order.storeName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium tabular-nums">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {formatDate(order.orderDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
