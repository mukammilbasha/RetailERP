"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  DragEvent,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Download, Printer, GripVertical, X, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/* =================================================================
   CSV Export Utility
   ================================================================= */

function exportToCSV(
  data: Record<string, unknown>[],
  columns: { key: string; header: string }[],
  filename: string
) {
  if (!data.length) return;
  const header = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key] ?? "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* =================================================================
   Constants & Demo Data
   ================================================================= */

const CLIENTS = [
  "DHEEN ENTERPRISES",
  "Inc.5",
  "REGAL",
  "ROHAN TRADERS",
  "SKH EXPORTS",
];

const MONTHS = [
  "APR 2025",
  "MAY 2025",
  "JUN 2025",
  "JUL 2025",
  "AUG 2025",
  "SEP 2025",
  "OCT 2025",
  "NOV 2025",
  "DEC 2025",
  "JAN 2026",
  "FEB 2026",
  "MAR 2026",
];

const ZONES = ["EAST", "NORTH", "SOUTH", "WEST", "WAREHOUSE"];
const BUSINESS_MODULES = ["REGAL-MENS", "REGAL-WOMENS", "REGAL-KIDS", "REGAL-SPORTS"];

const STORE_CODES = [
  "BLR-001", "BLR-002", "MUM-001", "MUM-002", "DEL-001",
  "DEL-002", "CHN-001", "CHN-002", "KOL-001", "HYD-001",
];

const CLIENT_COLORS: Record<string, string> = {
  "DHEEN ENTERPRISES": "#3b82f6",
  "Inc.5": "#f97316",
  "REGAL": "#10b981",
  "ROHAN TRADERS": "#a855f7",
  "SKH EXPORTS": "#ef4444",
};

const ZONE_COLORS: Record<string, string> = {
  EAST: "#3b82f6",
  NORTH: "#10b981",
  SOUTH: "#f97316",
  WEST: "#a855f7",
  WAREHOUSE: "#64748b",
};

interface SalesRecord {
  client: string;
  month: string;
  zone: string;
  businessModule: string;
  storeCode: string;
  salesQty: number;
  closingSOH: number;
  salesPercent: number;
  totalMRP: number;
  avgMRP: number;
  totalNSP: number;
  totalDisc: number;
  avgDiscMRP: number;
  avgDiscPercent: number;
  avgDisc: number;
  totalDoor: number;
  totalOutward: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDemoData(): SalesRecord[] {
  const records: SalesRecord[] = [];
  let seed = 1;

  CLIENTS.forEach((client) => {
    MONTHS.forEach((month) => {
      ZONES.forEach((zone) => {
        BUSINESS_MODULES.forEach((bm) => {
          STORE_CODES.slice(0, 4).forEach((store) => {
            seed++;
            const salesQty = Math.floor(seededRandom(seed) * 800 + 100);
            seed++;
            const closingSOH = Math.floor(seededRandom(seed) * 1200 + 200);
            seed++;
            const avgMRP = Math.floor(seededRandom(seed) * 2000 + 500);
            seed++;
            const totalDoor = Math.floor(seededRandom(seed) * 50 + 5);
            const totalMRP = salesQty * avgMRP;
            const avgDiscPercent = 10 + seededRandom(seed + 1) * 25;
            const totalDisc = totalMRP * (avgDiscPercent / 100);
            const totalNSP = totalMRP - totalDisc;

            records.push({
              client,
              month,
              zone,
              businessModule: bm,
              storeCode: store,
              salesQty,
              closingSOH,
              salesPercent: parseFloat(
                ((salesQty / (salesQty + closingSOH)) * 100).toFixed(1)
              ),
              totalMRP,
              avgMRP,
              totalNSP,
              totalDisc,
              avgDiscMRP: totalDisc / salesQty,
              avgDiscPercent: parseFloat(avgDiscPercent.toFixed(1)),
              avgDisc: totalDisc / salesQty,
              totalDoor,
              totalOutward: salesQty + Math.floor(seededRandom(seed + 2) * 50),
            });
          });
        });
      });
    });
  });

  return records;
}

const ALL_DEMO_DATA = generateDemoData();

type DimensionKey =
  | "businessModule"
  | "client"
  | "storeCode"
  | "month"
  | "zone";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  businessModule: "BUSINESS MODULE",
  client: "CLIENT",
  storeCode: "STORE CODE",
  month: "MONTH",
  zone: "ZONE",
};

