"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Package,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Search,
  ChevronDown,
  Save,
  CheckCircle,
  Eye,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface Order {
  orderId: string;
  orderNo: string;
  orderDate: string;
  clientId: string;
  clientName: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  warehouseId: string;
  warehouseName: string;
  articlesCount: number;
  totalQuantity: number;
  totalAmount: number;
  status: "Draft" | "Confirmed" | "Cancelled" | "Dispatched";
  notes?: string;
  articles?: any[];
}

interface OrderArticleEntry {
  localId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  hsnCode: string;
  mrp: number;
  imageUrl?: string;
  sizes: SizeAllocation[];
}

interface SizeAllocation {
  euroSize: string;
  warehouseStock: number;
  customerAllocated: number;
  available: number;
  allocation: number;
}

interface DropdownItem {
  id: string;
  name: string;
  code?: string;
}

interface ArticleOption {
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  hsnCode: string;
  mrp: number;
  imageUrl?: string;
}

/** Stock position returned from the inventory API */
interface StockPositionSize {
  euroSize: number;
  openingStock: number;
  closingStock: number;
}

interface StockPositionArticle {
  articleId: string;
  sizes: StockPositionSize[];
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const SIZE_COLUMNS = [
  "39-05",
  "40-06",
  "41-07",
  "42-08",
  "43-09",
  "44-10",
  "45-11",
  "46-12",
];

/** Map each size column label to its euro size number for API matching */
const EURO_SIZE_MAP: Record<string, number> = {
  "39-05": 39,
  "40-06": 40,
  "41-07": 41,
  "42-08": 42,
  "43-09": 43,
  "44-10": 44,
  "45-11": 45,
  "46-12": 46,
};

const DEFAULT_SIZES: SizeAllocation[] = SIZE_COLUMNS.map((s) => ({
  euroSize: s,
  warehouseStock: 0,
  customerAllocated: 0,
  available: 0,
  allocation: 0,
}));

const inputCls =
  "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const STATUS_FILTER_OPTIONS = ["All", "Draft", "Confirmed", "Cancelled", "Dispatched"];

/* ================================================================
   ARTICLE SELECTOR DROPDOWN
   ================================================================ */

function ArticleSelector({
  articles,
  onSelect,
  excludeIds,
}: {
  articles: ArticleOption[];
  onSelect: (article: ArticleOption) => void;
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
                  placeholder="Search articles..."
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
                    <div className="flex items-center gap-3">
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
   ORDER ARTICLE STOCK CARD  (matches the screenshot exactly)
   ================================================================ */

function OrderArticleStockCard({
  entry,
  onAllocationChange,
  onRemove,
  readOnly,
}: {
  entry: OrderArticleEntry;
  onAllocationChange: (localId: string, sizeIndex: number, qty: number) => void;
  onRemove: (localId: string) => void;
  readOnly?: boolean;
}) {
  // Row totals
  const totalWarehouseStock = entry.sizes.reduce(
    (sum, s) => sum + s.warehouseStock,
    0
  );
  const totalCustomerAllocated = entry.sizes.reduce(
    (sum, s) => sum + s.customerAllocated,
    0
  );
  const totalAllocation = entry.sizes.reduce((sum, s) => sum + s.allocation, 0);
  const totalClosingStock = entry.sizes.reduce(
    (sum, s) => sum + (s.warehouseStock - s.allocation),
    0
  );
  const hasStockExceeded = entry.sizes.some(
    (s) => s.allocation > 0 && s.warehouseStock - s.allocation < 0
  );

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Article Info Header -- matches screenshot layout */}
      <div className="flex gap-4 p-4 border-b bg-muted/20">
        {/* Article Image Placeholder */}
        <div className="flex-shrink-0 w-24 h-24 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt={entry.articleName}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Package size={32} className="text-gray-400" />
          )}
        </div>

