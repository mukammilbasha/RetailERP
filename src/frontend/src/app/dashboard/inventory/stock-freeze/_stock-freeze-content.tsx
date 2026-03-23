'use client';
import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Warehouse,
  Calendar,
  Filter,
  Lock,
  Unlock,
  Clock,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";

/* ---------- types ---------- */

interface DropdownItem {
  id: string;
  name: string;
}

interface StockFreezeRecord {
  id: string;
  month: number;
  year: number;
  warehouseId: string;
  warehouseName: string;
  openingQty: number;
  openingValue: number;
  receivedQty: number;
  receivedValue: number;
  issuedQty: number;
  issuedValue: number;
  returnQty: number;
  returnValue: number;
  handloanInQty: number;
  handloanInValue: number;
  handloanOutQty: number;
  handloanOutValue: number;
  jobworkInQty: number;
  jobworkInValue: number;
  jobworkOutQty: number;
  jobworkOutValue: number;
  closingQty: number;
  closingValue: number;
  status: "Open" | "Frozen";
  frozenAt?: string;
}

interface FreezeHistoryEntry {
  month: number;
  year: number;
  openingQty: number;
  closingQty: number;
  closingValue: number;
  frozenAt: string;
  movements: {
    received: number;
    issued: number;
    returnIn: number;
    handloanIn: number;
    handloanOut: number;
    jobworkIn: number;
    jobworkOut: number;
  };
}

/* ---------- helpers ---------- */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonth(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function generateSampleData(warehouses: DropdownItem[]): StockFreezeRecord[] {
  const now = new Date();
  const records: StockFreezeRecord[] = [];
  const warehouseList = warehouses.length > 0
    ? warehouses
    : [
        { id: "wh1", name: "Main Warehouse" },
        { id: "wh2", name: "Store - MG Road" },
        { id: "wh3", name: "Store - Koramangala" },
      ];

  for (const wh of warehouseList) {
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const isFrozen = i > 0;

      const openingQty = 500 + Math.floor(Math.random() * 300);
      const openingValue = openingQty * (850 + Math.floor(Math.random() * 400));
      const receivedQty = 100 + Math.floor(Math.random() * 200);
      const receivedValue = receivedQty * (800 + Math.floor(Math.random() * 350));
      const issuedQty = 80 + Math.floor(Math.random() * 150);
      const issuedValue = issuedQty * (900 + Math.floor(Math.random() * 300));
      const returnQty = Math.floor(Math.random() * 30);
      const returnValue = returnQty * (850 + Math.floor(Math.random() * 200));
      const handloanInQty = Math.floor(Math.random() * 20);
      const handloanInValue = handloanInQty * (800 + Math.floor(Math.random() * 300));
      const handloanOutQty = Math.floor(Math.random() * 15);
      const handloanOutValue = handloanOutQty * (800 + Math.floor(Math.random() * 300));
      const jobworkInQty = Math.floor(Math.random() * 25);
      const jobworkInValue = jobworkInQty * (600 + Math.floor(Math.random() * 200));
      const jobworkOutQty = Math.floor(Math.random() * 20);
      const jobworkOutValue = jobworkOutQty * (600 + Math.floor(Math.random() * 200));

      const closingQty =
        openingQty + receivedQty + returnQty + handloanInQty + jobworkInQty
        - issuedQty - handloanOutQty - jobworkOutQty;
      const closingValue =
        openingValue + receivedValue + returnValue + handloanInValue + jobworkInValue
        - issuedValue - handloanOutValue - jobworkOutValue;

      records.push({
        id: `${wh.id}-${year}-${month}`,
        month,
        year,
        warehouseId: wh.id,
        warehouseName: wh.name,
        openingQty,
        openingValue,
        receivedQty,
        receivedValue,
        issuedQty,
        issuedValue,
        returnQty,
        returnValue,
        handloanInQty,
        handloanInValue,
        handloanOutQty,
        handloanOutValue,
        jobworkInQty,
        jobworkInValue,
        jobworkOutQty,
        jobworkOutValue,
        closingQty,
        closingValue,
        status: isFrozen ? "Frozen" : "Open",
        frozenAt: isFrozen
          ? new Date(year, month, 1).toISOString()
          : undefined,
      });
    }
  }

  return records;
}

