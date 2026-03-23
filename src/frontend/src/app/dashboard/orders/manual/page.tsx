"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ClipboardList,
  Package,
  AlertTriangle,
  Check,
  Plus,
  Trash2,
  Search,
  Save,
  ShoppingCart,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
}

interface Client {
  clientId: string;
  clientName: string;
  orgName?: string;
}

interface StoreInfo {
  storeId: string;
  storeCode: string;
  storeName: string;
}

interface Article {
  articleId: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  color: string;
  mrp: number;
  hsnCode?: string;
  imageUrl?: string;
}

interface SizeStock {
  euroSize: number;
  ukSize: string;
  warehouseQty: number;
  customerQty: number;
}

interface OrderArticleEntry {
  localId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  mrp: number;
  hsnCode: string;
  imageUrl: string;
  sizeData: SizeRowData[];
  loadingStock: boolean;
}

interface SizeRowData {
  label: string;       // e.g. "39-05"
  euroSize: number;
  ukSize: string;
  warehouseOpn: number;  // Warehouse Opening SOH
  customerOpn: number;   // Customer Opening SOH
  allocation: number;    // Order qty (editable)
  warehouseCls: number;  // Auto-calculated
}

/* ================================================================
   Constants
   ================================================================ */

const SIZE_DEFINITIONS = [
  { label: "39-05", euroSize: 39, ukSize: "05" },
  { label: "40-06", euroSize: 40, ukSize: "06" },
  { label: "41-07", euroSize: 41, ukSize: "07" },
  { label: "42-08", euroSize: 42, ukSize: "08" },
  { label: "43-09", euroSize: 43, ukSize: "09" },
  { label: "44-10", euroSize: 44, ukSize: "10" },
  { label: "45-11", euroSize: 45, ukSize: "11" },
  { label: "46-12", euroSize: 46, ukSize: "12" },
];

/* ================================================================
   Helpers
   ================================================================ */

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `CO-${y}${m}-${seq}`;
}

function buildEmptySizeData(): SizeRowData[] {
  return SIZE_DEFINITIONS.map((def) => ({
    label: def.label,
    euroSize: def.euroSize,
    ukSize: def.ukSize,
    warehouseOpn: 0,
    customerOpn: 0,
    allocation: 0,
    warehouseCls: 0,
  }));
}

/* ================================================================
   Article Selector Component
   ================================================================ */