        {/* Article Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              INVENTORY OF WAREHOUSE
            </h3>
            {!readOnly && (
              <button
                onClick={() => onRemove(entry.localId)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Remove article"
              >
                <Trash2 size={16} className="text-destructive" />
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1">
            <div className="text-sm">
              <span className="text-muted-foreground font-medium">HSN CODE: </span>
              <span className="font-semibold">{entry.hsnCode || "-"}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground font-medium">ARTICLE: </span>
              <span className="font-semibold">{entry.articleName}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground font-medium">COLOUR: </span>
              <span className="font-semibold">{entry.color || "-"}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground font-medium">MRP: </span>
              <span className="font-semibold">
                {entry.mrp ? entry.mrp.toFixed(2) : "0.00"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Size-wise Stock Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="px-3 py-2.5 text-left font-bold border-r border-slate-600 w-40 whitespace-nowrap">
                SIZE RUN
              </th>
              {SIZE_COLUMNS.map((label) => (
                <th
                  key={label}
                  className="px-2 py-2.5 text-center font-bold border-r border-slate-600 whitespace-nowrap min-w-[64px]"
                >
                  {label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-bold whitespace-nowrap min-w-[72px]">
                T.PAIRS
              </th>
            </tr>
          </thead>
          <tbody>
            {/* WARE HOUSE OPN-SOH Row (green background) */}
            <tr className="border-b border-border/40 bg-green-50">
              <td className="px-3 py-2 font-bold text-green-800 border-r border-border/40 whitespace-nowrap">
                WARE HOUSE OPN-SOH
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-2 text-center border-r border-border/40 font-semibold text-green-800 bg-green-50"
                >
                  {s.warehouseStock}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-green-800 bg-green-100">
                {totalWarehouseStock}
              </td>
            </tr>

            {/* CUSTOMER OPN-SOH Row (blue background) */}
            <tr className="border-b border-border/40 bg-blue-50">
              <td className="px-3 py-2 font-bold text-blue-800 border-r border-border/40 whitespace-nowrap">
                CUSTOMER OPN-SOH
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-2 text-center border-r border-border/40 font-semibold text-blue-800 bg-blue-50"
                >
                  {s.customerAllocated}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold text-blue-800 bg-blue-100">
                {totalCustomerAllocated}
              </td>
            </tr>