type ReportTab = "SALES" | "CLOSING INVENTORY";
type ChartTab =
  | "month-client"
  | "sales-vs-soh"
  | "client-month"
  | "zone-analysis"
  | "pivot";

/* =================================================================
   Sub-components
   ================================================================= */

interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  sub?: string;
}

function KpiCard({ label, value, accent, sub }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded border border-gray-200 px-3 py-2 flex flex-col gap-0.5 min-w-0"
      style={{ borderLeftWidth: 3, borderLeftColor: accent }}
    >
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">
        {label}
      </span>
      <span className="text-sm font-bold text-gray-800 truncate">{value}</span>
      {sub && (
        <span className="text-[10px] text-gray-400 truncate">{sub}</span>
      )}
    </div>
  );
}

/* Custom Tooltip for recharts */
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded shadow-lg p-2 border border-gray-700 max-w-xs">
      <p className="font-semibold mb-1 text-gray-200 truncate">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-300 truncate">{p.name}:</span>
          <span className="font-bold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

/* =================================================================
   Drag-and-drop Dimension Reorder
   ================================================================= */

interface DimensionBarProps {
  dimensions: DimensionKey[];
  activeDimensions: Set<DimensionKey>;
  onReorder: (dims: DimensionKey[]) => void;
  onToggle: (dim: DimensionKey) => void;
}