function ArticleSelector({
  articles,
  onSelect,
  excludeIds,
}: {
  articles: Article[];
  onSelect: (article: Article) => void;
  excludeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = articles.filter(
    (a) =>
      !excludeIds.includes(a.articleId) &&
      (a.articleName.toLowerCase().includes(search.toLowerCase()) ||
        a.articleCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm border-2 border-dashed border-primary/40 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-primary font-medium w-full justify-center"
      >
        <Plus size={16} />
        Add Article
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-card border rounded-xl shadow-xl z-40 max-h-72 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search by article code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-52">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No articles available
                </div>
              ) : (
                filtered.map((article) => (
                  <button
                    key={article.articleId}
                    onClick={() => {
                      onSelect(article);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                        {article.articleCode}
                      </span>
                      <span className="text-sm font-medium">
                        {article.articleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {article.color}
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(article.mrp)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
   Order Article Card (matches wireframe)
   ================================================================ */

function OrderArticleCard({
  entry,
  onAllocationChange,
  onRemove,
}: {
  entry: OrderArticleEntry;
  onAllocationChange: (
    localId: string,
    sizeIndex: number,
    qty: number
  ) => void;
  onRemove: (localId: string) => void;
}) {
  const totalPairs = entry.sizeData.reduce((sum, s) => sum + s.allocation, 0);
  const totalAmount = totalPairs * entry.mrp;
  const hasStockExceeded = entry.sizeData.some((s) => s.warehouseCls < 0);

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* ---- Article Info Header ---- */}
      <div className="flex items-start gap-5 p-5 border-b bg-muted/20">
        {/* Article Image Placeholder */}
        <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center shrink-0 border">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt={entry.articleName}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <ImageIcon size={28} className="text-muted-foreground/40" />
          )}
        </div>

        {/* Article Details */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* HSN Code */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                HSN Code
              </p>
              <p className="text-lg font-bold text-foreground font-mono">
                {entry.hsnCode || "N/A"}
              </p>
            </div>

            {/* Article */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Article
              </p>
              <p className="text-sm font-semibold text-foreground">
                {entry.articleName}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {entry.articleCode}
              </p>
            </div>

            {/* Colour */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Colour
              </p>
              <p className="text-sm font-semibold text-foreground">
                {entry.color || "N/A"}
              </p>
            </div>

            {/* MRP */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                MRP
              </p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(entry.mrp)}
              </p>
            </div>
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(entry.localId)}
          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
          title="Remove article"
        >
          <Trash2 size={16} className="text-destructive" />
        </button>
      </div>

      {/* ---- "INVENTORY OF WAREHOUSE" Heading ---- */}
      <div className="text-center py-2.5 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">
          Inventory of Warehouse
        </p>
      </div>

      {/* ---- Size Run Table ---- */}
      {entry.loadingStock ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span className="text-sm">Loading stock data...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                <th className="px-3 py-2.5 text-left font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 w-44 whitespace-nowrap uppercase tracking-wider text-[10px]">
                  Size Run
                </th>
                {entry.sizeData.map((s) => (
                  <th
                    key={s.label}
                    className="px-2 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[64px]"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap uppercase tracking-wider text-[10px]">
                  T. Pairs
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: WARE HOUSE OPN-SOH */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/30 whitespace-nowrap">
                  Ware House OPN-SOH
                </td>
                {entry.sizeData.map((s) => (
                  <td
                    key={`wh-opn-${s.label}`}
                    className="px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/30"
                  >
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {s.warehouseOpn}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-emerald-50 dark:bg-emerald-950/30">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {entry.sizeData.reduce((sum, s) => sum + s.warehouseOpn, 0)}
                  </span>
                </td>
              </tr>

              {/* Row 2: CUSTOMER OPN-SOH */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-blue-800 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30 whitespace-nowrap">
                  Customer OPN-SOH
                </td>
                {entry.sizeData.map((s) => (
                  <td
                    key={`cust-opn-${s.label}`}
                    className="px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30"
                  >
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      {s.customerOpn}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-blue-50 dark:bg-blue-950/30">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {entry.sizeData.reduce((sum, s) => sum + s.customerOpn, 0)}
                  </span>
                </td>
              </tr>

              {/* Row 3: ALLOCATION (editable) */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/30 whitespace-nowrap">
                  Allocation
                </td>
                {entry.sizeData.map((s, idx) => (
                  <td
                    key={`alloc-${s.label}`}
                    className="px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/30"
                  >
                    <input
                      type="number"
                      min="0"
                      value={s.allocation || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        onAllocationChange(
                          entry.localId,
                          idx,
                          val < 0 ? 0 : val
                        );
                      }}
                      className={`
                        w-full px-1 py-1.5 text-center text-sm font-bold rounded
                        focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400
                        ${
                          s.allocation > 0 && s.allocation > s.warehouseOpn
                            ? "bg-red-100 border-red-400 text-red-700 dark:bg-red-950/50 dark:border-red-600 dark:text-red-400 ring-1 ring-red-300"
                            : "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/50 dark:border-amber-600 dark:text-amber-200"
                        }
                        border
                      `}
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-amber-50 dark:bg-amber-950/30">
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {totalPairs}
                  </span>
                </td>
              </tr>

              {/* Spacer row */}
              <tr className="h-1 bg-slate-200 dark:bg-slate-700">
                <td colSpan={entry.sizeData.length + 2}></td>
              </tr>

              {/* Row 4: WARE HOUSE CLS-SOH */}
              <tr>
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 whitespace-nowrap">
                  Ware House CLS-SOH
                </td>
                {entry.sizeData.map((s) => (
                  <td
                    key={`wh-cls-${s.label}`}
                    className={`
                      px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700
                      ${
                        s.warehouseCls < 0
                          ? "bg-red-100 dark:bg-red-950/40"
                          : "bg-slate-100 dark:bg-slate-800"
                      }
                    `}
                  >
                    <span
                      className={`text-sm font-bold ${
                        s.warehouseCls < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {s.warehouseCls}
                    </span>
                    {s.warehouseCls < 0 && (
                      <AlertTriangle
                        size={10}
                        className="inline-block ml-1 text-red-500"
                      />
                    )}
                  </td>
                ))}
                <td
                  className={`px-3 py-2.5 text-center ${
                    entry.sizeData.reduce((sum, s) => sum + s.warehouseCls, 0) <
                    0
                      ? "bg-red-100 dark:bg-red-950/40"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      entry.sizeData.reduce(
                        (sum, s) => sum + s.warehouseCls,
                        0
                      ) < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {entry.sizeData.reduce((sum, s) => sum + s.warehouseCls, 0)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Card Footer with Totals ---- */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Total Pairs:{" "}
              <span className="font-bold text-foreground text-base">
                {totalPairs}
              </span>
            </span>
          </div>
          <div className="w-px h-5 bg-border" />
          <span className="text-sm text-muted-foreground">
            Total Amount:{" "}
            <span className="font-bold text-primary text-base">
              {formatCurrency(totalAmount)}
            </span>
          </span>
        </div>

        {hasStockExceeded && (
          <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
            <AlertTriangle size={14} />
            Stock exceeded in one or more sizes
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Main Page Component
   ================================================================ */

export default function ManualOrderEntryPage() {
  /* ---- Reference data ---- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [availableArticles, setAvailableArticles] = useState<Article[]>([]);

  /* ---- Order header ---- */
  const [orderNo] = useState(() => generateOrderNumber());
  const [clientId, setClientId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [orderDate, setOrderDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  /* ---- Article entries ---- */
  const [entries, setEntries] = useState<OrderArticleEntry[]>([]);

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  /* ---- Fetch reference data ---- */
  const fetchReferenceData = useCallback(async () => {
    try {
      const [whRes, clientRes, artRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/warehouses", {
          params: { pageSize: 200 },
        }),
        api.get<ApiResponse<any>>("/api/clients", {
          params: { pageSize: 200 },
        }),
        api.get<ApiResponse<any>>("/api/articles", {
          params: { pageSize: 500 },
        }),
      ]);
      if (whRes.data.success)
        setWarehouses(whRes.data.data?.items || []);
      if (clientRes.data.success)
        setClients(clientRes.data.data?.items || []);
      if (artRes.data.success)
        setAvailableArticles(artRes.data.data?.items || []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  /* ---- Fetch stores when client changes ---- */
  useEffect(() => {
    if (!clientId) {
      setStores([]);
      setStoreId("");
      return;
    }
    const fetchStores = async () => {
      try {
        const res = await api.get<ApiResponse<any>>(
          `/api/clients/${clientId}/stores`,
          { params: { pageSize: 200 } }
        );
        if (res.data.success) {
          setStores(res.data.data?.items || res.data.data || []);
        }
      } catch {
        setStores([]);
      }
    };
    fetchStores();
    setStoreId("");
  }, [clientId]);

  /* ---- Fetch stock for an article ---- */
  const fetchArticleStock = useCallback(
    async (articleId: string, localId: string) => {
      if (!warehouseId) return;

      setEntries((prev) =>
        prev.map((e) =>
          e.localId === localId ? { ...e, loadingStock: true } : e
        )
      );

      try {
        const res = await api.get<ApiResponse<any>>(
          `/api/stock/warehouse/${warehouseId}/article/${articleId}`
        );

        if (res.data.success) {
          const stockData = res.data.data;

          setEntries((prev) =>
            prev.map((entry) => {
              if (entry.localId !== localId) return entry;
              const updatedSizeData = entry.sizeData.map((sd) => {
                // Try to match stock data by euroSize
                const stockItem = Array.isArray(stockData)
                  ? stockData.find(
                      (s: any) =>
                        s.euroSize === sd.euroSize ||
                        String(s.ukSize) === sd.ukSize
                    )
                  : null;

                const warehouseOpn = stockItem?.quantity ?? stockItem?.closingStock ?? 0;

                return {
                  ...sd,
                  warehouseOpn,
                  warehouseCls: warehouseOpn - sd.allocation,
                };
              });
              return { ...entry, sizeData: updatedSizeData, loadingStock: false };
            })
          );
        }
      } catch {
        setEntries((prev) =>
          prev.map((e) =>
            e.localId === localId ? { ...e, loadingStock: false } : e
          )
        );
      }
    },
    [warehouseId]
  );

  /* ---- Add article ---- */
  const handleAddArticle = useCallback(
    (article: Article) => {
      const localId = `${article.articleId}-${Date.now()}`;
      const newEntry: OrderArticleEntry = {
        localId,
        articleId: article.articleId,
        articleCode: article.articleCode,
        articleName: article.articleName,
        color: article.color || "",
        mrp: article.mrp || 0,
        hsnCode: article.hsnCode || "",
        imageUrl: article.imageUrl || "",
        sizeData: buildEmptySizeData(),
        loadingStock: false,
      };
      setEntries((prev) => [...prev, newEntry]);

      // Fetch stock if warehouse selected
      if (warehouseId) {
        fetchArticleStock(article.articleId, localId);
      }
    },
    [warehouseId, fetchArticleStock]
  );

  /* ---- Remove article ---- */
  const handleRemoveArticle = useCallback((localId: string) => {
    setEntries((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  /* ---- Update allocation ---- */
  const handleAllocationChange = useCallback(
    (localId: string, sizeIndex: number, qty: number) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.localId !== localId) return entry;
          const newSizeData = [...entry.sizeData];
          const sd = newSizeData[sizeIndex];
          newSizeData[sizeIndex] = {
            ...sd,
            allocation: qty,
            warehouseCls: sd.warehouseOpn - qty,
          };
          return { ...entry, sizeData: newSizeData };
        })
      );
    },
    []
  );

  /* ---- Re-fetch stock when warehouse changes ---- */
  useEffect(() => {
    if (!warehouseId) return;
    entries.forEach((entry) => {
      fetchArticleStock(entry.articleId, entry.localId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  /* ---- Computed values ---- */
  const excludedArticleIds = useMemo(
    () => entries.map((e) => e.articleId),
    [entries]
  );

  const hasValidationErrors = useMemo(
    () => entries.some((e) => e.sizeData.some((s) => s.warehouseCls < 0)),
    [entries]
  );

  const grandTotalArticles = entries.length;

  const grandTotalPairs = useMemo(
    () =>
      entries.reduce(
        (sum, e) =>
          sum + e.sizeData.reduce((s, sd) => s + sd.allocation, 0),
        0
      ),
    [entries]
  );

  const grandTotalValue = useMemo(
    () =>
      entries.reduce(
        (sum, e) =>
          sum +
          e.sizeData.reduce((s, sd) => s + sd.allocation, 0) * e.mrp,
        0
      ),
    [entries]
  );

  /* ---- Selected client name ---- */
  const selectedClient = clients.find((c) => c.clientId === clientId);
  const selectedStore = stores.find((s) => s.storeId === storeId);

  /* ---- Save / Confirm ---- */
  const buildOrderPayload = useCallback(
    (status: string) => ({
      orderNumber: orderNo,
      clientId,
      storeId,
      warehouseId,
      orderDate,
      status,
      articles: entries.map((entry) => ({
        articleId: entry.articleId,
        articleCode: entry.articleCode,
        sizes: entry.sizeData
          .filter((s) => s.allocation > 0)
          .map((s) => ({
            euroSize: s.euroSize,
            ukSize: s.ukSize,
            quantity: s.allocation,
            mrp: entry.mrp,
            amount: entry.mrp * s.allocation,
          })),
        totalPairs: entry.sizeData.reduce((sum, s) => sum + s.allocation, 0),
        totalAmount:
          entry.sizeData.reduce((sum, s) => sum + s.allocation, 0) * entry.mrp,
      })),
      grandTotalPairs,
      grandTotalValue,
    }),
    [
      orderNo,
      clientId,
      storeId,
      warehouseId,
      orderDate,
      entries,
      grandTotalPairs,
      grandTotalValue,
    ]
  );

  const handleSaveDraft = async () => {
    if (entries.length === 0) {
      alert("Please add at least one article.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/orders", buildOrderPayload("DRAFT"));
      alert("Order saved as draft successfully.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (entries.length === 0) {
      alert("Please add at least one article.");
      return;
    }
    if (hasValidationErrors) {
      alert(
        "Cannot confirm order: allocation exceeds warehouse stock in one or more sizes."
      );
      return;
    }
    if (grandTotalPairs <= 0) {
      alert("Total allocation must be greater than zero.");
      return;
    }
    setConfirmSaving(true);
    try {
      await api.post("/api/orders", buildOrderPayload("CONFIRMED"));
      alert("Order confirmed successfully.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to confirm order.");
    } finally {
      setConfirmSaving(false);
    }
  };

  /* ---- Styles ---- */
  const inputCls =
    "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card";
  const labelCls =
    "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider";

  return (
    <div className="space-y-5">
      {/* ===== Page Title — Centered, Professional ===== */}
      <div className="text-center py-4 bg-card border rounded-xl shadow-sm">
        <div className="flex items-center justify-center gap-3 mb-1">
          <ClipboardList size={24} className="text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Customer Order Form
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Size-wise manual order entry with stock validation
        </p>
      </div>

      {/* ===== Header Form ===== */}
      <div className="p-5 bg-card border rounded-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Client */}
          <div>
            <label className={labelCls}>Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.orgName || c.clientName}
                </option>
              ))}
            </select>
            {selectedClient && (
              <p className="text-xs text-primary mt-1 font-medium">
                M/s {selectedClient.orgName || selectedClient.clientName}
              </p>
            )}
          </div>

          {/* Store Code */}
          <div>
            <label className={labelCls}>Store Code</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className={inputCls}
              disabled={!clientId}
            >
              <option value="">
                {clientId ? "Select Store" : "Select client first"}
              </option>
              {stores.map((s) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeCode}
                </option>
              ))}
            </select>
            {selectedStore && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedStore.storeName}
              </p>
            )}
          </div>

          {/* Warehouse */}
          <div>
            <label className={labelCls}>Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.warehouseName}
                </option>
              ))}
            </select>
          </div>

          {/* Order No */}
          <div>
            <label className={labelCls}>Order No</label>
            <input
              type="text"
              value={orderNo}
              readOnly
              className={`${inputCls} bg-muted/50 cursor-not-allowed font-mono font-semibold`}
            />
          </div>
        </div>
      </div>

      {/* ===== Article Entries ===== */}
      {entries.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <ClipboardList
            size={56}
            className="mx-auto text-muted-foreground/30 mb-4"
          />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            No articles added yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Select an article from the dropdown below to start building the
            order. Each article will show a size-run table for allocation entry.
          </p>
          <div className="max-w-sm mx-auto">
            <ArticleSelector
              articles={availableArticles}
              onSelect={handleAddArticle}
              excludeIds={excludedArticleIds}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {entries.map((entry) => (
            <OrderArticleCard
              key={entry.localId}
              entry={entry}
              onAllocationChange={handleAllocationChange}
              onRemove={handleRemoveArticle}
            />
          ))}

          {/* Add Article Button */}
          <div className="max-w-md">
            <ArticleSelector
              articles={availableArticles}
              onSelect={handleAddArticle}
              excludeIds={excludedArticleIds}
            />
          </div>
        </div>
      )}

      {/* ===== Grand Total Bar ===== */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between p-5 bg-card border rounded-xl shadow-sm sticky bottom-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Articles</p>
                <p className="text-lg font-bold">{grandTotalArticles}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Pairs</p>
              <p className="text-lg font-bold text-primary">
                {grandTotalPairs}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(grandTotalValue)}
              </p>
            </div>

            {hasValidationErrors && (
              <>
                <div className="w-px h-10 bg-border" />
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={18} />
                  <div>
                    <p className="text-xs font-medium">Stock Exceeded</p>
                    <p className="text-[10px] text-red-400">
                      Reduce allocation to proceed
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (
                  confirm(
                    "Cancel this order? All entered data will be cleared."
                  )
                ) {
                  setEntries([]);
                }
              }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={handleConfirmOrder}
              disabled={confirmSaving || hasValidationErrors || grandTotalPairs <= 0}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 shadow-sm"
              title={
                hasValidationErrors
                  ? "Fix stock validation errors before confirming"
                  : ""
              }
            >
              <Check size={14} />
              {confirmSaving ? "Confirming..." : "Confirm Order"}
            </button>
          </div>
        </div>
      )}

      {/* Branding Footer */}
      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-primary">Shalive Solutions</span>{" "}
          RetailERP
        </p>
      </div>
    </div>
  );
}