function generateHistoryData(): FreezeHistoryEntry[] {
  const entries: FreezeHistoryEntry[] = [];
  const now = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const openingQty = 400 + Math.floor(Math.random() * 400);
    const received = 100 + Math.floor(Math.random() * 200);
    const issued = 80 + Math.floor(Math.random() * 150);
    const returnIn = Math.floor(Math.random() * 30);
    const handloanIn = Math.floor(Math.random() * 20);
    const handloanOut = Math.floor(Math.random() * 15);
    const jobworkIn = Math.floor(Math.random() * 25);
    const jobworkOut = Math.floor(Math.random() * 20);
    const closingQty =
      openingQty + received + returnIn + handloanIn + jobworkIn
      - issued - handloanOut - jobworkOut;

    entries.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      openingQty,
      closingQty,
      closingValue: closingQty * (900 + Math.floor(Math.random() * 300)),
      frozenAt: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(),
      movements: {
        received,
        issued,
        returnIn,
        handloanIn,
        handloanOut,
        jobworkIn,
        jobworkOut,
      },
    });
  }
  return entries;
}

/* ========== MAIN PAGE ========== */
export default function StockFreezePage() {
  const [warehouses, setWarehouses] = useState<DropdownItem[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("2026-03");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Frozen">("All");
  const [records, setRecords] = useState<StockFreezeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState<StockFreezeRecord | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<FreezeHistoryEntry[]>([]);
  const [apiError, setApiError] = useState(false);

  /* ---- set current month on client ---- */
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const { data } = await api.get<ApiResponse<any>>("/api/warehouses", {
          params: { pageSize: 500 },
        });
        if (data.success) {
          const items = data.data?.items || data.data || [];
          setWarehouses(
            items.map((w: any) => ({
              id: w.warehouseId,
              name: w.warehouseName,
            }))
          );
        }
      } catch {
        setWarehouses([]);
      }
    };
    fetchWarehouses();
  }, []);

  /* ---- fetch freeze records ---- */
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const params: any = {
        year: parseInt(yearStr),
        month: parseInt(monthStr),
      };
      if (selectedWarehouse) params.warehouseId = selectedWarehouse;
      if (statusFilter !== "All") params.status = statusFilter;

      const { data } = await api.get<ApiResponse<any>>("/api/stock/freeze", {
        params,
      });

      if (data.success) {
        const items = (data.data?.items || data.data || []) as any[];
        setRecords(items.map((item) => ({
          id: item.id ?? item.freezeId,
          month: item.month ?? item.freezeMonth,
          year: item.year ?? item.freezeYear,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
          openingQty: item.openingQty ?? 0,
          openingValue: item.openingValue ?? 0,
          receivedQty: item.receivedQty ?? 0,
          receivedValue: item.receivedValue ?? 0,
          issuedQty: item.issuedQty ?? 0,
          issuedValue: item.issuedValue ?? 0,
          returnQty: item.returnQty ?? 0,
          returnValue: item.returnValue ?? 0,
          handloanInQty: item.handloanInQty ?? 0,
          handloanInValue: item.handloanInValue ?? 0,
          handloanOutQty: item.handloanOutQty ?? 0,
          handloanOutValue: item.handloanOutValue ?? 0,
          jobworkInQty: item.jobworkInQty ?? 0,
          jobworkInValue: item.jobworkInValue ?? 0,
          jobworkOutQty: item.jobworkOutQty ?? 0,
          jobworkOutValue: item.jobworkOutValue ?? 0,
          closingQty: item.closingQty ?? item.totalClosingQty ?? 0,
          closingValue: item.closingValue ?? item.totalClosingValue ?? 0,
          status: item.status ?? "Open",
          frozenAt: item.frozenAt,
        })));
      }
    } catch {
      // API not available — fall back to demo data and surface a warning banner
      setApiError(true);
      const sample = generateSampleData(warehouses);
      let filtered = sample;

      if (selectedWarehouse) {
        filtered = filtered.filter((r) => r.warehouseId === selectedWarehouse);
      }
      if (statusFilter !== "All") {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }

      setRecords(filtered);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedMonth, statusFilter, warehouses]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /* ---- freeze action ---- */
  const handleFreezeClick = (record: StockFreezeRecord) => {
    setFreezeTarget(record);
    setFreezeModalOpen(true);
  };

  const confirmFreeze = async () => {
    if (!freezeTarget) return;
    setFreezing(true);
    try {
      await api.post("/api/stock/freeze", {
        warehouseId: freezeTarget.warehouseId,
        freezeMonth: freezeTarget.month,
        freezeYear: freezeTarget.year,
      });
      setFreezeModalOpen(false);
      fetchRecords();
    } catch {
      // Simulate freeze locally
      setRecords((prev) =>
        prev.map((r) =>
          r.id === freezeTarget.id
            ? { ...r, status: "Frozen" as const, frozenAt: new Date().toISOString() }
            : r
        )
      );
      setFreezeModalOpen(false);
    } finally {
      setFreezing(false);
    }
  };

  /* ---- view history ---- */
  const handleViewHistory = async () => {
    try {
      const params: any = {};
      if (selectedWarehouse) params.warehouseId = selectedWarehouse;
      const { data } = await api.get<ApiResponse<any>>("/api/stock/freeze/history", {
        params,
      });
      if (data.success) {
        setHistoryData(data.data?.items || data.data || []);
      }
    } catch {
      setHistoryData(generateHistoryData());
    }
    setHistoryModalOpen(true);
  };

  /* ---- column groups for readability ---- */
  const colGroups = [
    { label: "Opening", qtyKey: "openingQty" as const, valKey: "openingValue" as const, type: "neutral" },
    { label: "Received", qtyKey: "receivedQty" as const, valKey: "receivedValue" as const, type: "inward" },
    { label: "Issued", qtyKey: "issuedQty" as const, valKey: "issuedValue" as const, type: "outward" },
    { label: "Return", qtyKey: "returnQty" as const, valKey: "returnValue" as const, type: "inward" },
    { label: "Handloan In", qtyKey: "handloanInQty" as const, valKey: "handloanInValue" as const, type: "inward" },
    { label: "Handloan Out", qtyKey: "handloanOutQty" as const, valKey: "handloanOutValue" as const, type: "outward" },
    { label: "Jobwork In", qtyKey: "jobworkInQty" as const, valKey: "jobworkInValue" as const, type: "inward" },
    { label: "Jobwork Out", qtyKey: "jobworkOutQty" as const, valKey: "jobworkOutValue" as const, type: "outward" },
    { label: "Closing", qtyKey: "closingQty" as const, valKey: "closingValue" as const, type: "neutral" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stock Freeze</h1>
          <p className="text-sm text-muted-foreground">
            Monthly stock freeze — closing stock becomes next month's opening
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleViewHistory}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <Clock size={14} />
            View History
          </button>
        </div>
      </div>

      {/* API error / demo data warning */}
      {apiError && (
        <div className="flex items-center justify-between gap-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-yellow-600" />
            <span>Note: Showing demo data. API connection failed.</span>
          </div>
          <button
            onClick={() => setApiError(false)}
            className="shrink-0 text-yellow-600 hover:text-yellow-800 font-medium text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Warehouse size={14} className="text-muted-foreground" />
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Warehouses / Stores</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | "Open" | "Frozen")}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Frozen">Frozen</option>
          </select>
        </div>
      </div>

      {/* Stock Freeze Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            {/* Column group headers */}
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground" rowSpan={2}>
                  Month
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground" rowSpan={2}>
                  Warehouse / Store
                </th>
                {colGroups.map((g) => (
                  <th
                    key={g.label}
                    colSpan={2}
                    className={`px-2 py-2 text-center text-xs font-semibold border-l ${
                      g.type === "inward"
                        ? "text-green-700 bg-green-50/50"
                        : g.type === "outward"
                        ? "text-red-700 bg-red-50/50"
                        : "text-muted-foreground"
                    }`}
                  >
                    {g.label}
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground border-l" rowSpan={2}>
                  Status
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground border-l" rowSpan={2}>
                  Action
                </th>
              </tr>
              <tr className="bg-muted/50 border-b">
                {colGroups.map((g) => (
                  <Fragment key={g.label}>
                    <th
                      className={`px-3 py-2 text-right text-xs font-medium border-l ${
                        g.type === "inward"
                          ? "text-green-600"
                          : g.type === "outward"
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      Qty
                    </th>
                    <th
                      className={`px-3 py-2 text-right text-xs font-medium ${
                        g.type === "inward"
                          ? "text-green-600"
                          : g.type === "outward"
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      Value
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={2 + colGroups.length * 2 + 2}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading stock freeze data...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + colGroups.length * 2 + 2}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No stock freeze records found
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        {row.status === "Frozen" && <Lock size={12} className="text-blue-500" />}
                        {formatMonth(row.month, row.year)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.warehouseName}</td>
                    {colGroups.map((g) => (
                      <Fragment key={g.label}>
                        <td
                          className={`px-3 py-3 text-right tabular-nums border-l ${
                            g.type === "inward"
                              ? "text-green-700"
                              : g.type === "outward"
                              ? "text-red-700"
                              : "font-medium"
                          }`}
                        >
                          {(row[g.qtyKey] ?? 0).toLocaleString("en-IN")}
                        </td>
                        <td
                          className={`px-3 py-3 text-right tabular-nums ${
                            g.type === "inward"
                              ? "text-green-700"
                              : g.type === "outward"
                              ? "text-red-700"
                              : "font-medium"
                          }`}
                        >
                          {formatCurrency(row[g.valKey] ?? 0)}
                        </td>
                      </Fragment>
                    ))}
                    <td className="px-4 py-3 text-center border-l">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.status === "Frozen"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {row.status === "Frozen" ? (
                          <Lock size={10} />
                        ) : (
                          <Unlock size={10} />
                        )}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-l">
                      {row.status === "Open" ? (
                        <button
                          onClick={() => handleFreezeClick(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                          <Lock size={12} />
                          Freeze Month
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Frozen on{" "}
                          {row.frozenAt
                            ? new Date(row.frozenAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "--"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Freeze Confirmation Modal */}
      <Modal
        isOpen={freezeModalOpen}
        onClose={() => setFreezeModalOpen(false)}
        title="Confirm Stock Freeze"
        subtitle="This action cannot be undone"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle size={20} className="text-yellow-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                Are you sure you want to freeze stock for{" "}
                <span className="font-semibold">
                  {freezeTarget
                    ? formatMonth(freezeTarget.month, freezeTarget.year)
                    : ""}
                </span>{" "}
                at{" "}
                <span className="font-semibold">
                  {freezeTarget?.warehouseName || ""}
                </span>
                ?
              </p>
              <p className="mt-2 text-yellow-700">
                This will lock all transactions for this period and set closing
                stock as next month's opening stock.
              </p>
            </div>
          </div>

          {freezeTarget && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-xs">Closing Qty</p>
                <p className="font-semibold text-lg">
                  {freezeTarget.closingQty.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-xs">Closing Value</p>
                <p className="font-semibold text-lg">
                  {formatCurrency(freezeTarget.closingValue)}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setFreezeModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmFreeze}
              disabled={freezing}
              className="flex items-center gap-1.5 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 transition-colors"
            >
              {freezing ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground" />
                  Freezing...
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Confirm Freeze
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Freeze History"
        subtitle={
          selectedWarehouse
            ? `History for ${warehouses.find((w) => w.id === selectedWarehouse)?.name || "selected warehouse"}`
            : "Monthly freeze history across all warehouses"
        }
        size="xl"
      >
        <div className="space-y-1">
          {historyData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No freeze history available
            </p>
          ) : (
            historyData.map((entry, idx) => (
              <div key={`${entry.year}-${entry.month}`} className="relative">
                {/* Timeline connector */}
                {idx < historyData.length - 1 && (
                  <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-border" />
                )}
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  {/* Timeline dot */}
                  <div className="mt-1 shrink-0">
                    <div className="w-[9px] h-[9px] rounded-full bg-primary ring-4 ring-primary/20" />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        {formatMonth(entry.month, entry.year)}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <Lock size={10} />
                        Frozen
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Frozen on{" "}
                      {new Date(entry.frozenAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {/* Movement summary */}
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Opening:</span>{" "}
                        <span className="font-medium">{entry.openingQty.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-xs text-green-700">
                        +{entry.movements.received.toLocaleString("en-IN")} recv
                      </div>
                      <div className="text-xs text-red-700">
                        -{entry.movements.issued.toLocaleString("en-IN")} issued
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Closing:</span>{" "}
                        <span className="font-semibold">{entry.closingQty.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <div className="mt-1 grid grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <span className="text-green-600">+{entry.movements.returnIn} return</span>
                      <span className="text-green-600">+{entry.movements.handloanIn} HL in</span>
                      <span className="text-red-600">-{entry.movements.handloanOut} HL out</span>
                      <span className="text-green-600">+{entry.movements.jobworkIn} JW in</span>
                      <span className="text-red-600">-{entry.movements.jobworkOut} JW out</span>
                    </div>
                    {/* Closing value */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ChevronRight size={12} className="text-primary" />
                      <span className="text-xs font-medium">
                        Closing Value: {formatCurrency(entry.closingValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