function DimensionBar({
  dimensions,
  activeDimensions,
  onReorder,
  onToggle,
}: DimensionBarProps) {
  const dragIndex = useRef<number | null>(null);

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...dimensions];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    dragIndex.current = index;
    onReorder(next);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
        Group by:
      </span>
      {dimensions.map((dim, i) => {
        const active = activeDimensions.has(dim);
        return (
          <button
            key={dim}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            onClick={() => onToggle(dim)}
            className={[
              "flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border cursor-grab select-none transition-all",
              active
                ? "bg-blue-50 border-blue-400 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300",
            ].join(" ")}
            title="Drag to reorder · Click to toggle"
          >
            <GripVertical className="w-3 h-3 opacity-40 flex-shrink-0" />
            <span>{DIMENSION_LABELS[dim]}</span>
            {active && (
              <span className="ml-1 bg-blue-100 text-blue-600 rounded px-1 text-[9px] font-bold">
                {dimensions.filter((d) => activeDimensions.has(d)).indexOf(dim) +
                  1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =================================================================
   Filter Bar
   ================================================================= */

interface FilterBarProps {
  selectedModules: Set<string>;
  selectedClients: Set<string>;
  selectedMonths: Set<string>;
  selectedZones: Set<string>;
  onToggleModule: (v: string) => void;
  onToggleClient: (v: string) => void;
  onToggleMonth: (v: string) => void;
  onToggleZone: (v: string) => void;
  onClearAll: () => void;
}

function FilterSection({
  label,
  items,
  selected,
  onToggle,
  colorMap,
}: {
  label: string;
  items: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  colorMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const hasSelection = items.some((i) => selected.has(i));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold border transition-all",
          hasSelection
            ? "bg-blue-600 border-blue-500 text-white"
            : "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600",
        ].join(" ")}
      >
        <span>{label}</span>
        {hasSelection && (
          <span className="bg-blue-400 text-white rounded-full px-1.5 text-[9px] font-bold">
            {items.filter((i) => selected.has(i)).length}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded shadow-xl min-w-max max-h-64 overflow-y-auto">
          {items.map((item) => {
            const active = selected.has(item);
            const color = colorMap?.[item];
            return (
              <button
                key={item}
                onClick={() => onToggle(item)}
                className={[
                  "flex items-center gap-2 w-full px-3 py-2 text-[11px] text-left transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-200 hover:bg-slate-700",
                ].join(" ")}
              >
                {color && (
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                {item}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =================================================================
   Chart: Month & Client Sales
   ================================================================= */

function MonthClientSalesChart({ data }: { data: SalesRecord[] }) {
  const chartData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      if (!byMonth[r.month]) byMonth[r.month] = {};
      byMonth[r.month][r.client] =
        (byMonth[r.month][r.client] ?? 0) + r.salesQty;
    });
    return Object.entries(byMonth).map(([month, clients]) => ({
      month,
      ...clients,
    }));
  }, [data]);

  const activeClients = useMemo(() => {
    const s = new Set<string>();
    data.forEach((r) => s.add(r.client));
    return Array.from(s);
  }, [data]);

  const csvData = useMemo(
    () =>
      chartData.map((row) => ({
        month: row.month,
        ...Object.fromEntries(
          activeClients.map((c) => [c, (row as Record<string, unknown>)[c] ?? 0])
        ),
      })) as Record<string, unknown>[],
    [chartData, activeClients]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Month &amp; Client Sales Report — Quantity
        </h3>
        <button
          onClick={() =>
            exportToCSV(
              csvData,
              [
                { key: "month", header: "Month" },
                ...activeClients.map((c) => ({ key: c, header: c })),
              ],
              "month_client_sales"
            )
          }
          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
        >
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#64748b" }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={50} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            iconType="square"
            iconSize={8}
          />
          {activeClients.map((client) => (
            <Bar
              key={client}
              dataKey={client}
              stackId="a"
              fill={CLIENT_COLORS[client] ?? "#94a3b8"}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Data table below chart */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-500 sticky left-0 bg-gray-50">
                MONTH
              </th>
              {activeClients.map((c) => (
                <th
                  key={c}
                  className="border border-gray-200 px-2 py-1 text-right font-semibold text-gray-500 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
              <th className="border border-gray-200 px-2 py-1 text-right font-semibold text-gray-700 bg-blue-50">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => {
              const total = activeClients.reduce(
                (sum, c) => sum + ((row as Record<string, unknown>)[c] as number ?? 0),
                0
              );
              return (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1 font-medium text-gray-700 sticky left-0 bg-white">
                    {row.month}
                  </td>
                  {activeClients.map((c) => (
                    <td
                      key={c}
                      className="border border-gray-200 px-2 py-1 text-right text-gray-600"
                    >
                      {((row as Record<string, unknown>)[c] as number ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-2 py-1 text-right font-bold text-gray-800 bg-blue-50">
                    {total.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================================================================
   Chart: Sales vs SOH
   ================================================================= */

function SalesVsSOHChart({ data }: { data: SalesRecord[] }) {
  const chartData = useMemo(() => {
    const byClient: Record<string, { sales: number; soh: number }> = {};
    data.forEach((r) => {
      if (!byClient[r.client])
        byClient[r.client] = { sales: 0, soh: 0 };
      byClient[r.client].sales += r.salesQty;
      byClient[r.client].soh += r.closingSOH;
    });
    return Object.entries(byClient).map(([client, vals]) => ({
      client,
      SALES: vals.sales,
      SOH: vals.soh,
    }));
  }, [data]);

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Sales &amp; Closing SOH Report
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 60, left: 120, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis
            type="category"
            dataKey="client"
            tick={{ fontSize: 10, fill: "#374151" }}
            width={115}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            iconType="square"
            iconSize={8}
          />
          <Bar dataKey="SOH" fill="#f97316" maxBarSize={20} label={{ position: "right", fontSize: 9, fill: "#92400e" }} />
          <Bar dataKey="SALES" fill="#3b82f6" maxBarSize={20} label={{ position: "right", fontSize: 9, fill: "#1e40af" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =================================================================
   Chart: Client-Month Analysis
   ================================================================= */

function ClientMonthAnalysisChart({ data }: { data: SalesRecord[] }) {
  const chartData = useMemo(() => {
    const byClient: Record<
      string,
      { totalQty: number; totalMRP: number; totalNSP: number; totalDisc: number; avgDiscPct: number; count: number }
    > = {};
    data.forEach((r) => {
      if (!byClient[r.client])
        byClient[r.client] = { totalQty: 0, totalMRP: 0, totalNSP: 0, totalDisc: 0, avgDiscPct: 0, count: 0 };
      byClient[r.client].totalQty += r.salesQty;
      byClient[r.client].totalMRP += r.totalMRP;
      byClient[r.client].totalNSP += r.totalNSP;
      byClient[r.client].totalDisc += r.totalDisc;
      byClient[r.client].avgDiscPct += r.avgDiscPercent;
      byClient[r.client].count++;
    });
    return Object.entries(byClient).map(([client, v]) => ({
      client,
      "T.Qty": v.totalQty,
      "T.NSP (K)": Math.round(v.totalNSP / 1000),
      "T.Disc (K)": Math.round(v.totalDisc / 1000),
      "Avg Disc%": parseFloat((v.avgDiscPct / v.count).toFixed(1)),
    }));
  }, [data]);

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Client-Month Analysis
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="client"
            tick={{ fontSize: 10, fill: "#64748b" }}
            angle={-25}
            textAnchor="end"
          />
          <YAxis yAxisId="qty" tick={{ fontSize: 10, fill: "#64748b" }} width={50} />
          <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: "#64748b" }} width={40} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="square" iconSize={8} />
          <Bar yAxisId="qty" dataKey="T.Qty" fill="#3b82f6" maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.client} fill={CLIENT_COLORS[entry.client] ?? "#3b82f6"} />
            ))}
          </Bar>
          <Bar yAxisId="qty" dataKey="T.NSP (K)" fill="#10b981" maxBarSize={20} />
          <Bar yAxisId="qty" dataKey="T.Disc (K)" fill="#f97316" maxBarSize={20} />
          <Bar yAxisId="pct" dataKey="Avg Disc%" fill="#a855f7" maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =================================================================
   Chart: Zone Analysis
   ================================================================= */

function ZoneAnalysisChart({ data }: { data: SalesRecord[] }) {
  const chartData = useMemo(() => {
    const byZone: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      if (!byZone[r.zone]) byZone[r.zone] = {};
      byZone[r.zone][r.client] =
        (byZone[r.zone][r.client] ?? 0) + r.salesQty;
    });
    return Object.entries(byZone).map(([zone, clients]) => ({
      zone,
      ...clients,
    }));
  }, [data]);

  const activeClients = useMemo(() => {
    const s = new Set<string>();
    data.forEach((r) => s.add(r.client));
    return Array.from(s);
  }, [data]);

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Zone Analysis — Sales Quantity by Zone &amp; Client
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="zone" tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="square" iconSize={8} />
          {activeClients.map((client) => (
            <Bar
              key={client}
              dataKey={client}
              fill={CLIENT_COLORS[client] ?? "#94a3b8"}
              maxBarSize={18}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Zone summary strip */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {chartData.map((row) => {
          const total = activeClients.reduce(
            (sum, c) => sum + ((row as Record<string, unknown>)[c] as number ?? 0),
            0
          );
          return (
            <div
              key={row.zone}
              className="rounded border border-gray-200 px-3 py-2 text-center"
              style={{ borderTopWidth: 3, borderTopColor: ZONE_COLORS[row.zone] ?? "#94a3b8" }}
            >
              <div className="text-[10px] text-gray-400 font-semibold uppercase">
                {row.zone}
              </div>
              <div className="text-sm font-bold text-gray-800">
                {total.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =================================================================
   Pivot Table
   ================================================================= */

function PivotTable({ data }: { data: SalesRecord[] }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const stores = useMemo(() => {
    const s = new Set<string>();
    data.forEach((r) => s.add(r.storeCode));
    return Array.from(s).sort();
  }, [data]);

  const matrix = useMemo(() => {
    const byClient: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      if (!byClient[r.client]) byClient[r.client] = {};
      byClient[r.client][r.storeCode] =
        (byClient[r.client][r.storeCode] ?? 0) + r.salesQty;
    });
    return byClient;
  }, [data]);

  const rows = useMemo(() => {
    const clientList = Object.keys(matrix);
    if (!sortCol) return clientList;
    return [...clientList].sort((a, b) => {
      const va = matrix[a][sortCol] ?? 0;
      const vb = matrix[b][sortCol] ?? 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [matrix, sortCol, sortDir]);

  const colTotals = useMemo(() => {
    const t: Record<string, number> = {};
    stores.forEach((s) => {
      t[s] = Object.values(matrix).reduce(
        (sum, row) => sum + (row[s] ?? 0),
        0
      );
    });
    return t;
  }, [matrix, stores]);

  const rowTotals = useMemo(() => {
    const t: Record<string, number> = {};
    Object.entries(matrix).forEach(([client, storeMap]) => {
      t[client] = Object.values(storeMap).reduce((a, b) => a + b, 0);
    });
    return t;
  }, [matrix]);

  const grandTotal = useMemo(
    () => Object.values(rowTotals).reduce((a, b) => a + b, 0),
    [rowTotals]
  );

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const csvData: Record<string, unknown>[] = rows.map((client) => ({
    client,
    ...Object.fromEntries(stores.map((s) => [s, matrix[client][s] ?? 0])),
    total: rowTotals[client] ?? 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Pivot Table — Client × Store Code (Sales Qty)
        </h3>
        <button
          onClick={() =>
            exportToCSV(
              csvData,
              [
                { key: "client", header: "Client" },
                ...stores.map((s) => ({ key: s, header: s })),
                { key: "total", header: "Total" },
              ],
              "pivot_client_store"
            )
          }
          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
        >
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      <div className="overflow-auto max-h-96 border border-gray-200 rounded">
        <table className="text-[10px] border-collapse w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700 text-white">
              <th className="border border-slate-600 px-2 py-1.5 text-left font-semibold sticky left-0 bg-slate-700 min-w-36 z-20">
                CLIENT
              </th>
              {stores.map((s) => (
                <th
                  key={s}
                  className="border border-slate-600 px-2 py-1.5 text-right font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-600 select-none"
                  onClick={() => handleSort(s)}
                >
                  {s}
                  {sortCol === s && (
                    <span className="ml-0.5">
                      {sortDir === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              ))}
              <th className="border border-slate-600 px-2 py-1.5 text-right font-bold bg-blue-700 whitespace-nowrap">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client, idx) => (
              <tr
                key={client}
                className={idx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}
              >
                <td className="border border-gray-200 px-2 py-1 font-semibold text-gray-700 sticky left-0 bg-inherit min-w-36">
                  {client}
                </td>
                {stores.map((s) => {
                  const val = matrix[client][s] ?? 0;
                  return (
                    <td
                      key={s}
                      className="border border-gray-200 px-2 py-1 text-right text-gray-600 tabular-nums"
                    >
                      {val > 0 ? val.toLocaleString() : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="border border-gray-200 px-2 py-1 text-right font-bold text-gray-800 bg-blue-50 tabular-nums">
                  {(rowTotals[client] ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-slate-100 font-bold sticky bottom-0">
              <td className="border border-gray-300 px-2 py-1.5 text-gray-700 sticky left-0 bg-slate-100 text-[10px] uppercase">
                TOTAL
              </td>
              {stores.map((s) => (
                <td
                  key={s}
                  className="border border-gray-300 px-2 py-1.5 text-right text-gray-800 tabular-nums"
                >
                  {colTotals[s].toLocaleString()}
                </td>
              ))}
              <td className="border border-blue-300 px-2 py-1.5 text-right text-blue-800 bg-blue-100 tabular-nums">
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================================================================
   Main Page Component
   ================================================================= */

export default function ReportsPage() {
  /* --- Filter state --- */
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(BUSINESS_MODULES)
  );
  const [selectedClients, setSelectedClients] = useState<Set<string>>(
    new Set(CLIENTS)
  );
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(
    new Set(MONTHS)
  );
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    new Set(ZONES)
  );

  /* --- Report type tab --- */
  const [reportTab, setReportTab] = useState<ReportTab>("SALES");

  /* --- Dimension ordering & active --- */
  const [dimensions, setDimensions] = useState<DimensionKey[]>([
    "businessModule",
    "client",
    "storeCode",
    "month",
    "zone",
  ]);
  const [activeDimensions, setActiveDimensions] = useState<Set<DimensionKey>>(
    new Set(["client", "month"])
  );

  /* --- Chart sub-tab --- */
  const [chartTab, setChartTab] = useState<ChartTab>("month-client");

  /* --- Toggle helpers --- */
  const toggleSet = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        return next;
      });
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setSelectedModules(new Set(BUSINESS_MODULES));
    setSelectedClients(new Set(CLIENTS));
    setSelectedMonths(new Set(MONTHS));
    setSelectedZones(new Set(ZONES));
  }, []);

  const toggleDimension = useCallback((dim: DimensionKey) => {
    setActiveDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) {
        next.delete(dim);
      } else {
        next.add(dim);
      }
      return next;
    });
  }, []);

  /* --- Filtered data --- */
  const filteredData = useMemo(() => {
    return ALL_DEMO_DATA.filter(
      (r) =>
        selectedModules.has(r.businessModule) &&
        selectedClients.has(r.client) &&
        selectedMonths.has(r.month) &&
        selectedZones.has(r.zone)
    );
  }, [selectedModules, selectedClients, selectedMonths, selectedZones]);

  /* --- KPI aggregates --- */
  const kpis = useMemo(() => {
    const totalDoor = [...new Set(filteredData.map((r) => r.storeCode))].length;
    const totalOutward = filteredData.reduce((s, r) => s + r.totalOutward, 0);
    const salesQty = filteredData.reduce((s, r) => s + r.salesQty, 0);
    const clsSOH = filteredData.reduce((s, r) => s + r.closingSOH, 0);
    const salesPct = salesQty + clsSOH > 0
      ? ((salesQty / (salesQty + clsSOH)) * 100).toFixed(1)
      : "0.0";
    const totalMRP = filteredData.reduce((s, r) => s + r.totalMRP, 0);
    const avgMRP = salesQty > 0 ? totalMRP / salesQty : 0;
    const totalNSP = filteredData.reduce((s, r) => s + r.totalNSP, 0);
    const totalDisc = filteredData.reduce((s, r) => s + r.totalDisc, 0);
    const avgDiscMRP = salesQty > 0 ? totalDisc / salesQty : 0;
    const avgDiscPct = totalMRP > 0 ? ((totalDisc / totalMRP) * 100).toFixed(1) : "0.0";
    const avgDisc = salesQty > 0 ? totalDisc / salesQty : 0;

    return {
      totalDoor,
      totalOutward,
      salesQty,
      clsSOH,
      salesPct,
      totalMRP,
      avgMRP,
      totalNSP,
      totalDisc,
      avgDiscMRP,
      avgDiscPct,
      avgDisc,
    };
  }, [filteredData]);

  /* --- CSV export for full data --- */
  const handleExportAll = () => {
    exportToCSV(
      filteredData as unknown as Record<string, unknown>[],
      [
        { key: "client", header: "Client" },
        { key: "month", header: "Month" },
        { key: "zone", header: "Zone" },
        { key: "businessModule", header: "Business Module" },
        { key: "storeCode", header: "Store Code" },
        { key: "salesQty", header: "Sales Qty" },
        { key: "closingSOH", header: "Closing SOH" },
        { key: "salesPercent", header: "Sales %" },
        { key: "totalMRP", header: "Total MRP" },
        { key: "avgMRP", header: "Avg MRP" },
        { key: "totalNSP", header: "Total NSP" },
        { key: "totalDisc", header: "Total Disc" },
        { key: "avgDiscPercent", header: "Avg Disc %" },
      ],
      "retailerp_report"
    );
  };

  const CHART_TABS: { key: ChartTab; label: string }[] = [
    { key: "month-client", label: "Month & Client Sales" },
    { key: "sales-vs-soh", label: "Sales vs SOH" },
    { key: "client-month", label: "Client-Month Analysis" },
    { key: "zone-analysis", label: "Zone Analysis" },
    { key: "pivot", label: "Pivot Table" },
  ];

  const REPORT_TABS: ReportTab[] = ["SALES", "CLOSING INVENTORY"];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ================================================================
          TOP FILTER BAR
          ================================================================ */}
      <div
        className="px-4 py-3 flex flex-col gap-2 shadow-lg"
        style={{ backgroundColor: "#0f172a" }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm tracking-wide">
              BUSINESS ANALYTICS
            </span>
            <span className="text-slate-400 text-xs">
              {filteredData.length.toLocaleString()} records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Filter chips row */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSection
            label="BUSS-MODULE"
            items={BUSINESS_MODULES}
            selected={selectedModules}
            onToggle={(v) => toggleSet(setSelectedModules, v)}
          />
          <FilterSection
            label="CLIENT"
            items={CLIENTS}
            selected={selectedClients}
            onToggle={(v) => toggleSet(setSelectedClients, v)}
            colorMap={CLIENT_COLORS}
          />
          <FilterSection
            label="MNT-YR"
            items={MONTHS}
            selected={selectedMonths}
            onToggle={(v) => toggleSet(setSelectedMonths, v)}
          />
          <FilterSection
            label="ZONE"
            items={ZONES}
            selected={selectedZones}
            onToggle={(v) => toggleSet(setSelectedZones, v)}
            colorMap={ZONE_COLORS}
          />
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset all filters"
          >
            <X className="w-3 h-3" />
            Reset
          </button>

          {/* Active month chips */}
          <div className="flex items-center gap-1 flex-wrap ml-2">
            {MONTHS.filter((m) => selectedMonths.has(m)).slice(0, 6).map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 text-[9px] text-slate-300 font-mono"
              >
                {m}
                <button
                  onClick={() => toggleSet(setSelectedMonths, m)}
                  className="text-slate-500 hover:text-slate-200"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {selectedMonths.size > 6 && (
              <span className="text-[9px] text-slate-400">
                +{selectedMonths.size - 6} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          REPORT TYPE TABS + DIMENSION BAR
          ================================================================ */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 flex-wrap">
        {/* Report tabs */}
        <div className="flex items-center gap-0 border border-gray-200 rounded overflow-hidden">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setReportTab(tab)}
              className={[
                "px-4 py-1.5 text-[11px] font-semibold transition-colors",
                reportTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200" />

        {/* Dimension bar */}
        <DimensionBar
          dimensions={dimensions}
          activeDimensions={activeDimensions}
          onReorder={setDimensions}
          onToggle={toggleDimension}
        />
      </div>

      {/* ================================================================
          KPI CARDS
          ================================================================ */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-6 gap-2 mb-2">
          <KpiCard
            label="Total Door"
            value={kpis.totalDoor.toLocaleString()}
            accent="#3b82f6"
            sub="Active stores"
          />
          <KpiCard
            label="T. Outward"
            value={kpis.totalOutward.toLocaleString()}
            accent="#6366f1"
            sub="Units dispatched"
          />
          <KpiCard
            label="Sales Qty"
            value={kpis.salesQty.toLocaleString()}
            accent="#10b981"
            sub="Units sold"
          />
          <KpiCard
            label="Cls SOH"
            value={kpis.clsSOH.toLocaleString()}
            accent="#f59e0b"
            sub="Closing stock"
          />
          <KpiCard
            label="Sales %"
            value={`${kpis.salesPct}%`}
            accent="#f97316"
            sub="Of total stock"
          />
          <KpiCard
            label="T MRP"
            value={formatCurrency(kpis.totalMRP)}
            accent="#8b5cf6"
            sub="Total retail value"
          />
        </div>
        <div className="grid grid-cols-6 gap-2">
          <KpiCard
            label="Avg MRP"
            value={formatCurrency(kpis.avgMRP)}
            accent="#3b82f6"
            sub="Per unit"
          />
          <KpiCard
            label="T NSP"
            value={formatCurrency(kpis.totalNSP)}
            accent="#10b981"
            sub="Net sale price"
          />
          <KpiCard
            label="T Disc"
            value={formatCurrency(kpis.totalDisc)}
            accent="#ef4444"
            sub="Total discount"
          />
          <KpiCard
            label="Avg Disc MRP"
            value={formatCurrency(kpis.avgDiscMRP)}
            accent="#f59e0b"
            sub="Discount per unit"
          />
          <KpiCard
            label="Avg Disc %"
            value={`${kpis.avgDiscPct}%`}
            accent="#f97316"
            sub="On MRP"
          />
          <KpiCard
            label="Avg Disc"
            value={formatCurrency(kpis.avgDisc)}
            accent="#a855f7"
            sub="Absolute avg"
          />
        </div>
      </div>

      {/* ================================================================
          CHART AREA
          ================================================================ */}
      <div className="flex-1 px-4 pb-4">
        <div className="bg-white rounded border border-gray-200 shadow-sm">
          {/* Chart sub-tabs */}
          <div className="border-b border-gray-200 px-4 pt-0 flex items-center gap-0 overflow-x-auto">
            {CHART_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChartTab(tab.key)}
                className={[
                  "px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                  chartTab === tab.key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-400 hover:text-gray-600",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart content */}
          <div className="p-4">
            {filteredData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No data matches the current filters. Adjust your filter selection.
              </div>
            ) : (
              <>
                {chartTab === "month-client" && (
                  <MonthClientSalesChart data={filteredData} />
                )}
                {chartTab === "sales-vs-soh" && (
                  <SalesVsSOHChart data={filteredData} />
                )}
                {chartTab === "client-month" && (
                  <ClientMonthAnalysisChart data={filteredData} />
                )}
                {chartTab === "zone-analysis" && (
                  <ZoneAnalysisChart data={filteredData} />
                )}
                {chartTab === "pivot" && (
                  <PivotTable data={filteredData} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