            {/* ALLOCATION Row (orange/amber background -- editable inputs) */}
            <tr className="border-b border-border/40 bg-amber-50">
              <td className="px-3 py-2 font-bold text-amber-900 border-r border-border/40 whitespace-nowrap">
                ALLOCATION
              </td>
              {entry.sizes.map((s, idx) => {
                const closingStock = s.warehouseStock - s.allocation;
                const exceeded = s.allocation > 0 && closingStock < 0;
                return (
                  <td
                    key={idx}
                    className="px-1 py-1.5 text-center border-r border-border/40 bg-amber-50"
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
                      disabled={readOnly}
                      className={`w-full px-1 py-1.5 text-center text-sm font-bold rounded focus:outline-none focus:ring-2 ${
                        exceeded
                          ? "bg-red-100 border-2 border-red-400 text-red-700 focus:ring-red-400"
                          : "bg-amber-100 border border-amber-300 focus:ring-amber-400"
                      } ${readOnly ? "cursor-not-allowed opacity-75" : ""}`}
                      placeholder="0"
                    />
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold text-amber-900 text-base bg-amber-100">
                {totalAllocation}
              </td>
            </tr>

            {/* Spacer Row */}
            <tr className="border-b border-border/40">
              <td
                colSpan={SIZE_COLUMNS.length + 2}
                className="py-1 bg-muted/10"
              />
            </tr>

            {/* WARE HOUSE CLS- SOH Row (auto-calculated, red if negative) */}
            <tr className="bg-slate-50">
              <td className="px-3 py-2 font-bold text-slate-800 border-r border-border/40 whitespace-nowrap">
                WARE HOUSE CLS- SOH
              </td>
              {entry.sizes.map((s, idx) => {
                const closing = s.warehouseStock - s.allocation;
                return (
                  <td
                    key={idx}
                    className={`px-2 py-2 text-center border-r border-border/40 font-bold text-sm ${
                      closing < 0
                        ? "text-red-600 bg-red-50"
                        : "text-slate-800 bg-slate-50"
                    }`}
                  >
                    {closing}
                  </td>
                );
              })}
              <td
                className={`px-3 py-2 text-center font-bold text-sm ${
                  totalClosingStock < 0
                    ? "text-red-600 bg-red-100"
                    : "text-slate-800 bg-slate-100"
                }`}
              >
                {totalClosingStock}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Total Pairs:{" "}
              <span className="font-bold text-foreground text-base">
                {totalAllocation}
              </span>
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Amount:{" "}
            <span className="font-bold text-foreground text-base">
              {formatCurrency(totalAllocation * entry.mrp)}
            </span>
          </span>
        </div>
        {hasStockExceeded && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
            <AlertTriangle size={14} />
            Allocation exceeds available stock
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function OrdersPage() {
  /* ---- List state ---- */
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  /* ---- Form header state ---- */
  const [formClientId, setFormClientId] = useState("");
  const [formStoreId, setFormStoreId] = useState("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formOrderDate, setFormOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formNotes, setFormNotes] = useState("");

  /* ---- Form article entries ---- */
  const [articleEntries, setArticleEntries] = useState<OrderArticleEntry[]>([]);

  /* ---- Reference data ---- */
  const [clients, setClients] = useState<DropdownItem[]>([]);
  const [stores, setStores] = useState<DropdownItem[]>([]);
  const [warehouses, setWarehouses] = useState<DropdownItem[]>([]);
  const [availableArticles, setAvailableArticles] = useState<ArticleOption[]>(
    []
  );

  /* ---- Stock positions cache (bulk fetch per warehouse) ---- */
  const [warehouseStockCache, setWarehouseStockCache] = useState<
    StockPositionArticle[]
  >([]);
  const lastFetchedWarehouseId = useRef<string>("");

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  /* ================================================================
     DATA FETCHING
     ================================================================ */

  /* ---- Fetch orders list ---- */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/orders", {
        params: {
          search: search || undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
          page,
          pageSize: 25,
        },
      });
      if (data.success) {
        setOrders(data.data?.items || data.data || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  /* ---- Fetch reference dropdowns ---- */
  const fetchDropdowns = useCallback(async () => {
    try {
      const [clientRes, articleRes, warehouseRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/clients", {
          params: { pageSize: 500 },
        }),
        api.get<ApiResponse<any>>("/api/articles", {
          params: { pageSize: 500 },
        }),
        api.get<ApiResponse<any>>("/api/warehouses", {
          params: { pageSize: 500 },
        }),
      ]);
      if (clientRes.data.success) {
        const items =
          clientRes.data.data?.items || clientRes.data.data || [];
        setClients(
          items.map((c: any) => ({
            id: c.clientId,
            name: c.clientName,
          }))
        );
      }
      if (articleRes.data.success) {
        const items =
          articleRes.data.data?.items || articleRes.data.data || [];
        setAvailableArticles(
          items.map((a: any) => ({
            articleId: a.articleId,
            articleCode: a.articleCode,
            articleName: a.articleName,
            color: a.color || a.colour || "",
            hsnCode: a.hsnCode || "",
            mrp: a.mrp || 0,
            imageUrl: a.imageUrl || "",
          }))
        );
      }
      if (warehouseRes.data.success) {
        const items =
          warehouseRes.data.data?.items || warehouseRes.data.data || [];
        setWarehouses(
          items.map((w: any) => ({
            id: w.warehouseId,
            name: w.warehouseName,
          }))
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  /* ---- Fetch stores for a client ---- */
  const fetchStores = useCallback(async (clientId: string) => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stores", {
        params: { clientId, pageSize: 500 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setStores(
          items.map((s: any) => ({
            id: s.storeId,
            name: s.storeName,
            code: s.storeCode || s.storeName,
          }))
        );
      }
    } catch {
      setStores([]);
    }
  }, []);

  /* ---- Fetch ALL stock positions for a warehouse (bulk) ---- */
  const fetchWarehouseStockPositions = useCallback(
    async (warehouseId: string): Promise<StockPositionArticle[]> => {
      if (!warehouseId) return [];
      // Use cache if already fetched for this warehouse
      if (lastFetchedWarehouseId.current === warehouseId && warehouseStockCache.length > 0) {
        return warehouseStockCache;
      }
      try {
        const { data } = await api.get<ApiResponse<any>>(
          "/api/stock/positions",
          { params: { warehouseId } }
        );
        if (data.success && data.data) {
          const positions: StockPositionArticle[] = Array.isArray(data.data)
            ? data.data
            : data.data?.items || data.data?.positions || [];
          lastFetchedWarehouseId.current = warehouseId;
          setWarehouseStockCache(positions);
          return positions;
        }
      } catch {
        /* fall through -- API may not be available yet */
      }
      return [];
    },
    [warehouseStockCache]
  );

  /* ---- Fetch stock for a single article from warehouse ---- */
  const fetchArticleStock = useCallback(
    async (
      warehouseId: string,
      articleId: string
    ): Promise<SizeAllocation[]> => {
      let stockSizes: StockPositionSize[] = [];

      // First try: check bulk cache
      const cached = warehouseStockCache.find(
        (p) => p.articleId === articleId
      );
      if (cached && cached.sizes) {
        stockSizes = cached.sizes;
      } else if (warehouseId) {
        // Second try: per-article endpoint
        try {
          const { data } = await api.get<ApiResponse<any>>(
            "/api/stock/position",
            { params: { warehouseId, articleId } }
          );
          if (data.success && data.data) {
            stockSizes = data.data.sizes || [];
          }
        } catch {
          /* fall through to defaults */
        }
      }

      // Map stock data to our SizeAllocation shape
      return SIZE_COLUMNS.map((euroSizeLabel) => {
        const euroNum = EURO_SIZE_MAP[euroSizeLabel];
        const match = stockSizes.find((s) => s.euroSize === euroNum);
        return {
          euroSize: euroSizeLabel,
          warehouseStock: match?.openingStock ?? 0,
          customerAllocated: 0, // Customer OPN-SOH: 0 for now
          available: match?.openingStock ?? 0,
          allocation: 0,
        };
      });
    },
    [warehouseStockCache]
  );

  /* ---- Re-fetch stock for ALL current articles when warehouse changes ---- */
  const refetchAllStock = useCallback(
    async (warehouseId: string, currentEntries: OrderArticleEntry[]) => {
      if (!warehouseId || currentEntries.length === 0) return;
      setStockLoading(true);
      try {
        // Fetch bulk positions first
        await fetchWarehouseStockPositions(warehouseId);

        const updatedEntries = await Promise.all(
          currentEntries.map(async (entry) => {
            const sizes = await fetchArticleStock(
              warehouseId,
              entry.articleId
            );
            // Preserve existing allocations where possible
            const mergedSizes = sizes.map((newSize) => {
              const existing = entry.sizes.find(
                (s) => s.euroSize === newSize.euroSize
              );
              return {
                ...newSize,
                allocation: existing?.allocation || 0,
              };
            });
            return { ...entry, sizes: mergedSizes };
          })
        );
        setArticleEntries(updatedEntries);
      } finally {
        setStockLoading(false);
      }
    },
    [fetchWarehouseStockPositions, fetchArticleStock]
  );

  /* ---- Effects ---- */
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    if (formClientId) {
      fetchStores(formClientId);
    } else {
      setStores([]);
    }
  }, [formClientId, fetchStores]);

  /* ================================================================
     ARTICLE MANAGEMENT
     ================================================================ */

  /* ---- Add article ---- */
  const handleAddArticle = useCallback(
    async (article: ArticleOption) => {
      let sizes: SizeAllocation[];
      if (formWarehouseId) {
        setStockLoading(true);
        try {
          // Ensure bulk stock is loaded
          await fetchWarehouseStockPositions(formWarehouseId);
          sizes = await fetchArticleStock(formWarehouseId, article.articleId);
        } finally {
          setStockLoading(false);
        }
      } else {
        sizes = DEFAULT_SIZES.map((s) => ({ ...s }));
      }
      const newEntry: OrderArticleEntry = {
        localId: `${article.articleId}-${Date.now()}`,
        articleId: article.articleId,
        articleCode: article.articleCode,
        articleName: article.articleName,
        color: article.color,
        hsnCode: article.hsnCode,
        mrp: article.mrp,
        imageUrl: article.imageUrl,
        sizes,
      };
      setArticleEntries((prev) => [...prev, newEntry]);
    },
    [formWarehouseId, fetchWarehouseStockPositions, fetchArticleStock]
  );

  /* ---- Remove article ---- */
  const handleRemoveArticle = useCallback((localId: string) => {
    setArticleEntries((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  /* ---- Update allocation for a size ---- */
  const handleAllocationChange = useCallback(
    (localId: string, sizeIndex: number, qty: number) => {
      setArticleEntries((prev) =>
        prev.map((entry) => {
          if (entry.localId !== localId) return entry;
          const newSizes = [...entry.sizes];
          newSizes[sizeIndex] = {
            ...newSizes[sizeIndex],
            allocation: qty,
          };
          return { ...entry, sizes: newSizes };
        })
      );
    },
    []
  );

  /* ================================================================
     COMPUTED VALUES
     ================================================================ */

  const grandTotals = useMemo(() => {
    let totalArticles = articleEntries.length;
    let totalPairs = 0;
    let totalAmount = 0;
    articleEntries.forEach((entry) => {
      const entryQty = entry.sizes.reduce((sum, s) => sum + s.allocation, 0);
      totalPairs += entryQty;
      totalAmount += entryQty * entry.mrp;
    });
    return { totalArticles, totalPairs, totalAmount };
  }, [articleEntries]);

  const hasStockValidationErrors = useMemo(() => {
    return articleEntries.some((entry) =>
      entry.sizes.some(
        (s) => s.allocation > 0 && s.warehouseStock - s.allocation < 0
      )
    );
  }, [articleEntries]);

  const excludedArticleIds = useMemo(
    () => articleEntries.map((e) => e.articleId),
    [articleEntries]
  );

  /* ================================================================
     FORM HELPERS
     ================================================================ */

  const resetForm = useCallback(() => {
    setEditingOrder(null);
    setViewMode(false);
    setFormClientId("");
    setFormStoreId("");
    setFormWarehouseId("");
    setFormOrderDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setArticleEntries([]);
    setWarehouseStockCache([]);
    lastFetchedWarehouseId.current = "";
  }, []);

  /**
   * Build the payload matching the backend POST /api/orders contract:
   * { clientId, storeId, warehouseId, orderDate, notes, articles: [{ articleId, color, hsnCode, mrp, sizeQuantities: [{ euroSize, quantity }] }] }
   */
  const buildPayload = useCallback(() => {
    return {
      clientId: formClientId,
      storeId: formStoreId,
      warehouseId: formWarehouseId || undefined,
      orderDate: formOrderDate,
      notes: formNotes || undefined,
      articles: articleEntries.map((entry) => ({
        articleId: entry.articleId,
        color: entry.color,
        hsnCode: entry.hsnCode,
        mrp: entry.mrp,
        sizeQuantities: entry.sizes.map((s) => ({
          euroSize: EURO_SIZE_MAP[s.euroSize] ?? parseInt(s.euroSize),
          quantity: s.allocation,
        })),
      })),
    };
  }, [
    formClientId,
    formStoreId,
    formWarehouseId,
    formOrderDate,
    formNotes,
    articleEntries,
  ]);

  /* ================================================================
     CRUD OPERATIONS
     ================================================================ */

  /* ---- Open: New Order ---- */
  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  /* ---- Open: Edit Order ---- */
  const openEdit = async (order: Order) => {
    resetForm();
    setEditingOrder(order);
    setFormClientId(order.clientId || "");
    setFormOrderDate(
      order.orderDate
        ? new Date(order.orderDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setFormWarehouseId(order.warehouseId || "");
    setFormNotes(order.notes || "");

    // Fetch full order detail from GET /api/orders/{id}
    try {
      const { data } = await api.get<ApiResponse<any>>(
        `/api/orders/${order.orderId}`
      );
      if (data.success && data.data) {
        const detail = data.data;
        setFormClientId(detail.clientId || order.clientId || "");
        setFormStoreId(detail.storeId || order.storeId || "");
        setFormWarehouseId(detail.warehouseId || order.warehouseId || "");

        // Fetch stock for the warehouse
        let stockPositions: StockPositionArticle[] = [];
        const whId = detail.warehouseId || order.warehouseId;
        if (whId) {
          stockPositions = await fetchWarehouseStockPositions(whId);
        }

        if (detail.articles && detail.articles.length > 0) {
          setArticleEntries(
            detail.articles.map((a: any, i: number) => {
              const articleStock = stockPositions.find(
                (p) => p.articleId === a.articleId
              );
              const sizeQties = a.sizeQuantities || a.sizes || [];

              return {
                localId: `${a.articleId}-${Date.now()}-${i}`,
                articleId: a.articleId,
                articleCode: a.articleCode || a.articleName || "",
                articleName: a.articleName || "",
                color: a.color || a.colour || "",
                hsnCode: a.hsnCode || "",
                mrp: a.mrp || 0,
                imageUrl: a.imageUrl || "",
                sizes: SIZE_COLUMNS.map((euroSizeLabel) => {
                  const euroNum = EURO_SIZE_MAP[euroSizeLabel];
                  const match = sizeQties.find(
                    (s: any) =>
                      s.euroSize === euroNum ||
                      s.euroSize === euroSizeLabel
                  );
                  const stockMatch = articleStock?.sizes?.find(
                    (s) => s.euroSize === euroNum
                  );
                  const opnSoh = stockMatch?.openingStock ?? 0;
                  const qty =
                    match?.quantity ?? match?.allocation ?? match?.orderQty ?? 0;
                  return {
                    euroSize: euroSizeLabel,
                    warehouseStock: opnSoh,
                    customerAllocated: 0,
                    available: opnSoh,
                    allocation: qty,
                  };
                }),
              };
            })
          );
        }
      }
    } catch {
      // Use basic order info as fallback
      setFormStoreId(order.storeId || "");
    }

    setModalOpen(true);
  };

  /* ---- Open: View Order (read-only) ---- */
  const openView = async (order: Order) => {
    await openEdit(order);
    setViewMode(true);
  };

  /* ---- Save as Draft: POST /api/orders or PUT /api/orders/{id} ---- */
  const handleSaveDraft = async () => {
    if (!formClientId || !formStoreId) {
      alert("Client and Store are required.");
      return;
    }
    if (articleEntries.length === 0) {
      alert("Add at least one article with quantities.");
      return;
    }
    setSaving(true);
    try {
      const body = buildPayload();
      if (editingOrder) {
        await api.put(`/api/orders/${editingOrder.orderId}`, body);
      } else {
        await api.post("/api/orders", body);
      }
      setModalOpen(false);
      resetForm();
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Confirm Order: save then PUT /api/orders/{id}/confirm ---- */
  const handleConfirmOrder = async () => {
    if (!formClientId || !formStoreId) {
      alert("Client and Store are required.");
      return;
    }
    if (articleEntries.length === 0) {
      alert("Add at least one article with quantities.");
      return;
    }
    if (grandTotals.totalPairs <= 0) {
      alert("Total quantity must be greater than zero.");
      return;
    }
    if (hasStockValidationErrors) {
      alert(
        "Cannot confirm: allocation exceeds available stock for some sizes."
      );
      return;
    }
    setConfirming(true);
    try {
      let orderId = editingOrder?.orderId;

      // If new order, POST first then confirm
      if (!orderId) {
        const body = buildPayload();
        const { data } = await api.post<ApiResponse<any>>("/api/orders", body);
        if (data.success && data.data) {
          orderId = data.data.orderId || data.data.id;
        } else {
          throw new Error(data.message || "Failed to create order");
        }
      } else {
        // Update existing draft first
        await api.put(`/api/orders/${orderId}`, buildPayload());
      }

      // Now confirm via PUT /api/orders/{id}/confirm
      await api.put(`/api/orders/${orderId}/confirm`);

      setModalOpen(false);
      resetForm();
      fetchOrders();
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to confirm order"
      );
    } finally {
      setConfirming(false);
    }
  };

  /* ---- Delete draft: DELETE /api/orders/{id} ---- */
  const handleDelete = async (order: Order) => {
    if (order.status !== "Draft") {
      alert("Only draft orders can be deleted.");
      return;
    }
    if (!confirm(`Delete order "${order.orderNo}"?`)) return;
    try {
      await api.delete(`/api/orders/${order.orderId}`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete order");
    }
  };

  /* ---- Confirm from list: PUT /api/orders/{id}/confirm ---- */
  const handleConfirmFromList = async (order: Order) => {
    if (!confirm(`Confirm order "${order.orderNo}"? Stock will be deducted.`))
      return;
    try {
      await api.put(`/api/orders/${order.orderId}/confirm`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to confirm order");
    }
  };

  /* ---- Cancel from list: PUT /api/orders/{id}/cancel ---- */
  const handleCancelFromList = async (order: Order) => {
    if (!confirm(`Cancel order "${order.orderNo}"?`)) return;
    try {
      await api.put(`/api/orders/${order.orderId}/cancel`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel order");
    }
  };

  /* ---- Handle warehouse change (re-fetch all stock) ---- */
  const handleWarehouseChange = useCallback(
    (newWarehouseId: string) => {
      setFormWarehouseId(newWarehouseId);
      // Reset cache for new warehouse
      lastFetchedWarehouseId.current = "";
      setWarehouseStockCache([]);
      if (newWarehouseId && articleEntries.length > 0) {
        refetchAllStock(newWarehouseId, articleEntries);
      }
    },
    [articleEntries, refetchAllStock]
  );

  /* ---- Handle client change (reset store) ---- */
  const handleClientChange = useCallback((newClientId: string) => {
    setFormClientId(newClientId);
    setFormStoreId("");
  }, []);

  /* ================================================================
     TABLE COLUMNS
     ================================================================ */

  const columns: Column<Order>[] = [
    {
      key: "orderNo",
      header: "Order No",
      className: "font-mono text-xs font-medium whitespace-nowrap",
    },
    {
      key: "orderDate",
      header: "Date",
      render: (o) => formatDate(o.orderDate),
    },
    { key: "clientName", header: "Client" },
    {
      key: "storeName",
      header: "Store",
      render: (o) => (
        <span>
          {o.storeCode && (
            <span className="font-mono text-xs text-muted-foreground mr-1">
              {o.storeCode}
            </span>
          )}
          {o.storeName}
        </span>
      ),
    },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "articlesCount",
      header: "Articles",
      className: "text-center",
      render: (o) => (
        <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-semibold text-xs rounded-full w-7 h-7">
          {o.articlesCount || 0}
        </span>
      ),
    },
    {
      key: "totalQuantity",
      header: "Total Qty",
      className: "text-right font-medium",
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      render: (o) => formatCurrency(o.totalAmount),
      className: "text-right font-medium",
    },
    {
      key: "status",
      header: "Status",
      render: (o) => {
        const statusMap: Record<string, string> = {
          Draft: "DRAFT",
          Confirmed: "CONFIRMED",
          Cancelled: "CANCELLED",
          Dispatched: "DISPATCHED",
        };
        return <StatusBadge status={statusMap[o.status] || o.status} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (o) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openView(o);
            }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="View"
          >
            <Eye size={14} className="text-muted-foreground" />
          </button>
          {o.status === "Draft" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmFromList(o);
                }}
                className="p-1.5 rounded hover:bg-green-50 transition-colors"
                title="Confirm"
              >
                <Check size={14} className="text-green-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(o);
                }}
                className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </>
          )}
          {o.status === "Confirmed" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelFromList(o);
              }}
              className="p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Cancel"
            >
              <X size={14} className="text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  /* ================================================================
     CLIENT NAME LOOKUP
     ================================================================ */
  const selectedClientName = useMemo(() => {
    const c = clients.find((c) => c.id === formClientId);
    return c ? c.name : "";
  }, [clients, formClientId]);

  const selectedStoreCode = useMemo(() => {
    const s = stores.find((s) => s.id === formStoreId);
    return s ? s.code || s.name : "";
  }, [stores, formStoreId]);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <>
      {/* Status Filter Tabs above the DataTable */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_FILTER_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <DataTable
        title="Customer Orders"
        subtitle="Size-wise order entry with warehouse stock validation"
        columns={columns}
        data={orders}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={(o) => {
          if (o.status === "Draft") openEdit(o);
          else openView(o);
        }}
        onDelete={handleDelete}
        onImport={() => alert("Import feature coming soon")}
        onExport={() => alert("Export feature coming soon")}
        addLabel="New Order"
        loading={loading}
        keyExtractor={(o) => o.orderId}
      />

      {/* ========== ORDER FORM MODAL (XL) ========== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title=""
        size="xl"
      >
        <div className="space-y-5">
          {/* ---- CUSTOMER ORDER FORM Title ---- */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold tracking-wide uppercase">
              CUSTOMER ORDER FORM
            </h2>
            {editingOrder && (
              <p className="text-sm text-muted-foreground mt-1">
                {viewMode ? "Viewing" : "Editing"} {editingOrder.orderNo}
              </p>
            )}
          </div>

          {/* ---- Header Fields Row: DATE, CLIENT, STORE CODE ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl border">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                DATE
              </label>
              <input
                type="date"
                value={formOrderDate}
                onChange={(e) => setFormOrderDate(e.target.value)}
                disabled={viewMode}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                CLIENT
              </label>
              <select
                value={formClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={viewMode}
                className={inputCls}
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    M/s {c.name}
                  </option>
                ))}
              </select>
              {selectedClientName && (
                <p className="text-xs text-primary font-medium mt-1">
                  M/s {selectedClientName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                STORE CODE
              </label>
              <select
                value={formStoreId}
                onChange={(e) => setFormStoreId(e.target.value)}
                disabled={!formClientId || viewMode}
                className={inputCls}
              >
                <option value="">
                  {formClientId ? "Select Store" : "Select Client first"}
                </option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code || s.name}
                  </option>
                ))}
              </select>
              {selectedStoreCode && (
                <p className="text-xs text-primary font-medium mt-1">
                  {selectedStoreCode}
                </p>
              )}
            </div>
          </div>

          {/* ---- Warehouse Selector ---- */}
          <div className="max-w-sm">
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Warehouse
            </label>
            <select
              value={formWarehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              disabled={viewMode}
              className={inputCls}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* ---- Notes field ---- */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Notes (optional)
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              disabled={viewMode}
              placeholder="Any additional notes for this order..."
              className={inputCls}
            />
          </div>

          {/* ---- Stock loading indicator ---- */}
          {stockLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Loading stock positions from warehouse...
            </div>
          )}

          {/* ---- Article Entries with Stock Cards ---- */}
          {articleEntries.length === 0 && !viewMode ? (
            <div className="border-2 border-dashed rounded-xl p-12 text-center">
              <Package
                size={48}
                className="mx-auto text-muted-foreground/40 mb-4"
              />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                No articles added yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select a warehouse and article to begin size-wise allocation.
              </p>
              {formWarehouseId ? (
                <div className="max-w-sm mx-auto">
                  <ArticleSelector
                    articles={availableArticles}
                    onSelect={handleAddArticle}
                    excludeIds={excludedArticleIds}
                  />
                </div>
              ) : (
                <p className="text-sm text-amber-600 font-medium">
                  <AlertTriangle
                    size={14}
                    className="inline mr-1 -mt-0.5"
                  />
                  Please select a warehouse first
                </p>
              )}
            </div>
          ) : articleEntries.length === 0 && viewMode ? (
            <div className="border-2 border-dashed rounded-xl p-12 text-center">
              <Package
                size={48}
                className="mx-auto text-muted-foreground/40 mb-4"
              />
              <p className="text-sm text-muted-foreground">
                No articles in this order.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {articleEntries.map((entry) => (
                <OrderArticleStockCard
                  key={entry.localId}
                  entry={entry}
                  onAllocationChange={handleAllocationChange}
                  onRemove={handleRemoveArticle}
                  readOnly={viewMode}
                />
              ))}

              {/* + Add Article button */}
              {!viewMode && formWarehouseId && (
                <div className="max-w-md">
                  <ArticleSelector
                    articles={availableArticles}
                    onSelect={handleAddArticle}
                    excludeIds={excludedArticleIds}
                  />
                </div>
              )}
            </div>
          )}

          {/* ---- Grand Total Footer ---- */}
          {articleEntries.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Total Articles
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {grandTotals.totalArticles}
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Total Pairs
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {grandTotals.totalPairs}
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Total Amount
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(grandTotals.totalAmount)}
                  </p>
                </div>
              </div>
              {hasStockValidationErrors && (
                <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg">
                  <AlertTriangle size={16} />
                  Stock validation errors
                </div>
              )}
            </div>
          )}

          {/* ---- Action Buttons ---- */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              {viewMode ? "Close" : "Cancel"}
            </button>

            {!viewMode && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={confirming || hasStockValidationErrors}
                  className="flex items-center gap-1.5 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 shadow-sm transition-colors"
                >
                  <CheckCircle size={14} />
                  {confirming ? "Confirming..." : "Confirm Order"}
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
